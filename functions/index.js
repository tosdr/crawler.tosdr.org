module.exports = {
	crawl: require('./async.crawl'),
	response: {
		error: require('./error'),
		success: require('./success')
	}
}