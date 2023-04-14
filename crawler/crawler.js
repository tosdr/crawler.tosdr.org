const http = require('http');
const dotenv = require('dotenv');
const uuid = require('uuid');
const color = require('chalk');
const url = require('url');
const functions = require('./functions/index');
const packagejson = require('./package');
const Sentry = require("@sentry/node");
const axios = require('axios');
const localstorage = require('node-localstorage');
const appwrite = require('appwrite');


console.log(color.blue("********************** Booting ************************"));

console.log(color.yellow("** Reading .env **"));

global.window = {
    console: {warn: (() => {})},
    localStorage: new localstorage.LocalStorage(process.env.STORAGE_PATH ?? "../sessions")
};

dotenv.config();

const client = new appwrite.Client()
    .setEndpoint('https://appwrite.jrbit.de/v1') // Your API Endpoint
    .setProject('6438e3173a7ec7628d22');               // Your project ID

const account = new appwrite.Account(client);


async function init() {
    try {

        let session = null;
        let currentAccount = null;

        if(!functions.envIsEmpty('LOGIN_CREDENTIALS')){

            let credentails = process.env.LOGIN_CREDENTIALS.split(":");
            console.log(color.yellow("** Authenticating with master server using provided credentials **"));
            

            try {
                session = await account.getSession('current');
                currentAccount = await account.get();
                console.log(color.yellow(`** Logging in using existing Session **`));
            }catch(err){
                console.log(color.yellow(`** Creating new Session **`));
                session = await account.createEmailSession(
                    credentails[0],
                    credentails[1]
                );
                currentAccount = await account.get();
            }



            console.log(color.yellow(`** Logged in as ${color.blue(currentAccount.name)} via ${color.blue(currentAccount.email)} **`));
        }


        let apikey = (await account.getPrefs()).apikey ?? null;
        let healthcheck_url = (await account.getPrefs()).healthcheck_url ?? null;
        
        if(!functions.envIsEmpty('SENTRY_DSN')) {
            Sentry.init({
                dsn: process.env.SENTRY_DSN,
                tracesSampleRate: 1.0,
            });
        }
        


        if(healthcheck_url){

            console.log(color.yellow(`** Healthcheck configured, preparing Heartbeat. **`));
            setInterval(function() {
                console.log("** Pinging " + healthcheck_url + " **");
                axios.get(healthcheck_url);
                console.log("** Done Pinging " + healthcheck_url + " **");
            }, 59000);
        }else{
            console.log(color.yellow(`** Healthcheck not configured **`));
        }
        
        try {
        
            const httpserver = http.createServer(async (req, res) => {
        
        
                const query = url.parse(req.url, true).query;
        
                if (Object.keys(query).length === 0) {
                    res.write(JSON.stringify(functions.response.success({
                        "message": "Healthy!"
                    })));
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
        
                res.writeHead(200, {
                    'content-type': 'application/json', 
                    'x-request-id': request_id, 
                    'x-crawler-version': packagejson.version
                });
        
                if (!query.url) {
                    res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
                    res.end();
                    if(!functions.envIsEmpty('SENTRY_DSN')) {
                        transaction.finish();
                    }
                    return;
                }
                if (!query.apikey && !apikey) {
                    res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Required arguments missing")));
                    res.end();
                    if(!functions.envIsEmpty('SENTRY_DSN')) {
                        transaction.finish();
                    }
                    return;
                }
                if (query.xpath === "" || typeof query.xpath === 'undefined') {
                    query.xpath = "//body";
                }
        
                if (req.method !== "GET") {
                    res.write(JSON.stringify(functions.response.error("RequestMethodErr", "Only GET is supported")));
                    res.end();

                    if(!functions.envIsEmpty('SENTRY_DSN')) {
                                transaction.finish();
                    }
                    return;
                }

                if(!functions.envIsEmpty('SENTRY_DSN')) {
                    Sentry.setTag("request_id", request_id);
                    if(session !== null){
                        Sentry.setTag("crawler", currentAccount.name ?? 'legacy');
                    }
                }
        
                if(!apikey || apikey === query.apikey){
                    const response = await functions.crawl(query.url, query.xpath, Sentry)
                        
                    try {
                        console.log("Crawled Document");
                        res.write(JSON.stringify(functions.response.success(response)));
                        res.end();
                    }catch(ex){
                        console.log("Send Error to Sentry");
                        res.write(JSON.stringify(functions.response.error(err.name, err.message)));
                        res.end();
                    }
                    console.log("Finished transaction");

                    if(!functions.envIsEmpty('SENTRY_DSN')) {
                                transaction.finish();
                    }
                    return;
                    
                }else{
                    res.write(JSON.stringify(functions.response.error("RequestArgumentErr", "Invalid API Key")));
                    return res.end();
                }
            });
        
            httpserver.listen(process.env.PORT ?? 80, process.env.LISTEN ?? "0.0.0.0", () => {
                console.log(color.green(`HTTP Web server started on port ${color.cyan(process.env.LISTEN ?? "0.0.0.0")}:${color.cyan(process.env.PORT ?? 80)}`));
                console.log(color.blue("********************** Done ************************"));
                console.log(color.green("HTTP Server is now ready to accept connections"));
            });
        
        } catch(err){

            if(!functions.envIsEmpty('SENTRY_DSN')) {
                Sentry.captureException(err);
            }else{
                console.log(err);
            }    
        }
    
    }catch(err){
        console.log(color.red("********************** Failed to Boot ************************"));
        console.log(color.yellow("** Failed to authenticate with master Server, please check your LOGIN_CREDENTIALS **"));        
        console.log(color.red(err));
    }


}

init();