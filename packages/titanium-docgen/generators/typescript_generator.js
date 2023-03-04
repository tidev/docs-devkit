'use strict';
const common = require('../lib/common.js');
const path = require('path');

/*
 * Map of invalid types and their replacement
 */
const invalidTypeMap = {
	'2DMatrix': 'Matrix2D',
	'3DMatrix': 'Matrix3D',
	Dictionary: 'any',
	Object: 'any'
};

const skipApis = [
	'Dictionary',
	'Titanium.UI.2DMatrix',
	'Titanium.UI.3DMatrix'
];

// List of modules that need to be generated as an interface instead of a namespace.
const forcedInterfaces = [
	'Titanium.Android.R',
	'Titanium.App.iOS.UserDefaults',
	'Titanium.Media.Item',
	'Titanium.Calendar.Attendee',
	'Titanium.Calendar.Reminder',
	'Titanium.Calendar.RecurrenceRule',
	'Titanium.Platform.DisplayCaps',
	'Titanium.XML.DocumentType'
];

const eventsMethods = [
	'addEventListener',
	'removeEventListener',
	'fireEvent'
];

const globalIgnoreList = [
	'Global',
	'CollatorOptions',
	'DateTimeFormatOptions',
	'NumberFormatOptions'
];

let parser = null;

exports.exportData = function exportGlobalTemplate(apis) {
	parser = new DocsParser(apis);
	parser.parse();

	const writer = new GlobalTemplateWriter(apis.__version);
	writer.generateTitaniumDefinition(parser.tree);

	return writer.output;
};

/**
 * Checks if a proxy only consists of constants.
 *
 * These need to be rendered as a namespace instead of an interface because they
 * are used exclusively as values instead of types.
 *
 * @param {Object} typeInfo API docs
 * @return {Boolean} True if the given API type doc consists of constants only.
 */
function isConstantsOnlyProxy(typeInfo) {
	if (typeInfo.__subtype !== 'proxy') {
		return false;
	}

	const ownMethods = typeInfo.methods.filter(methodDoc => {
		if (methodDoc.__hide) {
			return false;
		}
		return methodDoc.__inherits === typeInfo.name;
	});
	const ownWritableProperties = typeInfo.properties.filter(propertyDoc => {
		if (propertyDoc.__hide) {
			return false;
		}
		return propertyDoc.__inherits === typeInfo.name && propertyDoc.permission !== 'read-only';
	});
	const ownReadOnlyProperties = typeInfo.properties.filter(propertyDoc => propertyDoc.__inherits === typeInfo.name && propertyDoc.permission === 'read-only');
	if (ownMethods.length === 0 && ownReadOnlyProperties.length > 0 && ownWritableProperties.length === 0) {
		return true;
	}

	return false;
}

/**
 * @param {Object} a method, property or event
 * @param {Object} b method, property or event
 * @return {number}
 */
function sortByName(a, b) {
	if (a.name > b.name) {
		return 1;
	}
	if (a.name < b.name) {
		return -1;
	}
	if (a.type) {
		return -1;
	}
	if (b.type) {
		return 1;
	}
	return 0;
}

/**
 * @param {MemberNode} a API node
 * @param {MemberNode} b API node
 * @return {number}
 */
function sortByFQN(a, b) {
	if (a.fullyQualifiedName > b.fullyQualifiedName) {
		return 1;
	}
	if (a.fullyQualifiedName < b.fullyQualifiedName) {
		return -1;
	}
	return 1;
}

/**
 * Parses the prepared API type docs and creates a syntax tree that can be used
 * to generate a TypeScript type definition file.
 */
class DocsParser {
	/**
	 * Constructs a new docs parser
	 *
	 * @param {Object} apis Hash map of Titanium type names and their definition.
	 */
	constructor(apis) {
		this.apis = apis;
		this.tree = new EmulatedSyntaxTree();
	}

	/**
	 * Parses all Titanium types and generates the emulated TypeScript syntax tree.
	 */
	parse() {
		const globalNamespace = new NamespaceNode(this.apis['Global']);
		this.tree.addNode(globalNamespace);
		this.tree.registerNamespace('Global', globalNamespace);
		delete this.apis['Global'];

		const namesList = Object.keys(this.apis);
		namesList.forEach(fullyQualifiedTypeName => {
			if (fullyQualifiedTypeName.startsWith('__')) {
				return;
			}

			const typeInfo = this.apis[fullyQualifiedTypeName];
			if (typeInfo) {
				this.processApi(typeInfo);
			}
		});
	}

