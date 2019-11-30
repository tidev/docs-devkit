const common = require('../lib/common.js');

const knownInterfaces = [
	'String',
	'JSON',
	'console'
];

const RESERVED_KEYWORDS = [
	// Reserved keywords as of ECMAScript 2015
	'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
	'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for',
	'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 'super',
	'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
	'yield',
	// Future reserved keywords
	'enum', 'implements', 'interface', 'let', 'package', 'private',
	'protected', 'public', 'static', 'await'
];

const ERROR = {
	UNDEFINED_TYPE: '#Error. #Undefined type',
	UNTYPED: '#Error. #Untyped',
	INCORRECT_ARGUMENTS: '#Error. #Suspicious method arguments. Optional argument is not the last',
	INCORRECT_IDENTIFIER: '#Error. #Skip incorrect identifier',
	REDECLARATION: '#Error. #Skip block-scoped variable redeclaration'
};

function writeDefinitions(version, d) {
	const versionSplit = version.split('.');
	const majorMinor = `${versionSplit[0]}.${versionSplit[1]}`;
	return `// Type definitions for non-npm package Titanium ${majorMinor}
// Project: https://github.com/appcelerator/titanium_mobile
// Definitions by: Sergey Volkov <s.volkov@netris.ru>

type NonFunctionPropertyNames<T> = {
\t[K in keyof T]: T[K] extends Function ? never : K
}[keyof T];
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
type Dictionary<T> = Partial<NonFunctionProperties<T>>

interface ProxyEventMap {}

${d}
import Ti = Titanium;
`;
}

function getType(type) {
	if (typeof type === 'undefined') {
		return `any /* ${ERROR.UNDEFINED_TYPE} */`;
	}
	if (typeof type === 'string') {
		if (type.includes('2DMatrix')) {
			type = type.replace('2DMatrix', 'Matrix2D');
		}
		if (type.includes('3DMatrix')) {
			type = type.replace('3DMatrix', 'Matrix3D');
		}
	}
	switch (type) {
		case 'Boolean':
		case 'Function':
		case 'Number':
		case 'String':
			return type.toLowerCase();
		case 'Object':
			return 'any';
		case 'Callback':
		case 'Callback<Object>':
		case 'Callback<Dictionary>':
			return '(...args: any[]) => void';
		case 'Dictionary':
			return `any /* ${ERROR.UNTYPED} "${type}" */`;
		case 'Array<Dictionary>':
			return `any[] /* ${ERROR.UNTYPED} "${type}" */`;
		default:
			if (typeof type === 'object') {
				if (typeof type[0] === 'object') {
					return getType(type[0]);
				}
				if (typeof type.type !== 'undefined') {
					return getType(type.type);
				}
				return Object.values(type).map(v => getType(v)).join('|');
			} else if (type.startsWith('Callback')) {
				return type.replace(/^Callback<(.*)>$/, formatCallback);
			} else if (type === 'Array') {
				return `any[] /* ${ERROR.UNTYPED} "${type}" */`;
			} else {
				return type;
			}
	}
}

function formatCallback(match, p1) {
	const args = p1
		.split(',')
		.map((a, i) => {
			a = a.trim();
			if (a === 'Object') {
				a = 'any';
			}
			return `arg${i + 1}: ${a}`;
		})
		.join(', ');
	return `(${args}) => void`;
}

function getValidName(name) {
	if (RESERVED_KEYWORDS.includes(name)) {
		name += '_';
	}
	return name;
}

function deepExtend(from, to) {
	Object.keys(from).forEach(key => {
		if (key === 'global') {
			return;
		}
		if (typeof from[key] !== 'object' || from[key] === null) {
			to[key] = from[key];
		} else {
			if (!to[key]) {
				to[key] = {};
			}
			deepExtend(from[key], to[key]);
		}
	});
}

function formatRemoved(pad, methodOrProperty, comment) {
	const notes = methodOrProperty.deprecated.notes ? methodOrProperty.deprecated.notes.replace('\n', `\n${pad} *`) : '';
	return `${pad}/*\n`
			+ `${pad} * REMOVED in ${methodOrProperty.deprecated.removed}\n`
			+ `${pad} * ${notes}\n`
			+ `${pad} */\n`
			+ `${pad}${comment ? '// ' : ''}${methodOrProperty.name}: never;`;
}

function propertyToString(pad, property, allMethodsNames, optionalByDefault, isStatic) {
	if (property.deprecated && property.deprecated.removed) {
		return formatRemoved(pad, property, allMethodsNames.includes(property.name));
	}
	const opt = property.optional === true || typeof property.optional !== 'undefined' ? property.optional : optionalByDefault;
	const stat = isStatic ? 'static ' : '';
	const ro = property.permission === 'read-only' ? 'readonly ' : '';
	return `${pad}${stat}${ro}${property.name}${opt ? '?' : ''}: ${getType(property.type)};`;
}

