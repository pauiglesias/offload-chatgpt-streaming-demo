<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Offload ChatGPT Streaming Demo</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="./style.css">
</head>
<body>

<section class="msger">

    <header class="msger-header">
        <div class="msger-header-title">
            <i class="fas fa-comment-alt"></i> ChatGPT
            &nbsp;| ID: <input type="text" id="id" hidden> <span class="id_session"></span>
        </div>
        <div class="msger-header-options">
            <button id="delete-button">Delete History</button>
        </div>
    </header>

    <main class="msger-chat">
    </main>

    <form class="msger-inputarea">
        <input class="msger-input" placeholder="Enter your message..." require>
        <button type="submit" class="msger-send-btn">Send</button>
    </form>

</section>

<script src="./script.js"></script>

</body>
</html>