	/**
	 * Creates {MemberNode} for type and places it in the tree.
	 * Will return {NamespaceNode} if it was created.
	 *
	 * @param {Object} typeInfo API doc.
	 * @return {NamespaceNode|undefined}
	 */
	processApi(typeInfo) {
		if (typeInfo.__file.includes(path.join('apidoc', 'Modules'))
			|| typeInfo.__file.includes(path.join('apidoc', 'NodeJS'))) {
			// skip bundled documentation for modules and Node.js shims
			return;
		}
		const namespaceParts = typeInfo.name.split('.');
		namespaceParts.pop();
		if (skipApis.includes(typeInfo.name)) {
			return;
		}

		const parentNamespace = this.findOrCreateNamespace(namespaceParts);
		const isInterface = this.isInterface(typeInfo);
		const isClass = this.isClass(typeInfo);
		const isNamespace = this.isNamespace(typeInfo);
		let processed = false;
		let namespaceNode;
		if (isNamespace) {
			processed = true;
			if (!this.tree.hasNamespace(typeInfo.name)) {
				namespaceNode = new NamespaceNode(typeInfo);
				this.tree.registerNamespace(namespaceNode.fullyQualifiedName, namespaceNode);
				if (parentNamespace) {
					parentNamespace.addNamespace(namespaceNode);
				} else {
					this.tree.addNode(namespaceNode);
				}
			}
		}
		if (isInterface || isClass) {
			processed = true;
			if (namespaceNode && namespaceNode.fullyQualifiedName === 'Titanium') {
				return namespaceNode;
			}
			const interfaceNode = isClass ? new ClassNode(typeInfo) : new InterfaceNode(typeInfo);
			if (namespaceNode) {
				namespaceNode.relatedNode = interfaceNode;
				interfaceNode.relatedNode = namespaceNode;
			}

			if (parentNamespace) {
				parentNamespace.addInterface(interfaceNode);
			} else {
				this.tree.addNode(interfaceNode);
			}
		}
		if (!processed) {
			console.warn(`Unhandled type ${typeInfo.name}`);
		}
		return namespaceNode;
	}

	/**
	 * Finds or creates a namespace node via the given namespace name parts.
	 *
	 * @param {Array<String>} namespaceParts Namespace name splitted with dot as delimiter
	 * @return {NamespaceNode}
	 * @throws Error
	 */
	findOrCreateNamespace(namespaceParts) {
		if (namespaceParts.length === 0) {
			return null;
		}

		const parentNamespaceName = namespaceParts.join('.');
		let parentNamespace = null;
		if (!this.tree.hasNamespace(parentNamespaceName)) {
			if (!this.apis[parentNamespaceName]) {
				throw new Error(`Couldn't find docs for "${parentNamespaceName}".`);
			}
			parentNamespace = this.processApi(this.apis[parentNamespaceName]);
			delete this.apis[parentNamespaceName];
		} else {
			parentNamespace = this.tree.getNamespace(parentNamespaceName);
		}

		if (!parentNamespace) {
			throw new Error(`Couldn't create namespace path up to ${parentNamespaceName}.`);
		}

		return parentNamespace;
	}

	/**
	 * Returns true if the given API type should be rendered as a TypeScript interface.
	 *
	 * To be considered as TypeScript interface a type must either one of the
	 * subtypes proxy (but not a constants only proxy), pseudo or view OR is a
	 * module which is blacklisted from being rendered as namespace.
	 *
	 * @param {Object} typeInfo Parsed API type info from YAML docs.
	 * @return {Boolean} True if the API type is considered an interface in TypeScript, false if not.
	 */
	isInterface(typeInfo) {
		const validSubtypes = [
			'pseudo',
		];

		return validSubtypes.includes(typeInfo.__subtype) || forcedInterfaces.includes(typeInfo.name);
	}

	isClass(typeInfo) {
		const validSubtypes = [
			'module',
			'proxy',
			'view'
		];
		return validSubtypes.includes(typeInfo.__subtype) && !forcedInterfaces.includes(typeInfo.name)
				&& !(typeInfo.createable === false && isConstantsOnlyProxy(typeInfo));
	}

	/**
	 * Returns true if the given API type should be rendered as a TypeScript namespace.
	 *
	 * To be considered as a TypeScript namespace, a type must be of the subtype
	 * module OR be a constatns only proxy.
	 *
	 * @param {Object} typeInfo Parsed API type info from YAML docs.
	 * @return {Boolean} True if the API type is considered a namespace in TypeScript, false if not.
	 */
	isNamespace(typeInfo) {
		return (typeInfo.__subtype === 'module' || isConstantsOnlyProxy(typeInfo)) && !forcedInterfaces.includes(typeInfo.name);
	}
}

/**
 * A very basic representation of a TypeScript syntax tree.
 */
class EmulatedSyntaxTree {
	constructor() {
		this.nodes = [];
		this.namespaces = new Map();
	}

	addNode(node) {
		this.nodes.push(node);
	}

	registerNamespace(namespaceName, namespace) {
		this.namespaces.set(namespaceName, namespace);
	}

	hasNamespace(namespaceName) {
		return this.namespaces.has(namespaceName);
	}

	getNamespace(namespaceName) {
		return this.namespaces.get(namespaceName);
	}
}

/**
 * Generates the Titanium TypeScript definition from the simplified TypeScript
 * syntax tree using the global template.
 *
 * @see https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-d-ts.html
 */
class GlobalTemplateWriter {
	/**
	 * Constructs a new global template writer.
	 *
	 * @param {String} version Version number of the typings
	 */
	constructor(version) {
		this.output = '';
		if (!version) {
			throw new TypeError('Invalid version');
		}
		this.version = version;
	}

	/**
	 * Generates the complete Titanium TypeScript type definition as a sstring and
	 * writes it to the output property.
	 *
	 * @param {EmulatedSyntaxTree} tree The simplified TypeScript syntax tree to generated the definitions from
	 */
	generateTitaniumDefinition(tree) {
		this.writeHeader();
		this.writeNodes(tree.nodes);
		this.writeTiShorthand();
	}

