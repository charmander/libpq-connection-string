const indexOfAny = (string, chars, start) => {
	const charSet = new Set(chars);

	for (let i = start; i < string.length; i++) {
		if (charSet.has(string.charAt(i))) {
			return i;
		}
	}

	return -1;
};

export default indexOfAny;
