/**
 * Copyright (c) 2015-2017 Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License.
 *
 * Script to preprocess the YAML docs in to a common JSON format,
 * then calls an generator script to format the API documentation.
 */
'use strict';

const common = require('./lib/common.js');
const nodeappc = require('node-appc');
const ejs = require('ejs');
const fs = require('fs');
const yaml = require('js-yaml');
const exec = require('child_process').exec; // eslint-disable-line security/detect-child-process
const os = require('os');
const pathMod = require('path');
const assert = common.assertObjectKey;

const processFirst = [ 'Titanium.Proxy', 'Titanium.Module', 'Titanium.UI.View' ];
var skipList = [ 'Titanium.Namespace.Name' ];
var validFormats = [];
var formats = [ 'html' ];
// directory to place output files underneath (default, overriden by command option/flag)
let outputPath = pathMod.join(__dirname, '..', 'dist');
var doc = {}; // the global object where all the parsed yaml objects/docs get merged into
var processedData = {};
var cssPath = pathMod.join(__dirname, 'templates/htmlejs/styles.css'); // default css file for html/modulehtml formats
let cssFile = 'styles.css';
var addOnDocs = [];
var searchPlatform = null;
var path = '';

/**
 * Returns a list of inherited APIs.
 * @param {Object} api API object to extract inherited APIs
 * @returns {Object} Object containing all API members for the class
 */
function getInheritedAPIs (api) {
	var inheritedAPIs = { events: [], methods: [], properties: [] };
	var removeAPIs = [];
	var copyAPIs = [];
	var matches = [];
	var index = 0;
	var x = 0;

	if (assert(api, 'extends') && api.extends in doc) {
		inheritedAPIs = getInheritedAPIs(doc[api.extends]);

		// Remove inherited accessors
		matches = inheritedAPIs.methods.filter(function (element) {
			return assert(element, '__accessor');
		});
		matches.forEach(function (element) {
			inheritedAPIs.methods.splice(inheritedAPIs.methods.indexOf(element), 1);
		});

		for (const key in inheritedAPIs) {
			removeAPIs = [];
			if (!(key in api) || !api[key]) {
				continue;
			}
			copyAPIs = nodeappc.util.mixObj([], api[key]);
			inheritedAPIs[key].forEach(function (inheritedAPI) { // eslint-disable-line no-loop-func
				// See if current API overwrites inherited API
				matches = copyAPIs.filter(function (element) {
					return (element.name === inheritedAPI.name);
				});

				matches.forEach(function (match) { // eslint-disable-line no-loop-func
					removeAPIs.push(match);
					// If the APIs came from the same class, do nothing
					if (match.__inherits === inheritedAPI.__inherits) {
						return;
					}

					// If the APIs are from different classes, override inherited API with current API
					index = inheritedAPIs[key].indexOf(inheritedAPI);
					for (const property in match) {
						if (assert(match, property)) {
							inheritedAPIs[key][index][property] = match[property];
						}
					}
					inheritedAPIs[key][index].__inherits = api.name;
				});
			});

			removeAPIs.forEach(function (element) { // eslint-disable-line no-loop-func
				copyAPIs.splice(copyAPIs.indexOf(element), 1);
			});
			for (x = 0; x < copyAPIs.length; x++) {
				copyAPIs[x].__inherits = api.name;
			}
			inheritedAPIs[key] = inheritedAPIs[key].concat(copyAPIs);
		}
	} else {
		for (const key2 in inheritedAPIs) {
			if (!(key2 in api) || !api[key2]) {
				continue;
			}
			inheritedAPIs[key2] = nodeappc.util.mixObj([], api[key2]);
			for (x = 0; x < inheritedAPIs[key2].length; x++) {
				inheritedAPIs[key2][x].__inherits = api.name;
			}
		}
	}
	return inheritedAPIs;
}

/**
 * Returns a list of constants
 * @param {Object} api API to evaluate
 * @returns {Array} List of constants the API supports
 */
function processConstants (api) {
	var rv = [];
	if ('constants' in api) {
		if (!Array.isArray(api.constants)) {
			api.constants = [ api.constants ];
		}
		api.constants.forEach(function (constant) {
			if (constant.charAt(constant.length - 1) === '*') {
				let prop = constant.split('.').pop();
				prop = prop.substring(0, prop.length - 1);
				const cls = constant.substring(0, constant.lastIndexOf('.'));
				if (cls in doc && 'properties' in doc[cls]) {
					doc[cls].properties.forEach(function (property) {
						if (property.name.indexOf(prop) === 0 && property.name.match(common.REGEXP_CONSTANTS)) {
							rv.push(cls + '.' + property.name);
						}
					});
				}
			} else {
				rv.push(constant);
			}
		});
	}
	return rv;
}