	/**
	 * Writes the type definition header required by DefinitelyTyped.
	 */
	writeHeader() {
		const versionSplit = this.version.split('.');
		const majorMinor = `${versionSplit[0]}.${versionSplit[1]}`;
		this.output += `// Type definitions for non-npm package Titanium ${majorMinor}\n`;
		this.output += '// Project: https://github.com/appcelerator/titanium_mobile\n';
		this.output += '// Definitions by: Axway Appcelerator <https://github.com/appcelerator>\n';
		this.output += '//                 Jan Vennemann <https://github.com/janvennemann>\n';
		this.output += '//                 Sergey Volkov <https://github.com/drauggres>\n';
		this.output += '//                 Mathias Lorenzen <https://github.com/ffMathy>\n';
		this.output += '// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped\n';
		this.output += '// TypeScript Version: 3.0\n';
		this.output += '\n';
		this.output += '// Base definitions that can\'t be generated yet\n';
		this.output += '/// <reference path="base.d.ts" />\n';
		this.output += '\n';
		this.output += 'type _Omit<T, K extends keyof any | undefined> = Pick<T, Exclude<keyof T, K>>;\n';
		this.output += 'type FunctionPropertyNames<T> = {\n';
		this.output += '	// tslint:disable-next-line:ban-types\n';
		this.output += '	[K in keyof T]: T[K] extends Function ? K : never\n';
		this.output += '}[keyof T];\n';
		this.output += 'type Dictionary<T> = Partial<_Omit<T, FunctionPropertyNames<Ti.Proxy>>>;';
		this.output += '\n';
		this.output += 'interface ProxyEventMap {}\n\n';
	}

	/**
	 * Writes the "Ti" shorthand alias for the global Titanium namespace.
	 */
	writeTiShorthand() {
		this.output += '\nimport Ti = Titanium;\n';
	}

	/**
	 * Renders all nodes from the synatx tree and adds them to the output.
	 *
	 * @param {Array<MemberNode>} nodes Syntax tree node to render and write
	 */
	writeNodes(nodes) {
		const copy = nodes.slice().sort(sortByFQN);
		while (copy.length) {
			const node = copy.shift();
			if (globalIgnoreList.includes(node.name)) {
				// @fixme: Global type definitions need special massaging so we handle them manually right now
				// @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/titanium/globals.d.ts
				continue;
			}
			if (node instanceof InterfaceNode) {
				this.writeInterfaceNode(node, 0);
				if (node.relatedNode) {
					const idx = copy.indexOf(node.relatedNode);
					const related = /** @type {NamespaceNode} */ (copy[idx]);
					copy.splice(idx, 1);
					this.writeNamespaceNode(related, 0);
				}
			} else if (node instanceof NamespaceNode) {
				if (node.relatedNode) {
					const idx = copy.indexOf(node.relatedNode);
					const related = /** @type {InterfaceNode} */ (copy[idx]);
					copy.splice(idx, 1);
					this.writeInterfaceNode(related, 0);
				}
				this.writeNamespaceNode(node, 0);
			}
		}
	}

