<?php

@require_once __DIR__.'/config.php';



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

	if ('title' == $_POST['action']) {
		updateChatTitle();
		return;
	}

	if ('remove' == $_POST['action']) {
		removeChat();
		return;
	}

	if ('chats' == $_POST['action']) {
		chats();
		return;
	}

}



/**
 * Streaming
 */



function streamRequest() {
	$userId		= trim($_POST['user_id']);
	$chatId 	= trim($_POST['chat_id']);
	$message 	= trim($_POST['message']);
	$statusUrl 	= empty($_POST['status_url']) ? null  : $_POST['status_url'];
	streamRequestOutput($userId, $chatId, $message, $statusUrl);
}



function streamRequestOutput($userId, $chatId, $message, $statusUrl) {
	header('Content-Type: application/json');
	echo json_encode(streamRequestData($userId, $chatId, $message, $statusUrl));
	die;
}



function streamRequestData($userId, $chatId, $message, $statusUrl) {

	$args = [
		'messages'  => json_encode([
			['role' => 'user', 'content' => $message],
		]),
	];

	if (!empty($statusUrl)) {
		$args['from_status_url'] = $statusUrl;
	}

	return [
		'user_id'		=> $userId,
		'chat_id'		=> $chatId,
		'status_url'	=> $statusUrl,
		'response'		=> remoteRequest($args, '/stream-chatgpt'),
	];
}



/**
 * Remote requests
 */



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
		CURLOPT_URL				=> 'https://offloadchatgpt.microdeploy.com/v1'.$endpoint,
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



/**
 * Save or update chat
 */



function saveChat() {
	$userId 	= empty($_POST['user_id'])		? null : $_POST['user_id'];
	$chatId 	= empty($_POST['chat_id'])		? null : $_POST['chat_id'];
	$message	= empty($_POST['message'])		? null : $_POST['message'];
	$statusUrl 	= empty($_POST['status_url'])	? null : $_POST['status_url'];
	saveChatResponse($userId, $chatId, $message, $statusUrl);
}



function saveChatResponse($userId, $chatId, $message, $statusUrl) {
	header('Content-Type: application/json');
	echo json_encode(saveChatData($userId, $chatId, $message, $statusUrl));
	die;
}



function saveChatData($userId, $chatId, $message, $statusUrl) {

	if (empty($userId) ||
		empty($chatId) ||
		empty($statusUrl) ||
		empty($message)) {
		return null;
	}

	$data = loadUserData($userId);

	$titleStatusUrl = null;

	if (!isset($data[$chatId])) {

		$data[$chatId] = [
			'created'	=> time(),
			'updated'	=> time(),
			'title'		=> chatTitleFallback($message),
			'prompt'	=> $message,
		];

		$titleStatusUrl = chatTitleStatusUrl($message);
	}

	$data[$chatId]['updated'] = time();
	$data[$chatId]['status_url'] = $statusUrl;

	if (!saveUserData($userId, $data)) {
		return null;
	}

	return [
		'user_id'			=> $userId,
		'chat_id'			=> $chatId,
		'title'				=> $data[$chatId]['title'],
		'title_status_url'	=> $titleStatusUrl,
	];
}



/**
 * Update chat title
 */



function updateChatTitle() {
	$userId = empty($_POST['user_id'])	? null : $_POST['user_id'];
	$chatId = empty($_POST['chat_id'])	? null : $_POST['chat_id'];
	$title	= empty($_POST['title'])	? null : $_POST['title'];
	updateChatTitleResponse($userId, $chatId, $title);
}



function updateChatTitleResponse($userId, $chatId, $title) {
	header('Content-Type: application/json');
	echo json_encode(updateChatTitleData($userId, $chatId, $title));
	die;
}



function updateChatTitleData($userId, $chatId, $title) {

	if (empty($userId) ||
		empty($chatId) ||
		empty($title)) {
		return null;
	}

	$data = loadUserData($userId);

	if (!isset($data[$chatId])) {
		return null;
	}

	$titleNew = prepareChatTitle($title);

	if (!empty($titleNew)) {
		$data[$chatId]['title'] = $titleNew;
		if (!saveUserData($userId, $data)) {
			return null;
		}
	}

	return ['title' => empty($titleNew)? $data[$chatId]['title'] : $titleNew];
}



function chatTitleStatusUrl($message) {

	$request = chatTitleRequest($message);
	if (empty($request) || !is_array($request)) {
		return null;
	}

	if (empty($request['endpoints']) ||
		empty($request['endpoints']['status_url'])) {
		return null;
	}

	return $request['endpoints']['status_url'];
}



function chatTitleRequest($message) {

	$args = [
		'messages'  => json_encode([
			['role' => 'system', 'content' => 'Summarize the following user text in 3 to 5 words in the same language: "'.str_replace('"', '', $message).'"'],
		]),
	];

	return remoteRequest($args, '/async-chatgpt');
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



/**
 * Remove chat
 */



function removeChat() {
	$userId = empty($_POST['user_id'])	? null : $_POST['user_id'];
	$chatId = empty($_POST['chat_id'])	? null : $_POST['chat_id'];
	removeChatResponse($userId, $chatId);
}



function removeChatResponse($userId, $chatId) {
	header('Content-Type: application/json');
	echo json_encode(removeChatData($userId, $chatId));
	die;
}



function removeChatData($userId, $chatId) {

	if (empty($chatId)) {
		return null;
	}

	$data = loadUserData($userId);
	if (!isset($data[$chatId])) {
		return 0;
	}

	unset($data[$chatId]);
	if (!saveUserData($userId, $data)) {
		return null;
	}

	return 1;
}



/**
 * User chat list
 */



function chats() {
	$userId = empty($_POST['user_id']) ? null : $_POST['user_id'];
	header('Content-Type: application/json');
	echo json_encode(chatsData($userId));
	die;
}



function chatsReponse($userId) {
	return chatsData($userId);
}



function chatsData($userId) {
	$data = loadUserData($userId);
	return ['chats' => chatsDataItems($data)];
}



function chatsDataItems($data) {

	$items = [];

	if (empty($data)) {
		return $items;
	}

	foreach ($data as $chatId => $info) {

		if (empty($chatId) ||
			empty($info['title']) ||
			empty($info['status_url'])) {
			continue;
		}

		$title = prepareChatTitle($info['title']);
		if ('' === $title) {
			continue;
		}

		$items[] = [
			'chat_id'		=> $chatId,
			'title'			=> $title,
			'status_url'	=> $info['status_url']
		];
	}

	return array_reverse($items);
}



function prepareChatTitle($title) {

	$chars = [
		null,
		'"',
		null,
		"'",
		null,
		'"',
		null,
		"'",
		'.',
		':',
		'.',
		':',
		'.',
	];

	foreach ($chars as $char) {
		$title = isset($char) ? trim($title, $char) : trim($title);
	}

	return $title;
}



/**
 * User data functions
 */



function loadUserData($userId) {
	$data = @json_decode(@file_get_contents(userDataPath()), true);
	return empty($data) || !is_array($data) ? [] : $data;
}



function saveUserData($userId, $data) {
	$json = @json_encode($data, JSON_UNESCAPED_SLASHES);
	return empty($json) ? null : @file_put_contents(userDataPath(), $json);
}



function userDataPath() {
	global $userId;
	return __DIR__.'/data/'.$userId.'.json';
}



postRequest();