/**
 * Returns a list of platforms and since versions the API supports
 * @param {Object} api API to evaluate
 * @param {Object} versions Possible platforms and versions the API supports (usually from the class)
 * @param {Boolean} matchVersion For members, only match platforms from the versions param
 * @param {Boolean} addon Indicates if the class came from an add-on file
 * @returns {Object} Object containing platforms and versions the API supports
 */
function processVersions (api, versions, matchVersion, addon) {
	var defaultVersions = nodeappc.util.mixObj({}, versions);
	var platform = null;
	var key = null;

	if (assert(api, 'platforms')) {
		for (platform in defaultVersions) {
			if (!~api.platforms.indexOf(platform)) {
				delete defaultVersions[platform];
			}
		}
		for (platform in common.ADDON_VERSIONS) {
			if (((matchVersion && ~Object.keys(versions).indexOf(platform)) || !matchVersion)
				&& ~api.platforms.indexOf(platform)) {
				defaultVersions[platform] = common.ADDON_VERSIONS[platform];
			}
		}
	} else if (assert(api, 'exclude-platforms')) {
		api['exclude-platforms'].forEach(function (platform) {
			if (platform in defaultVersions) {
				delete defaultVersions[platform];
			}
		});
		// Remove add-on platforms from defaults if exclude-platforms tag is used
		Object.keys(common.ADDON_VERSIONS).forEach(function (platform) {
			if (platform in defaultVersions) {
				delete defaultVersions[platform];
			}
		});
	} else if (addon) {
		// Verify add-on platforms if there is not platforms tags and the class came from an add
		for (platform in common.ADDON_VERSIONS) {
			if (~Object.keys(versions).indexOf(platform)) {
				defaultVersions[platform] = common.ADDON_VERSIONS[platform];
			}
		}
	} else {
		// Remove add-on platforms from defaults if platforms tag is not specified
		Object.keys(common.ADDON_VERSIONS).forEach(function (platform) {
			if (platform in defaultVersions) {
				delete defaultVersions[platform];
			}
		});
	}
	if (assert(api, 'since')) {
		if (typeof api.since === 'string') {
			for (key in defaultVersions) {
				if (nodeappc.version.gt(api.since, defaultVersions[key])) {
					defaultVersions[key] = api.since;
				}
			}
		} else {
			for (key in defaultVersions) {
				if (nodeappc.version.gt(api.since[key], defaultVersions[key])) {
					defaultVersions[key] = api.since[key];
				}
			}
		}
	}
	return defaultVersions;
}

/**
 * Processes APIs based on the given list of platforms and versions
 * @param {Array<Object>} apis List of APIs to evaluate
 * @param {String} type Type of API
 * @param {Object} defaultVersions List of platforms and versions the APIs support
 * @param {Boolean} addon Indicates if the class came from an add-on file
 * @returns {Array<Object>} List of processed APIs
 */
function processAPIMembers (apis, type, defaultVersions, addon) {
	var rv = [];
	var x = 0;
	apis.forEach(function (api) {
		api.since = processVersions(api, defaultVersions, true, addon);
		api.platforms = Object.keys(api.since);
		if (type === 'properties') {
			if (api.constants) {
				api.constants = processConstants(api);
			}
			api.__subtype = 'property';
		}
		if (type === 'events') {
			api.__subtype = 'event';
			if (assert(api, 'properties')) {
				for (x = 0; x < api.properties.length; x++) {
					api.properties[x].__subtype = 'eventProperty';
					if ('constants' in api.properties[x]) {
						api.properties[x].constants = processConstants(api.properties[x]);
					}
				}
			}
		}
		if (type === 'methods') {
			api.__subtype = 'method';
			if (assert(api, 'parameters')) {
				for (x = 0; x < api.parameters.length; x++) {
					api.parameters[x].__subtype = 'parameter';
					if ('constants' in api.parameters[x]) {
						api.parameters[x].constants = processConstants(api.parameters[x]);
					}
				}
			}
			if (assert(api, 'returns')) {
				if (!Array.isArray(api.returns)) {
					api.returns = [ api.returns ];
				}
				for (x = 0; x < api.returns.length; x++) {
					api.returns[x].__subtype = 'return';
					if (assert(api.returns[x], 'constants')) {
						api.returns[x].constants = processConstants(api.returns[x]);
					}
				}
			}
		}
		if (api.platforms.length > 0) {
			rv.push(api);
		}
	});
	return rv;
}

