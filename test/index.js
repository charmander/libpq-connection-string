'use strict';

const {promisify} = require('util');
const assert = require('assert').strict;
const execFileAsync = promisify(require('child_process').execFile);
const path = require('path');
const test = require('@charmander/test')(module);
const parseConnectionString = require('../');

const referencePath = path.join(__dirname, 'reference');

class NullTerminatedIterator {
	constructor(string, position) {
		this.string = string;
		this.position = position;
	}

	next() {
		const start = this.position;
		const end = this.string.indexOf('\0', start);

		if (end === -1) {
			throw new Error('Missing null terminator');
		}

		this.position = end + 1;
		return {
			done: false,
			value: this.string.substring(start, end),
		};
	}

	[Symbol.iterator]() {
		return this;
	}
}

const getReference = async connectionString => {
	const {stdout} = await execFileAsync(referencePath, [connectionString]);

	if (stdout.startsWith('error\0')) {
		return {err: stdout.slice(6, -1).trimEnd()};
	}

	if (!stdout.startsWith('ok\0')) {
		throw new Error('Unexpected reference output');
	}

	const result = {};
	const iter = new NullTerminatedIterator(stdout, 3);

	for (const key of iter) {
		if (key === '') {
			break;
		}

		result[key] = iter.next().value;
	}

	for (const key of iter) {
		if (key === '') {
			break;
		}

		result[key] = null;
	}

	if (iter.position !== stdout.length) {
		throw new Error('Unexpected trailing output');
	}

	assert(delete result.authtype);
	assert(delete result.tty);
	return {ok: result};
};

test.group('reference', test => {
	const testReference = value => {
		test(JSON.stringify(value), async () => {
			const reference = await getReference(value);

			if (reference.err !== undefined) {
				assert.throws(() => parseConnectionString(value), err => {
					console.error(
						`  ours:  ${err.message}\n`
						+ `  libpq: ${reference.err}`
					);
					return true;
				});
			} else {
				assert.deepEqual(parseConnectionString(value), reference.ok);
			}
		});
	};

	[
		'postgresql://127.0.0.1%2c127.0.0.2/',
		'postgresql://127.0.0.2,/',
		'postgresql://[,/:?]/',

		'host = spaces.test',
		'host=/run/trailing-backslash-test\\ port=5432',
		'host=/run/trailing-backslash-test\\',
		"host='/run/quoted-trailing-backslash-test\\",
	].forEach(testReference);
});
