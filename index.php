<?php include __DIR__.'/server.php';?><!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Offload ChatGPT Streaming Demo</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="./style.css">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet">
</head>
<body>

<?php if (!defined('OPENAI_API_KEY') || !defined('OFFLOAD_CHATGPT_API_KEY')) : ?>

	<p style="background-color: red; color: white">Please provide your API Keys from the config.php file.</p>

<?php else : ?>

	<div class="chat-wrapper">

		<div class="chat">

			<div class="chat-inner">

				<div class="chat-sidebar">

					<div class="chat-sidebar-new">New Chat</div>

					<div class="chat-sidebar-list"></div>

				</div>

				<div class="chat-content">

					<div class="chat-messages"></div>

					<div class="chat-loading"><span></span><div></div></div>

					<form class="chat-input">

						<div class="chat-input-inner">

							<div class="chat-input-text">

								<textarea rows="1" data-rows-max="15" autofocus require placeholder="Enter your message..."></textarea>

								<button type="submit"><svg width="24" height="24" viewBox="0 0 24.00 24.00" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.8160000000000001"></g><g id="SVGRepo_iconCarrier"> <path d="M20 4L3 11L10 14M20 4L13 21L10 14M20 4L10 14" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>

							</div>

						</div>

					</form>

				</div>

			</div>

		</div>

	</div>

	<script src="https://code.jquery.com/jquery-3.6.4.min.js" integrity="sha256-oP6HI9z1XaZNBrJURtCoUT5SUnxFr8s3BzRl+cbzUq8=" crossorigin="anonymous"></script>
	<script src="./client.js"></script>

<?php endif; ?>

</body>
</html>