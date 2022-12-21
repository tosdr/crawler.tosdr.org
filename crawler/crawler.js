const http = require('http');
const dotenv = require('dotenv');
const uuid = require('uuid');
const color = require('chalk');
const url = require('url');
const functions = require('./functions/index');
const package = require('./package');
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");


const axios = require('axios');
dotenv.config();

if(process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });
}

try {

    const httpserver = http.createServer((req, res) => {


        const query = url.parse(req.url, true).query;

        if (Object.keys(query).length === 0) {
            res.writeHead(302, {
                'Location': 'https://to.tosdr.org/bot'
            });
            res.end();
            return;
        }

        let request_id = uuid.v4();


        const transaction = Sentry.startTransaction({
            op: "transaction",
            name: "Document Crawl",
        });


        Sentry.setContext("website", {
            url: query.url,
            xpath: query.xpath
        });

        res.writeHead(200, {'content-type': 'application/json', 'x-request-id': request_id});

        if (!query.url) {
            res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
            res.end();
            transaction.finish();
            return;
        }
        if (!query.apikey && !functions.envIsEmpty("API_KEY")) {
            res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
            res.end();
            transaction.finish();
            return;
        }
        if (query.xpath === "" || typeof query.xpath === 'undefined') {
            query.xpath = "//body";
        }

        if (req.method !== "GET") {
            res.write(JSON.stringify(functions.response.error("RequestMethodErr", "Only GET is supported")));
            res.end();
            transaction.finish();
            return;
        }

        Sentry.setTag("request_id", request_id)
        Sentry.setTag("crawler", process.env.CRAWLER ? process.env.CRAWLER : 'legacy');



        let UserAgent = `ToSDRCrawler/${package.version} (+https://tosdr.org)`;

        if(functions.envIsEmpty("API_KEY")){
            functions.crawl(query.url, query.xpath, Sentry).then((response) => {
                console.log("Crawled Document");
                res.write(JSON.stringify(functions.response.success(response)));
                res.end();
            }).catch((err) => {
                console.log("Send Error to Sentry");
                res.write(JSON.stringify(functions.response.error(err.name, err.message)));
                res.end();
            }).finally(() => {
                console.log("Finished transaction");
                transaction.finish();
            });
        }else{
            console.log("Getting api key");
            axios.get(`${process.env.API_ENDPOINT}/apikey/v1/?apikey=${query.apikey}`, {
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
                    Sentry.captureMessage(response.statusText);
                    transaction.finish();
                    res.write(JSON.stringify(functions.response.error("ServerError", "Invalid Server API Key. Misconfigured")));
                    res.end();
                    return;
                } else if (response.status !== 200) {
                    Sentry.captureMessage(response.statusText);
                    transaction.finish();
                    res.write(JSON.stringify(functions.response.error("ServerError", response.statusText)));
                    res.end();
                    return;
                }

                let responseData = response.data;


                if (!(responseData.error & 0x100) ||
                    !(responseData.parameters.permissions & 0x8) ||
                    responseData.parameters.revoked) {

                    let reason = "Unknown";
                    if(!(responseData.error & 0x100)){
                        reason = "Invalid API Key!";
                    }else if(!(responseData.parameters.permissions & 0x8)){
                        reason = "Missing Permissions";
                    }else if(responseData.parameters.revoked){
                        reason = "Revoked Key";
                    }else if((responseData.parameters.expires_at != null ||
                        Math.floor(new Date(responseData.parameters.expires_at).getTime()) > Math.floor(new Date().getTime())
                    )){
                        reason = "Key expired";
                    }



                    console.log(responseData);
                    res.write(JSON.stringify(functions.response.error("RequestArgumentErr", reason)));
                    res.end();
                    return;
                }

                functions.crawl(query.url, query.xpath, Sentry).then((response) => {
                    console.log("Crawled Document");
                    res.write(JSON.stringify(functions.response.success(response)));
                    res.end();
                }).catch((err) => {
                    console.log("Send Error to Sentry");
                    res.write(JSON.stringify(functions.response.error(err.name, err.message)));
                    res.end();
                }).finally(() => {
                    console.log("Finished transaction");
                    transaction.finish();
                });
            }).catch((error) => {

            }).finally(() => {
                console.log("Finished transaction");
                transaction.finish();
            });
        }

    });

    httpserver.listen(80, "0.0.0.0", () => {
        console.log(color.green(`HTTP Web server started on port ${color.cyan("0.0.0.0")}:${color.cyan(80)}`));
        console.log(color.blue("********************** Done ************************"));
        console.log(color.green("HTTP Server is now ready to accept connections"));
    });

} catch(err){
    Sentry.captureException(err);
}