/**
 * Hides APIs based on the excludes list
 * @param {Object} apis APIs to evaluate
 * @param {String} type Type of API, one of 'events', 'methods' or 'properties'
 * @returns {object[]} Processed APIs
 */
function hideAPIMembers(apis, type) {
	var index;
	if (assert(apis, 'excludes') && assert(apis.excludes, type) && assert(apis, type)) {
		apis[type].forEach(function (api) {
			index = apis[type].indexOf(api);
			if (apis[type][index].__hide) {
				return;
			}
			apis[type][index].__hide = !!(~apis.excludes[type].indexOf(api.name));
			if (apis[type][index].__hide) {
				apis[type][apis[type].indexOf(api)].__inherits = apis.name;
			}
		});
	}
	return apis;
}

/**
 * Returns a subtype based on the parent class
 * @param {Object} api Class object
 * @returns {string} Class's subtype
 */
function getSubtype (api) {
	switch (api.name) {
		case 'Global':
		case 'Titanium.Module':
			return 'module';
		case 'Titanium.Proxy':
			return 'proxy';
	}

	if (api.name.indexOf('Global.') === 0) {
		return 'module';
	}

	switch (api.extends) {
		case 'Titanium.UI.View' :
			return 'view';
		case 'Titanium.Module' :
			return 'module';
		case 'Titanium.Proxy' :
			return 'proxy';
		default:
			if (assert(api, 'extends') && assert(doc, api.extends)) {
				return getSubtype(doc[api.extends]);
			} else {
				return 'pseudo';
			}
	}
}

/**
 * Process API class
 * @param {Object} api API object to build (and use as base)
 * @return {Object} api
 */
function processAPIs (api) {
	var defaultVersions = nodeappc.util.mix({}, common.DEFAULT_VERSIONS);
	var inheritedAPIs = {};
	var matches = [];

	// Generate list of supported platforms and versions
	api.since = processVersions(api, defaultVersions, false);
	api.platforms = Object.keys(api.since);

	// Get inherited APIs
	inheritedAPIs = getInheritedAPIs(api);
	for (const key in inheritedAPIs) {
		api[key] = inheritedAPIs[key];
	}

	api.__subtype = getSubtype(api);

	// Generate create method
	api.__creatable = false;
	if ((api.__subtype === 'view' || api.__subtype === 'proxy')
		&& (!assert(api, 'createable') || api.creatable)) { // createable not specified or is truthy
		const name = api.name;
		const prop = name.split('.').pop();
		const cls = name.substring(0, name.lastIndexOf('.'));
		const methodName = 'create' + prop;

		if (cls in doc) {
			matches = [];
			if (assert(doc[cls], 'methods')) {
				matches = doc[cls].methods.filter(function (member) {
					return member.name === methodName;
				});
			}
			if (matches.length === 0) {
				const createMethod = {
					name: methodName,
					summary: 'Creates and returns an instance of <' + name + '>.\n',
					deprecated: api.deprecated || null,
					since: api.since,
					platforms: api.platforms,
					returns: { type: name, __subtype: 'return' },
					parameters: [ {
						name: 'parameters',
						summary: 'Properties to set on a new object, including any defined by <' + name + '> except those marked not-creation or read-only.\n',
						type: 'Dictionary<' + name + '>',
						optional: true,
						__subtype: 'parameter'
					} ],
					__creator: true,
					__subtype: 'method'
				};
				api.__creatable = true;
				if ('methods' in doc[cls]) {
					if (!doc[cls].methods) {
						common.log(common.LOG_WARN, 'Empty \'methods\' listing for class: %s', cls);
						doc[cls].methods = [ createMethod ];
					} else {
						doc[cls].methods.push(createMethod);
					}
				} else {
					doc[cls].methods = [ createMethod ];
				}
			}
		}
	}

	if (assert(api, 'events')) {
		api = hideAPIMembers(api, 'events');
		api.events = processAPIMembers(api.events, 'events', api.since, api.__addon);
	}

	if (assert(api, 'properties')) {
		api = hideAPIMembers(api, 'properties');
		api.properties = processAPIMembers(api.properties, 'properties', api.since, api.__addon);
	}

	if (assert(api, 'methods')) {
		api = hideAPIMembers(api, 'methods');
		api.methods = processAPIMembers(api.methods, 'methods', api.since, api.__addon);
	}

	processFreeFormTextField(api, 'description');
	processFreeFormTextField(api, 'examples');

	return api;
}

