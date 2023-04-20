<?php

@require_once __DIR__.'/config.php';



/**
 * Streaming
 */



function streamRequest() {
	$message			= empty($_POST['message'])				? null : $_POST['message'];
	$fromStatusUrl 		= empty($_POST['from_status_url'])		? null : $_POST['from_status_url'];
	$fromBearerToken	= empty($_POST['from_bearer_token'])	? null : $_POST['from_bearer_token'];
	$conversationId	= empty($_POST['conversation_id'])			? null : $_POST['conversation_id'];
	streamRequestOutput($message, $fromStatusUrl, $fromBearerToken, $conversationId);
}



function streamRequestOutput($message, $fromStatusUrl, $fromBearerToken, $conversationId) {
	header('Content-Type: application/json');
	echo json_encode(streamRequestData($message, $fromStatusUrl, $fromBearerToken, $conversationId), JSON_UNESCAPED_SLASHES);
	die;
}



function streamRequestData($message, $fromStatusUrl, $fromBearerToken, $conversationId) {

	if (empty($message)) {
		return null;
	}

	$args = [
		'messages'  => json_encode([
			['role' => 'user', 'content' => $message],
		], JSON_UNESCAPED_SLASHES),
	];

	if (defined('OFFLOAD_CHATGPT_ACCESS')) {
		$args['access'] = OFFLOAD_CHATGPT_ACCESS;
	}

	if (!empty($fromStatusUrl)) {
		$args['from_status_url'] = $fromStatusUrl;
	}

	if (!empty($fromBearerToken)) {
		$args['from_bearer_token'] = $fromBearerToken;
	}

	if (!empty($conversationId)) {
		$args['conversation_id'] = $conversationId;
	}

	return remoteRequest($args, '/stream-chatgpt');
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
	$userId 			= empty($_POST['user_id'])				? null : $_POST['user_id'];
	$chatId 			= empty($_POST['chat_id'])				? null : $_POST['chat_id'];
	$message			= empty($_POST['message'])				? null : $_POST['message'];
	$statusUrl 			= empty($_POST['status_url'])			? null : $_POST['status_url'];
	$bearerToken		= empty($_POST['bearer_token'])			? null : $_POST['bearer_token'];
	$fromBearerToken	= empty($_POST['from_bearer_token'])	? null : $_POST['from_bearer_token'];
	saveChatResponse($userId, $chatId, $message, $statusUrl, $bearerToken, $fromBearerToken);
}



function saveChatResponse($userId, $chatId, $message, $statusUrl, $bearerToken, $fromBearerToken) {
	header('Content-Type: application/json');
	echo json_encode(saveChatData($userId, $chatId, $message, $statusUrl, $bearerToken, $fromBearerToken), JSON_UNESCAPED_SLASHES);
	die;
}



function saveChatData($userId, $chatId, $message, $statusUrl, $bearerToken, $fromBearerToken) {

	if (empty($userId) ||
		empty($chatId) ||
		empty($statusUrl) ||
		empty($message)) {
		return null;
	}

	$data = loadUserData($userId);

	$titleStatusUrl = null;
	$titleBearerToken = null;

	if (!isset($data[$chatId])) {

		$data[$chatId] = [
			'created'	=> time(),
			'updated'	=> time(),
			'title'		=> prepareChatTitle(chatTitleFallback($message)),
		];

		list($titleStatusUrl, $titleBearerToken) = chatTitleStatusUrl($message);
	}

	$data[$chatId]['updated']			= time();
	$data[$chatId]['status_url']		= $statusUrl;
	$data[$chatId]['bearer_token']		= $bearerToken;
	$data[$chatId]['from_bearer_token']	= $fromBearerToken;

	if (!saveUserData($userId, $data)) {
		return null;
	}

	return [
		'user_id'				=> $userId,
		'chat_id'				=> $chatId,
		'title'					=> $data[$chatId]['title'],
		'title_status_url'		=> $titleStatusUrl,
		'title_bearer_token'	=> $titleBearerToken,
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
	echo json_encode(updateChatTitleData($userId, $chatId, $title), JSON_UNESCAPED_SLASHES);
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
		$previousTitle = $data[$chatId]['title'];
		$data[$chatId]['title'] = $titleNew;
		if (!saveUserData($userId, $data)) {
			$data[$chatId]['title'] = $previousTitle;
		}
	}

	return [
		'user_id'	=> $userId,
		'chat_id'	=> $chatId,
		'title'		=> $data[$chatId]['title'],
	];
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

	$bearerToken = empty($request['endpoints']['bearer_token'])
		? null
		: $request['endpoints']['bearer_token'];

	return [
		$request['endpoints']['status_url'],
		$bearerToken
	];
}



