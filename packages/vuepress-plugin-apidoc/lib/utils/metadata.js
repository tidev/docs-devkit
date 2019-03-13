const fs = require('fs-extra');
const path = require('path');

class MetadataService {
  constructor() {
    this.initialized = false;
    this.versions = [];
    this.metadata = {};
  }

  loadMetadata(context, versions) {
    if (this.initialized) {
      return;
    }

    let metadataFilePath = path.join(context.sourceDir, 'api', 'api.json');
    let typesMetadata = JSON.parse(fs.readFileSync(metadataFilePath).toString());
    this.metadata.next = typesMetadata;

    for (const version of versions) {
      metadataFilePath = path.join(context.versionedSourceDir, version, 'api', 'api.json');
      typesMetadata = JSON.parse(fs.readFileSync(metadataFilePath).toString());
      this.metadata[version] = typesMetadata;
    }

    this.versions = versions.slice();
    this.versions.unshift('next');
    this.initialized = true;
  }

  findMetadata(typeName, version) {
    if (!version) {
      version = 'next';
    }
    return this.metadata[version] ? this.metadata[version][typeName] : undefined;
  }
}

const metadataService = new MetadataService();

/**
 * Checks if the given identifier is a known type in our metadata. If no version
 * is given it will search through all available versions.
 *
 * @param {String} keyPath Type identifier as a fully qualified key-path
 * @param {String} version Optional version of the metadta used for the type lookup
 */
function isValidType(keyPath, version) {
  return metadataService.versions.filter(v => version ? v === version : true).some(v => {
    const metadata = metadataService.findMetadata(keyPath, v);
    if (metadata) {
      return true;
    }

    const parentKeyPath = keyPath.substring(0, keyPath.lastIndexOf('.'));
    const memberName = keyPath.substring(parentKeyPath.length + 1);
    const parentMetadata = metadataService.findMetadata(parentKeyPath, v);

    if (!parentMetadata) {
      return false;
    }

    const memberTypeCandidates = ['properties', 'methods', 'events', 'constants'];
    return memberTypeCandidates.some(memberType => {
      const members = parentMetadata[memberType];
      if (!members) {
        return false;
      }

      return members.some(memberMetadata => memberMetadata.name === memberName);
    });
  });
}

/**
 * Generates a friendly name and path to the docs for the given key path.
 *
 * The key path can either point directly to a type (Titanium.UI.View) or to
 * a member of a type (Titanium.UI.View.add).
 *
 * @param {String} keyPath Key path to the type which to generate the link for
 * @param {String} basePath Base path used as a prefix in the returned path
 * @param {String} version Version of the metadata file to use for type metadata lookups
 */
function getLinkForKeyPath(keyPath, basePath, version) {
  prefix = `${basePath}${version ? `${version}/` : ''}api`;

  if (!version) {
    verion = metadataService.versions[0];
  }
  const metadata = metadataService.findMetadata(keyPath, version);
  if (metadata) {
    if (metadata.type === 'pseudo') {
      prefix += '/structs';
    }
    return {
      name: metadata.name,
      path: `${prefix}/${metadata.name.toLowerCase().replace(/\./g, '/')}.html`
    }
  }

  const parentKeyPath = keyPath.substring(0, keyPath.lastIndexOf('.'));
  const memberName = keyPath.substring(parentKeyPath.length + 1);
  const parentMetadata = metadataService.findMetadata(parentKeyPath, version);
  if (!parentMetadata) {
    return null;
  }

  const memberTypeCandidates = ['properties', 'methods', 'events', 'constants'];
  for (let i = 0; i < memberTypeCandidates.length; i++) {
    const members = parentMetadata[memberTypeCandidates[i]];
    if (!members) {
      continue;
    }

    const match = members.find(memberMetadata => memberMetadata.name === memberName);
    if (match) {
      if (parentMetadata.type === 'pseudo') {
        prefix += '/structs';
      }
      return {
        name: match.name,
        path: `${prefix}/${parentMetadata.name.toLowerCase().replace(/\./g, '/')}.html#${match.name.toLowerCase()}`
      }
    }
  }

  return null;
}

module.exports = {
  metadataService,
  isValidType,
  getLinkForKeyPath
}