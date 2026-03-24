# Parser And Graph Notes

## Current Parser Stack
- `SpringAnnotationParser.ts` uses `@lezer/java` for browser-safe syntax parsing.
- `PomXmlParser.ts` uses `fast-xml-parser`.
- The parser extracts package declarations, imports, class kinds, annotations, fields, methods, and type references.

## Known `@lezer/java` Constraints
- Good fit for browser execution.
- Supports generics and text blocks.
- Does not fully support modern Java constructs such as records, sealed classes, and newer pattern matching syntax.

## Dependency Graph Inputs
- `JavaClass.typeReferences`
- import declarations
- package names
- class names and layer metadata
- co-change matrix output

## Graph Construction Expectations
- Resolve dependencies from same-package references.
- Resolve dependencies from explicit imports.
- Resolve dependencies from wildcard imports when possible.
- Keep structural edges and co-change signals conceptually separate even when both influence the final graph.

## Common Pitfalls
- Extending the parser without updating downstream graph assumptions.
- Adding a new extracted field but not threading it through `JavaClass`.
- Treating syntax-tree data as full semantic resolution.
- Regressing browser compatibility by introducing Node-only parser libraries.
