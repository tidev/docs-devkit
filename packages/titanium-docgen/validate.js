/**
 * Script to validate the syntax of the YAML files against the TDoc spec
 * https://wiki.appcelerator.org/display/guides2/TDoc+Specification
 *
 * Execute `node validate.js --help` for usage
 *
 * Dependencies: colors ~0.6.2 and node-appc ~0.2.14
 */
'use strict';

const fs = require('fs'),
	nodeappc = require('node-appc'),
	colors = require('colors'), // eslint-disable-line no-unused-vars
	common = require('./lib/common.js');

let doc = {};
let standaloneFlag = false;

// List of "whitelisted" types provided via cli flag
// if we are unable to find these types we do not error
// This gives more control versus the standalone Flag which just ignores any type errors
const whitelistedTypes = [];

// Constants that are valid, but are windows specific, so would fail validation
const whitelistedConstants = [
	'Titanium.UI.Windows.ListViewScrollPosition.*'
];

const AVAILABILITY = [ 'always', 'creation', 'not-creation' ];
const PERMISSIONS = [ 'read-only', 'write-only', 'read-write' ];

const Examples = [ {
	required: {
		title: 'String',
		example: 'Markdown'
	}
} ];

const Deprecated = {
	required: {
		since: 'Since'
	},
	optional: {
		removed: 'Removed',
		notes: 'String'
	}
};

// TODO: Replace validateReturns with this once we fix docs to not have array of returns (when they should instead have an array of type under returns)
// const Returns = {
// 	required: {
// 		type: 'DataType' // FIXME: also needs to handle void
// 	},
// 	optional: {
// 		summary: 'String',
// 		constants: 'Constants'
// 	}
// };

const validSyntax = {
	required: {
		name: 'ASCIIString',
		summary: 'String',
	},
	optional: {
		description: 'Markdown',
		createable: 'Boolean',
		platforms: 'Platforms',
		'exclude-platforms': 'Platforms',
		excludes: {
			optional: {
				events: 'Array<events.name>',
				methods: 'Array<methods.name>',
				properties: 'Array<properties.name>'
			}
		},
		examples: Examples,
		osver: 'OSVersions',
		extends: 'Class',
		deprecated: Deprecated,
		since: 'Since',
		events: [ {
			required: {
				name: 'LowercaseASCIIString',
				summary: 'String',
			},
			optional: {
				description: 'String',
				platforms: 'Platforms',
				since: 'Since',
				deprecated: Deprecated,
				osver: 'OSVersions',
				properties: [ {
					required: {
						name: 'ASCIIString',
						summary: 'String',
						type: 'DataType',
					},
					optional: {
						optional: 'Boolean',
						platforms: 'Platforms',
						deprecated: Deprecated,
						since: 'Since',
						'exclude-platforms': 'Platforms',
						constants: 'Constants'
					}
				} ],
				'exclude-platforms': 'Platforms',
				notes: 'Invalid'
			}
		} ],
		methods: [ {
			required: {
				name: 'ASCIIString',
				summary: 'String'
			},
			optional: {
				description: 'String',
				returns: 'Returns',
				platforms: 'Platforms',
				since: 'Since',
				deprecated: Deprecated,
				examples: Examples,
				osver: 'OSVersions',
				parameters: [ {
					required: {
						name: 'ASCIIString',
						summary: 'String',
						type: 'DataType'
					},
					optional: {
						optional: 'Boolean',
						default: 'Default',
						repeatable: 'Boolean',
						constants: 'Constants',
						notes: 'Invalid'
					}
				} ],
				'exclude-platforms': 'Platforms',
				notes: 'Invalid'
			}
		} ],
		properties: [ {
			required: {
				name: 'ASCIIString',
				summary: 'String',
				type: 'DataType'
			},
			optional: {
				description: 'String',
				platforms: 'Platforms',
				since: 'Since',
				deprecated: Deprecated,
				osver: 'OSVersions',
				examples: Examples,
				permission: 'Permission',
				availability: 'Availability',
				accessors: 'Boolean',
				optional: 'Boolean',
				value: 'Primitive',
				default: 'Default',
				'exclude-platforms': 'Platforms',
				constants: 'Constants',
				notes: 'Invalid'
			}
		} ]
	}
};

// We define issues in the apidocs as Problem instances with severities
// this way we can warn about issues but not have them fail validation
const ERROR = 1;
const WARNING = 2;
const INFO = 3;
class Problem {
	/**
	 * @param {string} message the message giving details of the problem
	 * @param {1|2|3} [severity=1] severity level of this problem
	 */
	constructor(message, severity = ERROR) {
		this.message = message;
		this.severity = severity;
	}

	isWarning() {
		return this.severity === WARNING;
	}

	isError() {
		return this.severity === ERROR;
	}

	isInfo() {
		return this.severity === INFO;
	}

	toString() {
		return this.message;
	}
}

/**
 * Validate if an API exists in a class and its ancestors
 * We use this to validate "excludes" references refer to methods/properties/events that actually exist on parents
 * @param {string[]} names Array of API names to verify
 * @param {'events'|'methods'|'properties'} type API type
 * @param {string} className Name of class to check
 * @returns {null|Problem} possible Problem
 */
