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

Asynchronous application flows use RxJS end to end. Ports return `Observable`,
use cases expose event streams, and presentation controllers own and tear down
their long-lived subscriptions.

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

The current local resource catalog contains stable bot ids, mining duration,
and distinct backpack artifact ids for agate, aquamarine, and turquoise. The
panel separates mining and crafting into tabs with independent logs, clear
buttons, controls, and progress bars.
During mining, one zone scan every four seconds checks both nearby danger and
the current resource node by its server number. The bot considers the resource
collected when its node disappears and considers the attempt failed when the
node returns to an available state. Its progress bar uses the resource's
20-second nominal duration; if the node is still being farmed when the bar
fills, scans continue while the filled bar waits for the result. The crafting
tab contains the recipe multiselect and one shared amount input defaulting to
10. At the start of each crafting cycle, the bot loads backpack group 3 and
reads the resource quantities for all selected recipes with one shared
request. It then crafts no more than the selected amount or the available
resource count, waits for all recipe cooldowns before the next shared cycle,
logs the calculated remainder, and stops only the affected recipe when that
resource is absent.
Unexpected server responses stop the affected process, open the panel, show a
pulsing alarm overlay, start a looping siren, and add a red human-attention log
tag. Clicking the alarm button stops the siren and hides the overlay. The alarm
asset is embedded into the single output bundle.

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
