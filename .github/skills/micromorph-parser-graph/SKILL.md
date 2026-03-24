---
name: micromorph-parser-graph
description: 'Work on Java parsing, POM parsing, Spring annotation extraction, dependency graph construction, co-change matrix logic, or JavaClass metadata in MicroMorphAgent. Use for SpringAnnotationParser, PomXmlParser, DependencyGraphBuilder, and CoChangeMatrix changes.'
argument-hint: 'Describe the parser or graph change, the Java construct involved, and whether dependency, annotation, import, or commit-history behavior is affected.'
user-invocable: true
---

# MicroMorph Parser And Graph

Use this skill when a task changes how Java source is parsed or how structural relationships are derived from that parsed data.

## When to Use
- Extend Java syntax support in the browser parser.
- Change extraction of packages, annotations, classes, methods, fields, or type references.
- Adjust dependency graph edge construction.
- Change co-change matrix thresholds or commit-history interpretation.
- Fix incorrect graph nodes, layer assignment, or missing relationships.

## Procedure
1. Start with the smallest producing parser: `PomXmlParser.ts` or `SpringAnnotationParser.ts`.
2. Confirm the downstream data contract in `src/types/index.ts`, especially `JavaClass` and graph node shapes.
3. Update `DependencyGraph.ts` only after verifying the parser now emits the required metadata.
4. If a change touches commit-history coupling, inspect `GitHistoryFetcher.ts` and `CoChangeMatrix.ts` together.
5. Preserve browser-safe parsing assumptions and avoid Node-only parser dependencies.
6. Validate with `npm run build` and at least one realistic parsing scenario.

## Guardrails
- The current browser-safe Java parser is `@lezer/java`.
- Type references are central to dependency edge derivation.
- Same-package, explicit-import, and wildcard-import resolution should stay aligned.
- Do not silently fabricate semantic information the parser does not actually extract.

## Primary Files
- `src/engine/parser/SpringAnnotationParser.ts`
- `src/engine/parser/PomXmlParser.ts`
- `src/engine/graph/DependencyGraph.ts`
- `src/engine/graph/CoChangeMatrix.ts`
- `src/engine/github/GitHistoryFetcher.ts`
- `src/types/index.ts`

## References
- [Parser and graph notes](./references/parser-graph-notes.md)
