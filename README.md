
# OffloadGPT Streaming Demo

A ChatGPT clone that allows users to [chat with OpenAI](https://platform.openai.com/docs/guides/chat) language models.

It is powered by the [OffloadGPT API](https://rapidapi.com/microdeploy/api/offloadgpt), a service that enables ChatGPT API deferred responses:

- Delegates API requests and relieves your server load.
- Stores Streaming and Asynchronous API responses.
- Offload your server's workload to external resources.
- Easily concatenates messages from previous responses.

## Prerequisites

### Your OpenAI API key

Your [OpenAI API Key](https://platform.openai.com/account/api-keys) is used only in the OpenAI API call and will never be saved, shared or published.

The OpenAI API Key is deleted in memory after the OpenAI API request is performed.

### A RapidApi account

The OffloadGPT API is hosted on [RapidAPI](https://rapidapi.com), so you need to create a personal account.

Then you can subscribe to any of the [Offload GPT plans](https://rapidapi.com/microdeploy/api/offloadgpt/pricing) to run the service.

A free plan with 50 calls per day is available.

### Docker installed on your machine, or PHP with cUrl support, or using a Web Server

You can execute this demo using [Docker](https://www.docker.com), so you need to have it installed on your machine.

Alternatively, if you have installed PHP with cUrl support, you can run the standalone PHP Server.

Another option is using a web server with PHP (and PHP-CURL) support, like Apache or NGINX with php-fpm.

Future plans will include server execution in the cloud via edge scripts services, so you do not need to install anything in your local machine.

## Configuration

Currently only server's side PHP execution is supported.

In order to configure the applications, you need to follow the following steps:

- Copy or rename the `config-sample.php` file to `config.php` in the `server/php` directory.
- Fill the constants with your OpenAI API Key, and the RAPIDAPI Keys.
- Specify `public` or `private` access to set the URLs privacy.

## Execution

### Start with docker

### Start with PHP server

A standalone PHP is provided with PHP, so you can run this project from command line typing this command:

php -S 127.0.01:8000 -t .

## Data management

This project only stores the location of the generated URLs by OffloadGPT and the minimum related data, like the title of the conversation or a Bearer Token if the status Url is private.

The data is located at the `data` directory from the root of this project, and it consists of a JSON file where is stored the conversations list.
