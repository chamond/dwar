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

## Minigame fragment matrices

The standalone PNG utility detects the black separators in a 3-by-2 minigame
image and writes six normalized grayscale matrices. It is not included in the
browser bundle.

```sh
npm run minigame:matrices -- /path/to/captcha.png [output-directory]
```

Without the second argument, files are written next to the source image into
`<image-name>-fragment-matrices`. Each `fragment-N.json` contains a versioned
64-by-64 row-major matrix. The module also exports functions for reading and
comparing two generated matrix files.

```js
import {
  createMinigameFragmentMatrices,
  compareMinigameFragmentMatrixFiles
} from './scripts/minigame-fragment-matrices.mjs';

const result = createMinigameFragmentMatrices('/path/to/another-captcha.png');
const score = compareMinigameFragmentMatrixFiles(
  '/path/to/reference/fragment-0.json',
  result.files[0]
);

console.log(score.similarity); // 1 means identical matrices
```

To split a new image, identify which of the six reference minigames it belongs
to, and recognize the target position of every source fragment, run:

```sh
npm run minigame:recognize -- /path/to/captcha.png
```

The recognizer compares every source fragment with all six fragments of every
reference entirely in memory, without writing intermediate JSON files. It
selects the reference with the highest average similarity and prints the
recognized source-to-reference order, for example:

```text
Эталон: minigame_3 (схожесть 1.000000)
Порядок: 1,3,0,4,5,2
```

The browser widget embeds the same seven reference sets in `dist/index.js`.
When hunting requests a minigame, the widget recognizes the fetched image in
memory, shows the image and target-to-source server order in the mining log,
and optionally downloads the original PNG when the checkbox below the mining
button is enabled. It plays one short synthesized bowstring cue, waits a random
5 to 10 seconds, and submits the recognized order automatically. A response
with `status="1"` resumes the mining loop; every other status stops it. The
widget sends `action=cancel` without awaiting or inspecting its response, then
immediately handles the status saved from `minigame_check`.

The current local resource catalog contains stable bot ids, mining article ids,
and mining duration for agate, aquamarine, and turquoise. The current backpack
artifact id is discovered from the matching item's `data-id` attribute. The
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
request by matching each stable mining article id. It then crafts no more than
the selected amount or the available resource count, waits for all recipe
cooldowns before the next shared cycle, logs the calculated remainder, and
stops only the affected recipe when that resource is absent.
Unexpected server responses stop the affected process and add a red
human-attention log tag. There is no siren or alarm overlay. The header volume
control adjusts the one-shot minigame cue and persists mute and volume in
browser localStorage.

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
