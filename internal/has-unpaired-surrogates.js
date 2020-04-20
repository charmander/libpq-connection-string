'use strict';

const hasUnpairedSurrogates = text => {
	let leading = false;

	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);

		if (code >= 0xd800 && code <= 0xdfff) {
			const newLeading = code < 0xdc00;

			if (newLeading === leading) {
				return true;
			}

			leading = newLeading;
		} else if (leading) {
			return true;
		}
	}

	return leading;
};

module.exports = hasUnpairedSurrogates;
