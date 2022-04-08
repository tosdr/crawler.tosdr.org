## Required Envs:

- `SELENIUM_SERVER=""` - **Url to your Selenium Server

## Optional Envs:

- `API_ENDPOINT=https://api.tosdr.org` - **CrispCMS endpoint for api key validation
- `API_KEY=""` - **The API Key from ToS;DR to enable central api key validation**
- `IGNORE_ROBOTS=false` - **Ignore robots.txt?**
- `FORBIDDEN_MIME=application/octet-stream` - **Mimetypes to blacklist querying**
- `ALLOWED_MIME=text/plain,text/html,application/pdf` - **Allowed mimetypes for queries. If empty allow all except from `FORBIDDEN_MIME`**
- `SENTRY_DSN=""` - **Sentry DSN for error tracking**


## Query sample

```
curl --location --request GET 'http://mycrawler?url=https://google.com&apikey=my_api_key'
```

```http
GET /?url=https://google.de&apikey=my_api_key HTTP/1.1
Host: mycrawler
```