	/**
	 * Renders and writes a namespace node to the output.
	 *
	 * @param {NamespaceNode} namespaceNode Namesapce node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeNamespaceNode(namespaceNode, nestingLevel) {
		namespaceNode.init();
		const hasProperties = namespaceNode.properties.length > 0;
		const hasMethods = namespaceNode.methods.length > 0;
		const hasInterfaces = namespaceNode.interfaces.length > 0;
		const hasNamespaces = namespaceNode.namespaces.length > 0;

		if (!hasProperties && !hasMethods && !hasInterfaces && !hasNamespaces) {
			return;
		}

		if (namespaceNode.relatedNode) {
			if (!hasInterfaces && !hasNamespaces && !hasProperties) {
				// empty namespace, all methods and properties will be defined in related interface
				return;
			}
			if (namespaceNode.relatedNode.removed) {
				return;
			}
		}

		const nextNestingLevel = nestingLevel + 1;

		this.output += this.generateJsDoc(namespaceNode, nestingLevel);

		if (namespaceNode.removed) {
			this.output += `${this.indent(nestingLevel)}${nestingLevel === 0 ? 'declare ' : ''}const ${namespaceNode.name}: never;\n`;
			return;
		}

		this.output += `${this.indent(nestingLevel)}${nestingLevel === 0 ? 'declare ' : ''}namespace ${namespaceNode.name} {\n`;
		if (hasProperties) {
			namespaceNode.properties.forEach(propertyNode => this.writeVariableNode(propertyNode, nextNestingLevel));
		}
		if (hasMethods) {
			namespaceNode.methods.forEach(methodNode => this.writeFunctionNode(methodNode, nextNestingLevel));
		}
		if (hasNamespaces) {
			namespaceNode.namespaces.sort(sortByFQN).forEach(childNamespace => this.writeNamespaceNode(childNamespace, nextNestingLevel));
		}
		if (hasInterfaces) {
			namespaceNode.interfaces.sort(sortByFQN).forEach(interfaceNode => this.writeInterfaceNode(interfaceNode, nextNestingLevel));
		}
		this.output += `${this.indent(nestingLevel)}}\n`;
	}

	/**
	 * Renders and writes a interface node to the output.
	 *
	 * @param {InterfaceNode} interfaceNode Interface node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeInterfaceNode(interfaceNode, nestingLevel) {
		interfaceNode.init();
		if (interfaceNode.events.length > 0) {
			interfaceNode.events.forEach(eventNode =>
				this.writeInterfaceNode(eventNode, nestingLevel));
		}
		this.output += this.generateJsDoc(interfaceNode, nestingLevel);
		if (interfaceNode.removed) {
			this.output += `${this.indent(nestingLevel)}const ${interfaceNode.name}: never;\n`;
			return;
		}
		const parent = interfaceNode.extends ? 'extends ' + interfaceNode.extends + ' ' : '';
		const isTopLevelClass = interfaceNode instanceof ClassNode && nestingLevel === 0 ? 'declare ' : '';
		this.output += `${this.indent(nestingLevel)}${isTopLevelClass}${interfaceNode.keyWord} ${interfaceNode.name} ${parent}{\n`;
		if (interfaceNode.properties.length > 0) {
			interfaceNode.properties.forEach(propertyNode => this.writePropertyNode(propertyNode, nestingLevel + 1));
		}
		if (interfaceNode.methods.length > 0) {
			interfaceNode.methods.forEach(methodNode => this.writeMethodNode(methodNode, nestingLevel + 1));
		}
		if (interfaceNode.indexSignature) {
			const { name, type, returnType } = interfaceNode.indexSignature;
			this.output += `${this.indent(nestingLevel + 1)}[${name}: ${type}]: ${returnType};\n`;
		}
		this.output += `${this.indent(nestingLevel)}}\n`;
	}

	/**
	 * Renders and writes a variable node to the output.
	 *
	 * @param {VariableNode} variableNode Variable node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeVariableNode(variableNode, nestingLevel) {
		this.output += this.generateJsDoc(variableNode, nestingLevel);
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		const isConstant = variableNode.isConstant ? 'const' : inGlobal ? 'var' : 'let';
		this.output += `${this.indent(nestingLevel)}${inGlobal}${isConstant} ${variableNode.name}: ${this.normalizeType(variableNode.type)};\n\n`;
	}

	/**
	 * Renders and writes a variable node as a property to the output.
	 *
	 * @param {VariableNode} propertyNode Variable node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writePropertyNode(propertyNode, nestingLevel) {
		this.output += this.generateJsDoc(propertyNode, nestingLevel);
		const isStatic = propertyNode.isStatic ? 'static ' : '';
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		const isReadOnly = propertyNode.isConstant ? 'readonly ' : '';
		const type = this.normalizeType(propertyNode.type);
		const isOptional = (type !== 'never' && propertyNode.optional) ? '?' : '';
		this.output += `${this.indent(nestingLevel)}${inGlobal}${isStatic}${isReadOnly}${propertyNode.name}${isOptional}: ${type};\n\n`;
	}

	/**
	 * Renders and writes a function node to the output.
	 *
	 * @param {FunctionNode} functionNode Function node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeFunctionNode(functionNode, nestingLevel) {
		this.output += this.generateJsDoc(functionNode, nestingLevel);
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		if (functionNode.removed) {
			this.output += `${this.indent(nestingLevel)}${inGlobal}const ${functionNode.name}: never;\n\n`;
			return;
		}
		const parametersString = this.prepareParameters(functionNode.parameters);
		const type = this.normalizeType(functionNode.returnType);
		this.output += `${this.indent(nestingLevel)}${inGlobal}function ${functionNode.name}(${parametersString}): ${type};\n\n`;
	}

	/**
	 * Renders and writes a function node as a method to the output.
	 *
	 * @param {FunctionNode} functionNode Function node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeMethodNode(functionNode, nestingLevel) {
		this.output += this.generateJsDoc(functionNode, nestingLevel);
		const isStatic = functionNode.isStatic ? 'static ' : '';
		if (functionNode.removed) {
			this.output += `${this.indent(nestingLevel)}${isStatic}${functionNode.name}: never;\n\n`;
			return;
		}
		const parametersString = this.prepareParameters(functionNode.parameters);
		const isOptional = functionNode.optional ? '?' : '';
		const type = this.normalizeType(functionNode.returnType);
		const generic = functionNode.generic;
		this.output += `${this.indent(nestingLevel)}${isStatic}${functionNode.name}${generic}${isOptional}(${parametersString}): ${type};\n\n`;
	}

	/**
	 * Generates the JSDoc comment for the given node.
	 *
	 * @param {Object} node The node to generte the comment for
	 * @param {Number} nestingLevel Current nesting level for indentation
	 * @return {String} JSDoc comment
	 */
	generateJsDoc(node, nestingLevel) {
		if (!node.summary) {
			return '';
		}
		const summary = node.summary.replace(/\s?\n/g, `\n${this.indent(nestingLevel)} * `).trim();
		let jsDoc = '';
		if (summary) {
			jsDoc += `${this.indent(nestingLevel)}/**\n`;
			jsDoc += `${this.indent(nestingLevel)} * ${summary}\n`;
			jsDoc += `${this.indent(nestingLevel)} */\n`;
		}
		if (node instanceof InterfaceNode && node.name === 'IOStream') {
			jsDoc += this.indent(nestingLevel) + '// tslint:disable-next-line:interface-name\n';
		}

		return jsDoc;
	}