/**
 * Processes the property on the giventype and resolves any file references
 * to the actual text content.
 *
 * @param {Object} api Type to read the property from
 * @param {String} propertyName Property name to operate on
 */
function processFreeFormTextField(api, propertyName) {
	const fileReferencePattern = /^file:([^#]+\.md)(#.*)?$/;

	const fieldContent = api[propertyName];
	if (!fieldContent || Array.isArray(fieldContent)) {
		return;
	}

	const fileReferenceMatch = fieldContent.match(fileReferencePattern);
	if (fileReferenceMatch === null) {
		return;
	}

	const yamlSourceBasePath = pathMod.dirname(pathMod.resolve(process.cwd(), api.__file));
	const markdownSourcePath = pathMod.resolve(yamlSourceBasePath, fileReferenceMatch[1]);
	if (!fs.existsSync(markdownSourcePath)) {
		throw new Error(`Markdown file ${markdownSourcePath} referenced in ${api.name}.${propertyName} not found.`);
	}
	const heading = fileReferenceMatch[2];
	const markdownContent = fs.readFileSync(markdownSourcePath).toString();
	if (heading) {
		const headingOffset = markdownContent.indexOf(heading);
		const headingLevel = heading.match(/#/g).length;
		if (headingOffset === -1) {
			throw new Error(`Markdown file ${markdownSourcePath} doesn't contain the heading ${heading}`);
		}

		const apiDocsTagOffset = markdownContent.indexOf('<ApiDocs/>');
		// eslint-disable-next-line security/detect-non-literal-regexp
		const nextHeadingRegex = new RegExp(`^#{${headingLevel}}[^#]+$`, 'gm');
		nextHeadingRegex.lastIndex = headingOffset + heading.length;
		const nextHeadingMatch = nextHeadingRegex.exec(markdownContent);
		let endOffset = nextHeadingMatch ? nextHeadingMatch.index : apiDocsTagOffset;
		if (endOffset === -1) {
			endOffset = markdownContent.length;
		}
		const fieldMarkdown = markdownContent.substring(headingOffset + heading.length, endOffset).trim();
		if (propertyName === 'examples') {
			api[propertyName] = convertExamples(fieldMarkdown);
		} else {
			api[propertyName] = fieldMarkdown.replace(/^(#{3,})/gm, (match, heading) => heading + '#');
		}
	} else {
		api[propertyName] = markdownContent;
	}
}

/**
 * Converts structured examples from markdown back to their object representation.
 *
 * Each heading with a level of three is considered as the example title and
 * any following text is treated as the example content.
 *
 * @param {String} examplesMarkdown Markdown text to parse for examples
 * @return {Array<Object>} Parsed list of examples
 */
function convertExamples(examplesMarkdown) {
	const examples = [];
	const exampleTitleRegex = /^###([^#]+?)$/gm;
	let exampleMatch = exampleTitleRegex.exec(examplesMarkdown);
	while (exampleMatch) {
		const exampleTitle = exampleMatch[1].trim();
		const exampleContentStartOffset = exampleTitleRegex.lastIndex;
		const nextExampleMatch = exampleTitleRegex.exec(examplesMarkdown);
		const exampleContent = examplesMarkdown.substring(exampleContentStartOffset, nextExampleMatch ? nextExampleMatch.index : undefined).trim();
		examples.push({
			title: exampleTitle,
			example: exampleContent
		});
		exampleMatch = nextExampleMatch;
	}
	return examples;
}

/**
 * Output CLI usage
 */
function cliUsage () {
	common.log('Usage: node docgen.js [--addon-docs <PATH_TO_YAML_FILES] [--css <CSS_FILE>] [--format <EXPORT_FORMAT>] [--output <OUTPUT_DIRECTORY>] <PATH_TO_YAML_FILES>');
	common.log('\nOptions:');
	common.log('\t--addon-docs, -a\tDocs to add to the base Titanium Docs');
	common.log('\t--css           \tCSS style file to use for HTML exports.');
	common.log('\t--format, -f    \tExport format: %s. Default is html.', validFormats);
	common.log('\t--output, -o    \tDirectory to output the files.');
	common.log('\t--platform, -p  \tPlatform to extract for addon format.');
	common.log('\t--stdout        \tOutput processed YAML to stdout.');
	common.log('\t--start         \tStart version for changes format (will use the version in the package.json if not defined).');
	common.log('\t--end           \tEnd version for changes format (optional).');
}

/**
 * Merge values from add-on object to base object
 * @param {object} baseObj base object
 * @param {object} addObj add on object
 * @return {object} merged object
 */
function addOnMerge(baseObj, addObj) {
	for (const key in addObj) {
		const base = baseObj[key];
		const add = addObj[key];

		if (Array.isArray(base)) {
			// Array of objects
			if (typeof base[0] === 'object') {
				const tempArray = base;
				add.forEach(function (api) { // eslint-disable-line no-loop-func
					if ('name' in base[0]) {
						const match = base.filter(function (item) {
							return api.name === item.name;
						});
						if (match.length > 0) {
							// Replace item if we have a match
							tempArray.splice(tempArray.indexOf(match[0]), 1);
							tempArray.push(addOnMerge(match[0], api));
						} else if (~[ 'properties', 'methods', 'events' ].indexOf(key)
								&& !(api.name.indexOf('set') === 0 || api.name.indexOf('get') === 0 || api.name.indexOf('create') === 0)
									&& api.summary) {
							common.log(common.LOG_INFO, 'Adding new API to %s array: %s', key, api.name);
							tempArray.push(api);
						} else {
							common.log(common.LOG_WARN, 'Could not locate object in %s array with name: %s', key, api.name);
						}
					} else {
						common.log(common.LOG_WARN, 'Element in %s array does not have a name key.', key);
					}
				});
				baseObj[key] = tempArray;
			// Array of primitives
			} else if (Array.isArray(add)) {
				baseObj[key] = base.concat(add);
			} else {
				baseObj[key] = base.push(add);
			}
		} else {
			switch (typeof base) {
				case 'object':
					for (const k in add) {
						if (!base[k]) {
							base[k] = add[k];
							delete add[k];
						}
					}
					baseObj[key] = addOnMerge(base, add);
					break;
				case 'string':
					if (key === 'since') {
						const platforms = baseObj.platforms || Object.keys(common.DEFAULT_VERSIONS);
						const since = {};

						platforms.forEach(function (p) {
							since[p] = baseObj[key];
						});

						if (typeof add === 'object') {
							Object.keys(add).forEach(function (k) {
								since[k] = add[k];
							});
						} else if (assert(addObj, 'platforms')) {
							addObj.platforms.forEach(function (p) {
								since[p] = add;
							});
						} else {
							common.log(common.LOG_WARN, 'Cannot set since version.  Set since as a dictionary or add the platforms property.');
							break;
						}
						baseObj[key] = since;
					}
					break;
				case 'undefined':
					if (~[ 'description' ].indexOf(key)) {
						baseObj[key] = add;
					} else if (key === 'exclude-platforms' && !assert(baseObj, 'platforms')) {
						baseObj[key] = add;
					} else if (key === 'platforms') {
						baseObj[key] = Object.keys(common.DEFAULT_VERSIONS).concat(add);
					} else if (key === 'since') {
						const since = {};
						if (typeof add === 'object') {
							Object.keys(add).forEach(function (k) {
								since[k] = add[k];
							});
						} else if (assert(addObj, 'platforms')) {
							addObj.platforms.forEach(function (p) {
								since[p] = add;
							});
						} else {
							common.log(common.LOG_WARN, 'Cannot set since version.  Set since as a dictionary or add the platforms property.');
						}
						baseObj[key] = since;
					} else {
						common.log(common.LOG_WARN, 'Base object does not have a value for %s', key);
					}
					break;
				default:
					common.log(common.LOG_WARN, 'Could not merge %s key: %s to %s', key, base, add);
			}
		}
	}
	return baseObj;
}

/**
 * Create path if it does not exist
 * @param {string} path directory path to make
 */
function mkdirDashP(path) {
	var p = path.replace(/\\/g, '/');
	p = p.substring(0, path.lastIndexOf('/'));
	if (p.length) {
		if (!fs.existsSync(p)) {
			mkdirDashP(p);
		}
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
	}
}

// Start of Main Flow
// Get a list of valid formats
const generatorsPath = pathMod.join(__dirname, 'generators');
fs.readdirSync(generatorsPath).forEach(file => {
	const tokens = file.split('_');
	if (tokens[1] === 'generator.js') {
		validFormats.push(tokens[0]);
	}
});

// Check command arguments
const argc = process.argv.length;
const basePaths = [];
if (argc > 2) {
	for (let x = 2; x < argc; x++) {
		switch (process.argv[x]) {
			case '--help' :
				cliUsage();
				process.exit(0);
			case '--addon-docs' :
			case '-a':
				path = process.argv[++x];
				if (fs.existsSync(path)) {
					addOnDocs.push(path);
				} else {
					common.log(common.LOG_WARN, 'Path does not exist: %s', path);
				}
				path = null;
				break;
			case '--css':
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Did not specify a CSS file.');
					cliUsage();
					process.exit(1);
				}
				cssPath = process.argv[x];
				if (!fs.existsSync(cssPath)) {
					common.log(common.LOG_WARN, 'CSS file does not exist: %s', cssPath);
					process.exit(1);
				}
				cssFile = cssPath.substring(cssPath.lastIndexOf('/') + 1);
				break;
			case '--format' :
			case '-f' :
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Did not specify an export format. Valid formats are: %s', JSON.stringify(validFormats));
					cliUsage();
					process.exit(1);
				}

				if (~process.argv[x].indexOf(',')) {
					formats = process.argv[x].split(',');
				} else {
					formats = [ process.argv[x] ];
				}

				formats.forEach(function (format) {
					if (!~validFormats.indexOf(format)) {
						common.log(common.LOG_WARN, 'Not a valid export format: %s. Valid formats are: %s', format, validFormats);
						cliUsage();
						process.exit(1);
					}
				});
				break;
			case '--output' :
			case '-o' :
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Specify an output path.');
					cliUsage();
					process.exit(1);
				}
				outputPath = process.argv[x];
				break;
			case '--platform':
			case '-p':
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Specify a platform.');
					cliUsage();
					process.exit(1);
				}
				searchPlatform = process.argv[x];
				if (!~common.VALID_PLATFORMS.indexOf(searchPlatform)) {
					common.log(common.LOG_WARN, 'Not a valid platform. Specify one of the following: %s', common.VALID_PLATFORMS);
					process.exit(1);
				}
				break;
			case '--start':
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Specify a version.');
					cliUsage();
					process.exit(1);
				}
				processedData.__startVersion = process.argv[x];
				try {
					nodeappc.version.gt(0.0, processedData.__startVersion);
				} catch (e) {
					common.log(common.LOG_ERROR, 'Not a valid version: %s', processedData.__startVersion);
					process.exit(1);
				}
				break;
			case '--end':
				if (++x > argc) {
					common.log(common.LOG_WARN, 'Specify a version.');
					cliUsage();
					process.exit(1);
				}
				processedData.__endVersion = process.argv[x];
				try {
					nodeappc.version.gt(0.0, processedData.__endVersion);
				} catch (e) {
					common.log(common.LOG_ERROR, 'Not a valid version: %s', processedData.__endVersion);
					process.exit(1);
				}
				break;
			case '--colorize':
			case '--exclude-external':
			case '-e':
			case '--stdout':
			case '--verbose':
			case '--version':
			case '-v' :
			case '--warn-inherited':
				common.log(common.LOG_WARN, 'This command-line flag or argument has been deprecated or has not been implemented: %s', process.argv[x]);
				if (~[ '-v', '--version' ].indexOf(process.argv[x])) {
					x++;
				}
				break;
			default:
				path = process.argv[x];
				if (fs.existsSync(path)) {
					basePaths.push(path);
				} else {
					common.log(common.LOG_WARN, 'Path does not exist: %s', path);
				}
				path = null;
		}
	}
}

