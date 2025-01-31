import hasUnpairedSurrogates from './internal/has-unpaired-surrogates.mjs';
import indexOfAny from './internal/index-of-any.mjs';
import uriDecodeNoNul from './internal/uri-decode-no-nul.mjs';
import OPTIONS from './internal/options.mjs';

// src/interfaces/libpq/fe-connect.c:5568: parse_connection_string
const parseConnectionString = connectionString => {
	if (typeof connectionString !== 'string') {
		throw new TypeError('Connection string must be a string');
	}

	// libpq normally parses a NUL-terminated string, so it doesn’t have the equivalent of this situation
	if (connectionString.includes('\0')) {
		throw new Error('Connection string can’t contain NUL characters');
	}

	// libpq normally parses a bytestring, but we have a string of UTF-16 text and intend to parse it like libpq would its UTF-8 encoding, so make sure the UTF-16 is valid and can be represented in UTF-8
	if (hasUnpairedSurrogates(connectionString)) {
		throw new Error('Connection string can’t contain unpaired surrogates');
	}

	const uriPrefixLength = getUriPrefixLength(connectionString);

	return uriPrefixLength === 0
		? parseKeyValue(connectionString)
		: parseUri(connectionString, uriPrefixLength);
};

// src/interfaces/libpq/fe-connect.c:5588: uri_prefix_length
const getUriPrefixLength = connectionString => {
	// src/interfaces/libpq/fe-connect.c:371: uri_designator, short_uri_designator
	const prefix = /^postgres(?:ql)?:\/\//.exec(connectionString);

	return prefix === null ? 0 : prefix[0].length;
};

const splitCredentials = uriCredentials => {
	const i = uriCredentials.indexOf(':');
	let encodedUser;
	let encodedPassword;

	if (i === -1) {
		encodedUser = uriCredentials;
		encodedPassword = '';
	} else {
		encodedUser = uriCredentials.substring(0, i);
		encodedPassword = uriCredentials.substring(i + 1);
	}

	return {
		user: encodedUser === '' ? null : uriDecodeNoNul(encodedUser),
		password: encodedPassword === '' ? null : uriDecodeNoNul(encodedPassword),
	};
};

// src/interfaces/libpq/fe-connect.c:191: PQconninfoOptions
const createConnInfo = () => ({
	service: null,
	user: null,
	password: null,
	passfile: null,
	channel_binding: null,
	connect_timeout: null,
	dbname: null,
	host: null,
	hostaddr: null,
	port: null,
	client_encoding: null,
	options: null,
	application_name: null,
	fallback_application_name: null,
	keepalives: null,
	keepalives_idle: null,
	keepalives_interval: null,
	keepalives_count: null,
	tcp_user_timeout: null,
	sslmode: null,
	sslcompression: null,
	sslcert: null,
	sslkey: null,
	sslpassword: null,
	sslrootcert: null,
	sslcrl: null,
	sslcrldir: null,
	sslsni: null,
	requirepeer: null,
	ssl_min_protocol_version: null,
	ssl_max_protocol_version: null,
	gssencmode: null,
	krbsrvname: null,
	gsslib: null,
	replication: null,
	target_session_attrs: null,
});

