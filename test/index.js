'use strict';

const {promisify} = require('util');
const assert = require('assert').strict;
const execFileAsync = promisify(require('child_process').execFile);
const path = require('path');

// `describe` is compatible back to Node 18
const {describe: suite, test} = require('node:test');

const parseConnectionString = require('../');

// A temporary convenience for testing against reference versions of libpq that are different from the one this implementation is based on, but close enough.
const REFERENCE_TEST_NULLS = false;

const referencePath = path.join(__dirname, 'reference');

class NullTerminatedIterator {
	constructor(string, position) {
		this.string = string;
		this.position = position;
	}

	next() {
		const start = this.position;
		const end = this.string.indexOf('\0', start);

		/* node:coverage ignore next 3 */
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

	/* node:coverage ignore next 3 */
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

	/* node:coverage ignore next 3 */
	if (iter.position !== stdout.length) {
		throw new Error('Unexpected trailing output');
	}

	return {ok: result};
};

const filterOptions =
	REFERENCE_TEST_NULLS
		? options => options
		: options => Object.fromEntries(Object.entries(options).filter(([k, v]) => v !== null));

const testReference = (test, expect) => value => {
	test(JSON.stringify(value), async () => {
		const reference = await getReference(value);

		if (expect !== undefined) {
			assert.equal(reference.err === undefined ? 'success' : 'failure', expect);
		}

		if (reference.err !== undefined) {
			assert.throws(() => parseConnectionString(value), err => {
				console.log(
					`  ours:  ${err.message}\n`
					+ `  libpq: ${reference.err}`
				);
				return true;
			});
		} else {
			assert.deepEqual(filterOptions(parseConnectionString(value)), filterOptions(reference.ok));
		}
	});
};

suite('reference', () => {
	[
		'',
		' ',

		'postgresql://foo:bar@baz/quux?application_name=App',
		'postgresql://foo:@baz/quux?application_name=App',
		'postgresql://:@baz/quux?application_name=App',
		'postgresql://:bar@baz/quux?application_name=App',
		'postgresql://foo:%380/',
		'postgresql://%66oo/',
		'postgresql://127.0.0.1%2c127.0.0.2/',
		'postgresql://127.0.0.2,/',
		'postgresql://[,/:?]/',

		'host = spaces.test',
		'host=/run/trailing-backslash-test\\ port=5432',
		'host=/run/trailing-backslash-test\\',
		"user='' password=''",
		'user=\u{1f525}',

		'postgresql:///?ssl=true',
		'postgresql:///?ssl=tru%65',
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
	].forEach(testReference(test, 'success'));

	[
		"host='/run/quoted-trailing-backslash-test\\",

		'postgresql:///?ssl=truE',
		'ssl=true',
	].forEach(testReference(test, 'failure'));
});

suite('libpq', () => {
	// src/interfaces/libpq/t/001_uri.pl
	const tests = [
		{
			url: 'postgresql://uri-user:secret@host:12345/db',
			kv: "user='uri-user' password='secret' dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://uri-user:secret@host:12345/db',
			kv: "user='uri-user' password='secret' dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://uri-user@host:12345/db',
			kv: "user='uri-user' dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://uri-user@host/db',
			kv: "user='uri-user' dbname='db' host='host'",
		},
		{
			url: 'postgresql://host:12345/db',
			kv: "dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://host/db',
			kv: "dbname='db' host='host'",
		},
		{
			url: 'postgresql://uri-user@host:12345/',
			kv: "user='uri-user' host='host' port='12345'",
		},
		{
			url: 'postgresql://uri-user@host/',
			kv: "user='uri-user' host='host'",
		},
		{
			url: 'postgresql://uri-user@',
			kv: "user='uri-user'",
		},
		{
			url: 'postgresql://host:12345/',
			kv: "host='host' port='12345'",
		},
		{
			url: 'postgresql://host:12345',
			kv: "host='host' port='12345'",
		},
		{
			url: 'postgresql://host/db',
			kv: "dbname='db' host='host'",
		},
		{
			url: 'postgresql://host/',
			kv: "host='host'",
		},
		{
			url: 'postgresql://host',
			kv: "host='host'",
		},
		{
			url: 'postgresql://',
			kv: '',
		},
		{
			url: 'postgresql://?hostaddr=127.0.0.1',
			kv: "hostaddr='127.0.0.1'",
		},
		{
			url: 'postgresql://example.com?hostaddr=63.1.2.4',
			kv: "host='example.com' hostaddr='63.1.2.4'",
		},
		{
			url: 'postgresql://%68ost/',
			kv: "host='host'",
		},
		{
			url: 'postgresql://host/db?user=uri-user',
			kv: "user='uri-user' dbname='db' host='host'",
		},
		{
			url: 'postgresql://host/db?user=uri-user&port=12345',
			kv: "user='uri-user' dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://host/db?u%73er=someotheruser&port=12345',
			kv: "user='someotheruser' dbname='db' host='host' port='12345'",
		},
		{
			url: 'postgresql://host:12345?user=uri-user',
			kv: "user='uri-user' host='host' port='12345'",
		},
		{
			url: 'postgresql://host?user=uri-user',
			kv: "user='uri-user' host='host'",
		},
		{
			url: 'postgresql://host?',
			kv: "host='host'",
		},
		{
			url: 'postgresql://[::1]:12345/db',
			kv: "dbname='db' host='::1' port='12345'",
		},
		{
			url: 'postgresql://[::1]/db',
			kv: "dbname='db' host='::1'",
		},
		{
			url: 'postgresql://[2001:db8::1234]/',
			kv: "host='2001:db8::1234'",
		},
		{
			url: 'postgresql://[200z:db8::1234]/',
			kv: "host='200z:db8::1234'",
		},
		{
			url: 'postgresql://[::1]',
			kv: "host='::1'",
		},
		{
			url: 'postgres://',
			kv: '',
		},
		{
			url: 'postgres:///',
			kv: '',
		},
		{
			url: 'postgres:///db',
			kv: "dbname='db'",
		},
		{
			url: 'postgres://uri-user@/db',
			kv: "user='uri-user' dbname='db'",
		},
		{
			url: 'postgres://?host=/path/to/socket/dir',
			kv: "host='/path/to/socket/dir'",
		},
		{
			url: 'postgres://@host',
			kv: "host='host'",
		},
		{
			url: 'postgres://host:/',
			kv: "host='host'",
		},
		{
			url: 'postgres://:12345/',
			kv: "port='12345'",
		},
		{
			url: 'postgres://otheruser@?host=/no/such/directory',
			kv: "user='otheruser' host='/no/such/directory'",
		},
		{
			url: 'postgres://otheruser@/?host=/no/such/directory',
			kv: "user='otheruser' host='/no/such/directory'",
		},
		{
			url: 'postgres://otheruser@:12345?host=/no/such/socket/path',
			kv: "user='otheruser' host='/no/such/socket/path' port='12345'",
		},
		{
			url: 'postgres://otheruser@:12345/db?host=/path/to/socket',
			kv: "user='otheruser' dbname='db' host='/path/to/socket' port='12345'",
		},
		{
			url: 'postgres://:12345/db?host=/path/to/socket',
			kv: "dbname='db' host='/path/to/socket' port='12345'",
		},
		{
			url: 'postgres://:12345?host=/path/to/socket',
			kv: "host='/path/to/socket' port='12345'",
		},
		{
			url: 'postgres://%2Fvar%2Flib%2Fpostgresql/dbname',
			kv: "dbname='dbname' host='/var/lib/postgresql'",
		},
	];

	for (const {url, kv} of tests) {
		test(JSON.stringify(url), () => {
			assert.deepEqual(parseConnectionString(url), parseConnectionString(kv));
		});
	}

	test('errors', () => {
		const errorTests = [
			{
				url: 'postgresql://host/db?u%7aer=someotheruser&port=12345',
				error: 'invalid URI query parameter: "uzer"',
			},
			{
				url: 'postgresql://host?uzer=',
				error: 'invalid URI query parameter: "uzer"',
			},
			{
				url: 'postgre://',
				error: 'missing "=" after "postgre://" in connection info string',
			},
			{
				url: 'postgres://[::1',
				error: 'end of string reached when looking for matching "]" in IPv6 host address in URI: "postgres://[::1"',
			},
			{
				url: 'postgres://[]',
				error: 'IPv6 host address may not be empty in URI: "postgres://[]"',
			},
			{
				url: 'postgres://[::1]z',
				error: 'unexpected character "z" at position 17 in URI (expected ":" or "/"): "postgres://[::1]z"',
			},
			{
				url: 'postgresql://host?zzz',
				error: 'missing key/value separator "=" in URI query parameter: "zzz"',
			},
			{
				url: 'postgresql://host?value1&value2',
				error: 'missing key/value separator "=" in URI query parameter: "value1"',
			},
			{
				url: 'postgresql://host?key=key=value',
				error: 'extra key/value separator "=" in URI query parameter: "key"',
			},
			{
				url: 'postgres://host?dbname=%XXfoo',
				error: 'invalid percent-encoded token: "%XXfoo"',
			},
			{
				url: 'postgresql://a%00b',
				error: 'forbidden value %00 in percent-encoded value: "a%00b"',
			},
			{
				url: 'postgresql://%zz',
				error: 'invalid percent-encoded token: "%zz"',
			},
			{
				url: 'postgresql://%1',
				error: 'invalid percent-encoded token: "%1"',
			},
			{
				url: 'postgresql://%',
				error: 'invalid percent-encoded token: "%"',
			},
		];

		for (const {url, error: expectedError} of errorTests) {
			assert.throws(() => parseConnectionString(url), err => {
				console.log(
					`  ours:  ${err.message}\n`
					+ `  libpq: ${expectedError}`
				);
				return true;
			});
		}
	});
});

suite('interface', () => {
	test('invalid connection string type', () => {
		assert.throws(() => parseConnectionString(1), /^TypeError: Connection string must be a string$/);
	});

	test('invalid connection string encoding', () => {
		assert.throws(() => parseConnectionString('user=postgres\0'), /^Error: Connection string can’t contain NUL characters$/);

		for (const unpaired of [
			'user=' + '\u{1f525}'.charAt(0),
			'user=' + '\u{1f525}'.charAt(0) + 'x',
			'user=' + '\u{1f525}'.charAt(0).repeat(2),
			'user=' + '\u{1f525}'.charAt(1),
			'user=' + '\u{1f525}'.charAt(1) + 'x',
			'user=' + '\u{1f525}'.charAt(1).repeat(2),
			'user=' + '\u{1f525}'.split('').reverse().join(''),
		]) {
			assert.throws(() => parseConnectionString(unpaired), /^Error: Connection string can’t contain unpaired surrogates$/);
		}
	});
});
