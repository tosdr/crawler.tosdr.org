function error(name, remoteStacktrace) {
	return {
		error: true,
		message: {
			name: name,
			crawler: process.env.CRAWLER_NAME,
			remoteStacktrace: remoteStacktrace,
		}
	}
}

module.exports = error;
