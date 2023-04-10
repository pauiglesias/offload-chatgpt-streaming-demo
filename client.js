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

		$input = $form.find('textarea');

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
		const $div = addMessage($content, message, 'input');
		$div.addClass('chat-messages-input-wait');

		autoscroll = true;
		scrollBottom($content);

		sendMessage($content, $div, message);

/* // Debug point
blinkEnd(addMessage($content, message, 'output')); */
	}



	function addMessage($content, message, type) {
		const html = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-messages-text">' + message + '</div></div>';
		$content.find('.chat-messages').append(html);
		return lastMessage($content);
	}



	function lastMessage($content) {
		return $content.find('.chat-messages .chat-messages-item').last();
	}



	function sendMessage($content, $old, message) {

		const chatId = $content.attr('data-id');

		const data = {
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

			if (!chatId) {
				$content.attr('data-id', e.chat_id);
			}

			$old.removeClass('chat-messages-input-wait');
			const $div = addMessage($content, squareCursor(true), 'output');
			$content.attr('data-status-url', e.response.endpoints.status_url);
			scrollBottom($content);

			streamMessages($content, $div, $input, e.response.endpoints.stream_events_url);

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
				html += prepareOutput(txt);
				$div.html(html + squareCursor());
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
		$div.html(html);
		blinkEnd($div);
		readyInputButton($input);
		enableInputButton($content, true);
	}



	function prepareOutput(txt) {
		return txt.replace(/(?:\r\n|\r|\n)/g, '<br>');
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



});