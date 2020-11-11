'use strict';

const fs = require('fs');
const ServiceFilePathIterator = require('./internal/service-files/path-iterator');
const ServiceFileReader = require('./internal/service-files/reader');

const BUFFER_SIZE = 4096;

const addServiceDefaultsSync = result => {
	const paths = new ServiceFilePathIterator(result);

	if (paths.service === null) {
		return;
	}

	const reader = new ServiceFileReader(result, paths.service);
	const buf = Buffer.alloc(BUFFER_SIZE);

	for (;;) {
		const p = paths.next();

		let fd;

		try {
			fd = fs.openSync(p);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}

			continue;
		}

		try {
			for (;;) {
				const bytesRead = fs.readSync(fd, buf, 0, BUFFER_SIZE, null);

				if (reader.add(buf.slice(0, bytesRead))) {
					return;
				}

				if (bytesRead === 0) {
					break;
				}
			}
		} finally {
			fs.closeSync(fd);
		}
	}
};

module.exports = addServiceDefaultsSync;