function validateAPINames(names, type, className) {
	const apis = doc[className][type]; // grab the type's events/properties/methods
	// This modifies the 'names' arrays as we go, removing entries where we've found a match
	if (apis) {
		apis.forEach(function (api) {
			const index = names.indexOf(api.name);
			if (~index) {
				names.splice(index);
			}
		});
	}
	if (type === 'methods' && 'properties' in doc[className]) {
		// Evaluate setters and getters
		// if we're looking for getProp/setProp and the type has a declared property for the same name, match it up
		doc[className].properties.forEach(function (property) {
			const Prop = property.name.charAt(0).toUpperCase() + property.name.slice(1);
			const setterIndex = names.indexOf(`set${Prop}`);
			if (~setterIndex) {
				names.splice(setterIndex);
			}

			const getterIndex = names.indexOf(`get${Prop}`);
			if (~getterIndex) {
				names.splice(getterIndex);
			}
		});
	}

	if ('extends' in doc[className]) {
		// Evaluate parent class
		const parent = doc[className]['extends'];
		if (parent in doc) {
			// the parent type exists, so recurse with remaining api names against the parent
			return validateAPINames(names, type, parent);
		}

		// This is a whitelisted type, so ignore it
		if (whitelistedTypes.includes(parent)) {
			return;
		}

		if (standaloneFlag) {
			console.warn('WARNING! Cannot validate parent class: %s'.yellow, parent);
			return;
		}

		// TODO: Also make note of remaining apis we haven't matched?
		return new Problem(`Invalid parent class: ${parent}`);
	}

	// We still have unmatched (not found) apis
	if (names.length > 0) {
		return new Problem(`Could not find the following ${type}: ${names}`);
	}

	// All good
	return null;
}

/**
 * Validate boolean type
 * @param {*} bool possible boolean value
 * @return {null|Problem} possible Problem if not a boolean
 */
function validateBoolean(bool) {
	if (typeof bool !== 'boolean') {
		return new Problem(`Not a boolean value: ${bool}`);
	}
	return null;
}

/**
 * Validate class is in docs
 * @param {string} className class name
 * @returns {null|Problem} possible Problem if not found in docs
 */
function validateClass(className) {
	if (!(className in doc)) {
		if (standaloneFlag) {
			return new Problem(`Cannot validate class: ${className} (standalone flag is set)`, WARNING);
		}
		if (whitelistedTypes.includes(className)) {
			return null;
		}
		return new Problem(`Not a valid or known class/type: ${className}`);
	}
	return null;
}

/**
 * Validate constant is in docs
 * @param {string|string[]} constants arry or string of constant names
 * @returns {Problem[]} array of Problems if any given constants weren't found in the docs
 */
function validateConstants(constants) {
	const errors = [];
	// "coerce" to Array
	constants = Array.isArray(constants) ? constants : [ constants ];
	// validate each one
	constants.forEach(c => {
		const possibleProblem = validateConstant(c);
		if (possibleProblem) {
			errors.push(possibleProblem);
		}
	});
	return errors;
}

/**
 * @param {string} constant name of the referenced constant
 * @returns {null|Problem} possible Problem
 */
function validateConstant(constant) {
	// skip windows constants that are OK, but would be marked invalid
	if (whitelistedConstants.includes(constant)) {
		return null;
	}

	// is it hanging on a real type (that has properties, so therefore would have constants)
	const typeName = constant.substring(0, constant.lastIndexOf('.'));
	if (!(typeName in doc) || !('properties' in doc[typeName]) || doc[typeName] === null) {
		return new Problem(`Invalid constant: ${constant}, type ${typeName} does not exist`);
	}

	const propertyNames = doc[typeName].properties.map(p => p.name);
	// Grab the last segment of the namespace (the "base name")
	const propertyBaseName = constant.split('.').pop();

	// check for wildcard references!
	if (propertyBaseName.charAt(propertyBaseName.length - 1) === '*') {
		// TODO: Report a problem for wildcards? Maybe warning for now?

		const wildcardPrefix = propertyBaseName.substring(0, propertyBaseName.length - 1);
		// check that we have at least one property matching this prefix?
		for (let i = 0; i < propertyNames.length; i++) {
			if (propertyNames[i].indexOf(wildcardPrefix) === 0) {
				// found it!
				return null;
			}
		}
		// didn't find it!
		return new Problem(`Invalid constant: ${constant}`);
	}

	// Can we find this constant listed as a property on the referenced type/class?
	if (!propertyNames.includes(propertyBaseName)) {
		return new Problem(`Invalid constant: ${constant}`);
	}
	return null;
}

/**
 * Parses the generic portion of a complex type string (the stuff inside the brackets)
 * so for "Map<Number, String>", this would get "<Number, String>". Has to handle recursive complex types proeprly.
 * @param {string} rawSubTypeString i.e. "Object", "void", "Map<Number, String>, Set<String>"
 * @returns {string[]}
 */
