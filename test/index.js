'use strict';

const {promisify} = require('util');
const assert = require('assert').strict;
const execFileAsync = promisify(require('child_process').execFile);
const fs = require('fs');
const path = require('path');
const test = require('@charmander/test')(module);
const parseConnectionString = require('../');

const referencePath = path.join(__dirname, 'reference');

const getLines = text => {
	const lines = text.split(/\r?\n/);

	if (lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines;
};

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

const testReference = (test, expect) => value => {
	test(JSON.stringify(value), async () => {
		const reference = await getReference(value);

		if (expect !== undefined) {
			assert.equal(reference.err === undefined ? 'success' : 'failure', expect);
		}

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

test.group('reference', test => {
	[
		'',
		' ',

		'postgresql://foo:bar@baz/quux?application_name=App',
		'postgresql://foo:@baz/quux?application_name=App',
		'postgresql://:@baz/quux?application_name=App',
		'postgresql://:bar@baz/quux?application_name=App',
		'postgresql://127.0.0.1%2c127.0.0.2/',
		'postgresql://127.0.0.2,/',
		'postgresql://[,/:?]/',

		'host = spaces.test',
		'host=/run/trailing-backslash-test\\ port=5432',
		'host=/run/trailing-backslash-test\\',
		"user='' password=''",
		'user=\u{1f525}',

		'postgresql:///?ssl=true',
		'postgresql:///?requiressl=',
		'postgresql:///?requiressl=0',
		'postgresql:///?requiressl=1',
		'postgresql:///?requiressl=2',
		'postgresql:///?requiressl=foo',
		'postgresql:///?requiressl=1foo',
		'requiressl=',
		'requiressl=0',
		'requiressl=1',
		'requiressl=2',
		'requiressl=foo',
		'requiressl=1foo',

		'postgresql://baz/?authtype=foo&tty=bar',
		'authtype=foo tty=bar host=baz',
	].forEach(testReference(test, 'success'));

	[
		"host='/run/quoted-trailing-backslash-test\\",

		'ssl=true',
	].forEach(testReference(test, 'failure'));
});

test.group('libpq', test => {
	const lines = getLines(fs.readFileSync(path.join(__dirname, '../postgres/src/interfaces/libpq/test/regress.in'), 'utf8'));

	lines.forEach(testReference(test));
});

test.group('interface', test => {
	test('invalid connection string type', () => {
		assert.throws(() => parseConnectionString(1), /^TypeError: Connection string must be a string$/);
	});

	test('invalid connection string encoding', () => {
		assert.throws(() => parseConnectionString('user=postgres\0'), /^Error: Connection string can’t contain NUL characters$/);
		assert.throws(() => parseConnectionString('user=\u{1f525}'.slice(0, -1)), /^Error: Connection string can’t contain unpaired surrogates$/);
	});
});
