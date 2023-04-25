
# OffloadGPT Streaming Demo

A ChatGPT clone that allows users to chat with OpenAI language models.

It is powered by the [OffloadGPT API](https://rapidapi.com/microdeploy/api/offloadgpt), a service that enables ChatGPT API deferred responses:

- Delegates API requests and relieves your server load.
- Stores Streaming and Asynchronous API responses.
- Offload your server's workload to external resources.
- Easily concatenates messages from previous responses.

## Prerequisites

### Your OpenAI API key

Your OpenAI API Key is used only in the OpenAI API call and will never be saved, shared or published.

The OpenAI API Key is deleted in memory after the OpenAI API request is performed.

### A RapidApi account

The OffloadGPT API is hosted on RapidAPI, so you need to create a personal account.

Then you can subscribe to any of the [Offload GPT plans](https://rapidapi.com/microdeploy/api/offloadgpt/pricing) to run the service.

A free plan with 50 calls per day is available.

### Docker installed on your machine

### Alternatively, PHP installed in your machine with Curl

## Instructions

- Copy or rename the config-sample.php file to config.php
- Fill the constants with your API Keys

https://rapidapi.com/microdeploy/api/offloadgpt

## Execution

### Start with docker

### Start with PHP server

php -S 127.0.01:8000 -t .