function methodOverloadsToString(pad, method, allPropertiesNames, eventsInterfaceName, thisName, isStatic) {
	if (method.deprecated && method.deprecated.removed) {
		return formatRemoved(pad, method, allPropertiesNames.includes(method.name));
	}
	const methods = [];
	const parameters = method.parameters;
	let modifiedArguments = false;
	let result = '';
	if (!parameters) {
		methods.push(method);
	} else {
		const keys = Object.values(parameters);
		if (!keys.length) {
			methods.push(method);
		} else {
			// let hasOptional = false;
			let hasRequired = false;
			keys.reverse().forEach(v => {
				if (v.optional) {
					if (hasRequired) {
						modifiedArguments = true;
						v.optional = false;
					// } else {
					// 	hasOptional = true;
					}
				} else {
					hasRequired = true;
				}
			});
			methods.push(method);
		}
	}
	if (modifiedArguments) {
		result += `${pad}// ${ERROR.INCORRECT_ARGUMENTS}\n`;
	}
	result += methods.map(method => methodToString(pad, method, allPropertiesNames, eventsInterfaceName, thisName, isStatic)).join('\n');
	return result;
}

function methodToString(pad, method, allPropertiesNames, eventInterfaceName, thisName, isStatic) {
	if (method.__hide) {
		return `${pad}${method.name}: never;`;
	}
	const stat = isStatic ? 'static ' : '';
	if (eventInterfaceName) {
		if (method.name === 'addEventListener') {
			return `${pad}${stat}${method.name}<K extends keyof ${eventInterfaceName}>(name: K, callback: (this: ${thisName}, ev: ${eventInterfaceName}[K]) => any): void;\n`
					+ `${pad}${stat}${method.name}(name: string, callback: (this: ${thisName}, ...args: any[]) => any): void;`;
		} else if (method.name === 'removeEventListener') {
			return `${pad}${stat}${method.name}<K extends keyof ${eventInterfaceName}>(name: K, callback: (this: ${thisName}, ev: ${eventInterfaceName}[K]) => any): void;\n`
					+ `${pad}${stat}${method.name}(name: string, callback: (...args: any[]) => any): void;`;
		} else if (method.name === 'fireEvent') {
			return `${pad}${stat}${method.name}<K extends keyof ${eventInterfaceName}>(name: K, ev: ${eventInterfaceName}[K]): void;\n`
					+ `${pad}${stat}${method.name}(name: string, ...args: any[]): void;`;
		}
	}
	const args = methodArgumentsToString(method.parameters).join(', ');
	return `${pad}${stat}${method.name}(${args}): ${methodResultToString(method)};`;
}

function methodArgumentsToString(parameters, padding = '') {
	if (!parameters) {
		return [];
	}
	const keys = Object.values(parameters);
	if (!keys.length) {
		return [];
	}
	return keys.map(v => {
		const name = getValidName(v.name);
		const type = getType(v.type);
		let optional = '';
		if (v.optional) {
			optional = '?';
		}
		return `${padding}${name}${optional}: ${type}`;
	});
}

function methodResultToString(method) {
	return method.returns && Object.keys(method.returns).length ? getType(method.returns) : 'void';
}

function excludesToString(pad, excludesSet, prefix) {
	const temp = [];
	if (excludesSet.size) {
		excludesSet.forEach(v => temp.push(`${pad}${prefix || ''}${v}: never;`));
		temp.push('');
	}
	return temp.join('\n');
}

