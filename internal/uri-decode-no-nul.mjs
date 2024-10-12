// src/interfaces/libpq/fe-connect.c:6196: conninfo_uri_decode
const uriDecodeNoNul = encoded => {
	const decoded = decodeURIComponent(encoded);

	if (decoded.includes('\0')) {
		throw new Error('Connection string can’t contain encoded NUL characters');
	}

	return decoded;
};

export default uriDecodeNoNul;
