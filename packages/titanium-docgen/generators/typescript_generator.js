'use strict';
const common = require('../lib/common.js');
const path = require('path');
const INDEX_D_TS = 'index.d.ts';
const GLOBAL_D_TS = 'globals.global.d.ts';
const ORPHANS_D_TS = 'orphans.d.ts';

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
	'Global.Intl',
	'Global.Intl.Collator',
	'Global.Intl.DateTimeFormat',
	'Global.Intl.NumberFormat',
	'CollatorOptions',
	'DateTimeFormat',
	'DateTimeFormatOptions',
	'DateTimeFormattedPart',
	'NumberFormat',
	'NumberFormatOptions',
	'NumberFormattedPart',
	'Dictionary',
	'Titanium.UI.2DMatrix',
	'Titanium.UI.3DMatrix'
];

// skip bundled documentation for modules and Node.js shims
const skipDirs = [
	path.join('apidoc', 'Modules'),
	path.join('apidoc', 'NodeJS')
];

// List of modules that need to be generated as an interface instead of a namespace.
const forcedInterfaces = [
	'Global.Console',
	'Global.String',
	'Titanium.Android.R',
	'Titanium.App.iOS.UserDefaults'
];

const eventsMethods = [
	'addEventListener',
	'removeEventListener',
	'fireEvent'
];

const ignoreGlobalProperties = [
	'Buffer', // node 'buffer' shim, shims are not included
	'process', // node 'process' shim
	'global', // declared in `GLOBAL_D_TS`
];

const renameInterfaces = {
	'Global.String': 'Global.StringConstructor'
};

const TypeHint = {
	UNION: 'union',
	PARAMETER: 'parameter',
	NONE: 'none',
};

let parser = null;

