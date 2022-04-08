const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
const package = require('../package');
const robotsParser = require('robots-parser');
const url = require('url');
const { https } = require('follow-redirects');
const envIsEmpty = require('./envIsEmpty');
const pdfreader = require("pdfreader");

try {

    require('chromedriver');
    module.exports = async function crawl(_url, _xpath, Sentry) {

        const parsedUrl = url.parse(_url);
        let UserAgent = `ToSDRCrawler/${package.version} (+https://to.tosdr.org/bot)`;

        return new Promise((resolve, reject) => {

            https.get({
                hostname: parsedUrl.hostname,
                path: '/robots.txt',
                headers: { 'User-Agent': UserAgent }
            }, resp => {
                let data = '';

                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', async () => {
                    if (resp.statusCode == 200) {
                        let robots = robotsParser(`${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`, data);

                        if (robots.isDisallowed(_url, UserAgent) && !process.env.IGNORE_ROBOTS) {

                            Sentry.setContext("website", {
                                requestUrl: _url,
                                requestXpath: _xpath,
                                responseData: data,
                                responseCode: resp.statusCode,
                                responseMessage: resp.statusMessage,
                                responseMimetype: resp.headers['content-type']
                            });

                            Sentry.captureMessage('Crawling forbidden due to robots.txt', null, );
                            reject({ "name": "RobotsRestriction", "message": "Crawling forbidden due to robots.txt" });
                            return;
                        }
                    }


                    https.request(_url, { method: 'HEAD' }, async (res) => {

						console.log(res.statusCode);

                        if (!res.statusCode.toString().startsWith('2')) {
                            Sentry.setContext("website", {
                                requestUrl: _url,
                                requestXpath: _xpath,
                                responseData: null,
                                responseCode: res.statusCode,
                                responseMessage: res.statusMessage,
                                responseMimetype: res.headers['content-type']
                            });

                            Sentry.captureMessage(`Expected status code in range 2xx class; got ${res.statusCode}:${res.statusMessage}`);
                            reject({ "name": "StatusCodeError", "message": `Expected status code in range 2xx class; got ${res.statusCode}:${res.statusMessage}` });
                            return;
                        }
                        if (typeof res.headers['content-type'] === 'undefined') {

                            Sentry.setContext("website", {
                                requestUrl: _url,
                                requestXpath: _xpath,
                                responseData: null,
                                responseCode: res.statusCode,
                                responseMessage: res.statusMessage,
                                responseMimetype: res.headers['content-type']
                            });
                            Sentry.captureMessage(`Expected header content-type to be set; got undefined`);

                            reject({ "name": "InvalidHeader", "message": `Expected header content-type to be set; got undefined` });
                            return;
                        }
                        if (!envIsEmpty('FORBIDDEN_MIME') || !envIsEmpty('ALLOWED_MIME')) {
                            let _forbidden = (envIsEmpty('FORBIDDEN_MIME') ? null : process.env.FORBIDDEN_MIME.trim().split(',').map(s => s.trim()));
                            let _allowed = (envIsEmpty('ALLOWED_MIME') ? null : process.env.ALLOWED_MIME.trim().split(',').map(s => s.trim()));


                            if (_forbidden !== null && _forbidden.includes(res.headers['content-type'])) {

                                Sentry.setContext("website", {
                                    requestUrl: _url,
                                    requestXpath: _xpath,
                                    responseData: null,
                                    responseCode: res.statusCode,
                                    responseMessage: res.statusMessage,
                                    responseMimetype: res.headers['content-type']
                                });
                                Sentry.captureMessage(`MimeType ${res.headers['content-type']} is not crawlable.`);

                                reject({ "name": "MimeBlacklist", "message": `MimeType ${res.headers['content-type']} is not crawlable.` });
                                return;
                            }
                            if (_allowed !== null && !_allowed.includes(res.headers['content-type'].split(";")[0])) {


                                Sentry.setContext("website", {
                                    requestUrl: _url,
                                    requestXpath: _xpath,
                                    responseData: null,
                                    responseCode: res.statusCode,
                                    responseMessage: res.statusMessage,
                                    responseMimetype: res.headers['content-type']
                                });
                                Sentry.captureMessage(`MimeType ${res.headers['content-type']} is not in our whitelist. We only support ${_allowed.join(', ').trim()}`);

                                reject({ "name": "MimeWhitelist", "message": `MimeType ${res.headers['content-type']} is not in our whitelist. We only support ${_allowed.join(', ').trim()}` });
                                return;
                            }
                        }

                        if (res.headers['content-type'] === "application/pdf") {



                            https.get({
                                hostname: parsedUrl.hostname,
                                path: '/' + parsedUrl.path,
                                headers: { 'User-Agent': UserAgent }
                            }, resp => {
                                let buff = new Buffer.alloc(0);

                                resp.on('data', (chunk) => { buff = Buffer.concat([buff, chunk]); });
                                resp.on('end', async () => {
                                    let pdftxt = new Array();
                                    let pg = 0;
                                    new pdfreader.PdfReader().parseBuffer(buff, function (err, item) {
                                        if (err) {
                                            console.log("Invalid PDF");


                                            Sentry.setContext("website", {
                                                requestUrl: _url,
                                                requestXpath: _xpath,
                                                responseData: 'Buffer',
                                                responseCode: res.statusCode,
                                                responseMessage: res.statusMessage,
                                                responseMimetype: res.headers['content-type'],
                                                responseStacktrace: err
                                            });

                                            Sentry.captureMessage(`PDF Error ${err.message}`);

                                            reject({ "name": "PDFError", "message": err.message });
                                            return;
                                        }


                                        if (!item) {
                                            pdftxt.forEach(function (a, idx) {
                                                pdftxt[idx].forEach(function (v, i) {
                                                    pdftxt[idx][i].splice(1, 2);
                                                });
                                            });
                                            resolve({ "raw_html": pdftxt.join(), "imagedata": null, "imageurl": null });
                                        } else if (item && item.page) {
                                            pg = item.page - 1;
                                            pdftxt[pg] = [];
                                            pdftxt[pg]["width"] = item.page.width;
                                        } else if (item.text) {
                                            let t = 0;
                                            let sp = "";
                                            pdftxt[pg].forEach(function (val, idx) {
                                                if (val[1] == item.y) {
                                                    if (pdftxt[pg]["width"] && item.x - val[2] > pdftxt[pg]["width"]) {
                                                        sp += " ";
                                                    } else {
                                                        sp = "";
                                                    }
                                                    pdftxt[pg][idx][0] += sp + item.text;
                                                    t = 1;
                                                }
                                            });
                                            if (t == 0) {
                                                pdftxt[pg].push([item.text, item.y, item.x]);
                                            }
                                        }

                                    });
                                });
                            });
                            return;
                        }

                        let options = new chrome.Options();
                        options.setChromeBinaryPath(chromium.path);
                        options.addArguments('--no-sandbox');
                        options.addArguments('--headless');
                        options.addArguments('--disable-gpu');
                        options.addArguments('--window-size=1280,960');
                        options.addArguments('--lang=en');
                        options.addArguments(`--user-agent=${UserAgent}`);
                        options.addArguments("--disable-blink-features=AutomationControlled");
                        options.setUserPreferences({ 'download.open_pdf_in_system_reader': false });
                        options.setUserPreferences({ 'download.prompt_for_download': true });
                        options.setUserPreferences({ 'download.default_directory': "/dev/null" });
                        options.setUserPreferences({ 'plugins.always_open_pdf_externally': false });
                        options.setUserPreferences({ 'download_restrictions': 3 });
                        options.setUserPreferences({ 'excludeSwitches': ["enable-automation"] });
                        try {
                            const driver = new webdriver.Builder()
                                .forBrowser('chrome')
                                .setChromeOptions(options)
                                .build();

                            try {

                                await driver.get(_url);
                                await driver.sleep(5000);
                                await driver.wait(webdriver.until.elementLocated(webdriver.By.xpath(_xpath)), 10000);
                                let element = await driver.findElement(webdriver.By.xpath(_xpath));
                                let html = await element.getAttribute('innerHTML');
                                await driver.executeScript("arguments[0].scrollIntoView(true); arguments[0].style.border='2px solid red'; return true", element);
                                let imagedata = await driver.takeScreenshot();

                                await driver.quit();

                                resolve({ "raw_html": html, "imagedata": imagedata });
                            } catch (e) {
                                await driver.quit();
                                reject(e);

                                Sentry.setContext("website", {
                                    requestUrl: _url,
                                    requestXpath: _xpath,
                                    responseData: null,
                                    responseCode: res.statusCode,
                                    responseMessage: res.statusMessage,
                                    responseMimetype: res.headers['content-type'],
                                    responseStacktrace: e
                                });
                                Sentry.captureMessage(`Driver Error ${e.message}`);
                            }
                        } catch (e) {
                            Sentry.setContext("website", {
                                requestUrl: _url,
                                requestXpath: _xpath,
                                responseData: null,
                                responseCode: res.statusCode,
                                responseMessage: res.statusMessage,
                                responseMimetype: res.headers['content-type'],
                                responseStacktrace: e
                            });
                            Sentry.captureMessage(`Driver Error ${e.message}`);
                            reject({ "name": "DriverError", "message": e.message });
                        }
                    }).end();
                });


            }).on("error", (err) => {
                reject(err);

                Sentry.setContext("website", {
                    requestUrl: _url,
                    requestXpath: _xpath,
                    responseData: null,
                    responseCode: null,
                    responseMessage: null,
                    responseMimetype: null,
                    responseStacktrace: err
                });
                Sentry.captureMessage(`HTTP Error ${err.message}`);
            });
        });
    }
} catch (exception) {
    console.log(exception);
}