const parseUri = (connectionString, uriPrefixLength) => {
	const result = createConnInfo();

	// If credentials exist, parse them and start looking for netlocs after them
	// src/interfaces/libpq/fe-connect.c:6168
	const credentialsEnd = indexOfAny(connectionString, '@/', uriPrefixLength);
	let netlocStart;

	if (credentialsEnd !== -1 && connectionString.charAt(credentialsEnd) === '@') {
		netlocStart = credentialsEnd + 1;

		const credentials = splitCredentials(connectionString.substring(uriPrefixLength, credentialsEnd));
		result.user = credentials.user;
		result.password = credentials.password;
	} else {
		netlocStart = uriPrefixLength;
	}

	let hosts = '';
	let ports = '';
	let netlocEnd;

	for (;;) {
		let host;
		let hostEnd;

		if (netlocStart < connectionString.length && connectionString.charAt(netlocStart) === '[') {
			// IPv6 address
			const ipv6End = connectionString.indexOf(']', netlocStart + 1);

			if (ipv6End === -1) {
				throw new Error('Connection string IPv6 address missing closing square bracket');
			}

			if (ipv6End === netlocStart + 1) {
				throw new Error('Connection string IPv6 address can’t be empty');
			}

			host = connectionString.substring(netlocStart + 1, ipv6End);
			hostEnd = ipv6End + 1;
		} else {
			hostEnd = indexOfAny(connectionString, ':/?,', netlocStart);

			if (hostEnd === -1) {
				hostEnd = connectionString.length;
			}

			host = connectionString.substring(netlocStart, hostEnd);
		}

		let separator =
			hostEnd === connectionString.length
				? null
				: connectionString.charAt(hostEnd);

		if (![null, ':', '/', '?', ','].includes(separator)) {
			throw new Error('Connection string host followed by unexpected character: ' + separator);
		}

		hosts += host;

		if (separator === ':') {
			let portEnd = indexOfAny(connectionString, '/?,', hostEnd + 1);

			if (portEnd === -1) {
				portEnd = connectionString.length;
			}

			ports += connectionString.substring(hostEnd + 1, portEnd);

			hostEnd = portEnd;
			separator =
				hostEnd === connectionString.length
					? null
					: connectionString.charAt(hostEnd);
		}

		if (separator !== ',') {
			netlocEnd = hostEnd;
			break;
		}

		hosts += ',';
		ports += ',';
		netlocStart = hostEnd + 1;
	}

	if (hosts !== '') {
		result.host = uriDecodeNoNul(hosts);
	}

	if (ports !== '') {
		result.port = uriDecodeNoNul(ports);
	}

	let dbnameEnd;

	if (netlocEnd < connectionString.length && connectionString.charAt(netlocEnd) === '/') {
		dbnameEnd = connectionString.indexOf('?', netlocEnd + 1);

		if (dbnameEnd === -1) {
			dbnameEnd = connectionString.length;
		}

		if (dbnameEnd !== netlocEnd + 1) {
			result.dbname = uriDecodeNoNul(connectionString.substring(netlocEnd + 1, dbnameEnd));
		}
	} else {
		dbnameEnd = netlocEnd;
	}

	if (dbnameEnd + 1 < connectionString.length) {
		parseUriParams(connectionString.substring(dbnameEnd + 1), result);
	}

	return result;
};

// Parses a non-empty string of URI parameters.
// src/interfaces/libpq/fe-connect.c:6366: conninfo_uri_parse_params
const parseUriParams = (paramsString, result) => {
	const pairs = paramsString.split('&');

	for (const pair of pairs) {
		const pairParts = pair.split('=');

		if (pairParts.length !== 2) {
			throw new Error('Connection string parameter has invalid separators: ' + pair);
		}

		const [encodedKey, encodedValue] = pairParts;
		let key = uriDecodeNoNul(encodedKey);
		let value = uriDecodeNoNul(encodedValue);

		// src/interfaces/libpq/fe-connect.c:6437: Special keyword handling for improved JDBC compatibility
		if (key === 'ssl' && value === 'true') {
			key = 'sslmode';
			value = 'require';
		}

		store(key, value, result);
	}
};

// src/interfaces/libpq/fe-connect.c:6614: conninfo_storeval
const store = (key, value, result) => {
	if (key === 'requiressl') {
		key = 'sslmode';
		value = value.startsWith('1') ? 'require' : 'prefer';
	}

	if (!OPTIONS.has(key)) {
		throw new Error('Connection string parameter unknown: ' + key);
	}

	result[key] = value;
};

const unescapeValue = escapedValue =>
	escapedValue.replace(/\\(.?)/g, '$1');

const parseKeyValue = connectionString => {
	const result = createConnInfo();

	const pair = /[ \f\n\r\t\v]*(?:(?:([^= \f\n\r\t\v]+)[ \f\n\r\t\v]*)?=[ \f\n\r\t\v]*((?!')(?:[^ \f\n\r\t\v\\]|\\[^]?)+|'(?:[^'\\]|\\[^])*('?)|)|([^ \f\n\r\t\v]+))/y;

	for (let match; (match = pair.exec(connectionString)) !== null;) {
		if (match[4] !== undefined) {
			throw new Error(`Connection string missing “=” after “${match[4]}”`);
		}

		const key = match[1] ?? '';

		let escapedValue;

		if (match[3] === undefined) {
			escapedValue = match[2];
		} else {
			if (match[3] === '') {
				throw new Error('Connection string missing closing quote');
			}

			escapedValue = match[2].slice(1, -1);
		}

		store(key, unescapeValue(escapedValue), result);
	}

	return result;
};

export default parseConnectionString;
