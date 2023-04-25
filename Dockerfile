FROM php:8.2
WORKDIR /home/php/app
COPY . .
CMD php -S 127.0.0.1:8000 -t .
EXPOSE 8000