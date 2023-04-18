$(function() {



	let userId;

	let streaming = false;

	let autoscroll = false;
	let autoscrollDiv = null;

	let prevStatusUrl = '';
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

		const chat = getChat($content);
		const timestampId = timestamp($content);

		const data = {
			action			: 'stream',
			user_id			: userId,
			chat_id			: chat.id,
			message			: message,
			from_status_url	: prevStatusUrl
		};

		const $input = $content.find('.chat-input-text textarea');

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!streaming ||
				!timestamp($content, timestampId)) {
				return;
			}

			if (!e || !e.response || !e.response.status) {
				setStreaming($content, false);
				unreadyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			if ('success' != e.response.status) {
				setStreaming($content, false);
				unreadyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			lastUserMessage = message;
			prevStatusUrl = $content.attr('data-status-url') ? $content.attr('data-status-url') : '';

			chat.new && $content.attr('data-chat-id', chat.id);

			statusUrl = e.response.endpoints.status_url;
			$content.attr('data-status-url', statusUrl);
			$content.attr('data-stop-url', e.response.endpoints.stop_url ? e.response.endpoints.stop_url : '');

			$inputDiv && $inputDiv.removeClass('chat-messages-input-wait');
			const $div = addMessage($content, squareCursor(true), 'output');
			scrollBottom($content);

			saveChat($content, chat.id, statusUrl, message, chat.new);
			streamMessages($content, $div, $input, e.response.endpoints.stream_events_url);

		}).fail(function(e) {
			console.log(e);
			setStreaming($content, false);
			unreadyInputButton($input);
			enableInputButton($content, true);
		});

	}



	function streamMessages($content, $div, $input, url) {

		let html = '';
		const timestampId = timestamp($content);
		const eventSource = new EventSource(url);

		eventSource.onmessage = function(e) {

			if (!streaming ||
				!timestamp($content, timestampId)) {
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
				!timestamp($content, timestampId)) {
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



	function saveChat($content, chatId, statusUrl, message, newChat) {

		const data = {
			action		: 'save',
			user_id		: userId,
			chat_id		: chatId,
			message		: message,
			status_url	: statusUrl,
		};

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!e || !newChat) {
				return;
			}

			if (e.title_status_url) {
				waitForChatTitleUrl($content, data.chat_id, data.status_url, e.title_status_url);
				return;
			}

			if (e.title) {
				addChatList($content.closest('.chat'), data.chat_id, e.title, true);
			}

		});
	}



	function updateChatTitle($content, chatId, statusUrl, title) {

		const data = {
			action		: 'title',
			user_id		: userId,
			chat_id		: chatId,
			title		: title
		};

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!e || !e.title) {
				return;
			}

			addChatList($content.closest('.chat'), chatId, e.title, true);
			$list = $content.closest('.chat').find('.chat-sidebar .chat-sidebar-list');

			if (chatId != $content.attr('data-chat-id') ||
				statusUrl != $content.attr('data-chat-id')) {
				return;
			}

			$list.find('.chat-sidebar-item[data-chat-id="' + chatId + '"]').addClass('chat-sidebar-selected');
			$list.scrollTop(0);

		});
	}



	function addChatList($chat, chatId, title, prepend) {
		const $list = $chat.find('.chat-sidebar .chat-sidebar-list');
		const html = ('<div class="chat-sidebar-item" data-chat-id="' + chatId + '">' + escapeHtml(title)) + '<span></span></div>';
		prepend ? $list.prepend(html) && $list.scrollTop(0) : $list.append(html);
	}



	function waitForChatTitleUrl($content, chatId, statusUrl, titleStatusUrl) {
		setTimeout(fetchTitleUrl, 500, $content, chatId, statusUrl, titleStatusUrl);
	}



	function fetchTitleUrl($content, chatId, statusUrl, titleStatusUrl) {

		if (statusUrl != $content.attr('data-status-url')) {
			return;
		}

		$.get(titleStatusUrl, function(e) {

			if (statusUrl != $content.attr('data-status-url')) {
				return;
			}

			if (!e || !e.status || 'error' == e.status) {
				updateChatTitle($content, chatId, statusUrl, null);
				return;
			}

			if ('done' != e.status) {
				waitForChatTitleUrl($content, chatId, statusUrl, titleStatusUrl);
				return;
			}

			if (!e.response ||
				!e.response.body ||
				!e.response.body.choices ||
				!e.response.body.choices[0].message ||
				!e.response.body.choices[0].message.content) {
				updateChatTitle($content, chatId, statusUrl, null);
			}

			updateChatTitle($content, chatId, statusUrl, e.response.body.choices[0].message.content);

		});
	}



	function stopStreaming($content) {

		const stopUrl = $content.attr('data-stop-url');
		if (!stopUrl) {
			return;
		}

		$.get(stopUrl, function(e) {

			if (!e || !e.status || 'success' !== e.status) {
				return;
			}

			setStreaming($content, false);
			lastMessageItem($content).attr('data-stopped', true);

		});
	}



	$('.chat-input-stop').click(function() {
		stopStreaming($(this).closest('.chat-content'));
		return false;
	});



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

		$content.attr('data-status-url', prevStatusUrl);

		setStreaming($content, true);
		enableInputButton($content, false);
		unreadyInputButton($content.find('.chat-input-text textarea'), true);

		autoscroll = true;
		scrollBottom($content);
		sendMessage($content, $inputDiv, lastUserMessage);
	}



	$('.chat-input-regenerate').click(function() {
		regenerateMessage($(this).closest('.chat-content'));
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
		loadChat($content, $(this).attr('data-chat-id'), $(this).attr('data-status-url'));

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
		$content.removeAttr('data-chat-id').removeAttr('data-status-url').removeAttr('data-stop-url');
		enableInputButton($content, false);
	}



	function resetChatInput($content) {
		$input = $content.find('.chat-input textarea');
		$input.val('').focus();
		unreadyInputButton($input);
	}



	function loadChat($content, chatId) {

		const timestampId = timestamp($content);

		$content.addClass('chat-content-loading');

		const data = {
			action	: 'chat',
			user_id	: userId,
			chat_id	: chatId,
		};

		$.post(chatConfig.serverUrl, data, function(e) {

			if (!timestamp($content, timestampId)) {
				return;
			}

			if (!e || !e.status_url) {
				$content.removeClass('chat-content-loading');
				return;
			}

			loadChatJson($content, chatId, e.status_url);

		}).fail(function() {
			$content.removeClass('chat-content-loading');
		});

	}



	function loadChatJson($content, chatId, statusUrl) {

		const timestampId = timestamp($content);

		$content.attr('data-chat-id', chatId);
		$content.attr('data-status-url', statusUrl);
		$content.removeAttr('data-stop-url');

		$.get(statusUrl, function(e) {

			if (!timestamp($content, timestampId)) {
				return;
			}

			if (chatId != $content.attr('data-chat-id') ||
				statusUrl != $content.attr('data-status-url')) {
				return;
			}

			if (!e || !e.status || !['done', 'stop'].includes(e.status)) {
				return;
			}

			if (!e.parameters ||
				!e.parameters.messages ||
				!e.parameters.messages.length) {
				return;
			}

			prevStatusUrl = statusUrl;
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

			if (e.response &&
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

		}).always(function() {

			if (!timestamp($content, timestampId)) {
				return;
			}

			$content.removeClass('chat-content-loading');
			streaming || enableInputButton($content, true);
		});
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



	function getChat($content) {

		const chat = {
			id  : $content.attr('data-chat-id'),
			new : false
		};

		if (chat.id) {
			return chat;
		}

		return {
			id  : uniqueId(),
			new : true
		};
	}



	function timestamp($content, timestampId) {

		if (timestampId) {
			return timestampId === parseInt($content.attr('data-timestamp'), 10);
		}

		const timestampNow = new Date().getTime();
		$content.attr('data-timestamp', timestampNow);
		return timestampNow;
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