<?php

@require_once __DIR__.'/config.php';



function checkUser() {

	global $userId;

	if (!empty($_COOKIE['user_id'])) {
		$userId = $_COOKIE['user_id'];
		return;
	}

	$userId = uniqid();

	setCookie(
		'user_id',
		$userId,
		time() + (10 * 365 * 24 * 60 * 60)
	);
}




function postRequest() {

	if (!empty($_POST['message'])) {
		streamRequest();
		return;
	}

	if (empty($_POST['action'])) {
		return;
	}

	if ('save' == $_POST['action']) {
		saveChat();
	}
}



function streamRequest() {
	$message 	= trim($_POST['message']);
	$chatId 	= empty($_POST['chat_id']) ? uniqid() : $_POST['chat_id'];
	$statusUrl 	= empty($_POST['status_url']) ? null  : $_POST['status_url'];
	streamRequestOutput($chatId, $message, $statusUrl);
}



function streamRequestOutput($chatId, $message, $statusUrl) {
	header('Content-Type: application/json');
	echo json_encode(streamRequestData($chatId, $message, $statusUrl));
	die;
}



function streamRequestData($chatId, $message, $statusUrl) {
	return [
		'chat_id'  => $chatId,
		'response' => remoteRequest($message, $statusUrl),
	];
}



function remoteRequest($message, $statusUrl = null) {

	set_time_limit(60);

	try {
		$curl = curl_init();
		curl_setopt_array($curl, remoteRequestOptions($message, $statusUrl));
		$response = curl_exec($curl);
		curl_close($curl);
		return json_decode($response, true);

	} catch(Exception $e) {
		error_log($e->getMessage());
	}

	return false;
}



function remoteRequestOptions($message, $statusUrl) {
	return [
		CURLOPT_URL				=> 'https://asyncapi.microdeploy.com/v1/stream-chatgpt',
		CURLOPT_RETURNTRANSFER	=> true,
		CURLOPT_MAXREDIRS		=> 3,
		CURLOPT_TIMEOUT			=> 60,
		CURLOPT_FOLLOWLOCATION	=> true,
		CURLOPT_HTTP_VERSION	=> CURL_HTTP_VERSION_1_1,
		CURLOPT_CUSTOMREQUEST	=> 'POST',
		CURLOPT_POSTFIELDS		=> http_build_query(remoteRequestOptionsArgs($message, $statusUrl)),
	];
}



function remoteRequestOptionsArgs($message, $statusUrl) {

	$args = [
		'api_key'	=> OPENAI_API_KEY,
		'messages'	=> json_encode([
			['role' => 'user', 'content' => $message],
		]),
	];

	if (!empty($statusUrl)) {
		$args['from_status_url'] = $statusUrl;
	}

	return $args;
}



function saveChat() {
	$chatId 	= empty($_POST['chat_id'])		? null : $_POST['chat_id'];
	$statusUrl 	= empty($_POST['status_url'])	? null : $_POST['status_url'];
	saveChatResponse($chatId, $statusUrl);
}



function saveChatResponse($chatId, $statusUrl) {
	header('Content-Type: application/json');
	echo json_encode(saveChatData($chatId, $statusUrl));
	die;
}



function saveChatData($chatId, $statusUrl) {

	if (empty($chatId) || empty($statusUrl)) {
		return null;
	}

	$data = loadUserData();
	$data[$chatId] = $statusUrl;
	return saveUserData($data);
}



function loadUserData() {
	$data = @json_decode(@file_get_contents(userDataPath()), true);
	return empty($data) || !is_array($data) ? [] : $data;
}



function saveUserData($data) {
	$json = @json_encode($data, JSON_UNESCAPED_SLASHES);
	return empty($json) ? 0 : @file_put_contents(userDataPath(), $json);
}



function userDataPath() {
	global $userId;
	return __DIR__.'/data/'.$userId.'.json';
}



checkUser();
postRequest();
