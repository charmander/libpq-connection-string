'use strict';

const DelimitedReader = require('./delimited-reader');
const OPTIONS = require('../options');

class ServiceFileReader {
	constructor(result, service) {
		this._found = false;
		this._delimitedReader = new DelimitedReader(service);
		this._groupReader = new ServiceGroupReader(result);
	}

	add(buf) {
		if (buf.includes(0)) {
			throw new Error('Service file can’t contain NUL characters');
		}

		if (this._found) {
			const done = this._groupReader.add(buf);

			if (done) {
				this._groupReader = null;
			}

			return done;
		}

		if (buf.length === 0) {
			this._delimitedReader = null;
			this._groupReader = null;
			return false;
		}

		const forward = this._delimitedReader.add(buf);

		if (forward !== null) {
			this._found = true;
			this._delimitedReader = null;

			if (forward.length !== 0) {
				return this._groupReader.add(forward);
			}
		}

		return false;
	}
}

const STATE_IGNORED = 0;
const STATE_START_OF_LINE = 1;
const STATE_NAME = 2;
const STATE_VALUE = 3;

const SPACES = Buffer.from(' \n\r\t\f\v', 'ascii');

class ServiceGroupReader {
	constructor(result) {
		this._result = result;
		this._name = null;
		this._value = null;
		this._state = STATE_IGNORED;
	}

	_store() {
		if (!OPTIONS.has(this._name)) {
			throw new Error('Service file option unknown: ' + this._name);
		}

		this._result[this._name] =
			this._value.endsWith('\r')
				? this._value.slice(0, -1)
				: this._value;
		this._name = null;
		this._value = null;
	}

	add(buf) {
		if (buf.length === 0) {
			switch (this._state) {
				case STATE_NAME:
					throw new Error('Service file option missing = separator');

				case STATE_VALUE:
					this._store();
					// fallthrough

				default:
					return true;
			}
		}

		let i = 0;

		do {
			switch (this._state) {
				case STATE_IGNORED: {
					const end = buf.indexOf(0x0a, i);  // '\n'

					if (end === -1) {
						return false;
					}

					this._state = STATE_START_OF_LINE;
					i = end + 1;
					break;
				}

				case STATE_START_OF_LINE:
					// ignore blank lines and whitespace at the start of lines
					for (;;) {
						if (!SPACES.includes(buf[i])) {
							break;
						}

						if (++i === buf.length) {
							return false;
						}
					}

					switch (buf[i]) {
						case 0x23:  // '#', a comment
							this._state = STATE_IGNORED;
							i++;
							break;

						case 0x5b:  // '[', a new group
							return true;

						default:
							this._state = STATE_NAME;
							this._name = '';
							break;
					}

					break;

				case STATE_NAME: {
					const end = buf.indexOf(0x3d, i);  // '='

					if (end === -1) {
						if (buf.includes(0x0a, i)) {
							throw new Error('Service file line missing =');
						}

						this._name += buf.toString('utf8', i, buf.length);
						return false;
					}

					this._name += buf.toString('utf8', i, end);
					this._value = '';
					this._state = STATE_VALUE;
					i = end + 1;
					break;
				}

				case STATE_VALUE: {
					const end = buf.indexOf(0x0a, i);  // '\n'

					if (end === -1) {
						this._value += buf.toString('utf8', i, buf.length);
						return false;
					}

					this._value += buf.toString('utf8', i, end);
					this._store();
					this._state = STATE_START_OF_LINE;
					i = end + 1;
					break;
				}

				default:
					throw new Error('Unexpected');
			}
		} while (i !== buf.length);

		return false;
	}
}

module.exports = ServiceFileReader;
