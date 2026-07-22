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
The launcher position is saved in browser localStorage.

The current local resource catalog contains stable bot ids and mining duration
for agate, aquamarine, and turquoise. The panel exposes independent mining and
crafting start buttons, compact multiselects for resources and profession
recipes, and one shared crafting amount input defaulting to 10. It also shows
separate progress bars for mining and every parallel crafting timer.
Unexpected server responses trigger process shutdown and a red human-attention
log tag. The panel header includes a persisted alarm toggle. The alarm is off
by default; enabling it starts a test siren immediately, and future unexpected
responses start the embedded siren sound while the toggle stays enabled. The
siren loops until the user disables the toggle manually. The alarm asset is
embedded into the single output bundle.

## GitHub Pages Deploy

The workflow in `.github/workflows/deploy-pages.yml` runs on pushes, pull requests,
and manual launches. It builds the project, verifies that `dist` contains only
`index.js`, and deploys `dist/index.js` to GitHub Pages from the default branch.

Before the first deploy, open the repository settings on GitHub and set
`Pages -> Build and deployment -> Source` to `GitHub Actions`.

After a successful deploy, the script is available at:

```text
https://<owner>.github.io/<repository>/index.js
```

For user or organization Pages repositories named `<owner>.github.io`, GitHub
serves it from:

```text
https://<owner>.github.io/index.js
```
