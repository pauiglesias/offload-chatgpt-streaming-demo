$(function() {



	$('.chat-input').submit(function() {
		userMessage($(this));
		return false;
	});



	function userMessage($form) {

		$button = $form.find('button[type="submit"]');
		if ($button.attr('disabled')) {
			return;
		}

		$input = $form.find('textarea');

		const message = $input.val().trim();
		if ('' === message) {
			return;
		}

		$input.val('');
		//$button.attr('disabled', 'disabled');

		$content = $form.closest('.chat-content');

		//addMessage($content, message, 'input');
		//sendMessage($content, message);

// Debug point
blinkEnd(addMessage($content, message, 'output'));
	}



	function addMessage($content, message, type) {
		const html = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-messages-text">' + message + '</div></div>';
		$content.find('.chat-messages').append(html);
		return $content.find('.chat-messages .chat-messages-item').last();
	}



	function sendMessage($content, message) {

		const chatId = $content.attr('data-id');

		const data = {
			chat_id: chatId,
			message: message
		};

		$.post('/server.php', data, function(e) {

			if (!e || !e.response || !e.response.status) {
				return;
			}

			if ('success' != e.response.status) {
				return;
			}

			if (!chatId) {
				$content.attr('data-id', e.chat_id);
			}

			const $div = addMessage($content, '', 'output');
			streamMessages($content, $div, e.response.endpoints.stream_events_url);

		}).fail(function(e) {
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
				enableInput($content);
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
		};

		eventSource.onerror = function (e) {
			console.log(e);
			enableInput($content);
			eventSource.close();
		};
	}



	function blinkEnd($div) {
		$div.addClass('chat-messages-output-end');
	}



	function enableInput($content) {
		$content.find('.chat-input button[type="submit"]').removeAttr('disabled');
	}



});