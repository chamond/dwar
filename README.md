# dwar

TypeScript 5.x project base with Clean Architecture layers and a single-file JavaScript build.

## Scripts

- `npm run typecheck` - checks TypeScript types without emitting files.
- `npm run build` - type-checks the project, then bundles it to `dist/index.js`.
- `npm run start -- <name>` - runs the compiled bundle.
- `npm run dev -- <name>` - builds and runs the bundle.

## Architecture

- `src/domain` - business entities and domain rules. No framework or infrastructure imports.
- `src/application` - use cases and ports required by the domain workflow.
- `src/infrastructure` - adapters for external systems.
- `src/presentation` - delivery layer, currently a small CLI.
- `src/main.ts` - composition root where adapters and use cases are wired together.

## Build

Install dependencies first:

```sh
npm install
```

Then create the single JavaScript file:

```sh
npm run build
```

The compiled output is `dist/index.js`.

