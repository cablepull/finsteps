# Finsteps JSON Schemas

This directory contains JSON Schema definitions for Finsteps API contracts.

## Schemas

### `mpd.json`

Schema for the `ParseResult` returned by `parseMPD()`.

- **URL**: `https://cablepull.github.io/finsteps/schema/mpd.json`
- **Type**: `ParseResult` from `src/ast.ts`
- **Description**: Validates the AST structure returned when parsing MPD (Mermaid Presentation DSL) source code

Use this schema to:
- Validate MPD parse results
- Understand the MPD AST structure
- Build tools that work with MPD ASTs

### `api.json`

Schema for the `PresentationAst` used by `presentMermaid()`.

- **URL**: `https://cablepull.github.io/finsteps/schema/api.json`
- **Type**: `PresentationAst` from `src/types.ts`
- **Description**: Validates the presentation AST structure passed to `presentMermaid()`

Use this schema to:
- Validate presentation AST objects before passing to `presentMermaid()`
- Generate TypeScript types
- Understand the presentation API structure

## Usage

### Validating in JavaScript/TypeScript

```typescript
import Ajv from 'ajv';
import mpdSchema from 'https://cablepull.github.io/finsteps/schema/mpd.json';
import apiSchema from 'https://cablepull.github.io/finsteps/schema/api.json';

const ajv = new Ajv();
const validateMpd = ajv.compile(mpdSchema);
const validateApi = ajv.compile(apiSchema);

// Validate MPD parse result
const parseResult = parseMPD(mpdText);
if (!validateMpd(parseResult)) {
  console.error('Invalid MPD:', validateMpd.errors);
}

// Validate presentation AST
if (!validateApi(presentationAst)) {
  console.error('Invalid AST:', validateApi.errors);
}
```

### Package.json Contract

The schemas are also referenced in `package.json` under `finsteps.schema`:

```json
{
  "finsteps": {
    "schema": {
      "mpd": "https://cablepull.github.io/finsteps/schema/mpd.json",
      "api": "https://cablepull.github.io/finsteps/schema/api.json"
    }
  }
}
```

This allows tools and IDEs to discover and use the schemas automatically.

## Related Documentation

- [MPD Grammar](../grammar.md)
- [MPD Parser Compatibility Contract](../mpd-parser/compatibility-contract.md)
- [Public API Documentation](../api/public-api.md)
