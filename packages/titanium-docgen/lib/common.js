/**
 * Copyright (c) 2015-2018 Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License.
 *
 * Common Library for Doctools
 */
'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const colors = require('colors'); // eslint-disable-line no-unused-vars
const nodeappc = require('node-appc');
const path = require('path');
const MarkdownIt = require('markdown-it');
const ignoreList = [ 'node_modules', '.travis.yml' ];
const LOG_INFO = 0;
const LOG_WARN = LOG_INFO + 1;
const LOG_ERROR = LOG_WARN + 1;

let logLevel = LOG_INFO;
let md;

exports.VALID_PLATFORMS = [ 'android', 'blackberry', 'iphone', 'ipad', 'windowsphone', 'macos' ];
exports.VALID_OSES = [ 'android', 'blackberry', 'ios', 'windowsphone' ];
exports.DEFAULT_VERSIONS = {
	android: '0.8',
	iphone: '0.8',
	ipad: '0.8',
	macos: '9.2.0'
};
exports.ADDON_VERSIONS = {
	blackberry: '3.1.2',
	windowsphone: '4.1.0'
};

exports.SIMPLE_TYPES = [
	'ArrayBuffer',
	'Boolean',
	'Date',
	'Error',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Number',
	'Object',
	'RegExp',
	'String',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'any' // TODO: Add undefined?
];
// Mapping from base type name to number of generic types required (0 means 0-Infinity)
exports.COMPLEX_TYPES = new Map([
	[ 'Array', 1 ],
	[ 'Callback', 0 ], // alias for Function
	[ 'Dictionary', 1 ], // alias for generic JS Object
	[ 'Function', 0 ],
	[ 'Map', 2 ],
	[ 'Promise', 1 ],
	[ 'Set', 1 ],
]);

// TODO: Add null, undefined, Arguments, Infinity, NaN, Symbol, BigInt stuff?
exports.DATA_TYPES = [].concat(exports.SIMPLE_TYPES, Array.from(exports.COMPLEX_TYPES.keys()));
exports.PRETTY_PLATFORM = {
	android: 'Android',
	blackberry: 'BlackBerry',
	ios: 'iOS',
	iphone: 'iPhone',
	ipad: 'iPad',
	macos: 'macOS',
	tizen: 'Tizen',
	windowsphone: 'Windows'
};

// Matches FOO_CONSTANT
exports.REGEXP_CONSTANTS = /^[A-Z_0-9]*$/;

// Matches <a href="...">Foo</a>
exports.REGEXP_HREF_LINK = /<a href="(.+?)">(.+?)<\/a>/;
exports.REGEXP_HREF_LINKS = /<a href="(.+?)">(.+?)<\/a>/g;

// Matches <code>, </code>, etc.
exports.REGEXP_HTML_TAG = /<\/?[a-z]+[^>]*>/;

// Matches <Titanium.UI.Window>, <ItemTemplate>, etc. (and HTML tags)
exports.REGEXP_CHEVRON_LINK = /<([^>]+?)>/;
exports.REGEXP_CHEVRON_LINKS = /(?!`)<[^>]+?>(?!`)/g;

/**
 * Converts a Markdown string to HTML
 * @param {string} text markdown to convert to html
 * @return {string} HTML
 */
exports.markdownToHTML = function markdownToHTML(text) {
	if (!md) {
		throw new Error('Markdown parser not initalized. Call "createMarkdown" before trying to render any markdown.');
	}
	return md.render(text).trim();
};

exports.LOG_INFO = LOG_INFO;
exports.LOG_WARN = LOG_WARN;
exports.LOG_ERROR = LOG_ERROR;

/**
 * Logs output
 * @param {number} level log level
 * @param {string} message log message
 */
exports.log = function log(level, message) {
	const args = [];

	if (level < logLevel) {
		return;
	}

	if (arguments.length >= 3) {
		for (const key in arguments) {
			args.push(arguments[key]);
		}
		args.splice(0, 2);
	}

	if (typeof level === 'string') {
		console.info.apply(this, arguments);
	} else {
		switch (level) {
			case LOG_INFO:
				message = '[INFO] ' + message;
				args.unshift(message.white);
				console.info.apply(this, args);
				break;
			case LOG_WARN:
				message = '[WARN] ' + message;
				args.unshift(message.yellow);
				console.warn.apply(this, args);
				break;
			case LOG_ERROR:
				message = '[ERROR] ' + message;
				args.unshift(message.red);
				console.error.apply(this, args);
				break;
		}
	}
};

/**
 * Sets the log level for output
 * @param {number} level target log level for filtering
 */
exports.setLogLevel = function setLogLevel(level) {
	logLevel = level;
};

/**
 * Determines if the key exists in the object and is defined
 * Also if it's array, make sure the array is not empty
 * @param {object} obj an object
 * @param {object} key an expected key on the object
 * @return {boolean} true if the object has a value for the key (and if it's an array, it has to have at least one element)
 */
