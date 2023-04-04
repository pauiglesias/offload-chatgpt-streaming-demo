$(function() {



	$('.chat-input').submit(function() {
		const message = $(this).find('input[type="text"]').val();
		return false;
	});



});