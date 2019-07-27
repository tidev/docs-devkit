# titanium-docgen

> Generates Titanium API documentation in different formats

## Installation

```sh
npm i titanium-docgen -D
```

## Usage

```
node docgen [--addon-docs <PATH_TO_YAML_FILES] [--css <CSS_FILE>] [--format <EXPORT_FORMAT>] [--output <OUTPUT_DIRECTORY>] <PATH_TO_YAML_FILES>
```

For a description of each option. run `docgen --help`.

## Supported formats

| Format | Description |
| --- | --- |
| `addon` | |
| `changes` | |
| `html` | HTML files for the official docs at https://docs.appcelerator.com |
| `jsca` | [JSCA](https://docs.appcelerator.com/platform/latest/#!/guide/JSCA_1.0_Specification) content assist metadata |
| `jsduck` | https://github.com/senchalabs/jsduck |
| `json` | JSON metadata file |
| `json-raw` | Same as `json`, but with no pre-rendered markdown |
| `modulehtml` | |
| `parity` | |
| `solr` | Solr search index |
| `typescript` | TypeScript type definition file |
