const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
const package = require('../package');
const robotsParser = require('robots-parser');
const url = require('url');
const https = require('https');
require('chromedriver');

module.exports = async function crawl(_url, _xpath) {

    const parsedUrl = url.parse(_url);
    let UserAgent = `ToSDRCrawler/${package.version} (+https://tosdr.org)`;

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
                    var robots = robotsParser(`${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`, data);

                    if (robots.isDisallowed(_url, UserAgent)) {
                        reject({ "name": "RobotsRestriction", "message": "Crawling forbidden due to robots.txt" });
                        return;
                    }
                }

                let options = new chrome.Options();
                options.setChromeBinaryPath(chromium.path);
                options.addArguments('--headless');
                options.addArguments('--disable-gpu');
                options.addArguments('--window-size=1280,960');
                options.addArguments('--no-sandbox');
                options.addArguments('--lang=en');
                options.addArguments(`--user-agent=${UserAgent}`);

                const driver = new webdriver.Builder()
                    .forBrowser('chrome')
                    .setChromeOptions(options)
                    .build();



                await driver.get(_url);
                await driver.wait(webdriver.until.elementLocated(webdriver.By.xpath(_xpath)), 10000);
                let element = await driver.findElement(webdriver.By.xpath(_xpath));
                let html = await element.getAttribute('innerHTML');
                let imagedata = await driver.takeScreenshot();

                await driver.quit();


                resolve({ "raw_html": html, "imagedata": imagedata });

            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}