const http = require('http');
const dotenv = require('dotenv');
const color = require('chalk');
const url = require('url');
const functions = require('./functions/index');

dotenv.config();

const httpserver = http.createServer((req, res) => {

    const query = url.parse(req.url, true).query;
    res.writeHead(200, { 'content-type': 'application/json' })
    let data = { "error": false, "message": { "name": null, "remoteStacktrace": null } }
    if (!query.url) {
        res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
        res.end();
        return;
    }
    if (!query.apikey && !functions.envIsEmpty("API_KEY")) {
        res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
        res.end();
        return;
    }
    if (query.xpath === "" || typeof query.xpath === 'undefined') {
        query.xpath = "//body";
    }
    if (query.apikey !== process.env.API_KEY && !functions.envIsEmpty("API_KEY")) {
        res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Invalid API Key")));
        res.end();
        return;
    }

    if (req.method !== "GET") {
        res.write(JSON.stringify(functions.response.error("RequestMethodErr", "Only GET is supported")));
        res.end();
        return;
    }

    functions.crawl(query.url, query.xpath).then((response) => {
        res.write(JSON.stringify(functions.response.success(response)));
        res.end();
    }).catch((err) => {
        res.write(JSON.stringify(functions.response.error(err.name, err.message)));
        res.end();
    });
});

httpserver.listen(parseInt(process.env.HTTP_PORT), process.env.HTTP_BIND, () => {
    console.log(color.green(`HTTP Web server started on port ${color.cyan(process.env.HTTP_BIND)}:${color.cyan(process.env.HTTP_PORT)}`));
    console.log(color.blue("********************** Done ************************"));
    console.log(color.green("HTTP Server is now ready to accept connections"));
});