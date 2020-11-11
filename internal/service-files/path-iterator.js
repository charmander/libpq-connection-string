'use strict';

const os = require('os');
const path = require('path');
const SYSCONFDIR = '/etc/postgresql';

const tryGetHomedir = () => {
	try {
		return os.homedir();
	} catch (err) {
		if (err.code !== 'ERR_SYSTEM_ERROR') {
			throw err;
		}
	}

	return null;
};

const tryGetUserServiceFilePath = () => {
	const homedir = tryGetHomedir();

	return homedir === null
		? null
		: path.join(homedir, '.pg_service.conf');
};

// src/interfaces/libpq/fe-connect.c:4957: parse_service_info
class ServiceFilePathIterator {
	constructor(result) {
		this.service =
			result.service !== null ? result.service
			: 'PGSERVICE' in process.env ? process.env.PGSERVICE
			: null;
		this._current = 0;
	}

	next() {
		switch (this._current++) {
			case 0:
				if ('PGSERVICEFILE' in process.env) {
					return process.env.PGSERVICEFILE;
				}

				{
					const userServiceFilePath = tryGetUserServiceFilePath();

					if (userServiceFilePath !== null) {
						return userServiceFilePath;
					}
				}

				this._current++;
				// fallthrough

			case 1:
				return path.join(
					'PGSYSCONFDIR' in process.env
						? process.env.PGSYSCONFDIR
						: SYSCONFDIR,
					'pg_service.conf'
				);

			default:
				throw new Error('Definition of service not found: ' + this.service);
		}
	}
}

module.exports = ServiceFilePathIterator;
