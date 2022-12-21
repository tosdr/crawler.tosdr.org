function success(args) {
    let _data = {
        error: false,
        message: {
            name: null,
			crawler: process.env.CRAWLER_NAME,
            remoteStacktrace: null
        },
    };
    if (typeof args === "object") {
        for (const [key, value] of Object.entries(args)) {
            _data[key] = value;
        }
    }

    return _data;
}

module.exports = success;
