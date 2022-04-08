function error(name, remoteStacktrace) {
	return {
		error: true,
		message: {
			name: name,
			remoteStacktrace: remoteStacktrace
		}
	}
}

module.exports = error;