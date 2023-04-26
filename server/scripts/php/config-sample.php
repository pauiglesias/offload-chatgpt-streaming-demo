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
 * Default OffloadGPT and ChatGPT arguments.
 */
function defaultChatGptArgs() {

	return [


		/**
		 * OffloadGPT arguments
		 */


		/**
		 * Privacy settings on Endpoints URLs.
		 * Allowed values: `public` or `private`
		 * Default value: `public`
		 */
		'access'			=> null,


		/**
		 * Process timeout in seconds.
		 * Alllowed values: 5 to 90
		 * Default values: 90
		 */
		'timeout'			=> null,


		/**
		 * Connection timeout in seconds to OpenAI servers.
		 * Allowed values: 1 to 10
		 * Default value: 5
		 */
		'connect_timeout'	=> null,


		/**
		 * Webhook URL to send results at the end of the process
		 * It performs a POST request having the results in the variable `response`
		 * Optional
		 */
		'webhook_url'		=> null,


		/*
		 * From here the OpenAI API arguments
		 * https://platform.openai.com/docs/api-reference/chat/create
		 */


		/**
		 * ID of the model to use.
		 * https://platform.openai.com/docs/models
		 * Default value (by OffloadGPT): `gpt-3.5-turbo`
		 */
		'model'				=> null,


		/**
		 * What sampling temperature to use, between 0 and 2.
		 * Default value (by OpenAI): 1
		 */
		'temperature'		=> null,


		/**
		 * An alternative to sampling with temperature, called nucleus sampling.
		 * Default value (by OpenAI): 1
		 */
		'top_p'				=> null,


		/**
		 * How many chat completion choices to generate for each input message.
		 * Default value (by OpenAI): 1
		 */
		'n'					=> null,


		/**
		 * Up to 4 sequences where the API will stop generating further tokens.
		 * Default value: null
		 */
		'stop'				=> null,


		/**
		 * The maximum number of tokens to generate in the chat completion.
		 * No defaults
		 */
		'max_tokens'		=> null,


		/**
		 * Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they
		 * appear in the text so far, increasing the model's likelihood to talk about new topics.
		 * Default value (by OpenAI): 0
		 */
		'presence_penalty'	=> null,


		/**
		 * Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing
		 * frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
		 * Default value (by OpenAI): 0
		 */
		'frequency_penalty'	=> null,


		/**
		 * Modify the likelihood of specified tokens appearing in the completion.
		 * Default value: null
		 */
		'logit_bias'		=> null,


		/**
		 * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.
		 * Optional
		 */
		'user'				=> null,

	];

}