exports.exportData = function exportGlobalTemplate(apis) {
	parser = new DocsParser(apis);
	parser.parse();

	const writer = new GlobalTemplateWriter(apis.__version);
	writer.generateTitaniumDefinition(parser.tree);

	const entry = DescriptionFile.getInstance(INDEX_D_TS);
	for (const descriptor of DescriptionFile.files.values()) {
		if (!descriptor.referenced) {
			const orphans = DescriptionFile.getInstance(ORPHANS_D_TS);
			orphans.writeRefs(descriptor.node);
			entry.writeRefs(ORPHANS_D_TS);
		}
	}
	return DescriptionFile.files;
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
	const onlyUpperCaseProperties = ownReadOnlyProperties.filter(propertyDoc => propertyDoc.name.toUpperCase() === propertyDoc.name);
	if (ownMethods.length === 0 && ownReadOnlyProperties.length > 0 && ownWritableProperties.length === 0
		&& ownReadOnlyProperties.length === onlyUpperCaseProperties.length) {
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
		const isInSkipDirList = skipDirs.filter(dir => typeInfo.__file.includes(dir)).length > 0;
		if (isInSkipDirList) {
			return;
		}
		if (skipApis.includes(typeInfo.name)) {
			return;
		}
		const parentNamespace = this.findOrCreateNamespace(typeInfo.name);
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
	 * Finds or creates a namespace node via the given namespace name.
	 *
	 * @param {string} namespace Full namespace name with dot as delimiter
	 * @return {NamespaceNode}
	 * @throws Error
	 */
	findOrCreateNamespace(namespace) {
		const namespaceParts = namespace.split('.');
		namespaceParts.pop();
		if (namespaceParts.length === 0) {
			return null;
		}

		const parentNamespaceName = namespaceParts.join('.');
		let parentNamespace = null;
		if (!this.tree.hasNamespace(parentNamespaceName)) {
			if (!this.apis[parentNamespaceName]) {
				throw new Error(`Couldn't find docs for "${parentNamespaceName}" from ${namespace}.`);
			}
			parentNamespace = this.processApi(this.apis[parentNamespaceName]);
			delete this.apis[parentNamespaceName];
		} else {
			parentNamespace = this.tree.getNamespace(parentNamespaceName);
		}

		if (!parentNamespace) {
			throw new Error(`Couldn't create namespace path up to ${parentNamespaceName} from ${namespace}`);
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
		if (!version) {
			throw new TypeError('Invalid version');
		}
		this.version = version;
	}

	/**
	 * Generates the complete Titanium TypeScript type definition as a string and
	 * writes it to the output property.
	 *
	 * @param {EmulatedSyntaxTree} tree The simplified TypeScript syntax tree to generate the definitions from
	 */
	generateTitaniumDefinition(tree) {
		this.writeIndex();
		this.writeNodes(tree.nodes);
		this.writeGlobalVar();
	}

	/**
	 * Writes the type definition header required by DefinitelyTyped.
	 */
	writeIndex() {
		const versionSplit = this.version.split('.');
		const majorMinor = `${versionSplit[0]}.${versionSplit[1]}`;
		const descriptor = this.getDescriptorFile(INDEX_D_TS);
		descriptor.markReferenced();
		descriptor.writeHeader(`// Type definitions for non-npm package Titanium ${majorMinor}`);
		descriptor.writeHeader('// Project: https://github.com/appcelerator/titanium_mobile');
		descriptor.writeHeader('// Definitions by: Axway Appcelerator <https://github.com/appcelerator>');
		descriptor.writeHeader('//                 Jan Vennemann <https://github.com/janvennemann>');
		descriptor.writeHeader('//                 Sergey Volkov <https://github.com/drauggres>');
		descriptor.writeHeader('//                 Mathias Lorenzen <https://github.com/ffMathy>');
		descriptor.writeHeader('// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped');
		descriptor.writeHeader('// TypeScript Version: 4.0');
		descriptor.writeRefs(GLOBAL_D_TS);

		descriptor.writeRaw('type _Omit<T, K extends keyof any | undefined> = Pick<T, Exclude<keyof T, K>>;');
		descriptor.writeRaw('type FunctionPropertyNames<T> = {');
		descriptor.writeRaw('	// tslint:disable-next-line:ban-types');
		descriptor.writeRaw('	[K in keyof T]: T[K] extends Function ? K : never');
		descriptor.writeRaw('}[keyof T];');
		descriptor.writeRaw('type Dictionary<T> = Partial<_Omit<T, FunctionPropertyNames<Ti.Proxy>>>;');
		descriptor.writeRaw('');
		descriptor.writeRaw('interface ProxyEventMap {}');

		descriptor.writeRaw('import Ti = Titanium;');
	}

	writeGlobalVar() {
		const descriptor = this.getDescriptorFile(GLOBAL_D_TS);
		descriptor.writeRaw('declare var global: typeof globalThis;');
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
	 * @param {NamespaceNode} namespaceNode Namespace node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeNamespaceNode(namespaceNode, nestingLevel) {
		const descriptor = this.getDescriptorFile(namespaceNode);
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

		let nextNestingLevel = nestingLevel + 1;
		if (namespaceNode.namespaces.length) {
			namespaceNode.namespaces.forEach(childNamespaceNode => {
				descriptor.writeRefs(childNamespaceNode);
			});
		}
		if (namespaceNode.interfaces.length) {
			namespaceNode.interfaces.forEach(childInterfaceNode => {
				descriptor.writeRefs(childInterfaceNode);
			});
		}

		const jsdoc = this.generateJsDoc(namespaceNode, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(namespaceNode.parent, jsdoc);
		}

		if (namespaceNode.removed) {
			descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}${nestingLevel === 0 ? 'declare ' : ''}const ${namespaceNode.name}: never;`);
			return;
		}

		const isGlobal = namespaceNode.fullyQualifiedName.startsWith('Global');
		if (isGlobal) {
			nextNestingLevel = 0;
		} else {
			descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}${nestingLevel === 0 ? 'declare ' : ''}namespace ${namespaceNode.name} {`);
		}
		if (hasProperties) {
			namespaceNode.properties.forEach(propertyNode => this.writeVariableNode(namespaceNode, propertyNode, nextNestingLevel));
		}
		if (hasMethods) {
			namespaceNode.methods.forEach(methodNode => this.writeFunctionNode(namespaceNode, methodNode, nextNestingLevel));
		}
		if (hasNamespaces) {
			namespaceNode.namespaces.sort(sortByFQN).forEach(childNamespace => this.writeNamespaceNode(childNamespace, nextNestingLevel));
		}
		if (hasInterfaces) {
			namespaceNode.interfaces.sort(sortByFQN).forEach(interfaceNode => this.writeInterfaceNode(interfaceNode, nextNestingLevel));
		}
		if (!isGlobal) {
			descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}}`);
		}
	}

	/**
	 * Renders and writes a interface node to the output.
	 *
	 * @param {InterfaceNode} interfaceNode Interface node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeInterfaceNode(interfaceNode, nestingLevel) {
		const descriptor = this.getDescriptorFile(interfaceNode);
		interfaceNode.init();
		if (interfaceNode.events.length > 0) {
			interfaceNode.events.forEach(eventNode =>
				this.writeInterfaceNode(eventNode, nestingLevel));
		}
		const jsdoc = this.generateJsDoc(interfaceNode, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(interfaceNode.parent, jsdoc);
		}
		if (interfaceNode.removed) {
			descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}const ${interfaceNode.name}: never;`);
			return;
		}
		const parent = interfaceNode.extends ? 'extends ' + interfaceNode.extends + ' ' : '';
		const isTopLevelClass = interfaceNode instanceof ClassNode && nestingLevel === 0 ? 'declare ' : '';
		descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}${isTopLevelClass}${interfaceNode.keyWord} ${interfaceNode.name} ${parent}{`);
		if (interfaceNode.properties.length > 0) {
			interfaceNode.properties.forEach(propertyNode => this.writePropertyNode(interfaceNode, propertyNode, nestingLevel + 1));
		}
		if (interfaceNode.methods.length > 0) {
			interfaceNode.methods.forEach(methodNode => this.writeMethodNode(interfaceNode, methodNode, nestingLevel + 1));
		}
		if (interfaceNode.indexSignature) {
			const { name, type, returnType } = interfaceNode.indexSignature;
			descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel + 1)}[${name}: ${type}]: ${returnType};`);
		}
		descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}}`);
	}

	/**
	 * Renders and writes a variable node to the output.
	 * @param {NamespaceNode} namespaceNode Namespace node to write
	 * @param {VariableNode} variableNode Variable node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeVariableNode(namespaceNode, variableNode, nestingLevel) {
		if (nestingLevel === 0 && ignoreGlobalProperties.includes(variableNode.name)) {
			return;
		}
		const descriptor = this.getDescriptorFile(namespaceNode);
		const jsdoc = this.generateJsDoc(variableNode, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(namespaceNode.parent, jsdoc);
		}
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		const isConstant = variableNode.isConstant ? 'const' : inGlobal ? 'var' : 'let';
		const type = this.normalizeType(variableNode.type, TypeHint.NONE);
		descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}${inGlobal}${isConstant} ${variableNode.name}: ${type};\n`);
	}

	/**
	 * Renders and writes a variable node as a property to the output.
	 *
	 * @param {InterfaceNode} interfaceNode Interface node to write
	 * @param {VariableNode} propertyNode Variable node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writePropertyNode(interfaceNode, propertyNode, nestingLevel) {
		if (nestingLevel === 0 && ignoreGlobalProperties.includes(propertyNode.name)) {
			return;
		}
		const descriptor = this.getDescriptorFile(interfaceNode);
		const jsdoc = this.generateJsDoc(propertyNode, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(interfaceNode.parent, jsdoc);
		}
		const isStatic = propertyNode.isStatic ? 'static ' : '';
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		const isReadOnly = propertyNode.isConstant ? 'readonly ' : '';
		const type = this.normalizeType(propertyNode.type, TypeHint.NONE, propertyNode.optional);
		const isOptional = type !== 'never' && propertyNode.optional;
		const optionalSign = isOptional ? '?' : '';
		descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}${inGlobal}${isStatic}${isReadOnly}${propertyNode.name}${optionalSign}: ${type};\n`);
	}

	/**
	 * Renders and writes a function node to the output.
	 *
	 * @param {NamespaceNode} namespaceNode Namespace node to write out
	 * @param {FunctionNode} node Function node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeFunctionNode(namespaceNode, node, nestingLevel) {
		if (nestingLevel === 0 && ignoreGlobalProperties.includes(node.name)) {
			return;
		}
		const descriptor = this.getDescriptorFile(namespaceNode);
		const jsdoc = this.generateJsDoc(node, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(namespaceNode.parent, jsdoc);
		}
		const inGlobal = nestingLevel === 0 ? 'declare ' : '';
		if (node.removed) {
			descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}${inGlobal}const ${node.name}: never;\n`);
			return;
		}
		const parametersString = this.prepareParameters(node.parameters);
		const type = this.normalizeType(node.returnType, TypeHint.NONE);
		descriptor.writeToNamespace(namespaceNode.parent, `${this.indent(nestingLevel)}${inGlobal}function ${node.name}(${parametersString}): ${type};\n`);
	}

	/**
	 * Renders and writes a function node as a method to the output.
	 *
	 * @param {InterfaceNode} interfaceNode Interface node to write out
	 * @param {FunctionNode} node Function node to write out
	 * @param {Number} nestingLevel Current nesting level for indentation
	 */
	writeMethodNode(interfaceNode, node, nestingLevel) {
		const descriptor = this.getDescriptorFile(interfaceNode);
		const jsdoc = this.generateJsDoc(node, nestingLevel);
		if (jsdoc) {
			descriptor.writeToNamespace(interfaceNode.parent, jsdoc);
		}
		const isStatic = node.isStatic ? 'static ' : '';
		if (node.removed) {
			descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}${isStatic}${node.name}: never;\n`);
			return;
		}
		const parametersString = this.prepareParameters(node.parameters);
		const type = this.normalizeType(node.returnType, TypeHint.NONE, node.optional);
		const optionalSign = node.optional ? '?' : '';
		const generic = node.generic;
		descriptor.writeToNamespace(interfaceNode.parent, `${this.indent(nestingLevel)}${isStatic}${node.name}${generic}${optionalSign}(${parametersString}): ${type};\n`);
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
			jsDoc += `${this.indent(nestingLevel)} */`;
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
	 * @param {TypeHint} usageHint A string with a hint where this type is used
	 * @param {boolean=} isOptional Type is optional (i.e. undefined)
	 * @return {String} A normalized representation of the type for usage in TypeScript
	 */
	normalizeType(docType, usageHint, isOptional) {
		if (!docType) {
			return 'any';
		}

		if (Array.isArray(docType)) {
			const normalizedTypes = docType.map(typeName => this.normalizeType(typeName, TypeHint.UNION));
			return normalizedTypes.includes('any') ? 'any' : normalizedTypes.join(' | ');
		}

		let type = '';
		const lessThanIndex = docType.indexOf('<');
		if (lessThanIndex !== -1) {
			const baseType = docType.slice(0, lessThanIndex);
			const greaterThanIndex = docType.lastIndexOf('>');
			const subType = docType.slice(lessThanIndex + 1, greaterThanIndex);
			const subTypes = subType.split(',').map(type => this.normalizeType(type.trim(), TypeHint.NONE));
			if (baseType === 'Array') {
				type = subTypes.map(typeName => {
					if (usageHint === TypeHint.PARAMETER) {
						return `ReadonlyArray<${typeName}>`;
					} else if (typeName.indexOf('<') !== -1) {
						return `Array<${typeName}>`;
					} else {
						return `${typeName}[]`;
					}
				}).join(' | ');
			} else if (baseType === 'Callback') {
				let func;
				if (docType === 'Callback<void>') {
					func = '() => void';
				} else {
					func = `(${subTypes.map((type, index) => `param${index}: ${type}`).join(', ')}) => void`;
				}
				if (func) {
					type = usageHint === TypeHint.UNION ? `(${func})` : func;
				}
			} else if (baseType === 'Dictionary') {
				type = `Dictionary<${subType}>`;
			} else if (baseType === 'Promise') {
				type = `Promise<${this.normalizeType(subType, TypeHint.NONE)}>`;
			}
		} else {
			switch (docType) {
				case 'Object':
				case 'any':
					return 'any';
				case 'bool':
					type = 'boolean'; // Windows addon only
					break;
				case 'Boolean':
				case 'Function':
				case 'Number':
				case 'String':
					type = docType.toLowerCase();
					break;
				case 'Array':
					type = 'any[]';
					break;
				case 'Callback': {
					// simple 'Callback' is considered a poorly documented type, assume any number of `any` arguments
					// callback without arguments and return value should be documented as `Callback<void>`
					const func = '(...args: any[]) => void';
					type = usageHint === TypeHint.UNION ? `(${func})` : func;
					break;
				}
				default: {
					if (docType.indexOf('.') !== -1) {
						const lastPart = docType.substring(docType.lastIndexOf('.') + 1);
						if (invalidTypeMap[lastPart]) {
							type = docType.replace(lastPart, invalidTypeMap[lastPart]);
						}
						const firstPart = docType.substring(0, docType.indexOf('.'));
						if (firstPart === 'Global') {
							type = docType.substring(firstPart.length + 1);
						}
					}
					if (!type) {
						if (invalidTypeMap[docType]) {
							type = invalidTypeMap[docType];
						} else {
							type = docType;
						}
					}
				}
			}
		}
		if (isOptional && type !== 'never' && type !== 'any') {
			type = `${type} | undefined`;
		}
		return type;
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
		let type = this.normalizeType(paramNode.type, paramNode.repeatable ? null : TypeHint.PARAMETER);
		if (paramNode.repeatable && type.indexOf('Array<') !== 0 && type.indexOf('[]') !== type.length - 2) {
			type = type.indexOf(' | ') !== -1 ? `Array<${type}>` : `${type}[]`;
		}
		parameter += `: ${type}`;

		return parameter;
	}

	getDescriptorFile(node) {
		return DescriptionFile.getInstance(node);
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
 * Representation of a node in the AST that has members (used as a base for
 * namespace and interface nodes).
 */
class MemberNode {
	constructor(api) {
		this.api = api;
		this.fullyQualifiedName = api.name;
		let fullyQualifiedName = this.fullyQualifiedName;
		if (typeof renameInterfaces[api.name] === 'string') {
			fullyQualifiedName = renameInterfaces[api.name];
		}
		this.name = fullyQualifiedName.substring(fullyQualifiedName.lastIndexOf('.') + 1);
		this.properties = [];
		this.methods = [];
		this.events = [];
		this.relatedNode = null;
		this.innerNodesMap = new Map();
		this.membersAreStatic = false;
		this.proxyEventMap = null;
		this.parent = null;
		this.filename = '';
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
			__file: this.api.__file,
			__path: this.api.__path,
			name: `${this.name}EventMap`,
			extends: 'ProxyEventMap',
			properties: properties,
			summary: ''
		});
		this.proxyEventMap.parent = this.parent;
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

	getRelativeFilePath(from) {
		let relativePath = '';
		if (from) {
			if (!this.filename) {
				this.filename = this.api.__file.replace(/\.yml$/, '.d.ts');
			}
			relativePath = path.relative(from, this.filename);
		} else {
			relativePath = this.api.__path.replace(/\.yml$/, '.d.ts');
		}
		if (!relativePath.startsWith('./')) {
			relativePath = './' + relativePath;
		}
		return relativePath;
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
		// If we have interface/class for this namespace, then we need here only upper-cased constants
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
		namespaceNode.parent = this;
	}

	addInterface(interfaceNode) {
		this.interfaces.push(interfaceNode);
		interfaceNode.parent = this;
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

	wrap(string) {
		let top = this;
		const stack = [ this ];
		while (top.parent) {
			top = top.parent;
			stack.unshift(top);
		}
		let open = '';
		let close = '';
		if (stack[0].fullyQualifiedName === 'Global') {
			stack.shift();
		}
		stack.forEach((node, index) => {
			if (index === 0) {
				open = `declare namespace ${node.name} {\n`;
				close = '}';
			} else {
				const indent = ''.padStart(index, '\t');
				open = `${open}${indent}namespace ${node.name} {\n`;
				close = `${indent}}\n${close}`;
			}
		});
		return `${open}${string}${close}`;
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
	const node = new InterfaceNode({
		__file: interfaceNode.api.__file,
		__path: interfaceNode.api.__path,
		name: `${name}BaseEvent`,
		extends: 'Ti.Event',
		summary: `Base event for class ${name}`,
		properties: [
			{ name: 'source', type: name, optional: false, summary: 'Source object that fired the event.' }
		]
	});
	node.parent = interfaceNode.parent;
	return node;
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
	const node = new InterfaceNode({
		__file: interfaceNode.api.__file,
		__path: interfaceNode.api.__path,
		name: `${interfaceNode.name}_${name}_Event`,
		extends: `${interfaceNode.name}BaseEvent`,
		summary: eventDoc.summary,
		properties: properties
	});
	node.parent = interfaceNode.parent;
	return node;
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

class DescriptionFile {
	constructor(node, filePath) {
		this.node = node;
		this.filePath = filePath;
		this.headers = [];
		this.namespaces = new Map();
		this.raw = [];
		this.refsNames = new Set();
		this.refs = [];
		this.referenced = false;
	}

	writeRefs(node) {
		const name = typeof node === 'string' ? node : node.name;
		if (!this.refsNames.has(name)) {
			let relativePath;
			if (typeof node === 'string') {
				relativePath = name;
			} else {
				let from = '';
				if (typeof this.node !== 'string') {
					from = path.dirname(this.node.api.__file);
				}
				relativePath = node.getRelativeFilePath(from);
			}
			this.refs.push(`/// <reference path="${relativePath}" />`);
			this.refsNames.add(name);
			DescriptionFile.getInstance(node).markReferenced();
		}
	}

	writeHeader(str) {
		this.headers.push(str);
	}

	writeToNamespace(namespaceNode, str) {
		if (namespaceNode) {
			const strings = this.namespaces.get(namespaceNode) || [];
			strings.push(str);
			this.namespaces.set(namespaceNode, strings);
		} else {
			this.raw.push(str);
		}
	}

	writeRaw(str) {
		this.raw.push(str);
	}

	markReferenced() {
		this.referenced = true;
	}

	toString() {
		const parts = [];
		parts.push(this.headers.join('\n'));
		parts.push(this.refs.sort().join('\n'));
		this.namespaces.forEach((strings, node) => {
			parts.push(node.wrap(strings.join('\n') + '\n'));
		});
		parts.push(this.raw.join('\n'));
		let output = parts.filter(part => part.length).join('\n');
		if (!output.endsWith('\n')) {
			output += '\n';
		}
		return output;
	}
}

DescriptionFile.files = new Map();

DescriptionFile.getInstance = function (node) {
	const file = typeof node === 'string' ? node : node.getRelativeFilePath();
	let descriptor;
	if (DescriptionFile.files.has(file)) {
		descriptor = DescriptionFile.files.get(file);
	} else {
		descriptor = new DescriptionFile(node, file);
		DescriptionFile.files.set(file, descriptor);
	}
	return descriptor;
};