class Block {
	constructor(params) {
		this._baseName = params.baseName;
		this._padding = params.padding;
		this._inGlobal = params.inGlobal;
		this._global = params.global;

		this.api = {};

		/** @type {Array<Block>} */
		this.childBlocks = [];
		this.childBlocksMap = {};
	}
	formatClassOrInterface(namespaceGenerated) {
		this.prepareExcludes();
		const padding = `${this._padding}\t`;
		const methods = Object.values(this.api.methods);
		const properties = Object.values(this.api.properties);

		const allMethodsNames = methods.map(v => v.name);
		const allPropertiesNames = properties.map(v => v.name);
		const { eventsMapName, eventInterface } = this.formatEvents();
		let inner = '';
		let dec = '';
		let result = '';
		let classOrInterface = 'class';
		let baseName = this._baseName;
		if (this._inGlobal) {
			dec = 'declare ';
			if (knownInterfaces.includes(baseName)) {
				classOrInterface = 'interface';
			}
			if (baseName === 'console') {
				baseName = 'Console';
				classOrInterface = 'interface';
				result += `${dec}var console: ${baseName};\n`;
			}
			if (this.api.__subtype === 'pseudo' && !this.api.__creatable) {
				classOrInterface = 'interface';
			}
		}

		const isStatic = classOrInterface === 'class' && this.api.__subtype === 'module';

		if (properties.length) {
			const optionalByDefault = this.api.name.indexOf('.') === -1;
			const props = [];
			inner += excludesToString(padding, this.all_excludes['properties']);
			properties.forEach(v => {
				if (namespaceGenerated && v.name === v.name.toUpperCase()) {
					return;
				}
				props.push(propertyToString(padding, v, allMethodsNames, optionalByDefault, isStatic));
			});
			inner += props.length ? (props.join('\n') + '\n') : '';
		}
		if (methods.length) {
			inner += excludesToString(padding, this.all_excludes['methods']);
			inner += methods.map(v => methodOverloadsToString(padding, v, allPropertiesNames, eventsMapName, this.api.name, isStatic)).join('\n') + '\n';
		}
		let ext = '';
		if (this.api.extends && this._baseName !== 'Titanium') {
			ext = `extends ${this.api.extends} `;
		}

		result += `${this._padding}${dec}${classOrInterface} ${baseName} ${ext}{\n${inner}${this._padding}}\n`;
		if (eventInterface) {
			result = eventInterface + result;
		}
		return result;
	}
	formatEvents() {
		const padding = `${this._padding}\t`;
		let eventInterface = '';
		let eventsMapName;
		if (this.api.events && Object.keys(this.api.events)) {
			const events = new Map(Object.values(this.api.events).map(e => [ e.name, e ]));
			if (this.api.excludes && this.api.excludes.events) {
				Object.values(this.api.excludes.events).forEach(event => events.delete(event));
			}
			if (events.size) {
				eventsMapName = 'Ti.Event';
				const body = [];
				const baseEvent = `${this._baseName}BaseEvent`;
				eventInterface += `${this._padding}interface ${baseEvent} extends Ti.Event {\n`
						+ `${padding}source: ${this.api.name}\n`
						+ `${this._padding}}\n`;
				events.forEach((event, name) => {
					if (event.deprecated && event.deprecated.removed) {
						return;
					}
					const properties = event.properties && Object.values(event.properties) || [];
					eventsMapName = `${this._baseName}EventMap`;
					let eventInterfaceName = baseEvent;
					if (properties.length) {
						eventInterfaceName = `${this._baseName}_${name.replace(':', '_')}_Event`;
						const temp = methodArgumentsToString(properties, padding);
						eventInterface += `${this._padding}interface ${eventInterfaceName} extends ${baseEvent} {\n`
								+ temp.join(',\n')
								+ `\n${this._padding}}\n`;
					}
					body.push(`${padding}\t"${name}": ${eventInterfaceName}`);
				});
				if (eventsMapName !== 'Ti.Event') {
					eventInterface += `${this._padding}interface ${eventsMapName} extends ProxyEventMap {\n`
							+ body.join(',\n')
							+ `\n${this._padding}}\n`;
				}
			}
		}
		return { eventInterface, eventsMapName };
	}
	formatNamespace(hasClass) {
		let inner = this.childBlocks.map(block => block.toString()).join('');
		this.prepareExcludes();
		const methods = Object.values(this.api.methods);
		const properties = Object.values(this.api.properties);
		const isGlobal = this === this._global;
		const padding = isGlobal ? '' : `${this._padding}\t`;
		const declare = isGlobal ? 'declare ' : '';

		if (methods.length && !hasClass) {
			inner = excludesToString(padding, this.all_excludes['methods'], 'const ')
					+ methods.map(v => {
						const args = methodArgumentsToString(v.parameters).join(', ');
						return `${padding}${declare}function ${v.name}(${args}): ${methodResultToString(v)};`;
					}).join('\n') + '\n' + inner;
		}
		if (properties.length) {
			const apiName = this.api.name;
			const props = [];
			properties.forEach(v => {
				if (hasClass && v.name !== v.name.toUpperCase()) {
					return;
				}
				let prefix = 'let';
				if (v.permission === 'read-only') {
					prefix = 'const';
				}
				const result = `${declare}${prefix} ${v.name}: ${getType(v.type)};`;
				if (v.name === 'R' && (apiName === 'Titanium.Android' || apiName === 'Titanium.App.Android')) {
					props.push(`${padding}// ${ERROR.REDECLARATION}\n${padding}//${result}`);
				} else {
					props.push(`${padding}${result}`);
				}
			});
			inner = excludesToString(padding, this.all_excludes['properties'])
					+ (props.length ? (props.join('\n') + '\n') : '') + inner;
		}

		if (isGlobal) {
			return inner;
		}
		return `${this._padding}${this._inGlobal ? 'declare ' : ''}namespace ${this._baseName} {\n${inner}${this._padding}}\n`;
	}
	prepareExcludes() {
		const methodProperties = [ 'methods', 'properties' ];
		if (!this.api.excludes) {
			this.api.excludes = {
				methods: {},
				properties: {}
			};
		} else {
			this.api.excludes.methods = this.api.excludes.methods || {};
			this.api.excludes.properties = this.api.excludes.properties || {};
		}
		this.all_excludes = {};
		methodProperties.forEach(key => {
			this.all_excludes[key] = new Set(Object.values(this.api.excludes[key]));
		});
		if (this.api.extends) {
			let parent = this._global;
			const path = this.api.extends.split('.');
			do {
				const namespaceName = path.shift();
				parent = parent.getOrCreateBlock(namespaceName);
			} while (path.length > 0);
			if (parent.api.excludes) {
				if (!parent.__excludesReady) {
					parent.prepareExcludes();
				}
				methodProperties.forEach(key => {
					parent.all_excludes[key].forEach(v => {
						if (!this.all_excludes[key].has(v)) {
							this.all_excludes[key].add(v);
						}
					});
				});
			}
		}
		methodProperties.forEach(key => this.removeExcluded(key));
		this.__excludesReady = true;
	}
	toString() {
		if (!isNaN(parseInt(this._baseName[0], 10)) || this._baseName === 'Dictionary') {
			return `${this._padding}// ${ERROR.INCORRECT_IDENTIFIER} "${this._baseName}";\n`;
		}
		let result = '';
		const hasChildren = this.childBlocks.length;
		const isModules = this.api.name === 'Modules';
		if ([ 'proxy', 'view', 'pseudo' ].includes(this.api.__subtype) && !isModules) {
			result += this.formatClassOrInterface(false);
		} else if (this.api.__subtype === 'module' || isModules) {
			const generateClass = this !== this._global && !isModules;
			if (hasChildren) {
				result += this.formatNamespace(generateClass);
			}
			if (generateClass) {
				result += this.formatClassOrInterface(hasChildren);
			}
		} else {
			common.log(common.LOG_INFO, `${this.api.name}  :  ${this.api.__subtype}`);
		}
		return result;
	}
	getOrCreateBlock(name) {
		if (typeof this.childBlocksMap[name] !== 'undefined') {
			return this.childBlocks[this.childBlocksMap[name]];
		}
		const inGlobal = this._global === this;
		const padding = inGlobal ? '' : this._padding + '\t';
		const tempBlock = new Block({ baseName: name, padding: padding, inGlobal: inGlobal, global: this._global });
		this.childBlocksMap[name] = this.childBlocks.length;
		this.childBlocks.push(tempBlock);
		return tempBlock;
	}
	add(name, api) {
		this.getOrCreateBlock(name).update(api);
	}
	update(api) {
		deepExtend(api, this.api);
	}
	removeExcluded(container) {
		if (this.all_excludes) {
			if (this.all_excludes[container] && this.all_excludes[container].size) {
				Object.keys(this.api[container]).forEach(key => {
					const name = this.api[container][key].name;
					if (this.all_excludes[container].has(name)) {
						delete this.api[container][key];
					}
				});
			}
		}
	}
}

function createBlock(global, api) {
	if (typeof api !== 'object' || api === null) {
		return;
	}
	const name = api.name;
	let parent = global;
	if (name === global._baseName) {
		global.update(api);
		return;
	}
	const path = name.split('.');
	let namespaceName = path.shift();
	if (namespaceName === global._baseName) {
		namespaceName = path.shift();
	}
	while (path.length > 0) {
		parent = parent.getOrCreateBlock(namespaceName);
		namespaceName = path.shift();
	}

	parent.add(namespaceName, api);
}

function createGlobal() {
	const block = new Block({ baseName: 'Global', padding: '' });
	block._global = block;
	return block;
}

/**
 * Returns a string with js API description
 * @param {Object} apis full api tree
 * @return {string}
 */
exports.exportData = function exportDTS(apis) {
	common.log(common.LOG_INFO, 'Generating TypeScript declaration file...');

	const global = createGlobal();
	for (const fullyQualifiedTypeName in apis) {
		createBlock(global, apis[fullyQualifiedTypeName]);
	}
	return writeDefinitions(apis.__version, global.toString());
};
