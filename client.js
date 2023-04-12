$(function() {



	let streaming = false;
	let autoscroll = false;
	let lastScroll = false;
	let lastScrollDiv = false;



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

		readyInputButton($(this));
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

		streaming = true;

		$input.val('');
		$input.css('height', inputHeight + 'px');
		readyInputButton($input);

		$content = $form.closest('.chat-content');

		enableInputButton($content, false);
		const input = prepareOutput(escapeHtml(message), '');
		const $div = addMessage($content, input, 'input');
		$div.addClass('chat-messages-input-wait');

		autoscroll = true;
		scrollBottom($content);

		sendMessage($content, $div, message);

/* // Debug point
blinkEnd(addMessage($content, message, 'output')); */
	}



	function addMessage($content, message, type) {
		const html = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-messages-icon"></div><div class="chat-messages-text">' + message + '</div></div>';
		$content.find('.chat-messages').append(html);
		return lastMessage($content);
	}



	function lastMessage($content) {
		return $content.find('.chat-messages .chat-messages-item').last();
	}



	function sendMessage($content, $old, message) {

		const chatId = $content.attr('data-chat-id');

		const data = {
			action		: 'stream',
			chat_id		: chatId,
			message		: message,
			status_url	: $content.attr('data-status-url')
		};

		const $input = $content.find('.chat-input-text textarea');

		$.post('/server.php', data, function(e) {

			if (!streaming) {
				return;
			}

			if (!e || !e.response || !e.response.status) {
				streaming = false;
				readyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			if ('success' != e.response.status) {
				streaming = false;
				readyInputButton($input);
				enableInputButton($content, true);
				return;
			}

			let newChat = false;
			if (!chatId) {
				newChat = true;
				$content.attr('data-chat-id', e.chat_id);
			}

			statusUrl = e.response.endpoints.status_url;

			$old.removeClass('chat-messages-input-wait');
			const $div = addMessage($content, squareCursor(true), 'output');
			$content.attr('data-status-url', statusUrl);
			scrollBottom($content);

			streamMessages($content, $div, $input, e.response.endpoints.stream_events_url);

			saveChat($content, message, newChat);

		}).fail(function(e) {
			console.log(e);
			streaming = false;
			readyInputButton($input);
			enableInputButton($content, true);
		});

	}



	function streamMessages($content, $div, $input, url) {

		let html = '';

		const eventSource = new EventSource(url);

		eventSource.onmessage = function(e) {

			if (!streaming) {
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

			const obj = JSON.parse(e.data);
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

			if (choice.finish_reason &&
				'length' == choice.finish_reason) {
				streamMessagesEnd($content, $div, $input, eventSource, html);
			}
		}

		eventSource.onerror = function(e) {
			console.log(e);
			streamMessagesEnd($content, $div, $input, eventSource, html);
		}

	}



	function streamMessagesEnd($content, $div, $input, eventSource, html) {
		streaming = false;
		eventSource.close();
		$div.find('.chat-messages-text').html(prepareOutput(html, ''));
		blinkEnd($div);
		readyInputButton($input);
		enableInputButton($content, true);
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
		const $button = $content.find('.chat-input button[type="submit"]');
		enable ? $button.removeAttr('disabled') : $button.attr('disabled', 'disabled');
	}



	function readyInputButton($input) {
		streaming || '' === $input.val().trim()
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
			const div = $content.find('.chat-messages')[0];
			div.scrollTop = div.scrollHeight;
			lastScroll = div.scrollTop;
			lastScrollDiv = div;
		}
	}



	$('.chat-messages').scroll(function() {

		if (false === lastScroll ||
			false == lastScrollDiv) {
			return;
		}

		autoscroll = autoscroll
			? (lastScrollDiv.scrollTop === lastScroll)
			: streaming && (lastScrollDiv.scrollTop === lastScrollDiv.scrollHeight)

	});



	$(window).resize(function() {
		$('.chat').each(function() {
			const height = $(this).find('.chat-content').outerHeight() - $(this).find('.chat-input').height();
			$(this).find('.chat-messages').height(height > 0 ? height : 0);
		});
	}).resize();



	function saveChat($content, message, newChat) {

		const data = {
			action		: 'save',
			message		: message,
			chat_id		: $content.attr('data-chat-id'),
			status_url	: $content.attr('data-status-url')
		};

		$.post('/server.php', data, function(e) {

			if (!e || !newChat) {
				return;
			}

			if (e.title) {
				addChatList($content.closest('.chat'), data.chat_id, e.title, true);
				return;
			}

			if (e.title_status_url) {
				waitForChatTitleUrl($content, data.chat_id, e.title_status_url);
			}

		});
	}



	function updateChatTitle($content, chatId, title) {

		const data = {
			action		: 'title',
			chat_id		: chatId,
			title		: title,
		};

		$.post('/server.php', data, function(e) {
			if (e && e.title) {
				addChatList($content.closest('.chat'), chatId, e.title, true);
			}
		});
	}



	function addChatList($chat, chatId, title, prepend) {
		const $list = $chat.find('.chat-sidebar .chat-sidebar-list');
		const html = ('<div class="chat-sidebar-item" data-chat-id="' + chatId + '">' + escapeHtml(title)) + '</div>';
		prepend ? $list.prepend(html) : $list.append(html);
	}



	function waitForChatTitleUrl($content, chatId, titleStatusUrl) {
		setTimeout(fetchTitleUrl, 1000, $content, chatId, titleStatusUrl);
	}



	function fetchTitleUrl($content, chatId, titleStatusUrl) {

		$.get(titleStatusUrl, function(e) {

			if (!e || !e.status || 'error' == e.status) {
				updateChatTitle($content, chatId, null);
				return;
			}

			if ('done' != e.status) {
				waitForChatTitleUrl($content, chatId, titleStatusUrl);
				return;
			}

			if (!e.response ||
				!e.response.body ||
				!e.response.body.choices ||
				!e.response.body.choices[0].message ||
				!e.response.body.choices[0].message.content) {
				updateChatTitle($content, chatId, null);
			}

			updateChatTitle($content, chatId, e.response.body.choices[0].message.content);

		});
	}



	$(document).on('click', '.chat-sidebar-new', function() {

		streaming = false;

		const $content = $(this).closest('.chat').find('.chat-content');
		$content.find('.chat-messages').html('');
		$content.removeAttr('data-chat-id').removeAttr('data-status-url');
		enableInputButton($content, false);

		$input = $content.find('.chat-input textarea');
		$input.val('').focus();
		readyInputButton($input);

		return false;
	});



	function chats() {

		$('.chat').each(function() {

			const $chat = $(this);
			$chat.find('.chat-sidebar-list').addClass('chat-sidebar-list-loading');

			$.post('/server.php', { action: 'chats' }, function(e) {

				$chat.find('.chat-sidebar-list').removeClass('chat-sidebar-list-loading');

				if (!e || !e.chats || !e.chats.length) {
					return;
				}

				for (item of e.chats) {
					addChatList($chat, item.chat_id, item.title, false);
				}

			});

		});

	}



	chats();



});