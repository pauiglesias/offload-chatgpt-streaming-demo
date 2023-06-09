
# OffloadGPT Streaming Demo - ChatGPT clone

![OffloadGPT Streaming Demo - ChatGPT clone](https://github.com/pauiglesias/offload-chatgpt-streaming-demo/blob/main/images/demo.png?raw=true)

A ChatGPT clone that allows users to [chat with OpenAI](https://platform.openai.com/docs/guides/chat) language models.

It is powered by the [OffloadGPT API](https://rapidapi.com/microdeploy/api/offloadgpt), a service that enables ChatGPT API deferred responses.

You can check the complete documentation here:
[https://offloadgpt-docs.microdeploy.com](https://offloadgpt-docs.microdeploy.com)

**Table of Contents:**

- [Prerequisites](#prerequisites)
	- [Your OpenAI API key](#your-openai-api-key)
	- [A RapidApi account](#a-rapidapi-account)
	- [Docker installed on your machine, or PHP with cUrl support, or using a Web Server](#docker-installed-on-your-machine-or-php-with-curl-support-or-using-a-web-server)
- [Installation](#installation)
- [Configuration](#configuration)
- [Execution](#execution)
	- [Start with Docker](#start-with-docker)
	- [Or start with the built-in PHP server](#or-start-with-the-built-in-php-server)
- [Data management](#data-management)

## Prerequisites

### Your OpenAI API key

Your [OpenAI API Key](https://platform.openai.com/account/api-keys) is used only in the OpenAI API call and will never be saved, shared or published.

The OpenAI API Key is deleted in memory after the OpenAI API request is performed, avoiding to show it in logs or debug output.

### A RapidApi account

The OffloadGPT API is hosted on [RapidAPI](https://rapidapi.com), so you need to create a personal account.

Then you can subscribe to any of the [Offload GPT plans](https://rapidapi.com/microdeploy/api/offloadgpt/pricing) to run the service.

A free plan with 50 calls per day is available.

### Docker installed on your machine, or PHP with cUrl support, or using a Web Server

You can execute this demo using [Docker](https://www.docker.com), so you need to have it installed on your machine.

Alternatively, if you have installed PHP with cUrl support, you can run the standalone PHP Server.

Another option is using a web server with PHP (and PHP-CURL) support, like Apache or NGINX with php-fpm.

Future plans will include server execution in the cloud via edge scripts services, so you do not need to install anything in your local machine.

## Installation

Clone this repository to your local machine:

```shell
git clone https://github.com/pauiglesias/offload-chatgpt-streaming-demo.git
```

Navigate to the project directory:

```shell
cd offload-chatgpt-streaming-demo
```

## Configuration

Currently only server's side PHP execution is supported.

From the `server/scripts/php` directory:

- Copy or rename the `config-sample.php` file to `config.php`
- Fill the constants with your **OpenAI API Key**, and the **RAPIDAPI Keys**
- Check the `defaultChatGptArgs()` function where you can modify arguments like:
  - The `public` or `private` access to define the URLs privacy.
  - A Webhook URL to POST data after the process is finished.
  - The OpenAI `model` Id to use in your requests.
  - Other params like `temperature`, `max_tokens`, etc.

## Execution

### Start with Docker

If it is the first time, you need to create the initial Docker image:

```shell
docker build -t offloadgpt .
```

Once you have created it, you can start the service in this way, sharing the `/server` directory for data and config files persistence:

```shell
docker run --name=offloadgpt -d -v ./server:/server -p 8000:8000 offloadgpt
```

And run it in the browser from this address:

[http://localhost:8000](http://localhost:8000)

In order to stop and remove the running container, execute this command:

```shell
docker container stop offloadgpt && docker container rm offloadgpt
```

### Or start with the built-in PHP server

If you have PHP installed in your machine, a standalone PHP server is provided with PHP, so you can run this project from command line typing this command:

php -S 127.0.0.1:8000 -t .

And then open this address in your browser:

[http://localhost:8000](http://localhost:8000)

## Data management

This project only stores the location of the generated URLs by OffloadGPT and the minimum related data, like the title of the conversation or a Bearer Token if the status Url is private.

The data is located in the `server/data` directory at the root of this project, and it consists of a JSON file per user where the conversations list is stored

The filename is composed of a randomly generated string of 16 characters, created from the client-side script. This string is stored in a cookie called `user_id` in order to retrieve the information per each user.

Using single JSON files in this way is only intended for demonstration purposes and is not recommended for live production servers.