function chatTitleRequest($message) {

	$args = [
		'messages'  => json_encode([
			['role' => 'system', 'content' => 'Summarize the following user text in 3 to 5 words in the same language: "'.str_replace('"', '', $message).'"'],
		]),
	];

	if (defined('OFFLOAD_CHATGPT_ACCESS')) {
		$args['access'] = OFFLOAD_CHATGPT_ACCESS;
	}

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
	echo json_encode(removeChatData($userId, $chatId), JSON_UNESCAPED_SLASHES);
	die;
}



function removeChatData($userId, $chatId) {

	if (empty($userId) ||
		empty($chatId)) {
		return null;
	}

	$removed = true;

	$data = loadUserData($userId);
	if (isset($data[$chatId])) {
		unset($data[$chatId]);
		if (!saveUserData($userId, $data)) {
			$removed = false;
		}
	}

	return [
		'user_id'	=> $userId,
		'chat_id'	=> $chatId,
		'removed'	=> $removed,
	];
}



/**
 * Single Chat
 */



function chat() {
	$userId = empty($_POST['user_id'])	? null : $_POST['user_id'];
	$chatId = empty($_POST['chat_id'])	? null : $_POST['chat_id'];
	chatResponse($userId, $chatId);
}



function chatResponse($userId, $chatId) {
	header('Content-Type: application/json');
	echo json_encode(chatResponseData($userId, $chatId), JSON_UNESCAPED_SLASHES);
	die;
}



function chatResponseData($userId, $chatId) {

	if (empty($userId) ||
		empty($chatId)) {
		return null;
	}

	$data = loadUserData($userId);
	if (!isset($data[$chatId])) {
		return null;
	}

	return [
		'user_id'			=> $userId,
		'chat_id'			=> $chatId,
		'title'				=> $data[$chatId]['title'],
		'status_url' 		=> $data[$chatId]['status_url'],
		'bearer_token'		=> $data[$chatId]['bearer_token'],
		'from_bearer_token'	=> $data[$chatId]['from_bearer_token'],
	];
}



/**
 * Chats list
 */



function chats() {
	$userId = empty($_POST['user_id']) ? null : $_POST['user_id'];
	header('Content-Type: application/json');
	echo json_encode(chatsReponse($userId), JSON_UNESCAPED_SLASHES);
	die;
}



function chatsReponse($userId) {

	if (empty($userId)) {
		return null;
	}

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
		];
	}

	return array_reverse($items);
}



function prepareChatTitle($title) {

	$title = str_replace(['"', '"'], '', $title);

	$chars = [null, '.', null, ':', null];
	foreach ($chars as $char) {
		$title = isset($char) ? trim($title, $char) : trim($title);
	}

	return $title;
}



/**
 * User data functions
 */



function loadUserData($userId) {
	$data = @json_decode(@file_get_contents(userDataPath($userId)), true);
	return empty($data) || !is_array($data) ? [] : $data;
}



function saveUserData($userId, $data) {
	$json = @json_encode($data, JSON_UNESCAPED_SLASHES);
	return empty($json) ? null : @file_put_contents(userDataPath($userId), $json);
}



function userDataPath($userId) {
	return dirname(dirname(__DIR__)).'/data/'.$userId.'.json';
}




/**
 * User actions
 */



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

	if ('chat' == $_POST['action']) {
		chat();
		return;
	}

	if ('chats' == $_POST['action']) {
		chats();
		return;
	}

}

postRequest();