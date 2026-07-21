# dwar

Browser game helper bot base written in TypeScript 5.x.

The build produces one browser-loadable JavaScript file: `dist/index.js`.

## Scripts

- `npm run typecheck` - checks TypeScript types without emitting files.
- `npm run build` - type-checks the project, then bundles it to `dist/index.js`.

## Architecture

- `src/domain` - business entities and domain rules. No framework or infrastructure imports.
- `src/application` - use cases and ports required by the domain workflow.
- `src/infrastructure` - adapters for external systems.
- `src/presentation` - delivery layer, currently a browser overlay widget.
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

Load that file on the game page to mount the floating pickaxe button and bot panel.