if (~formats.indexOf('addon') && !searchPlatform) {
	common.log(common.LOG_ERROR, 'Specify a platform to extract with the -p option.');
	process.exit(1);
}

if (basePaths.length === 0) {
	common.log(common.LOG_ERROR, 'Specify at least one path where to look for YAML files.');
	process.exit(1);
}

// Get the SDK version
let version = '';
const sdkPackageJson = pathMod.resolve(basePaths[0], '..', 'package.json');
if (fs.existsSync(sdkPackageJson)) {
 	version = require(sdkPackageJson).version;
}

// Parse YAML files
const originalPaths = basePaths;
const modules = [];
const errors = []; // gather parse errors (FIXME: we ignore these errors!)
basePaths.forEach(function (basePath) {
	const resolvedPath = pathMod.resolve(basePath);
	common.log(common.LOG_INFO, 'Parsing YAML files in %s...', resolvedPath);
	const parseData = common.parseYAML(resolvedPath);
	for (const key in parseData.data) {
		errors.push(parseData.errors);
		if (assert(doc, key)) {
			common.log(common.LOG_WARN, 'Duplicate class found: %s', key);
			continue;
		}
		doc[key] = parseData.data[key];
		if (~originalPaths.indexOf(basePath)) {
			modules.push(key);
		}
	}
});

