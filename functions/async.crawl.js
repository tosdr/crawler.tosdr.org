const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
const package = require('../package');
const robotsParser = require('robots-parser');
const url = require('url');
const https = require('https');
const uploadjbcdn = require('./async.upload_jbcdn');
const envIsEmpty = require('./envIsEmpty');
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

                    if (robots.isDisallowed(_url, UserAgent) && !process.env.IGNORE_ROBOTS) {
                        reject({ "name": "RobotsRestriction", "message": "Crawling forbidden due to robots.txt" });
                        return;
                    }
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
                options.setUserPreferences({ 'useAutomationExtension': false });
                options.setUserPreferences({ 'excludeSwitches': ["enable-automation"] });

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
                    let cdn = null;
                    if (!envIsEmpty("JBCDN_UPKEY") && !envIsEmpty("JBCDN_SLUG") && !envIsEmpty("JBCDN_TTL")) {
                        let cdnResponse = await uploadjbcdn(imagedata);
                        if (cdnResponse.error) {
                            cdn = false;
                        } else {
                            cdn = cdnResponse.data.result.URL;
                        }
                    }

                    await driver.quit();


                    resolve({ "raw_html": html, "imagedata": imagedata, "imageurl": cdn });
                } catch (e) {
                    reject(e);
                }

            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}