function parseSubTypes(rawSubTypeString) {
	const regex = /([^,<\s]+(<.+?>)?)/gm;
	const types = [];
	let m;
	while ((m = regex.exec(rawSubTypeString)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		types.push(m[0]);
	}
	return types;
}

/**
 * Validate type
 * @param {string|string[]} type array of strings, or single string with a type name
 * @param {string|null} fullTypeContext full context of the type (for recursion), i.e. 'Callback<Object>' or 'Array<Object>'
 * @returns {Problem[]} problems (may be empty)
 */
// FIXME: Some types may only be valid in some scenarios, i.e. 'void' for return type/callback arg (which is really 'undefined')
function validateDataType(type, fullTypeContext) {
	if (Array.isArray(type)) {
		const errors = [];
		type.forEach(elem => {
			errors.push(...validateDataType(elem));
		});
		return errors;
	}

	// Check for compound types: Array<>, Callback<>, Function<>, Dictionary<>, Set<>, Promise<>, Map<>
	const lessThanIndex = type.indexOf('<');
	const greaterThanIndex = type.lastIndexOf('>');
	if (lessThanIndex !== -1 && greaterThanIndex !== -1) {
		// Compound data type
		const baseType = type.slice(0, lessThanIndex);
		if (!common.COMPLEX_TYPES.has(baseType)) {
			return [ new Problem(`${baseType} is not a valid complex type, must be one of ${Array.from(common.COMPLEX_TYPES.keys())}: ${fullTypeContext || type}`) ];
		}
		const subTypes = parseSubTypes(type.slice(lessThanIndex + 1, greaterThanIndex));
		const argCount = common.COMPLEX_TYPES.get(baseType);
		// Enforce complex types have correct number of generics specified
		if (argCount !== 0 && subTypes.length !== argCount) {
			return [ new Problem(`${type} must have ${argCount} generic type(s) specified, but had ${subTypes.length}: ${fullTypeContext || type}`) ];
		}
		// Special case for Callback<void> or Function<void>
		if (argCount === 0 && subTypes.length === 1 && subTypes[0] === 'void') {
			return [];
		}
		// check the generic types
		const errors = [];
		subTypes.forEach(sub => {
			errors.push(...validateDataType(sub.trim(), type));
		});
		return errors;
	}

	// not written as a compound type...
	const errors = [];

	// Is this a built in Javascript type?
	if (common.DATA_TYPES.includes(type)) {
		// Should it have been written as a complex type?
		if (common.COMPLEX_TYPES.has(type)) {
			const argCount = common.COMPLEX_TYPES.get(type); // may be 0 if Function/Callback
			// Enforce as ERROR if Promise/Set/Map doesn't have exact generic type count
			const severity = [ 'Map', 'Set', 'Promise' ].includes(type) ? ERROR : WARNING;
			errors.push(new Problem(`${type} ${severity === ERROR ? 'must' : 'should'} have ${argCount || 'any number of'} generic type(s) specified, but had 0: ${fullTypeContext || type}`, severity));
		} else if (type === 'Object') {
			// Warn about generic Object types (Dictionary is handled above as a complex type)
			// TODO: How can we mark/skip the valid cases here? Some APIs really do need to say "Object" as the arg/return value
			errors.push(new Problem(`Please define a new type rather than using the generic Object type reference: ${fullTypeContext || type}`, WARNING));
		}
		return errors;
	}

	// Is this a type in our APIDocs, or on our whitelist? (or are we on standalone mode?)
	const possibleProblem = validateClass(type);
	if (possibleProblem) {
		errors.push(possibleProblem);
	}

	// class/type is fine or whitelisted
	return errors;
}

/**
 * Validate default value
 * @param {*} val possible primitive or object
 * @returns {null|Problem} possible Problem if not a primitive or object
 */
function validateDefault(val) {
	if (validatePrimitive(val) && (typeof val !== 'object')) {
		return new Problem(`Not a valid data type or string: ${val}`);
	}
	return null;
}

/**
 * Validate platform listing
 * @param {*} platforms possible number
 * @returns {null|Problem} possible Problem if not valid
 */
function validatePlatforms(platforms) {
	// FIXME: If something explicitly lists a platform excluded at some higher level, we should error/warn!
	if (!Array.isArray(platforms)) {
		return new Problem('must be an array of valid platform names');
	}

	if (platforms.length === 0) {
		return new Problem('array must not be empty. Remove to fall back to "default" platforms based on "since" value; or remove doc entry if this applies to no platforms.');
	}

	// Filter the platforms against common.VALID_PLATFORMS - any remaining are invalid
	const remaining = platforms.filter(p => !common.VALID_PLATFORMS.includes(p));
	if (remaining && remaining.length !== 0) {
		return new Problem(`Invalid platform name(s): ${remaining}`);
	}

	return null;
}

/**
 * Validate availability
 * @param {*} availability possible availability
 * @returns {null|Problem} possible Problem if not valid
 */
function validateAvailability(availability) {
	return validateOneOf(AVAILABILITY, availability);
}

function validateOneOf(possibilities, value) {
	if (!possibilities.includes(value)) {
		return new Problem(`must be one of: ${possibilities}. was: ${value}`);
	}
	return null;
}

/**
 * Validate permission value
 * @param {string} permission possible permission
 * @param {string} propertyName name of the property whose permissions is being set
 * @returns {null|Problem} possible Problem if not valid
 */
function validatePermission(permission, propertyName) {
	const possibleProblem = validateOneOf(PERMISSIONS, permission);
	if (possibleProblem) {
		return possibleProblem;
	}
	// It's one of our enumerated values, but if it looks like a constant, should probably be 'read-only'
	// consider UPPER(_MORE)* style constants (i.e. can't start/end with underscores)
	if (/^[A-Z]+(_[A-Z]+)*$/.test(propertyName) && permission !== 'read-only') {
		return new Problem(`property name is all caps so permissions should likely be read-only (was ${permission})`, WARNING);
	}
	return null;
}

/**
 * Validate number
 * @param {*} number possible number
 * @returns {null|Problem} possible Problem if not a number
 */
function validateNumber(number) {
	if (typeof number !== 'number') {
		return new Problem(`Not a number value: ${number}`);
	}
	return null;
}

/**
 * Validate OS version
 * @param {object} oses map of os names to versions
 * @returns {Problem[]} possible problems (may be empty)
 */
function validateOSVersions(oses) {
	const problems = [];
	for (const key in oses) {
		if (~common.VALID_OSES.indexOf(key)) {
			for (const x in oses[key]) {
				switch (x) {
					case 'max':
					case 'min':
						const possibleVersionProblem = validateVersion(oses[key][x]);
						if (possibleVersionProblem) {
							problems.push(possibleVersionProblem);
						}
						break;
					case 'versions':
						// eslint-disable-next-line no-loop-func
						oses[key][x].forEach(elem => {
							const possibleVersionProblem = validateVersion(elem);
							if (possibleVersionProblem) {
								problems.push(possibleVersionProblem);
							}
						});
						break;
					default:
						problems.push(new Problem(`Unknown key: ${x}`));
				}
			}
		} else {
			problems.push(new Problem(`Invalid OS: ${key}; valid OSes are: ${common.VALID_OSES}`));
		}
	}
	return problems;
}

/**
 * Validate primitive
 * @param {object|number|boolean|string} x possible primitive value
 * @return {null|Problem} possible Problem if not a primitive
 */
function validatePrimitive(x) {
	if (validateBoolean(x) && validateNumber(x) && validateString(x)) {
		return new Problem(`Not a primitive value (Boolean, Number, String): ${x}`);
	}
	return null;
}

/**
 * Validate return value
 * @param {object|object[]} ret An array of objects, or object
 * @param {object} [ret.type] return type
 * @param {object} [ret.summary] summary of value
 * @param {object} [ret.constants] possible constant values
 * @returns {Problem[]} problems (may be empty)
 */
function validateReturns(ret) {
	const errors = [];
	if (Array.isArray(ret)) {
		errors.push(new Problem('Replace array of returns with single returns value with type having array of type names', WARNING));
		ret.forEach(elem => errors.push(...validateReturns(elem)));
	} else {
		let sawType = false;
		for (const key in ret) {
			switch (key) {
				case 'type':
					if (ret[key] !== 'void') {
						errors.push(...validateDataType(ret['type']));
					}
					sawType = true;
					break;
				case 'summary':
					const possibleProblem = validateString(ret['summary']);
					if (possibleProblem) {
						errors.push(possibleProblem);
					}
					break;
				case 'constants':
					errors.push(...validateConstants(ret['constants']));
					break;
				default:
					errors.push(new Problem(`Invalid key: ${key}`));
			}
		}
		if (!sawType) {
			errors.push(new Problem('Missing "type" for returns'));
		}
	}
	return errors;
}

/**
 * Validate since version
 * @param {object|string} version object holding platform/os to version string; or a normal version string
 * @param {Set<string>} platformsInContext the set of platforms this api member is listed as available on
 * @returns {Problem[]} array of Problems (may be empty)
 */
function validateSince(version, platformsInContext) {
	const errors = [];
	// since values may be listed per-platform
	if (typeof version === 'object') {
		for (const platform in version) {
			// Validate the platform specified is valid in this context (i.e. this api member is actually available on this platform!)
			if (!platformsInContext.has(platform)) {
				errors.push(new Problem(`Platform specified in 'since' ('${platform}') isn't one of the platforms this API is marked as available upon: ${Array.from(platformsInContext)}`));
			}
			// TODO: Check if the since value is extraneous (duplicates the inherited value)
			// This can be true if they explitly state the same value *or* if the implict "default" value for a platform would have been used
			// i.e. macos default is 9.2.0, so even if the property/method states a blanket "3.3.0", 9.2.0 would be used for macos
			// so we do not need to break it out by platform!
			// (Or do we want to encourage explicit values if they align with default?)
			if (platform in common.DEFAULT_VERSIONS) {
				try {
					// is it reporting a version before our initial version of the platform?
					if (nodeappc.version.lt(version[platform], common.DEFAULT_VERSIONS[platform])) {
						errors.push(new Problem(`Minimum version for ${platform} is ${common.DEFAULT_VERSIONS[platform]}`));
					}
				} catch (e) {
					// it reported an invalid version (unparseable as a version)
					errors.push(new Problem(`Invalid version string: ${version[platform]}`));
				}
			} else {
				// platform doesn't exist(!) - maybe a typo?
				errors.push(new Problem(`Invalid platform: ${platform}`));
			}
		}
		return errors;
	}
	const possibleProblem = validateVersion(version);
	if (possibleProblem) {
		errors.push(possibleProblem);
	}
	return errors;
}

/**
 * Validate deprecated.removed version
 * @param {string} version raw version number string
 * @param {Set<string>} platformsInContext the set of platforms this api member is listed as available on
 * @returns {Problem[]} array of Problems (may be empty)
 */
function validateRemoved(version, platformsInContext) {
	const errors = [];
	const possibleProblem = validateVersion(version);
	// If we can't parse it as a version, we can't compare, so just return the initial error
	if (possibleProblem) {
		errors.push(possibleProblem);
		return errors;
	}
	// FIXME: if the platform isn't listed explicitly at this level, we may just ignore it
	// How can we get access to the list of explicit platforms?! It'd be up the hierarchy from current object
	platformsInContext.forEach(p => {
		const earliestVersion = common.DEFAULT_VERSIONS[p];
		if (nodeappc.version.lt(version, earliestVersion)) {
			errors.push(new Problem(`API was removed in version: ${version}, but lists a platform introduced in ${earliestVersion}: ${p}`));
		}
	});
	return errors;
}

/**
 * Validates string type
 * @param {*} str possible string value
 * @returns {null|Problem} possible Problem if value isn't a string
 */
function validateString(str) {
	if (typeof str !== 'string') {
		return new Problem(`Not a string value: ${str}`);
	}
	return null;
}

/**
 * Validates string type and only ASCII characetrs (typically used to make method/property/event/parameter names ASCII only)
 * @param {*} str possible string value
 * @returns {null|Problem} possible Problem if value isn't a string or contains non-ASCII characters
 */
function validateASCIIString(str) {
	let problem = validateString(str);
	if (problem) {
		return problem;
	}
	if (!/^[\x00-\x7F]*$/.test(str)) { // eslint-disable-line no-control-regex
		return new Problem('String contains non-ASCII characters.');
	}
	return null;
}

/**
 * Validate string
 * @param {*} str possible string value
 * @returns {null|Problem} possible Problem if value isn't a string or contains non-ASCII characters
 */
function validateLowercaseString(str) {
	let problem = validateASCIIString(str);
	if (problem) {
		return problem;
	}
	if (str.toLowerCase() !== str) {
		return new Problem('Name should be all lowercase.', WARNING);
	}
	return null;
}

/**
 * Validatea markdown content (string type, can be converted from markdwn to html without erroring)
 * @param {string} str possible markdown string
 * @returns {null|Problem} possible Problem if not valid markdown (or string!)
 */
function validateMarkdown(str) {
	const stringProblem = validateString(str);
	if (stringProblem) {
		return stringProblem;
	}

	try {
		common.markdownToHTML(str);
	} catch (e) {
		return new Problem(`Error parsing markdown block "${str}": ${e}`);
	}
	return null;
}

/**
 * Validate version
 * @param {string} version possible version string
 * @return {null|Problem} possible Problem if not a value version string
 */
function validateVersion(version) {
	try {
		nodeappc.version.lt('0.0.1', version);
	} catch (e) {
		return new Problem(`Invalid version: ${version}`);
	}
	return null;
}

/**
 * adds the contents of the second map to the first (merging values with shared keys)
 * @param {Map<String, Problem[]>} map1 map getting modified by having another map merged into it
 * @param {Map<String, Problem[]>} map2 map to combine with the first
 * @returns {Map<String, Problem[]>}
 */
function mergeMaps(map1, map2) {
	if (map2 === null || map2 === undefined || map2.size < 1) {
		return map1;
	}

	map2.forEach((val, key) => {
		if (map1.has(key)) {
			// need to merge the results
			const combined = map1.get(key).concat(val);
			map1.set(key, combined);
		} else {
			map1.set(key, val);
		}
	});
	return map1;
}

/**
 * @param {string|null} baseNamespace may be null, may be a dotted namespace
 * @param {string} keyName base name of the key we're working on
 * @returns {string}
 */
function generateFullPath(baseNamespace, keyName) {
	if (baseNamespace) {
		return `${baseNamespace}.${keyName}`;
	}
	return keyName;
}

/**
 * Validates an object against a syntax dictionary
 * @param {Object} obj Object (from the parsed apidocs) to validate
 * @param {Object} syntax Dictionary defining the syntax
 * @param {string} type type name? the current key from apidocs?
 * @param {string} currentKey current key
 * @param {string} className Name of class being validated
 * @param {string} fullKeyPath full namespace of the key
 * @param {Set<string>} platformsInContext set of platforms this API is declared to be filtered to
 * @returns {Map<String, Problem[]>} mapping from keys to array of problems found for that key
 */
function validateObjectAgainstSyntax(obj, syntax, type, currentKey, className, fullKeyPath, platformsInContext) {
	// If syntax is a dictionary, validate object against syntax dictionary
	let result = new Map();

	// Narrow the set of platforms
	// TODO: allow method parameters to narrow too?
	if (type === 'properties' || type === 'methods' || type === 'events') {
		// If the set is the exact same **and** they specified a platforms explicitly, warn that it was unnecessary?
		const before = platformsInContext.size;
		platformsInContext = filterPlatforms(obj, platformsInContext);
		const after = platformsInContext.size;
		if (before === after && obj.platforms) {
			result.set(generateFullPath(fullKeyPath, 'platforms'), [ new Problem(`Unnecessary platforms listing which is the same as the inherited set: ${obj.platforms}`, WARNING) ]);
		}
	}

	// Ensure required keys exist and then validate them
	const requiredKeys = syntax.required;
	for (const requiredKey in requiredKeys) {
		const fullRequiredKeyPath = generateFullPath(fullKeyPath, requiredKey);
		if (requiredKey in obj) {
			result = mergeMaps(result, validateKey(obj[requiredKey], requiredKeys[requiredKey], requiredKey, className, fullRequiredKeyPath, platformsInContext));
		} else {
			// We're missing a required field. Check the parent to see if it's filled in there.
			// Only do this check when we're overriding an event, property or method, not top-level fields like 'summary'
			const parentClassName = doc[className]['extends'];
			let parent = doc[parentClassName],
				parentValue = null;
			if (type && parent) {
				const array = parent[type];
				if (array) {
					// find matching name in array
					for (let i = 0; i < array.length; i++) {
						if (array[i] && array[i].name === currentKey) { // eslint-disable-line max-depth
							parent = array[i];
							break;
						}
					}
					if (parent) {
						parentValue = parent[requiredKey];
					}
				}
			}

			if (!parentValue) {
				result.set(fullRequiredKeyPath, [ new Problem(`Required property "${requiredKey}" not found`) ]);
			}
		}
	}

	// Validate optional keys if they're on the object
	const optionalKeys = syntax.optional;
	for (const optionalKey in optionalKeys) {
		if (optionalKey in obj) {
			result = mergeMaps(result, validateKey(obj[optionalKey], optionalKeys[optionalKey], optionalKey, className, generateFullPath(fullKeyPath, optionalKey), platformsInContext));
		}
	}

	// Find keys on obj that aren't required or optional!
	for (const possiblyInvalidKey in obj) {
		// If doesn't start with underscores, and isn't required or optional...
		const isRequired = requiredKeys ? (possiblyInvalidKey in requiredKeys) : false;
		const isOptional = optionalKeys ? (possiblyInvalidKey in optionalKeys) : false;
		if (possiblyInvalidKey.indexOf('__') !== 0 && !isRequired && !isOptional) {
			// We found some entry in our docs that isn't required or optional in our syntax definition
			// so it's probably extraneous (or a typo)
			result.set(generateFullPath(fullKeyPath, possiblyInvalidKey), [ new Problem(`Invalid key(s) in ${className}: ${possiblyInvalidKey}`) ]);
		}
	}
	return result;
}

/**
 * @param {string} key map key
 * @param {null|Problem} possibleProblem possible problem
 * @returns {Map<string, Problem[]>}
 */
function possibleProblemAsMap(key, possibleProblem) {
	const map = new Map();
	if (possibleProblem) {
		map.set(key, [ possibleProblem ]);
	}
	return map;
}

/**
 * @param {string} key map key
 * @param {Problem[]} possibleProblems possible problems
 * @returns {Map<string, Problem[]>}
 */
function possibleProblemArrayAsMap(key, possibleProblems) {
	const map = new Map();
	if (possibleProblems && possibleProblems.length > 0) {
		map.set(key, possibleProblems);
	}
	return map;
}

/**
 * @param {string} fullKeyPath something like 'properties[propName].permission' is expected
 * @returns {string} returns 'propName' in the example
 */
function getPropertyName(fullKeyPath) {
	const lastOpenBracketIndex = fullKeyPath.lastIndexOf('[');
	const lastCloseBracketIndex = fullKeyPath.lastIndexOf(']');
	return fullKeyPath.slice(lastOpenBracketIndex + 1, lastCloseBracketIndex);
}

/**
 * Validates an object against a syntax dictionary
 * @param {Object} obj Object to validate
 * @param {Object} syntax Dictionary defining the syntax
 * @param {String} currentKey Current key being validated
 * @param {String} className Name of class being validated
 * @param {string} fullKeyPath full namespace of the current key
 * @param {Set<string>} platformsInContext set of platforms this API member is said to be filtered to
 * @returns {Map<String, Problem[]>} keys are the key paths, values are an array of Problems found for that specific apidoc tree member
 */
function validateKey(obj, syntax, currentKey, className, fullKeyPath, platformsInContext) {
	// if a value is an Array in the syntax definition, it basically means that the given element can have 0+ instances of the wrapped object/syntax
	if (Array.isArray(syntax)) {
		if (syntax.length !== 1) {
			// if the array has more than one entry, the syntax definition is busted
			return possibleProblemAsMap(fullKeyPath, new Problem(`Syntax tree definition has more than one Array element at ${syntax}. Please fix it.`));
		}

		// Should only contain one entry, an object holding the definition of elements allowed in the array for this key
		const firstSyntaxElement = syntax[0];
		if (typeof firstSyntaxElement !== 'object') {
			return possibleProblemAsMap(fullKeyPath, new Problem(`Syntax tree definition has a non-Object Array element at ${syntax}. Please fix it.`));
		}

		// Ok so this element defines how the entries for the key's array should look (i.e. how a given single property, method, event or example are defined)
		// obj here should be an array!
		if (!Array.isArray(obj)) {
			return possibleProblemAsMap(fullKeyPath, new Problem(`We expect an Array of values for ${currentKey}, but received non-Array: ${obj}`));
		}

		// Validate each object against the syntax
		let problemMap = new Map();
		obj.forEach((elem, index) => {
			const name = elem.name || '__noname';
			const nameOrIndex = elem.name || index;
			problemMap = mergeMaps(problemMap, validateObjectAgainstSyntax(elem, firstSyntaxElement, currentKey, name, className, `${fullKeyPath}[${nameOrIndex}]`, platformsInContext));
		});
		return problemMap;
	}

	// we're matching a given parsed apidoc tree item/node against the defined syntax tree/object (defined at the top of this file)
	if (typeof syntax === 'object') {
		return validateObjectAgainstSyntax(obj, syntax, null, currentKey, className, fullKeyPath, platformsInContext);
	}

	// We have a specific syntax element to validate against
	switch (syntax) {
		case 'Boolean':
			return possibleProblemAsMap(fullKeyPath, validateBoolean(obj));
		case 'Class':
			return possibleProblemAsMap(fullKeyPath, validateClass(obj));
		case 'Constants':
			return possibleProblemArrayAsMap(fullKeyPath, validateConstants(obj));
		case 'DataType':
			return possibleProblemArrayAsMap(fullKeyPath, validateDataType(obj));
		case 'Default':
			return possibleProblemAsMap(fullKeyPath, validateDefault(obj));
		case 'Number':
			return possibleProblemAsMap(fullKeyPath, validateNumber(obj));
		case 'OSVersions':
			return possibleProblemArrayAsMap(fullKeyPath, validateOSVersions(obj));
		case 'Removed':
			return possibleProblemArrayAsMap(fullKeyPath, validateRemoved(obj, platformsInContext));
		case 'Primitive':
			return possibleProblemAsMap(fullKeyPath, validatePrimitive(obj));
		case 'Returns':
			return possibleProblemArrayAsMap(fullKeyPath, validateReturns(obj));
		case 'Since':
			return possibleProblemArrayAsMap(fullKeyPath, validateSince(obj, platformsInContext));
		case 'LowercaseASCIIString':
			return possibleProblemAsMap(fullKeyPath, validateLowercaseString(obj));
		case 'String':
			return possibleProblemAsMap(fullKeyPath, validateString(obj));
		case 'ASCIIString':
			return possibleProblemAsMap(fullKeyPath, validateASCIIString(obj));
		case 'Markdown':
			return possibleProblemAsMap(fullKeyPath, validateMarkdown(obj));
		case 'Platforms':
			return possibleProblemAsMap(fullKeyPath, validatePlatforms(obj));
		case 'Availability':
			return possibleProblemAsMap(fullKeyPath, validateAvailability(obj));
		case 'Permission':
			// permissions are always under a given property (only place they are used), so hack
			// to extract the name of the property
			const propertyName = getPropertyName(fullKeyPath);
			return possibleProblemAsMap(fullKeyPath, validatePermission(obj, propertyName));
		case 'Invalid':
			return possibleProblemAsMap(fullKeyPath, new Problem(`Invalid field "${currentKey}"`));
		default:
			// we use Array<events.name>, Array<methods.name>, or Array<properties.name> in references for the excludes property
			// so let's validate that the references names actually exist on the type hierarchy
			if (syntax.indexOf('Array') === 0) {
				// Pull out the internal "type" of the array reference
				const baseTypeReference = syntax.slice(syntax.indexOf('<') + 1, syntax.indexOf('>'));
				switch (baseTypeReference) {
					case 'events.name':
						return possibleProblemAsMap(fullKeyPath, validateAPINames(obj, 'events', className));
					case 'methods.name':
						return possibleProblemAsMap(fullKeyPath, validateAPINames(obj, 'methods', className));
					case 'properties.name':
						return possibleProblemAsMap(fullKeyPath, validateAPINames(obj, 'properties', className));
					default:
						return possibleProblemAsMap(fullKeyPath, new Problem(`Did not validate: ${currentKey} = ${obj}`, WARNING));
				}
			}
			// This should never happen!
			return possibleProblemAsMap(fullKeyPath, new Problem(`Did not validate: ${currentKey} = ${obj}`, WARNING));
	}
}

/**
 * @param {object} obj api member from YML
 * @param {Set<string>} defaultPlatforms the default set of platforms inherited
 * @returns {Set<string>} the set of platforms this api member is said to be filtered to
 */
function filterPlatforms(obj, defaultPlatforms) {
	// if the api member explicitly declares a set of platforms use it. Otherwise fall back to the inherited set (or the implicit default)
	const platformsInContext = new Set(obj.platforms ? obj.platforms : defaultPlatforms);

	// Now remove exclude-platforms
	if (obj['exclude-platforms']) {
		obj['exclude-platforms'].forEach(p => platformsInContext.delete(p));
	}
	return platformsInContext;
}

/**
 * Output CLI usage
 */
function cliUsage () {
	common.log('Usage: node validate.js [--standalone] [--quiet] [--whitelisted Type.Name,Type.Two] [--constant Titanium.Namespace.CONSTANT] [<PATH_TO_YAML_FILES>]');
	common.log('\nOptions:');
	common.log('\t--quiet, -q\tSuppress non-error messages');
	common.log('\t--standalone, -s\tdisable error checking for inherited APIs');
	common.log('\t--whitelisted, -w\tdisable error checking for unresolved types. Can be specified multiple times. Accepts a comma separated list of types.');
	common.log('\t--constant, -c\tdisable error checking for unresolved constant references. Can be specified multiple times. Accepts a comma separated list of constants.');
}

// Start of Main Flow
// Check command arguments
const argc = process.argv.length;
let basePath = '.';
if (argc > 2) {
	for (let x = 2; x < argc; x++) {
		switch (process.argv[x]) {
			case '--help':
				cliUsage();
				process.exit(0);
			// TODO: Remove standalone mode? It really just ignores being unable to resolve any types
			// We should probably just make it like an auto-whitelist for commonly-referred-to types in SDK like Ti.Proxy, Ti.UI.View
			case '--standalone':
			case '-s':
				standaloneFlag = true;
				common.log('Standalone mode enabled. Errors will not be logged against inherited APIs.');
				break;
			case '--whitelisted':
			case '-w' :
				// Read next arg as a whitelisted type
				if (x === argc - 1) {
					common.log(common.LOG_WARN, 'Must supply name of whitelisted type');
					cliUsage();
					process.exit(1);
				}
				const types = process.argv[++x].split(',');
				whitelistedTypes.push(...types);
				break;
			case '--constant':
			case '-c' :
				// Read next arg as a whitelisted constant reference
				if (x === argc - 1) {
					common.log(common.LOG_WARN, 'Must supply name of whitelisted constant references');
					cliUsage();
					process.exit(1);
				}
				const constants = process.argv[++x].split(',');
				whitelistedConstants.push(...constants);
				break;
			case '--quiet':
			case '-q':
				common.setLogLevel(common.LOG_WARN);
				break;
			default:
				if (x === argc - 1) {
					basePath = process.argv[process.argv.length - 1];
				} else {
					common.log(common.LOG_WARN, 'Unknown option: %s', process.argv[x]);
					cliUsage();
					process.exit(1);
				}
		}
	}
}

if (whitelistedTypes.length !== 0) {
	common.log('Whitelist mode enabled. Errors will not be logged for failure to resolve these types: ' + whitelistedTypes);
}

if (whitelistedConstants.length !== 0) {
	common.log('Whitelist constant mode enabled. Errors will not be logged for failure to resolve these constants: ' + whitelistedConstants);
}

if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
	common.log(common.LOG_ERROR, 'Invalid path: %s', basePath);
	process.exit(1);
}