// Parse add-on docs and merge them with the base set
addOnDocs.forEach(function (basePath) {
	const resolvedPath = pathMod.resolve(basePath);
	common.log(common.LOG_INFO, 'Parsing add-on YAML files in %s...', resolved);
	const parseData = common.parseYAML(resolvedPath);
	for (const key in parseData.data) {
		errors.push(parseData.errors);
		if (assert(doc, key)) {
			common.log(common.LOG_INFO, 'Adding on to %s...', key);
			doc[key] = addOnMerge(doc[key], parseData.data[key]);
		} else {
			common.log(common.LOG_INFO, 'New class found in add-on docs: %s...', key);
			parseData.data[key].__addon = true;
			doc[key] = parseData.data[key];
		}
	}
});

// Process YAML files
common.log(common.LOG_INFO, 'Processing YAML data...');
processFirst.forEach(function (cls) {
	if (!assert(doc, cls)) {
		return;
	}
	processedData[cls] = processAPIs(doc[cls]);
});
skipList = skipList.concat(processFirst);
for (const key in doc) {
	if (~skipList.indexOf(key)) {
		continue;
	}
	processedData[key] = processAPIs(doc[key]);
}

formats.forEach(function (format) {
	// For changes format, make sure we have a start version and it's less than the end version if defined
	if (format === 'changes') {
		if (!processedData.__startVersion) {
			processedData.__startVersion = version;
		}
		if (processedData.__endVersion) {
			if (nodeappc.version.gt(processedData.__startVersion, processedData.__endVersion)) {
				common.log(common.LOG_ERROR, 'Skipping changes format.  Start version (%s) is greater than end version (%s).',
					processedData.__startVersion, processedData.__endVersion);
				return;
			}
		}
	}

	// Export data
	const exporter = require('./generators/' + format + '_generator.js'); // eslint-disable-line security/detect-non-literal-require
	if (format === 'modulehtml') {
		processedData.__modules = modules;
	} else if (format === 'typescript') {
		processedData.__version = version;
	}
	if (searchPlatform) {
		processedData.__platform = searchPlatform;
	}
	const exportData = exporter.exportData(processedData);
	const templatePath = pathMod.join(__dirname, 'templates');
	
	mkdirDashP(outputPath); // make the output directory

	common.log(common.LOG_INFO, 'Generating %s output...', format.toUpperCase());

	let render; // the rendered data
	// (typically we'd render using ejs, but for some formats this will be the exported data itself)
	let output = outputPath; // the final output filepath
	switch (format) {
		case 'addon':

			output = pathMod.join(outputPath, 'addon');
			if (!fs.existsSync(output)) {
				fs.mkdirSync(output);
			}
			for (const cls in exportData) {
				if (cls.indexOf('__') === 0) {
					continue;
				}
				render = yaml.safeDump(exportData[cls]);
				if (fs.writeFileSync(output + cls + '.yml', render) <= 0) {
					common.log(common.LOG_ERROR, 'Failed to write to file: %s', output + cls + '.yml');
				}
			}
			exportData.__copyList.forEach(function (file) {
				const copyCommand = 'cp ' + file + ' ' + output;
				exec(copyCommand, function (error) {
					if (error !== null) {
						common.log(common.LOG_ERROR, 'Error copying file: %s (%s)', file, error);
					}
				});
			});
			common.log('Generated output at %s', output);
			break;
		case 'changes' :
			if (exportData.noResults) {
				common.log('No API changes found.');
				return;
			}
			output = pathMod.join(output, 'changes_' + processedData.__startVersion.replace(/\./g, '_') + '.html');
			const changesTemplateFile = pathMod.join(templatePath, 'changes.ejs');
			const changesTemplate = fs.readFileSync(changesTemplateFile, 'utf8');
			render = ejs.render(changesTemplate, { data: exportData, assert: common.assertObjectKey }, { filename: changesTemplateFile });
			break;
		case 'html':
		case 'modulehtml':

			output = pathMod.join(outputPath, 'apidoc');

			if (!fs.existsSync(output)) {
				fs.mkdirSync(output);
			}

			if (cssFile) {
				fs.createReadStream(cssPath).pipe(fs.createWriteStream(pathMod.join(output, cssFile)));
			}

			// For each of the input directories, check if there's an images subdir
			// if so, copy it over!
			basePaths.concat(addOnDocs).forEach(p => {
				const imgPath = pathMod.join(pathMod.resolve(p), 'images');
				if (!fs.existsSync(imgPath)) {
					return;
				}
				// TODO: Use fs module to copy it!
				let copyCommand;
				if (os.type() === 'Windows_NT') {
					copyCommand = `xcopy ${imgPath} ${output}`;
					copyCommand = copyCommand.replace(/\//g, '\\') + ' /s';
				} else {
					copyCommand = `cp -r ${imgPath} ${output}`;
				}

				exec(copyCommand, function (error) {
					if (error !== null) {
						common.log(common.LOG_ERROR, 'Error copying file: %s', error);
					}
				});
			});

			for (const type in exportData) {
				if (type.indexOf('__') === 0) {
					continue;
				}
				const typeTemplate = pathMod.join(templatePath, 'htmlejs', type + '.html');
				const htmlTemplateStr = fs.readFileSync(typeTemplate, 'utf8');
				exportData[type].forEach(function (member) { // eslint-disable-line no-loop-func
					render = ejs.render(htmlTemplateStr, { data: member, assert: common.assertObjectKey, css: cssFile }, { filename: typeTemplate });
					const filename = pathMod.join(output, `${member.filename}.html`);
					if (fs.writeFileSync(filename, render) <= 0) {
						common.log(common.LOG_ERROR, 'Failed to write to file: %s', filename);
					}
				});
			}

			if (format === 'modulehtml') {
				const moduleHtmlTemplateFile = pathMod.join(templatePath, 'htmlejs', 'moduleindex.html');
				const moduleHtmlTemplate = fs.readFileSync(moduleHtmlTemplateFile, 'utf8');
				render = ejs.render(moduleHtmlTemplate, { filename: exportData.proxy[0].filename + '.html' });
			} else {
				const htmlTemplateFile = pathMod.join(templatePath, 'htmlejs', 'index.html');
				const htmlTemplate = fs.readFileSync(htmlTemplateFile, 'utf8');
				render = ejs.render(htmlTemplate, { data: exportData, assert: common.assertObjectKey, css: cssFile }, { filename: htmlTemplateFile });
			}
			output = pathMod.join(output, 'index.html');
			break;
		case 'jsca' :
			render = JSON.stringify(exportData, null);
			output = pathMod.join(outputPath, 'api.jsca');
			break;
		case 'json' :
		case 'json-raw' :
			render = JSON.stringify(exportData, null, '    ');
			output = pathMod.join(outputPath, 'api.json');
			break;
		case 'jsduck' :
			const jsduckTemplateFile = pathMod.join(templatePath, 'jsduck.ejs');
			const jsduckTemplate = fs.readFileSync(jsduckTemplateFile, 'utf8');
			render = ejs.render(jsduckTemplate, { doc: exportData }, { filename: jsduckTemplateFile });
			output = pathMod.join(outputPath, 'titanium.js');
			break;
		case 'parity' :
			const parityTemplateFile = pathMod.join(templatePath, 'parity.ejs');
			const parityTemplate = fs.readFileSync(parityTemplateFile, 'utf8');
			render = ejs.render(parityTemplate, { apis: exportData }, { filename: parityTemplateFile });
			output = pathMod.join(outputPath, 'parity.html');
			break;
		case 'solr' :
			render = JSON.stringify(exportData, null, '    ');
			output = pathMod.join(outputPath, 'api_solr.json');
			break;
		case 'typescript':
			render = exportData;
			output = pathMod.join(outputPath, 'index.d.ts');
			delete processedData['__version']; // clean up
			break;
	}

	if (!~[ 'addon' ].indexOf(format)) {
		fs.writeFile(output, render, function (err) {
			if (err) {
				common.log(common.LOG_ERROR, 'Failed to write to file: %s with error: %s', output, err);
				process.exit(1);
			}
			common.log('Generated output at %s', output);
		});
	}
});
