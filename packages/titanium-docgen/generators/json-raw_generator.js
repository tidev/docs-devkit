/**
 * Copyright (c) 2015-2017 Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License.
 *
 * Script to convert data to JSON format for third-party extensions
 */
'use strict';

const common = require('../lib/common.js'),
	assert = common.assertObjectKey;
let doc = {};

// eslint-disable-next-line security/detect-child-process
const exec = require('child_process').execSync;

/**
 * Export deprecated field
 * @param {object} api api object
 * @return {object|null}
 */
function exportDeprecated(api) {
	if ('deprecated' in api && api.deprecated) {
		return {
			notes: api.deprecated.notes || '',
			since: api.deprecated.since,
			removed: api.deprecated.removed
		};
	}
	return null;
}

/**
 * Export summary field
 * @param {object} api api object
 * @return {string} HTML-ified summary text
 */
function exportSummary(api) {
	let rv = '';
	if ('summary' in api && api.summary) {
		rv = api.summary;
	}
	return rv;
}

/**
 * Export examples field
 * @param {object} api api object
 * @return {object[]}
 */
function exportExamples(api) {
	const rv = [];
	if ('examples' in api && api.examples.length > 0) {
		api.examples.forEach(function (example) {
			let code = example.example;
			rv.push({ description: example.title, code: code });
		});
	}
	return rv;
}

/**
 * Export method parameters or event properties field
 * @param {object[]} apis api tree
 * @param {string} type type name
 * @return {object[]}
 */
function exportParams(apis, type) {
	const rv = [];
	if (apis) {
		apis.forEach(function (member) {
			const annotatedMember = {};
			annotatedMember.name = member.name;
			if (assert(member, 'deprecated')) {
				annotatedMember.deprecated = exportDeprecated(member);
			}
			annotatedMember.summary = exportSummary(member);
			if (assert(member, 'description')) {
				annotatedMember.description = exportDescription(member);
			}
			annotatedMember.type = member.type || 'String';
			if (type === 'parameters') {
				annotatedMember.optional = member.optional || false;
			}
			rv.push(annotatedMember);
		});
	}
	return rv;
}

/**
 * Export description field
 * @param {object} api api object
 * @return {string|null} HTML-ified description
 */
function exportDescription(api) {
	if ('description' in api && api.description) {
		return api.description;
	}
	return null;
}

/**
 * Export returns field
 * @param {object} api api object
 * @return {object|object[]}
 */
function exportReturnTypes(api) {
	const rv = [];
	if (assert(api, 'returns')) {
		if (!Array.isArray(api.returns)) {
			api.returns = [ api.returns ];
		}
		api.returns.forEach(function (ret) {
			const x = {};
			if (assert(ret, 'summary')) {
				x.summary = ret.summary;
			}
			x.type = ret.type;
			rv.push(x);
		});
	} else {
		rv.push({ type: 'void' });
	}
	if (rv.length === 1) {
		return rv[0];
	}
	return rv;
}

/**
 * Export since field
 * @param {object} api api object
 * @return {object[]}
 */
function exportPlatforms(api) {
	const rv = [];
	for (const platform in api.since) {
		rv.push({
			since: api.since[platform],
			name: platform
		});
	}
	return rv;
}

/**
 * Export members API
 * @param {object} api api object
 * @param {string} type type name
 * @return {object[]}
 */
