$(function() {



	let streaming = false;



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

		$input.val('');
		$content = $form.closest('.chat-content');

		enableInput($content, false);
		addMessage($content, message, 'input');
		scrollBottom($content);

		sendMessage($content, message);

/* // Debug point
blinkEnd(addMessage($content, message, 'output')); */
	}



	function addMessage($content, message, type) {
		const html = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-messages-text">' + message + '</div></div>';
		$content.find('.chat-messages').append(html);
		return $content.find('.chat-messages .chat-messages-item').last();
	}



	function sendMessage($content, message) {

		streaming = true;

		const chatId = $content.attr('data-id');

		const data = {
			chat_id		: chatId,
			message		: message,
			status_url	: $content.attr('data-status-url')
		};

		$.post('/server.php', data, function(e) {

			if (!e || !e.response || !e.response.status) {
				streaming = false;
				return;
			}

			if ('success' != e.response.status) {
				streaming = false;
				return;
			}

			if (!chatId) {
				$content.attr('data-id', e.chat_id);
			}

			$content.attr('data-status-url', e.response.endpoints.status_url);

			const $div = addMessage($content, '', 'output');
			streamMessages($content, $div, e.response.endpoints.stream_events_url);

		}).fail(function(e) {
			streaming = false;
			console.log(e);
		});
	}



	function streamMessages($content, $div, url) {

		let html = '';
		const eventSource = new EventSource(url);

		eventSource.onmessage = function (e) {

			if (e.data == "[DONE]") {
				eventSource.close();
				blinkEnd($div);
				streaming = false;
				enableInput($content, true);
				return;
			}

			let txt = JSON.parse(e.data).choices[0].delta.content;

			if (undefined === txt) {
				return;
			}

			if ('' === txt) {
				return;
			}

			html += txt.replace(/(?:\r\n|\r|\n)/g, '<br>');
			$div.html(html);

			scrollBottom($content);
		};

		eventSource.onerror = function (e) {
			console.log(e);
			streaming = false;
			enableInput($content, true);
			eventSource.close();
		};
	}



	function blinkEnd($div) {
		$div.addClass('chat-messages-output-end');
	}



	function scrollBottom($content) {
		const div = $content.find('.chat-messages')[0];
		div.scrollTop = div.scrollHeight;
	}



	function enableInput($content, enable) {
		const $button = $content.find('.chat-input button[type="submit"]');
		enable ? $button.removeAttr('disabled') : $button.attr('disabled', 'disabled');
	}



});