// Load YAML files
const rv = common.parseYAML(basePath);
doc = rv.data;
const parseErrors = rv.errors;
if (Object.keys(doc).length === 0) {
	common.log(common.LOG_ERROR, 'Could not find YAML files in %s', basePath);
	process.exit(1);
}

common.createMarkdown(doc);
// TODO: Move to common?
const DEFAULT_PLATFORMS = new Set(Object.keys(common.DEFAULT_VERSIONS));

// Keep track of all errors/warnings across all files
let totalErrorCount = 0;
let totalWarningCount = 0;
// Validate YAML
for (const key in doc) {
	const cls = doc[key];
	const currentFile = cls.__file;

	let errorCount = 0;
	let warningCount = 0;
	let output = '';
	try {
		const platformsInContext = filterPlatforms(cls, DEFAULT_PLATFORMS);
		const keysToProblems = validateKey(cls, validSyntax, null, key, null, platformsInContext);
		keysToProblems.forEach((problems, key) => {
			problems.forEach(p => {
				if (p.isError()) {
					errorCount++;
					output += `\t${key} - ${p}\n`.red;
				} else if (p.isWarning()) {
					warningCount++;
					output += `\t${key} - ${p}\n`.yellow;
				} else {
					output += `\t${key} - ${p}\n`;
				}
			});
		});
	} catch (e) {
		console.log(currentFile);
		common.log(common.LOG_ERROR, 'PARSING ERROR:\n%s', e);
		console.error(e.stack);
		errorCount++;
	}

	if (errorCount > 0) {
		console.log(currentFile);
		common.log(common.LOG_ERROR, '%s: found %s error(s), %s warning(s)!', cls.name, errorCount, warningCount);
		console.log(output);
	} else if (warningCount > 0) {
		console.log(currentFile);
		common.log(common.LOG_WARN, '%s: found %s warning(s)!', cls.name, warningCount);
		console.log(output);
	}
	// Sum up all errors/warnings
	totalErrorCount += errorCount;
	totalWarningCount += warningCount;
}

// Summarize all errors/warnings
let exitCode = 0; // Exit with error if we found errors or handled exceptions
if (parseErrors && parseErrors.length > 0) {
	common.log(common.LOG_ERROR, 'The following files have YAML syntax errors: ');
	parseErrors.forEach(function (error) {
		common.log(common.LOG_ERROR, '%s\n%s', error.__file, error);
	});
	exitCode = 1;
}

if (totalErrorCount > 0) {
	common.log(common.LOG_ERROR, 'Found %s error(s), %s warning(s)!', totalErrorCount, totalWarningCount);
	exitCode = 1;
} else if (totalWarningCount > 0) {
	common.log(common.LOG_WARN, 'Found %s warning(s)!', totalWarningCount);
} else {
	common.log('No errors found!');
}
process.exit(exitCode);
