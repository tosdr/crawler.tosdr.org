### This Project requires an API Key from ToS;DR! It's not possible to run it without one for now.


## Required Envs:

- API_KEY - **The API Key from ToS;DR**


## Optional Envs:

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