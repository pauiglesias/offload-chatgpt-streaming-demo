<?php



function postRequest() {

	if (!empty($_POST['message'])) {
		streamRequest();
		return;
	}
}



function streamRequest() {
	$message = trim($_POST['message']);
	$chatId = empty($_POST['chat_id']) ? uniqid() : $_POST['chat_id'];
	//$fromStatusUrl = '';
	streamRequestOutput($chatId, $message);
}



function streamRequestOutput($chatId, $message) {
	header('Content-Type: application/json');
	echo json_encode(streamRequestData($chatId, $message));
	die;
}



function streamRequestData($chatId, $message) {
	return [
		'chat_id'  => $chatId,
		'response' => remoteRequest($message),
	];
}



function remoteRequest($message, $fromStatusUrl = null) {

	try {
		$curl = curl_init();
		curl_setopt_array($curl, remoteRequestOptions($message, $fromStatusUrl));
		$response = curl_exec($curl);
		curl_close($curl);
		return $response;

	} catch(Exception $e) {
		error_log($e->getMessage());
	}

	return false;
}



function remoteRequestOptions($message, $fromStatusUrl) {
	return [
		CURLOPT_URL				=> 'https://asyncapi.microdeploy.com/v1/stream-chatgpt',
		CURLOPT_RETURNTRANSFER	=> true,
		CURLOPT_MAXREDIRS		=> 3,
		CURLOPT_TIMEOUT			=> 60,
		CURLOPT_FOLLOWLOCATION	=> true,
		CURLOPT_HTTP_VERSION	=> CURL_HTTP_VERSION_1_1,
		CURLOPT_CUSTOMREQUEST	=> 'POST',
		CURLOPT_POSTFIELDS		=> http_build_query(remoteRequestOptionsArgs($message, $fromStatusUrl)),
	];
}



function remoteRequestOptionsArgs($message, $fromStatusUrl) {

	$args = [
		'api_key'	=> getenv('OPENAI_API_KEY'),
		'messages'	=> json_encode(['role' => 'user', 'content' => $message]),
	];

	return $args;
}



postRequest();