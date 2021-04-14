const http = require('http');
const dotenv = require('dotenv');
const color = require('chalk');
const url = require('url');
const functions = require('./functions/index');
const package = require('./package');

const axios = require('axios');
dotenv.config();

const httpserver = http.createServer((req, res) => {

    const query = url.parse(req.url, true).query;
    res.writeHead(200, { 'content-type': 'application/json' })
    let data = { "error": false, "message": { "name": null, "remoteStacktrace": null } }
    if (Object.keys(query).length === 0) {
        res.writeHead(302, {
            'Location': 'https://to.tosdr.org/bot'
        });
        res.end();
        return;
    }
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
    /*
    if (query.apikey !== process.env.API_KEY && !functions.envIsEmpty("API_KEY")) {
        res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Invalid API Key")));
        res.end();
        return;
    }
    */

    if (req.method !== "GET") {
        res.write(JSON.stringify(functions.response.error("RequestMethodErr", "Only GET is supported")));
        res.end();
        return;
    }


    let UserAgent = `ToSDRCrawler/${package.version} (+https://tosdr.org)`;

    console.log("Getting api key");
    axios.get(`https://api.tosdr.org/apikey/v1/?apikey=${query.apikey}`, {
        headers: {
            'User-Agent': UserAgent,
            'Authorization': process.env.API_KEY,
        },
        validateStatus: function (status) {
            return true;
        },
    }).then((response) => {
        console.log("Got api key");
        if (response.status === 403 || response.status === 401) {
            res.write(JSON.stringify(functions.response.error("ServerError", "Invalid Server API Key. Misconfigured")));
            res.end();
            return;
        } else if (response.status !== 200) {
            res.write(JSON.stringify(functions.response.error("ServerError", response.statusText)));
            res.end();
            return;
        }

        let responseData = response.data;

        if (!(responseData.error & 0x100) || !(responseData.parameters.permissions & 0x8)) {
            res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Invalid API Key")));
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
    }).catch((error) => {

    });

});

httpserver.listen(parseInt(process.env.HTTP_PORT), process.env.HTTP_BIND, () => {
    console.log(color.green(`HTTP Web server started on port ${color.cyan(process.env.HTTP_BIND)}:${color.cyan(process.env.HTTP_PORT)}`));
    console.log(color.blue("********************** Done ************************"));
    console.log(color.green("HTTP Server is now ready to accept connections"));
});