$(function() {



	let userId;

	let streaming = false;

	let autoscroll = false;
	let autoscrollDiv = null;

	let lastUserMessage = '';



	const inputHeight  = $('.chat-input-text textarea').height();
	const inputRowsMax = parseInt($('.chat-input-text textarea').attr('data-rows-max'), 10) || 25;
	const inputScrollHeight = $('.chat-input-text textarea')[0].scrollHeight;



	$('.chat-input-text textarea').keypress(function(e) {
		const code = e.keyCode ? e.keyCode : e.which;
		if (13 === code) {
			userMessage($(this).closest('.chat-input'));
			return false;
		}

	}).on('input change keyup paste', function() {

		this.style.height = 0;

		const rows = Math.ceil(this.scrollHeight / inputScrollHeight);
		this.rows = rows > inputRowsMax ? inputRowsMax : rows;

		let height = 1 === this.rows
			? inputHeight
			: (this.rows * inputHeight) - 5;

		$(this).css('height', height + 'px');

		unreadyInputButton($(this));
	});



	$('.chat-input').submit(function() {
		userMessage($(this));
		return false;
	});



	function userMessage($form) {

		if (streaming) {
			return;
		}

		const $input = $form.find('textarea');

		const message = $input.val().trim();
		if ('' === message) {
			return;
		}

		$content = $form.closest('.chat-content');
		regenerative($content, false);
		setStreaming($content, true);

		$input.val('');
		$input.css('height', inputHeight + 'px');
		unreadyInputButton($input, true);

		enableInputButton($content, false);
		const input = prepareOutput(escapeHtml(message), '');
		const $div = addMessage($content, input, 'input');
		$div.addClass('chat-messages-input-wait');

		autoscroll = true;
		scrollBottom($content);
		sendMessage($content, $div, message);
	}



	function addMessage($content, message, type) {
		const html = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-messages-inner"><div class="chat-messages-icon"></div><div class="chat-messages-text">' + message + '</div></div></div>';
		$content.find('.chat-messages').append(html);
		return lastMessageItem($content);
	}



	function lastMessageItem($content) {
		return $content.find('.chat-messages .chat-messages-item').last();
	}



	function sendMessage($content, $inputDiv, message) {

		const watermarkId = watermark($content);

		const data = {
			action				: 'stream',
			message				: message,
			from_status_url		: $content.attr('data-status-url') || '',
			from_bearer_token	: $content.attr('data-bearer-token') || '',
			conversation_id		: $content.attr('data-conversation-id') || ''
		};

		const $input = $content.find('.chat-input-text textarea');

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!streaming ||
				!watermark($content, watermarkId)) {
				return;
			}

			if (!e || !e.status) {
				setStreaming($content, false);
				unreadyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			if ('success' != e.status) {
				setStreaming($content, false);
				unreadyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			lastUserMessage = message;

			const conversationId = data.conversation_id ? data.conversation_id : e.conversation_id;
			$content.attr('data-conversation-id', conversationId);

			const statusUrl = e.endpoints.status_url;
			$content.attr('data-status-url', statusUrl);
			$content.attr('data-stop-url', e.endpoints.stop_url ? e.endpoints.stop_url : '');
			$content.attr('data-from-status-url', data.from_status_url);

			const bearerToken = e.endpoints.bearer_token || '';
			const streamToken = e.endpoints.stream_token || '';
			$content.attr('data-bearer-token', bearerToken);
			$content.attr('data-from-bearer-token', data.from_bearer_token);

			$inputDiv && $inputDiv.removeClass('chat-messages-input-wait');
			const $div = addMessage($content, squareCursor(true), 'output');
			scrollBottom($content);

			saveChat($content, conversationId, statusUrl, bearerToken, data.from_bearer_token, message, !data.conversation_id);
			streamMessages($content, $div, $input, e.endpoints.stream_events_url, streamToken);

		}).fail(function(e) {
			console.log(e);
			setStreaming($content, false);
			unreadyInputButton($input);
			enableInputButton($content, true);
		});

	}



	function streamMessages($content, $div, $input, url, streamToken) {

		let html = '';
		const watermarkId = watermark($content);

		const eventSource = new EventSource(url + (streamToken ? '?stream_token=' + streamToken : ''));

		eventSource.onmessage = function(e) {

			if (!watermark($content, watermarkId)) {
				return;
			}

			if (!streaming) {
				streamMessagesEnd($content, $div, $input, eventSource, html);
				return;
			}

			if (!e || !e.data) {
				streamMessagesEnd($content, $div, $input, eventSource, html);
				return;
			}

			if (e.data == "[DONE]") {
				streamMessagesEnd($content, $div, $input, eventSource, html);
				return;
			}

			const obj = streamMessagesItem(e.data);
			if (!obj) {
				return;
			}

			const choice = 	obj.choices[0];
			let txt = choice.delta.content;

			if (null === txt ||
				undefined === txt) {
				return;
			}

			txt = '' + txt;
			if ('' !== txt) {
				html += escapeHtml(txt);
				$div.find('.chat-messages-text').html(prepareOutput(html, squareCursor()));
				scrollBottom($content);
			}

			if (choice.finish_reason) {
				streamMessagesEnd($content, $div, $input, eventSource, html);
				return;
			}
		}

		eventSource.onerror = function(e) {

			console.log(e);

			if (!streaming ||
				!watermark($content, watermarkId)) {
				eventSource.close();
				return;
			}

			streamMessagesEnd($content, $div, $input, eventSource, html);
		}
	}



	function streamMessagesItem(data) {

		let obj = null;

		try {

			obj = JSON.parse(data);
			if (!obj || !obj.choices) {
				return false;
			}

		} catch(e) {
			return false;
		}

		return obj;
	}



	function streamMessagesEnd($content, $div, $input, eventSource, html) {

		regenerative($content, true);
		setStreaming($content, false);

		eventSource.close();

		$div.find('.chat-messages-text').html(prepareOutput(html, ''));
		blinkEnd($div);

		autoscroll = false;
		autoscrollDiv = null;

		unreadyInputButton($input);
		enableInputButton($content, true);

		$content.removeAttr('data-stop-url');
	}



	function regenerateMessage($content) {

		regenerative($content, false);

		if ('' === lastUserMessage) {
			return;
		}

		let $last = lastMessageItem($content);

		if ($last && (
			$last.attr('data-stopped') || $last.hasClass('chat-messages-output'))) {
			$last.remove();
			$last = lastMessageItem($content);
		}

		let $inputDiv = null;
		if ($last && $last.hasClass('chat-messages-input')) {
			$inputDiv = $last;
			$inputDiv.addClass('chat-messages-input-wait');
		}

		setStreaming($content, true);
		enableInputButton($content, false);
		unreadyInputButton($content.find('.chat-input-text textarea'), true);

		$content.attr('data-status-url', $content.attr('data-from-status-url'));
		$content.attr('data-bearer-token', $content.attr('data-from-bearer-token'));

		autoscroll = true;
		scrollBottom($content);
		sendMessage($content, $inputDiv, lastUserMessage);
	}



	$('.chat-input-regenerate').click(function() {
		regenerateMessage($(this).closest('.chat-content'));
		return false;
	});



	function prepareOutput(html, cursor) {

		let input = html.trim();
		input = input.replace(/(?:\r\n|\r)/g, "\n");
		input = input.replace(/\n+/, "\n").trim();

		if ('' === input) {
			return cursor;
		}

		let output = '';
		const chunks = input.split("\n");

		let inCode = false;
		const codeMark = '&#x60;&#x60;&#x60;';

		let prevLine = '';

		let inListUl = false;
		let inListOl = false;

		for (let i = 0; i < chunks.length; i++) {

			const line = chunks[i];
			if ('' === line) {
				continue;
			}

			const isLast = i === chunks.length - 1;
			const cursored = isLast ? cursor : '';

			if (codeMark === line) {
				output += inCode ? '</code></div>' : '<div class="chat-messages-code"><code>';
				output += cursored;
				inCode = !inCode;
				continue;
			}

			if (0 === line.indexOf(codeMark)) {

				const title = line.substring(codeMark.length);

				if (!inCode) {
					output += '<div class="chat-messages-code"><code title="' + title + '">';
					output += cursored;
					inCode = !inCode;
					continue;
				}

				output += '</code></div>' + '<p>' + title + cursored + '</p>';
				inCode = !inCode;

				continue;
			}

			if (inCode) {
				output += line + cursored + "\n";
				continue;
			}

			if (0 === line.indexOf('-')) {

				if (!inListUl) {
					inListUl = true;
					output += '<ul>';
				}

				output += '<li>' + line.substring(1).trim() + cursored + '</li>';
				continue;
			}

			if (inListUl) {
				output += '</ul>';
				inListUl = false;
			}

			if (line.match(/^[0-9]+$/)) {
				if (inListOl) {
					continue;
				}
			}

			if (line.match(/^[0-9]+\./)) {

				if (!inListOl) {
					inListOl = true;
					output += '<ol>';
				}

				const pos = line.indexOf('.');
				const content = line.substring(pos + 1).trim();
				output += '<li>' + ('' === content ? '&nbsp;' : content) + cursored + '</li>';

				continue;
			}

			if (inListOl) {
				output += '</ol>';
				inListOl = false;
			}

			output += '<p>' + prevLine + line + cursored + '</p>';
		}

		if (inCode) {
			output += '</code>';
		}

		if (inListUl) {
			output += '</ul>';
		}

		if (inListOl) {
			output += '</ol>';
		}

		return output;
	}



	const htmlEntityMap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
		'/': '&#x2F;',
		'`': '&#x60;',
		'=': '&#x3D;'
	};

	function escapeHtml(input) {
		return String(input).replace(/[&<>"'`=\/]/g, function(s) {
			return htmlEntityMap[s];
		});
	}



	function squareCursor(blink) {
		return '<span class="chat-cursor' + (blink ? ' chat-cursor-blink' : '') + '">&nbsp;</span>';
	}



	function enableInputButton($content, enable) {
		const $button = $content.find('.chat-input-text button[type="submit"]');
		enable ? $button.removeAttr('disabled') : $button.attr('disabled', 'disabled');
	}



	function unreadyInputButton($input, unready) {
		unready || streaming || '' === $input.val().trim()
			? $input.closest('.chat-input-text').removeClass('chat-input-ready')
			: $input.closest('.chat-input-text').addClass('chat-input-ready');
	}



	$('.chat-input-text').on('click', function(e) {
		if (e.target === this) {
			$(this).find('textarea').focus();
		}
	});



	function blinkEnd($div) {
		$div.addClass('chat-messages-output-end');
	}



	function scrollBottom($content) {
		if (autoscroll) {
			autoscrollDiv = $content.find('.chat-messages')[0];
			autoscrollDiv.scrollTop = autoscrollDiv.scrollHeight;
		}
	}



	$('.chat-messages').scroll(function() {
		if (null !== autoscrollDiv) {
			autoscroll = Math.abs(autoscrollDiv.scrollHeight - autoscrollDiv.scrollTop - autoscrollDiv.clientHeight) < 1;
		}
	});



	$(window).resize(function() {

		$('.chat').each(function() {
			const height = $(this).find('.chat-content').outerHeight() - $(this).find('.chat-input').height();
			$(this).find('.chat-loading').height(height > 0 ? height : 0);
			$(this).find('.chat-messages').height(height > 0 ? height : 0);
		});

	}).resize();



	function setStreaming($content, value) {
		streaming = value;
		streaming ? $content.addClass('chat-streaming') : $content.removeClass('chat-streaming');
	}



	function regenerative($content, value) {
		value && $content.find('.chat-messages').children().length ? $content.addClass('chat-awaiting') : $content.removeClass('chat-awaiting');
	}



	function saveChat($content, chatId, statusUrl, bearerToken, fromBearerToken, message, newChat) {

		const data = {
			action				: 'save',
			user_id				: userId,
			chat_id				: chatId,
			message				: message,
			status_url			: statusUrl,
			bearer_token		: bearerToken,
			from_bearer_token	: fromBearerToken
		};

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!e || !newChat) {
				return;
			}

			if (e.title_status_url) {
				waitForChatTitleUrl($content, data.chat_id, data.status_url, e.title_status_url, e.title_bearer_token, e.title);
				return;
			}

			if (e.title) {
				addChatList($content.closest('.chat'), data.chat_id, e.title, true);
			}

		});
	}



	function updateChatTitle($content, chatId, statusUrl, title, titleFallback) {

		const data = {
			action		: 'title',
			user_id		: userId,
			chat_id		: chatId,
			title		: title
		};

		$.post(chatConfig.serverUrl, data, function(e) {
			newChatListItem($content, chatId, statusUrl, e && e.title ? e.title : titleFallback);

		}).fail(function(e) {
			console.log(e);
			newChatListItem($content, chatId, statusUrl, titleFallback);
		});
	}



	function newChatListItem($content, chatId, statusUrl, title) {

		addChatList($content.closest('.chat'), chatId, title, true);

		if (chatId != $content.attr('data-conversation-id') ||
			statusUrl != $content.attr('data-status-url')) {
			return;
		}

		$list = $content.closest('.chat').find('.chat-sidebar .chat-sidebar-list');
		$list.find('.chat-sidebar-item[data-chat-id="' + chatId + '"]').addClass('chat-sidebar-selected');
		$list.scrollTop(0);
	}



	function addChatList($chat, chatId, title, prepend) {
		const $list = $chat.find('.chat-sidebar .chat-sidebar-list');
		const html = ('<div class="chat-sidebar-item" data-chat-id="' + chatId + '">' + escapeHtml(title)) + '<span></span></div>';
		prepend ? $list.prepend(html) && $list.scrollTop(0) : $list.append(html);
	}



	function waitForChatTitleUrl($content, chatId, statusUrl, titleStatusUrl, titleBearerToken, titleFallback) {
		setTimeout(fetchTitleUrl, 500, $content, chatId, statusUrl, titleStatusUrl, titleBearerToken, titleFallback);
	}



	function fetchTitleUrl($content, chatId, statusUrl, titleStatusUrl, titleBearerToken, titleFallback) {

		$.ajax({

			url: titleStatusUrl,

			beforeSend: function(xhr) {
				if (titleBearerToken) {
					xhr.setRequestHeader('Authorization', 'Bearer ' + titleBearerToken);
				}
			}

		}).done(function(e) {

			if (!e || !e.status || 'error' == e.status) {
				newChatListItem($content, chatId, statusUrl, titleFallback);
				return;
			}

			if ('done' != e.status) {
				waitForChatTitleUrl($content, chatId, statusUrl, titleStatusUrl, titleBearerToken, titleFallback);
				return;
			}

			if (!e.response ||
				!e.response.body ||
				!e.response.body.choices ||
				!e.response.body.choices[0].message ||
				!e.response.body.choices[0].message.content) {

				newChatListItem($content, chatId, statusUrl, titleFallback);
				return;
			}

			updateChatTitle($content, chatId, statusUrl, e.response.body.choices[0].message.content, titleFallback);

		}).fail(function(e) {
			console.log(e);
			newChatListItem($content, chatId, statusUrl, titleFallback);
		});
	}



	function stopStreaming($content) {

		const stopUrl = $content.attr('data-stop-url');
		if (!stopUrl) {
			return;
		}

		const bearerToken = $content.attr('data-bearer-token') || '';

		$.ajax({

			url: stopUrl,

			beforeSend: function(xhr) {
				if (bearerToken) {
					xhr.setRequestHeader('Authorization', 'Bearer ' + bearerToken);
				}
			}

		}).done(function(e) {

			if (stopUrl !== $content.attr('data-stop-url')) {
				return;
			}

			if (!e || !e.status || 'success' !== e.status) {
				return;
			}

			setStreaming($content, false);
			lastMessageItem($content).attr('data-stopped', true);
			regenerative($content, true);

		});
	}



	$('.chat-input-stop').click(function() {
		stopStreaming($(this).closest('.chat-content'));
		return false;
	});



	$(document).on('click', '.chat-sidebar-new', function() {

		const $content = $(this).closest('.chat').find('.chat-content');

		regenerative($content, false);
		setStreaming($content, false);
		resetChatMessages($content);
		resetChatInput($content);

		$(this).closest('.chat-sidebar').find('.chat-sidebar-item').removeClass('chat-sidebar-selected').removeClass('chat-sidebar-loading');

		return false;
	});



	$(document).on('click', '.chat-sidebar-item', function() {

		const $content = $(this).closest('.chat').find('.chat-content');

		regenerative($content, false);
		setStreaming($content, false);
		resetChatInput($content);

		$(this).closest('.chat-sidebar-list').find('.chat-sidebar-item').removeClass('chat-sidebar-selected').removeClass('chat-sidebar-loading');
		$(this).addClass('chat-sidebar-loading');

		enableInputButton($content, false);
		loadChat($content, $(this).attr('data-chat-id'));

		return false;
	});



	$(document).on('click', '.chat-sidebar-item span', function(e) {

		e.stopPropagation();

		const $content = $(this).closest('.chat').find('.chat-content');

		setStreaming($content, false);
		resetChatMessages($content);
		resetChatInput($content);

		const $item = $(this).closest('.chat-sidebar-item');
		const chatId = $item.attr('data-chat-id');
		$item.remove();
		removeChat(chatId);

		return false;

	});



	function resetChatMessages($content) {

		$content.find('.chat-messages').html('');

		$content.removeAttr('data-watermark')
				.removeAttr('data-conversation-id')
				.removeAttr('data-status-url')
				.removeAttr('data-from-status-url')
				.removeAttr('data-stop-url')
				.removeAttr('data-bearer-token')
				.removeClass('chat-awaiting');

		enableInputButton($content, false);
	}



	function resetChatInput($content) {
		$input = $content.find('.chat-input textarea');
		$input.val('').focus();
		unreadyInputButton($input);
	}



	function loadChat($content, chatId) {

		const watermarkId = watermark($content);

		$content.addClass('chat-content-loading');

		const data = {
			action	: 'chat',
			user_id	: userId,
			chat_id	: chatId,
		};

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!watermark($content, watermarkId)) {
				return;
			}

			if (!e || !e.status_url) {
				$content.removeClass('chat-content-loading');
				return;
			}

			loadChatJson($content, chatId, e.status_url, e.bearer_token, e.from_bearer_token);

		}).fail(function() {
			$content.removeClass('chat-content-loading');
		});

	}



	function loadChatJson($content, chatId, statusUrl, bearerToken, fromBearerToken) {

		const watermarkId = watermark($content);

		$content.attr('data-conversation-id', chatId);
		$content.attr('data-status-url', statusUrl);
		$content.attr('data-bearer-token', bearerToken || '');
		$content.removeAttr('data-stop-url');

		$.ajax({
			url: statusUrl,
			beforeSend: function(xhr) {
				if (bearerToken) {
					xhr.setRequestHeader('Authorization', 'Bearer ' + bearerToken);
				}
			}

		}).done(function(e) {

			if (!watermark($content, watermarkId)) {
				return;
			}

			onLoadChatJson(e, $content, chatId, fromBearerToken);

		}).always(function() {

			if (!watermark($content, watermarkId)) {
				return;
			}

			$content.removeClass('chat-content-loading');
			streaming || enableInputButton($content, true);
		});
	}



	function onLoadChatJson(e, $content, chatId, fromBearerToken) {

		if (!e || !e.status) {
			return;
		}

		if (!e.parameters ||
			!e.parameters.messages ||
			!e.parameters.messages.length) {
			return;
		}

		const fromStatusUrl = e.endpoints && e.endpoints.from_status_url ? e.endpoints.from_status_url : '';
		$content.attr('data-from-status-url', fromStatusUrl);
		$content.attr('data-from-bearer-token', fromStatusUrl ? fromBearerToken : '');

		$content.closest('.chat').find('.chat-sidebar .chat-sidebar-list .chat-sidebar-item[data-chat-id="' + chatId + '"]').removeClass('chat-sidebar-loading').addClass('chat-sidebar-selected');

		$content.find('.chat-messages').html('');
		$content.find('.chat-messages').scrollTop(0);

		for (const message of e.parameters.messages) {

			if (!message.role || !message.content ||
				!['user', 'assistant'].includes(message.role)) {
				continue;
			}

			const content = '' + message.content.trim();
			if ('' !== content) {

				if ('user' == message.role) {
					lastUserMessage = content;
				}

				const input = prepareOutput(escapeHtml(content), '');
				addMessage($content, input, 'user' == message.role ? 'input' : 'output');
			}
		}

		if (['done', 'stop', 'streaming'].includes(e.status) &&
			e.response &&
			e.response.body &&
			e.response.body.choices &&
			e.response.body.choices[0].message &&
			e.response.body.choices[0].message.content) {

			const content = '' + e.response.body.choices[0].message.content;
			if ('' !== content) {
				const output = prepareOutput(escapeHtml(content), '');
				addMessage($content, output, 'output');
			}
		}

		regenerative($content, true);
	}



	function removeChat(chatId) {
		$.post(chatConfig.serverUrl, {
			action	: 'remove',
			user_id	: userId,
			chat_id	: chatId
		});
	}



	function chats() {

		$('.chat').each(function() {

			const $chat = $(this);
			$chat.find('.chat-sidebar-list').addClass('chat-sidebar-list-loading');

			const data = {
				action	: 'chats',
				user_id	: userId
			};

			$.post(chatConfig.serverUrl, data, function(e) {

				if (!e || !e.chats || !e.chats.length) {
					return;
				}

				for (item of e.chats) {
					addChatList($chat, item.chat_id, item.title, false);
				}

			}).always(function() {
				$chat.find('.chat-sidebar-list').removeClass('chat-sidebar-list-loading');
			});

		});

	}



	function watermark($content, watermarkId) {

		if (watermarkId) {
			return watermarkId === parseInt($content.attr('data-watermark'), 10);
		}

		const watermarkNow = new Date().getTime();
		$content.attr('data-watermark', watermarkNow);
		return watermarkNow;
	}



	function getUserId() {
		const userId = getCookie('user_id');
		return userId ? userId : setUserId();
	}



	function setUserId() {
		const userId = uniqueId();
		setCookie('user_id', userId);
		return userId;
	}



	function uniqueId() {
		return stringId() + stringId();
	}



	function stringId() {
		const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
		return uint32.toString(16);
	}



	function getCookie(name) {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
	}



	function setCookie(name, value) {
		document.cookie = name + '=' + value + '; expires=' + cookieDate() + ';path=/';
	}



	function cookieDate() {
		const d = new Date();
		d.setFullYear(d.getFullYear() + 1);
		return d.toGMTString();
	}



	userId = getUserId();

	chats();



});