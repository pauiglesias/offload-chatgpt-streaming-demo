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
		$button.attr('disabled', 'disabled');

		addMessage($form, message, 'input');
		sendMessage($form, message);
	}



	function addMessage($form, message, type) {
		const div = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-text">' + message + '</div></div>';
		$form.closest('.chat-content').find('.chat-messages').append(div);
	}



	function sendMessage($form, message) {

		const data = {
			chat_id: $form.closest('.chat-content').attr('data-id'),
			message: message
		};

		$.post('/server.php', data, function(e) {
			console.log(e);

		}).fail(function(e) {
			console.log(e);
		});
	}



});