	/**
	 * Creates a tab based indentation. The depth is based on the given nesting level.
	 *
	 * @param {Number} nestingLevel Nesting level inside the syntax tree
	 * @return {String} A string containing tabs equal the amount of the given nesting level
	 */
	indent(nestingLevel) {
		return ''.padStart(nestingLevel, '\t');
	}

	/**
	 * Normalizes a given type so it can be safely used in TypeScript.
	 *
	 * @param {Object | String | Array <Object | String>} docType Type definition
	 * @param {String=} usageHint A string with a hint where this type is used (null or 'parameter')
	 * @return {String} A normalized representation of the type for usage in TypeScript
	 */
	normalizeType(docType, usageHint) {
		if (!docType) {
			return 'any';
		}

		if (Array.isArray(docType)) {
			const normalizedTypes = docType.map(typeName => this.normalizeType(typeName));
			return normalizedTypes.includes('any') ? 'any' : normalizedTypes.join(' | ');
		}

		const lessThanIndex = docType.indexOf('<');
		if (lessThanIndex !== -1) {
			const baseType = docType.slice(0, lessThanIndex);
			const greaterThanIndex = docType.lastIndexOf('>');
			const subType = docType.slice(lessThanIndex + 1, greaterThanIndex);
			const subTypes = subType.split(',').map(type => this.normalizeType(type.trim()));
			if (baseType === 'Array') {
				return subTypes.map(typeName => {
					if (usageHint === 'parameter') {
						return `ReadonlyArray<${typeName}>`;
					} else if (typeName.indexOf('<') !== -1) {
						return `Array<${typeName}>`;
					} else {
						return `${typeName}[]`;
					}
				}).join(' | ');
			} else if (baseType === 'Callback') {
				if (docType === 'Callback<void>') {
					return '() => void';
				} else {
					return `(${subTypes.map((type, index) => `param${index}: ${type}`).join(', ')}) => void`;
				}
			} else if (baseType === 'Dictionary') {
				return `Dictionary<${subType}>`;
			}
		}

		switch (docType) {
			case 'bool':
				return 'boolean'; // Windows addon only
			case 'Boolean':
			case 'Function':
			case 'Number':
			case 'String':
				return docType.toLowerCase();
			case 'Object':
			case 'any':
				return 'any';
			case 'Array':
				return 'any[]';
			case 'Callback': {
				// simple 'Callback' is considered a poorly documented type, assume any number of `any` arguments
				// callback without arguments and return value should be documented as `Callback<void>`
				return '(...args: any[]) => void';
			}
			default: {
				let typeName = docType;
				if (typeName.indexOf('.') !== -1) {
					typeName = docType.substring(docType.lastIndexOf('.') + 1);
					if (invalidTypeMap[typeName]) {
						return docType.replace(typeName, invalidTypeMap[typeName]);
					}
				} else if (invalidTypeMap[typeName]) {
					return invalidTypeMap[typeName];
				}
				return docType;
			}
		}
	}

	/**
	 * Normalized a parameter definition.
	 *
	 * Currenlty only replaces a parameter's name from default to defaultValue
	 * since default is a reversed keyword in TypeScript.
	 *
	 * @param {Object} paramNode Parameter definition
	 */
	normalizeParameter(paramNode) {
		if (paramNode.name === 'default') {
			paramNode.name = 'defaultValue';
		} else if (paramNode.name === 'function') {
			paramNode.name = 'func';
		}
	}

	/**
	 * Pepares a list of parameters by normalizing the parameter name and its type
	 * and concatenates each parameter to a comma separated list.
	 *
	 * @param {Array<Object>} parameters List of parameter definitions
	 * @return {String} Comma separated list of parameters, ready to be used between the braces of a function definition.
	 */
	prepareParameters(parameters) {
		return parameters.map(paramNode => this.prepareParameterString(paramNode)).join(', ');
	}

	/**
	 * Prepares a single parameter string of the given parameter definition.
	 *
	 * @param {Object} paramNode Parameter definition
	 * @return {String} Parameter string in the form: <name>[?]: [...]<type>
	 */
	prepareParameterString(paramNode) {
		this.normalizeParameter(paramNode);
		let parameter = paramNode.repeatable ? '...' + paramNode.name : paramNode.name;

		// TS1047: A rest parameter cannot be optional.
		if (paramNode.optional && !paramNode.repeatable) {
			parameter += '?';
		}
		let type = this.normalizeType(paramNode.type, paramNode.repeatable ? null : 'parameter');
		if (paramNode.repeatable && type.indexOf('Array<') !== 0 && type.indexOf('[]') !== type.length - 2) {
			type = type.indexOf(' | ') !== -1 ? `Array<${type}>` : `${type}[]`;
		}
		parameter += `: ${type}`;

		return parameter;
	}
}

/**
 * A node that represents a variable.
 *
 * Used for variables in namespaces and properties in interfaces.
 */
class VariableNode {
	constructor(variableDoc, isStatic) {
		this.name = variableDoc.name;
		this.isStatic = isStatic;
		if (variableDoc.__hide || variableDoc.deprecated && variableDoc.deprecated.removed) {
			this.type = 'never';
		} else {
			this.type = variableDoc.type;
		}
		this.summary = variableDoc.summary ? variableDoc.summary.trim() : '';
		if (variableDoc.deprecated) {
			this.summary += '\n@deprecated';
			if (variableDoc.deprecated.notes) {
				this.summary += ' ' + variableDoc.deprecated.notes;
			}
		}
		this.isConstant = variableDoc.permission === 'read-only';
		this.optional = variableDoc.optional;
		this.repeatable = variableDoc.repeatable || false;
	}
}

