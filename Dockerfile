FROM node:lts-bullseye

COPY crawler /var/www/crawler

EXPOSE 80

ENV SELENIUM_SERVER=""
ENV IGNORE_ROBOTS=false
ENV FORBIDDEN_MIME=application/octet-stream
ENV ALLOWED_MIME=text/plain,text/html,application/pdf
ENV SENTRY_DSN=""

VOLUME /var/www/crawler/sessions

WORKDIR /var/www/crawler

RUN echo "#" > .env &&  \
    npm install


ENTRYPOINT ["node", "/var/www/crawler/crawler.js"]