exports.assertObjectKey = function assertObjectKey(obj, key) {
	if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
		if (Array.isArray(obj[key])) {
			if (obj[key].length > 0) {
				return true;
			}
		} else {
			return true;
		}
	}
	return false;
};

/**
 * Error message
 * @return {string} error message
 */
function errorMessage() {
	return 'ERROR: Missing name for doc in file';
}

/**
 * Recursively find, load and parse YAML files
 * @param {Object} rootPath Root path to start search
 * @returns {Object} Dictionary containing the parsed data and any YAML errors
 */
exports.parseYAML = function parseYAML(rootPath) {
	const rv = {
		data: {},
		errors: []
	};
	let currentFile = rootPath;
	try {
		const fsArray = fs.readdirSync(rootPath);
		fsArray.forEach(function (fsElement) {
			const elem = path.join(rootPath, fsElement);
			const stat = fs.statSync(elem);
			currentFile = elem;

			if (~ignoreList.indexOf(fsElement)) {
				return;
			}

			if (stat.isDirectory()) {
				nodeappc.util.mixObj(rv, parseYAML(elem));
			} else if (stat.isFile()) {
				if (elem.split('.').pop() === 'yml') {
					try {
						const fileBuffer = fs.readFileSync(elem, 'utf8');
						// remove comments
						fileBuffer.replace(/\w*#.*/, '');
						yaml.loadAll(fileBuffer, function (doc) {
							if (!doc.name) {
								rv.errors.push({ toString: errorMessage(), __file: currentFile });
								return;
							}
							// data does not exist in doc
							if (!rv.data[doc.name]) {
								rv.data[doc.name] = doc;
								rv.data[doc.name].__file = currentFile;
							} else {
								rv.errors.push({
									toString: function () {
										return 'Duplicate key: ' + doc.name + '. Please rename the key to be unique!';
									},
									__file: currentFile
								});
							}
						});
					} catch (e) {
						e.__file = currentFile;
						rv.errors.push(e);
					}
				}
			}
		});
	} catch (e) {
		e.__file = currentFile;
		rv.errors.push(e);
	}
	return rv;
};

/**
 * Find the API in the docs
 * @param {Object} doc full api tree
 * @param {Object} className class name
 * @param {Object} memberName member name
 * @param {Object} type sub-type of class?
 * @return {boolean} true if found, false otherwise
 */
exports.findAPI = function findAPI(doc, className, memberName, type) {
	var cls = doc[className];
	var x = 0;

	if (cls && type in cls && cls[type]) {
		for (x = 0; x < cls[type].length; x++) {
			if (cls[type][x].name === memberName) {
				return true;
			}
		}
	}
	return false;
};

exports.createMarkdown = function createMarkdown(doc) {
	const typeLinkPattern = /^<([a-zA-Z][a-zA-Z0-9._]+)>/;
	md = new MarkdownIt({
		html: true
	});
	md.use(typeAutolinkPlugin);

	/**
	 * Adds a new rule to the inline parser to automatically create link tokens
   * for types, e.g. `<Titanium.UI.View>`.
	 *
	 * @param {MarkdownIt} md markdown-it parser instance
	 */
	function typeAutolinkPlugin(md) {
		md.inline.ruler.after('autolink', 'type-autolink', (state, silent) => {
			const pos = state.pos;
			if (state.src.charCodeAt(pos) !== 0x3C/* < */) {
				return false;
			}

			const tail = state.src.slice(pos);
			if (tail.indexOf('>') === -1) {
				return false;
			}

			if (typeLinkPattern.test(tail)) {
				const linkMatch = tail.match(typeLinkPattern);
				const url = linkMatch[0].slice(1, -1);
				if (!isValidType(url)) {
					return false;
				}
				if (!silent) {
					let token;
					token = state.push('link_open', 'a', 1);
					token.attrs = [ [ 'href', url ] ];
					token.markup = 'autolink';
					token.info = 'auto';

					token = state.push('text', '', 0);
					token.content = url;

					token = state.push('link_close', 'a', -1);
					token.markup = 'autolink';
					token.info = 'auto';
				}
				state.pos += linkMatch[0].length;
				return true;
			}

			return false;
		});
	}

	function isValidType(apiName) {
		if (apiName in doc) {
			return true;
		}

		if (apiName.indexOf('.') === -1) {
			return false;
		}

		const member = apiName.split('.').pop();
		const cls = apiName.substring(0, apiName.lastIndexOf('.'));

		if (!(cls in doc) && !apiName.startsWith('Modules.')) {
			return false;
		}

		const memberTypeCandidates = [ 'properties', 'methods', 'events' ];
		return memberTypeCandidates.some(memberType => exports.findAPI(doc, cls, member, memberType));
	}
};