/**
 * A node that represents a function.
 *
 * Used for functions in namespaces and methods in interfaces.
 */
class FunctionNode {
	constructor(functionDoc, isStatic) {
		this.definition = functionDoc;
		this.name = functionDoc.name;
		this.isStatic = isStatic;
		this.generic = '';

		if (functionDoc.__hide || functionDoc.deprecated && functionDoc.deprecated.removed) {
			this.removed = true;
		}
		if (functionDoc.returns) {
			if (Array.isArray(functionDoc.returns)) {
				this.returnType = functionDoc.returns.map(type => type.type);
			} else {
				this.returnType = functionDoc.returns.type;
			}
		} else {
			this.returnType = 'void';
		}
		this.parameters = [];
		this.parseParameters(functionDoc.parameters);
		this.summary = functionDoc.summary ? functionDoc.summary.trim() : '';
		if (functionDoc.deprecated) {
			this.summary += '\n@deprecated';
			if (functionDoc.deprecated.notes) {
				this.summary += ' ' + functionDoc.deprecated.notes;
			}
		}
		this.optional = functionDoc.optional || false;
	}

	parseParameters(parameters) {
		if (!parameters) {
			return;
		}

		let hasOptional = false;
		this.parameters = parameters.map(paramDoc => {
			if (!hasOptional && paramDoc.optional) {
				hasOptional = true;
			}

			if (hasOptional && !paramDoc.optional) {
				paramDoc.optional = true;
			}

			return new VariableNode(paramDoc);
		});
	}

	setGeneric(value) {
		this.generic = value;
	}
}

/**
 * Representation of a node in the AST that has memebers (used as a base for
 * namesapce and interface nodes).
 */
class MemberNode {
	constructor(api) {
		this.api = api;
		this.fullyQualifiedName = api.name;
		this.name = api.name.substring(api.name.lastIndexOf('.') + 1);
		this.properties = [];
		this.methods = [];
		this.events = [];
		this.relatedNode = null;
		this.innerNodesMap = new Map();
		this.membersAreStatic = false;
		this.proxyEventMap = null;
	}

	init() {
		throw Error('Not implemented');
	}

	parseProperties(properties) {
		if (!properties || !properties.length) {
			return;
		}

		const filterFunc = this.filterProperties.bind(this);
		this.properties = [];
		properties
			.filter(filterFunc)
			.sort(sortByName)
			.forEach(propertyDoc => {
			// Make all properties of global interfaces optional by default
				if (this.fullyQualifiedName.indexOf('.') === -1 && propertyDoc.optional === undefined) {
					propertyDoc.optional = true;
				}

				// Some iOS views do not have this property, so mark it as optional.
				if (this.fullyQualifiedName === 'Titanium.Proxy' && propertyDoc.name === 'lifecycleContainer') {
					propertyDoc.optional = true;
				}

				const node = new VariableNode(propertyDoc, this.membersAreStatic);
				if (this.innerNodesMap.has(propertyDoc.name)) {
					common.log(common.LOG_WARN, `Duplicate identifier "${propertyDoc.name}" on API ${this.fullyQualifiedName}`);
					return;
				}
				this.innerNodesMap.set(propertyDoc.name, node);
				this.properties.push(node);
			});
	}

	filterProperties(propertyDoc) {
		// Filter out unused animate property which collides with the animate method
		if (this.fullyQualifiedName === 'Titanium.Map.View' && propertyDoc.name === 'animate') {
			return false;
		}

		if (propertyDoc.__inherits && propertyDoc.__inherits !== this.fullyQualifiedName && !this.membersAreStatic) {
			return false;
		}

		return true;
	}

	parseMethods(methods) {
		if (!methods) {
			return;
		}

		this.methods = [];

		const filterFunc = this.filterMethods.bind(this);

		methods.filter(filterFunc).sort(sortByName).forEach(methodDoc => {
			if (this.fullyQualifiedName === 'Titanium.Proxy' && /LifecycleContainer$/.test(methodDoc.name)) {
				methodDoc.optional = true;
			}
			const isEventMethod = eventsMethods.includes(methodDoc.name);

			if (this.proxyEventMap && isEventMethod) {
				const parameters = [ {
					name: 'name',
					optional: false,
					summary: 'Name of the event.',
					type: 'K',
					__subtype: 'parameter'
				} ];
				if (methodDoc.name === 'fireEvent') {
					parameters.push({
						name: 'event',
						optional: true,
						summary: 'A dictionary of keys and values to add to the <Titanium.Event> object sent to the listeners.',
						type: `${this.proxyEventMap.name}[K]`,
						__subtype: 'parameter'
					});
				} else {
					parameters.push({
						name: 'callback',
						optional: false,
						summary: 'Callback function name.',
						// Pass preformatted type for callback
						type: `(this: ${this.fullyQualifiedName}, event: ${this.proxyEventMap.name}[K]) => void`,
						thisValue: this.fullyQualifiedName,
						__subtype: 'parameter'
					});
				}
				const node = new FunctionNode({
					name: methodDoc.name,
					summary: methodDoc.summary,
					parameters: parameters
				}, this.membersAreStatic);
				node.setGeneric(`<K extends keyof ${this.proxyEventMap.name}>`);
				this.methods.push(node);
			}
			if (this.innerNodesMap.has(methodDoc.name)) {
				if (!methodDoc.deprecated || !methodDoc.deprecated.removed) {
					// only currently known method is "fieldCount" from "Titanium.Database.ResultSet"
					common.log(common.LOG_WARN, `Duplicate identifier "${methodDoc.name}" on API ${this.fullyQualifiedName}`);
				}
				return;
			}

			// Generate overloads if required and add them instead of the original method
			const overloads = this.generateMethodOverloadsIfRequired(methodDoc);
			if (!overloads.length) {
				overloads.push(methodDoc);
			}
			overloads.forEach(doc => {
				const node = new FunctionNode(doc, this.membersAreStatic);
				this.innerNodesMap.set(doc.name, node);
				this.methods.push(node);
			});
		});
	}

