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

	if (empty($_POST['action'])) {
		return;
	}

	if ('stream' == $_POST['action']) {
		streamRequest();
		return;
	}

	if ('save' == $_POST['action']) {
		saveChat();
		return;
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

	$args = [
		'messages'  => json_encode([
			['role' => 'user', 'content' => $message],
		]),
	];

	if (!empty($statusUrl)) {
		$args['from_status_url'] = $statusUrl;
	}

	return [
		'chat_id'  => $chatId,
		'response' => remoteRequest($args, '/stream-chatgpt'),
	];
}



function remoteRequest($args, $endpoint) {

	set_time_limit(60);

	try {
		$curl = curl_init();
		curl_setopt_array($curl, remoteRequestOptions($args, $endpoint));
		$response = curl_exec($curl);
		curl_close($curl);
		return json_decode($response, true);

	} catch(Exception $e) {
		error_log($e->getMessage());
	}

	return false;
}


function remoteRequestOptions($args, $endpoint) {
	return [
		CURLOPT_URL				=> 'https://asyncapi.microdeploy.com/v1'.$endpoint,
		CURLOPT_RETURNTRANSFER	=> true,
		CURLOPT_MAXREDIRS		=> 3,
		CURLOPT_TIMEOUT			=> 60,
		CURLOPT_FOLLOWLOCATION	=> true,
		CURLOPT_HTTP_VERSION	=> CURL_HTTP_VERSION_1_1,
		CURLOPT_CUSTOMREQUEST	=> 'POST',
		CURLOPT_POSTFIELDS		=> http_build_query(remoteRequestOptionsArgs($args)),
	];
}



function remoteRequestOptionsArgs($args = []) {
	return array_merge($args, [
		'api_key' => OPENAI_API_KEY,
	]);
}



function saveChat() {
	$chatId 	= empty($_POST['chat_id'])		? null : $_POST['chat_id'];
	$message	= empty($_POST['message'])		? null : $_POST['message'];
	$statusUrl 	= empty($_POST['status_url'])	? null : $_POST['status_url'];
	saveChatResponse($chatId, $message, $statusUrl);
}



function saveChatResponse($chatId, $message, $statusUrl) {
	header('Content-Type: application/json');
	echo json_encode(saveChatData($chatId, $message, $statusUrl));
	die;
}



function saveChatData($chatId, $message, $statusUrl) {

	if (empty($chatId) || empty($statusUrl) || empty($message)) {
		return null;
	}

	$data = loadUserData();

	if (!isset($data[$chatId])) {
		$data[$chatId] = ['title' => chatTitle($message)];
	}

	$data[$chatId]['status_url'] = $statusUrl;

	if (!saveUserData($data)) {
		return null;
	}

	return [
		'chat_id' => $chatId,
		'title'	  => $data[$chatId]['title'],
	];
}



function loadUserData() {
	$data = @json_decode(@file_get_contents(userDataPath()), true);
	return empty($data) || !is_array($data) ? [] : $data;
}



function saveUserData($data) {
	$json = @json_encode($data, JSON_UNESCAPED_SLASHES);
	return empty($json) ? null : @file_put_contents(userDataPath(), $json);
}



function userDataPath() {
	global $userId;
	return __DIR__.'/data/'.$userId.'.json';
}



function chatTitle($message) {
	$title = chatTitleData(chatTitleRequest($message));
	return empty($title) ? chatTitleFallback($message) : $title;
}



function chatTitleData($data) {

	if (empty($data) || !is_array($data)) {
		return null;
	}

	if (empty($data['choices'])) {
		return null;
	}

	if (empty($data['choices'][0]['message'])) {
		return null;
	}

	if (empty($data['choices'][0]['message']['content'])) {
		return null;
	}

	$content = trim($data['choices'][0]['message']['content']);

	$lines = array_map('trim', explode("\n", $content));
	foreach ($lines as $line) {
		if ('' !== $line) {
			return $line;
		}
	}

	return $content;
}



function chatTitleRequest($message) {

	$args = [
		'messages'  => json_encode([
			['role' => 'system', 'content' => 'Summarize the following user text in 3 to 5 words in the same language of the user.'],
			['role' => 'user', 	 'content' => $message],
		]),
	];

	return remoteRequest($args, '/sync-chatgpt');
}



function chatTitleFallback($message) {

	$parts = array_map('trim', explode(' ', $message));

	foreach ($parts as $part) {
		if ('' !== $part) {
			$output[] = $part;
			if (count($output) >= 4) {
				break;
			}
		}
	}

	return implode(' ', $output);
}



checkUser();
postRequest();