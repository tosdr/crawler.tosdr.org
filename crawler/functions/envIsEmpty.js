function envIsEmpty(_Variable) {
	return (typeof process.env[_Variable] === "undefined" ? true : process.env[_Variable].length === 0);
}

module.exports = envIsEmpty;