	filterMethods(methodDoc) {
		const isEventMethod = eventsMethods.includes(methodDoc.name);
		return !(!isEventMethod && methodDoc.__inherits && methodDoc.__inherits !== this.fullyQualifiedName && !this.membersAreStatic);
	}

	parseEvents(events) {
		if (!events || !events.length) {
			return;
		}
		const baseEvent = InterfaceNode.createBaseEvent(this);
		const properties = [];
		this.events.push(baseEvent);
		events.forEach(eventDoc => {
			if (eventDoc.deprecated && eventDoc.deprecated.removed) {
				return;
			}
			const eventNode = InterfaceNode.createEvent(eventDoc, this);
			this.events.push(eventNode);
			const name = eventDoc.name.indexOf(':') === -1 ? eventDoc.name : `"${eventDoc.name}"`;
			properties.push({
				name: name,
				optional: false,
				summary: '',
				type: eventNode.name
			});
		});
		this.proxyEventMap = new InterfaceNode({
			name: `${this.name}EventMap`,
			extends: 'ProxyEventMap',
			properties: properties,
			summary: ''
		});
		this.events.push(this.proxyEventMap);
	}

	/**
	 * Generates overload method definitions for methods which have parameter
	 * definitions that are not compatible with union types.
	 *
	 * Currently only handles one case where a parameter can be passed as both a
	 * single (repeatable) value and as an array, e.g. ...Ti.UI.View[], Array<Ti.UI.View>
	 *
	 * @param {Object} methodDoc Method definitions as parsed from YAML files
	 * @return {Array<Object>} List of overload method definitions
	 */
	generateMethodOverloadsIfRequired(methodDoc) {
		const parameters = methodDoc.parameters;
		if (!parameters) {
			return [];
		}

		// TODO: proper types for Titanium.Database.DB.executeAsync, problem is:
		// "TS1014: A rest parameter must be last in a parameter list."

		const originalMethodDocJsonString = JSON.stringify(methodDoc);
		const arrayTypePattern = /Array<.*>/;
		let methodOverloads = [];
		let hasRepeatableAndArray = false;
		const last = parameters.length - 1;
		const parameter = parameters[last];
		if (!Array.isArray(parameter.type) || !parameter.repeatable) {
			return [ methodDoc ];
		}

		const parameterOverloads = [];
		for (const type of parameter.type) {
			if (arrayTypePattern.test(type)) {
				hasRepeatableAndArray = true;
				const arrayOverloadDoc = JSON.parse(originalMethodDocJsonString);
				arrayOverloadDoc.parameters[last].repeatable = false;
				arrayOverloadDoc.parameters[last].type = type;
				parameterOverloads.push(arrayOverloadDoc);
			} else {
				const newOverloadDoc = JSON.parse(originalMethodDocJsonString);
				newOverloadDoc.parameters[last].type = type;
				newOverloadDoc.parameters[last].optional = false;
				parameterOverloads.push(newOverloadDoc);
			}
		}

		if (hasRepeatableAndArray) {
			methodOverloads = methodOverloads.concat(parameterOverloads);
		}

		if (hasRepeatableAndArray) {
			return methodOverloads;
		} else {
			return [ JSON.parse(originalMethodDocJsonString) ];
		}
	}
}

/**
 * A namespace in typescript represents a module in our Titanium global
 */
class NamespaceNode extends MemberNode {
	constructor(moduleDoc, relatedNode) {
		super(moduleDoc, relatedNode);
		this.interfaces = [];
		this.namespaces = [];
	}
	init() {
		const moduleDoc = this.api;
		this.summary = moduleDoc.summary ? moduleDoc.summary.trim() : '';

		if (moduleDoc.deprecated && moduleDoc.deprecated.removed) {
			this.removed = true;
			this.summary += '\n@deprecated';
			if (moduleDoc.deprecated.notes) {
				this.summary += ' ' + moduleDoc.deprecated.notes;
			}
		}
		if (this.relatedNode) {
			if ((!this.interfaces.length && !this.namespaces.length && !isConstantsOnlyProxy(moduleDoc)) || this.removed) {
				this.relatedNode.relatedNode = null;
				return;
			}
		}
		if (this.removed) {
			return;
		}
		this.parseProperties(moduleDoc.properties);
		if (!this.relatedNode) {
			this.parseEvents(moduleDoc.events);
			this.parseMethods(moduleDoc.methods);
		}
		if (this.namespaces.length) {
			this.namespaces.forEach(node => this.findDuplicates(node));
		}
	}

