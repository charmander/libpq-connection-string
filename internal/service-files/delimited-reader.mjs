import {Buffer} from 'node:buffer';

export default class DelimitedReader {
	constructor(service) {
		const serviceLength = Buffer.byteLength(service, 'utf8');
		const pattern = Buffer.alloc(serviceLength + 3);
		pattern[0] = 0x0a;
		pattern[1] = 0x5b;
		pattern.write(service, 2, serviceLength, 'utf8');
		pattern[2 + serviceLength] = 0x5d;

		if (pattern.includes(0x5b, 2) || pattern.includes(0x00, 2) || pattern.includes(0x0a, 2)) {
			throw new Error('Invalid service name: ' + service);
		}

		this._pattern = pattern;
		this._offset = 1;
	}

	add(buf) {
		const pattern = this._pattern;

		if (this._offset !== 0) {
			const advance = Math.min(buf.length, pattern.length - this._offset);

			if (buf.compare(pattern, this._offset, this._offset + advance, 0, advance) === 0) {
				if (advance === buf.length) {
					this._offset += advance;
					return null;
				}

				return buf.slice(advance);
			}

			this._offset = 0;
		}

		const i = buf.indexOf(pattern);

		if (i !== -1) {
			return buf.slice(i + pattern.length);
		}

		const cutoff = Math.max(0, buf.length - pattern.length + 1);

		for (let j = buf.length - 1; j >= cutoff; j--) {
			if (buf[j] === 0x0a) {
				if (buf.compare(pattern, 1, buf.length - j, j + 1, buf.length) === 0) {
					this._offset = buf.length - j;
				}

				break;
			}
		}

		return null;
	}
};
