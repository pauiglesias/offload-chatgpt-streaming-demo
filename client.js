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

		addMessage(message, $form, 'input');
	}



	function addMessage(message, $form, type) {
		const div = '<div class="chat-messages-item chat-messages-' + type + '"><div class="chat-text">' + message + '</div></div>';
		$form.closest('.chat-content').find('.chat-messages').append(div);
	}



});