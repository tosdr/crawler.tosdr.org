const fs = require('fs');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
const http = require('http');
const dotenv = require('dotenv');
const color = require('chalk');
const url = require('url');
require('chromedriver');

let dotenvparsed = dotenv.config();
let options = new chrome.Options();
options.setChromeBinaryPath(chromium.path);
options.addArguments('--headless');
options.addArguments('--disable-gpu');
options.addArguments('--window-size=1280,960');
options.addArguments('--no-sandbox');

const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
	
const httpserver = http.createServer((req, res) => {
	const query = url.parse(req.url,true).query;
	res.writeHead(200, { 'content-type': 'application/json' })
	let data = {"error": false, "message": {"name": null, "remoteStacktrace": null}}
	if(!query.apikey || !query.url || !query.xpath){
		data["error"] = true;
		data["message"] = {
			"name": "RequestArgumentErr",
			"remoteStacktrace": "Required arguments missing"
		};
		data["xpath"] = query.xpath;
		data["url"] = query.url;
		res.write(JSON.stringify(data));
		res.end();
		return;
	}
	if(query.xpath === ""){
		query.xpath = "//body";
	}
	if(query.apikey !== process.env.API_KEY){
		data["error"] = true;
		data["message"] = {
			"name": "RequestArgumentErr",
			"remoteStacktrace": "Invalid API Key"
		};
		data["xpath"] = query.xpath;
		data["url"] = query.url;
		res.write(JSON.stringify(data));
		res.end();
		return;
	}
	
	if(req.method !== "GET"){
		data["error"] = true;
		data["message"] = {
			"name": "RequestMethodErr",
			"remoteStacktrace": "Only GET is supported"
		};
		data["xpath"] = query.xpath;
		data["url"] = query.url;
		res.write(JSON.stringify(data));
		res.end();
		return;
	}
	driver.get(query.url).then(() => {
		driver.findElement(webdriver.By.xpath(query.xpath)).then((page) => {
			page.getAttribute('innerHTML').then((html) => {
				data["raw_html"] = html;
				data["xpath"] = query.xpath;
				data["url"] = query.url;
				driver.takeScreenshot().then((imagedata) => {
					data["imagedata"] = imagedata;
					res.write(JSON.stringify(data));
					res.end();
					//driver.quit();
				}).catch((err) => {
				data["error"] = true;
				data["message"] = err;
				data["xpath"] = query.xpath;
				data["url"] = query.url;
				res.write(JSON.stringify(data));
				res.end();
				//driver.quit();
			});
			}).catch((err) => {
				data["error"] = true;
				data["message"] = err;
				data["xpath"] = query.xpath;
				data["url"] = query.url;
				res.write(JSON.stringify(data));
				res.end();
				//driver.quit();
			});
		}).catch((err) => {
			data["error"] = true;
			data["message"] = err;
			data["xpath"] = query.xpath;
			data["url"] = query.url;
			res.write(JSON.stringify(data));
			res.end();
			//driver.quit();
		});
	}).catch((err) => {
		data["error"] = true;
		data["message"] = err;
		
		data["xpath"] = query.xpath;
		data["url"] = query.url;
		res.write(JSON.stringify(data));
		res.end();
	});
});

httpserver.listen(parseInt(process.env.HTTP_PORT), process.env.HTTP_BIND, () => {
		console.log(color.green(`HTTP Web server started on port ${color.cyan(process.env.HTTP_BIND)}:${color.cyan(process.env.HTTP_PORT)}`));
		console.log(color.blue("********************** Done ************************"));
		console.log(color.green("HTTP Server is now ready to accept connections"));
});