	filterProperties(propertyDoc) {
		// If we have interface/class for this namespace, then we need here only upper cased constants
		let onlyUpperCased = true;
		const excluded = propertyDoc.__hide;
		if (this.relatedNode) {
			onlyUpperCased = propertyDoc.name.toUpperCase() === propertyDoc.name;
		}
		return onlyUpperCased && !excluded && super.filterProperties(propertyDoc);
	}

	filterMethods(methodDoc) {
		const excluded = methodDoc.__hide;
		return !excluded && super.filterMethods(methodDoc);
	}

	addNamespace(namespaceNode) {
		this.namespaces.push(namespaceNode);
	}

	addInterface(interfaceNode) {
		this.interfaces.push(interfaceNode);
	}

	findDuplicates(inputNode) {
		const name = inputNode.name;
		if (this.innerNodesMap.has(name)) {
			const node = this.innerNodesMap.get(name);
			let found = false;
			let idx = this.properties.indexOf(node);
			if (idx !== -1) {
				found = true;
				this.properties.splice(idx, 1);
			}
			idx = this.methods.indexOf(node);
			if (idx !== -1) {
				found = true;
				this.methods.splice(idx, 1);
			}
			if (!found) {
				throw new Error(`Unable to found identifier ${name} in the method or properties of ${this.fullyQualifiedName}`);
			}
			common.log(common.LOG_WARN, `Duplicate identified "${name} on ${this.fullyQualifiedName}`);
			this.innerNodesMap.delete(name);
		}
	}
}

/**
 * A typescript interface represents a single proxy in our Titanium global
 */
class InterfaceNode extends MemberNode {
	constructor(typeDoc) {
		super(typeDoc);
		this.removed = typeDoc.deprecated && typeDoc.deprecated.removed;
		this.membersAreStatic = false;
		this.keyWord = 'interface';
		this.indexSignature = null;
	}
	init() {
		const typeDoc = this.api;
		this.summary = typeDoc.summary ? typeDoc.summary.trim() : '';
		if (typeDoc.deprecated) {
			this.summary += '\n@deprecated';
			if (typeDoc.deprecated.notes) {
				this.summary += ' ' + typeDoc.deprecated.notes;
			}
		}
		if (typeDoc.extends && this.name !== 'Titanium') {
			this.extends = typeDoc.extends;
		}
		if (!this.removed) {
			this.parseEvents(typeDoc.events);
			this.parseProperties(typeDoc.properties);
			this.parseMethods(typeDoc.methods);
		}
		// FIXME: Ti.Proxy has no documented "id" property
		// currently if we put it in docs - accessors methods will show up in
		// every class extended from Ti.Proxy
		if (this.fullyQualifiedName === 'Titanium.Proxy') {
			const array = this.properties.filter(prop => prop.name === 'id');
			if (!array.length) {
				// injecting "id" property into "Titanium.Proxy"
				this.properties.push(new VariableNode({
					name: 'id',
					optional: true,
					summary: 'Proxy identifier',
					type: 'string | number'
				}, false));
			}
		} else if (this.fullyQualifiedName === 'ListDataItem') {
			// We don't have a way to sepcify this in our apidocs, so this currently
			// needs to be hard coded here.
			this.indexSignature = {
				name: 'index',
				type: 'string',
				returnType: 'any'
			};
		}
	}

	filterProperties(propertyDoc) {
		if (this.relatedNode && propertyDoc.name === propertyDoc.name.toUpperCase()) {
			// all upper cased constants will be present in the related namespace
			return false;
		}
		return super.filterProperties(propertyDoc);
	}
}

/**
 * @param {MemberNode} interfaceNode node
 * @return {InterfaceNode}
 */
InterfaceNode.createBaseEvent = function (interfaceNode) {
	const name = interfaceNode.fullyQualifiedName;
	return new InterfaceNode({
		name: `${interfaceNode.name}BaseEvent`,
		extends: 'Ti.Event',
		summary: `Base event for class ${name}`,
		properties: [
			{ name: 'source', type: name, optional: false, summary: 'Source object that fired the event.' }
		]
	});
};

/**
 * @param {Object} eventDoc event description
 * @param {MemberNode} interfaceNode node
 * @return {InterfaceNode}
 */
InterfaceNode.createEvent = function (eventDoc, interfaceNode) {
	let properties = eventDoc.properties;
	if (properties) {
		properties = eventDoc.properties
			.filter(prop => prop.name !== 'source')
			.map(prop => {
				prop.optional = false;
				return prop;
			});
	}
	const name = eventDoc.name.replace(':', '_');
	return new InterfaceNode({
		name: `${interfaceNode.name}_${name}_Event`,
		extends: `${interfaceNode.name}BaseEvent`,
		summary: eventDoc.summary,
		properties: properties
	});
};

class ClassNode extends InterfaceNode {
	constructor(typeDoc) {
		super(typeDoc);
		this.keyWord = 'class';
		if (typeDoc.__subtype === 'module') {
			this.membersAreStatic = true;
		}
	}
}