function exportAPIs(api, type) {
	var rv = [],
		x = 0,
		member = {},
		annotatedMember = {};

	if (type in api) {
		for (x = 0; x < api[type].length; x++) {
			member = api[type][x];
			if (member.__hide) {
				continue;
			}
			if (member.__accessor) {
				continue;
			}
			annotatedMember.name = member.name;
			if (assert(member, 'deprecated')) {
				annotatedMember.deprecated = exportDeprecated(member);
			}
			annotatedMember.summary = exportSummary(member);
			if (assert(member, 'description')) {
				annotatedMember.description = exportDescription(member);
			}
			annotatedMember.platforms = exportPlatforms(member);
			if (member.__inherits !== api.name) {
				annotatedMember.inherits = member.__inherits;
			}

			switch (type) {
				case 'events':
					if (member.properties) {
						if ('Titanium.Event' in doc) {
							member.properties = member.properties.concat(doc['Titanium.Event'].properties);
						}
						annotatedMember.properties = exportParams(member.properties, 'properties');
					}
					break;
				case 'methods':
					if (assert(member, 'examples')) {
						annotatedMember.examples = exportExamples(member);
					}
					if (assert(member, 'parameters')) {
						annotatedMember.parameters = exportParams(member.parameters, 'parameters');
					}
					annotatedMember.returns = exportReturnTypes(member);
					break;
				case 'properties':
					if (assert(member, 'examples')) {
						annotatedMember.examples = exportExamples(member);
					}
					annotatedMember.type = member.type || 'String';
					if (assert(member, 'availability')) {
						annotatedMember.availability = member.availability;
					}
					if (assert(member, 'default')) {
						annotatedMember['default'] = member['default'];
					}
					if (assert(member, 'optional')) {
						annotatedMember.optional = member.optional;
					}
					if (assert(member, 'permission')) {
						annotatedMember.permission = member.permission;
					}
					if (assert(member, 'value')) {
						annotatedMember.value = member.value;
					}
			}

			rv.push(annotatedMember);
			member = annotatedMember = {};
		}
	}

	return rv;
}

const REPO_URLS = new Map();
/**
 * Convert a filepath on disk to the URL of the repo on github for that file
 * @param {string} filepath file path (should be root of git clone)
 * @returns {string}
 */
function getRepoUrl(filepath) {
	if (REPO_URLS.has(filepath)) {
		return REPO_URLS.get(filepath);
	}
	const stdout = exec('git config --get remote.origin.url', { cwd: filepath }).toString().trim();
	const m = stdout.match(/^(git@|https:\/\/)github.com[:/]([\w-]+)\/([\w_-]+)\.git$/);
	if (!m) {
		const result = 'https://github.com/appcelerator/titanium_mobile/edit/master/';
		REPO_URLS.set(filepath, result);
		return result;
	}
	const org = m[2];
	const repo = m[3];
	const result = `https://github.com/${org}/${repo}/edit/master/`;
	REPO_URLS.set(filepath, result);
	return result;
}

function editUrl(api) {
	const file = api.__file;
	// we need to strip path to remove al the way up to /apidoc to get the relative path
	const apiDocIndex = file.indexOf('apidoc/');
	const relPath = file.slice(apiDocIndex);
	const basePath = file.slice(0, apiDocIndex);
	const repoUrl = getRepoUrl(basePath);
	return `${repoUrl}${relPath}`;
}

/**
 * Annotate JSON data for consumption by third-party tools
 * @param {object[]} apis api tree
 * @return {object[]}
 */
exports.exportData = function exportJSON(apis) {
	const rv = {};
	doc = apis; // TODO make doc a field on a type, rather than this weird file-global!

	common.log(common.LOG_INFO, 'JSON-RAW generator starting...');

	for (const className in apis) {
		const cls = apis[className];
		const annotatedClass = {
			name: cls.name,
			summary: exportSummary(cls),
			extends: cls['extends'] || 'Object',
			platforms: exportPlatforms(cls),
			type: cls.__subtype || 'object',
			editUrl: editUrl(cls)
		};
		// Avoid setting null/empty array values - trims down large filesize
		if (assert(cls, 'deprecated')) {
			annotatedClass.deprecated = exportDeprecated(cls);
		}
		if (assert(cls, 'description')) {
			annotatedClass.description = exportDescription(cls);
		}
		if (assert(cls, 'events')) {
			annotatedClass.events = exportAPIs(cls, 'events');
		}
		if (assert(cls, 'examples')) {
			annotatedClass.examples = exportExamples(cls);
		}
		if (assert(cls, 'methods')) {
			annotatedClass.methods = exportAPIs(cls, 'methods');
		}
		if (assert(cls, 'properties')) {
			annotatedClass.properties = exportAPIs(cls, 'properties');
		}
		if (~[ 'proxy', 'view' ].indexOf(annotatedClass.type)) {
			annotatedClass.subtype = annotatedClass.type;
			annotatedClass.type = 'object';
		}

		rv[className] = annotatedClass;
	}
	return rv;
};
