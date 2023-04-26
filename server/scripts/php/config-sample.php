<?php

/**
 * OffloadGPT Streaming Demo
 * Copy or rename this file to `config.php` and complete the following constants to start the demo.
 */


/**
 * Your OpenAI API Key
 * https://platform.openai.com/
 */
define('OPENAI_API_KEY', '[YOUR_OPENAI_API_KEY]');



/**
 * Your OpenAI Organization
 * Optional
 */
//define('OPENAI_ORGANIZATION', '[YOUR_OPENAI_ORGANIZATION]');



/**
 * Your RapidAPI Api Key for OffloadGPT
 * https://rapidapi.com/microdeploy/api/offloadgpt
 */
define('OFFLOAD_GPT_RAPIDAPI_KEY',  '[YOUR_RAPIDAPI_KEY]');
define('OFFLOAD_GPT_RAPIDAPI_HOST', '[YOUR_RAPIDAPI_HOST]');



/**
 * The OffloadGPT Base URL
 */
define('OFFLOAD_GPT_BASE_URL', 'https://offloadgpt.p.rapidapi.com/v1');



/**
 * Default ChatGPT settings
 */
function defaultChatGptArgs() {

	return [

		/**
		 * Privacy settings on Endpoints Urls
		 * Allowed values: `public` or `private`
		 * Default: `public`
		 */
		'access'	=> null,

		/**
		 * https://platform.openai.com/docs/models
		 */
		'model'		=> null,

	];

}