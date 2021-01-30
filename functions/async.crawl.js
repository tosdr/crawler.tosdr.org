const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
require('chromedriver');

module.exports = async function crawl(url, xpath) {

    let options = new chrome.Options();
    options.setChromeBinaryPath(chromium.path);
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,960');
    options.addArguments('--no-sandbox');
    options.addArguments('--lang=en');

    const driver = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();



    await driver.get(url);
    await driver.wait(webdriver.until.elementLocated(webdriver.By.xpath(xpath)), 10000);
    let element = await driver.findElement(webdriver.By.xpath(xpath));
    let html = await element.getAttribute('innerHTML');
    let imagedata = await driver.takeScreenshot();

    await driver.quit();


    return new Promise(resolve => {
        resolve({ "raw_html": html, "imagedata": imagedata });
    });
}