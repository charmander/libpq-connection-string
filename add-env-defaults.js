'use strict';

const os = require('os');
const OPTIONS = require('./internal/options');

const tryGetUsername = () => {
	try {
		return os.userInfo().username;
	} catch (err) {
		if (err.code !== 'ERR_SYSTEM_ERROR') {
			throw err;
		}
	}

	return null;
};

// src/interfaces/libpq/fe-connect.c:5663: conninfo_add_defaults
const addEnvDefaults = result => {
	for (const [name, {envName, fallbackDefault}] of OPTIONS) {
		if (result[name] !== null) {
			continue;
		}

		if (envName !== null && envName in process.env) {
			result[name] = process.env[envName];
		} else if (name === 'sslmode' && 'PGREQUIRESSL' in process.env && process.env.PGREQUIRESSL.startsWith('1')) {
			result.sslmode = 'require';
		} else if (fallbackDefault !== null) {
			result[name] = fallbackDefault;
		} else if (name === 'user') {
			result.user = tryGetUsername();
		}
	}
};

module.exports = addEnvDefaults;
