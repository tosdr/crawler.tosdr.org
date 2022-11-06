FROM node:lts-bullseye

COPY crawler /var/www/crawler

EXPOSE 80

ENV SELENIUM_SERVER=""
ENV API_ENDPOINT="https://api.tosdr.org"
ENV API_KEY=""
ENV IGNORE_ROBOTS=false
ENV FORBIDDEN_MIME=application/octet-stream
ENV ALLOWED_MIME=text/plain,text/html,application/pdf
ENV SENTRY_DSN=""

WORKDIR /var/www/crawler

RUN echo "#" > .env &&  \
    npm install && \
    apt-get install -y unzip wget default-jre chromium-browser && \
    mkdir /var/www/chromedriver && \
    cd /var/www/chromedriver && \
    wget http://chromedriver.storage.googleapis.com/108.0.5359.22/chromedriver_linux64.zip -O /var/www/chromedriver/chrome.zip && \
    unzip chrome.zip && \
    mv /var/www/chromedriver/chromedriver /usr/local/bin/chromedriver


ENTRYPOINT ["node", "/var/www/crawler/crawler.js"]
