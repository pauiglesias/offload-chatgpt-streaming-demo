<?php include __DIR__.'/server.php';?><!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Offload ChatGPT Streaming Demo</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="./style.css">
</head>
<body>

<div class="chat-wrapper">

	<div class="chat">

		<div class="chat-sidebar">

		</div>

		<div class="chat-content" data-id="">

			<div class="chat-messages">

			</div>

			<form class="chat-input">

				<div class="chat-input-text">
					<textarea placeholder="Enter your message..." require></textarea>
				</div>

				<button type="submit">Send</button>

			</form>

		</div>

	</div>

</div>

<script src="https://code.jquery.com/jquery-3.6.4.slim.min.js" integrity="sha256-a2yjHM4jnF9f54xUQakjZGaqYs/V1CYvWpoqZzC2/Bw=" crossorigin="anonymous"></script>
<script src="./client.js"></script>

</body>
</html>