<?php include __DIR__.'/server.php';?><!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Offload ChatGPT Streaming Demo</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="./style.css">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>

<div class="chat-wrapper">

	<div class="chat">

		<div class="chat-inner">

			<div class="chat-sidebar">

			</div>

			<div class="chat-content" data-id="">

				<div class="chat-messages"></div>

				<form class="chat-input">

					<div class="chat-input-inner">

						<div class="chat-input-text">

							<textarea rows="1" data-rows-max="15" autofocus require placeholder="Enter your message..."></textarea>

							<button type="submit"><i class="fa-sharp fa-solid fa-paper-plane"></i></button>

						</div>

					</div>

				</form>

			</div>

		</div>

	</div>

</div>

<script src="https://code.jquery.com/jquery-3.6.4.min.js" integrity="sha256-oP6HI9z1XaZNBrJURtCoUT5SUnxFr8s3BzRl+cbzUq8=" crossorigin="anonymous"></script>
<script src="./client.js"></script>

</body>
</html>