export const BOT_WIDGET_STYLES = `
  :host {
    all: initial;
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .dwar-launcher {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 2147483646;
    display: grid;
    width: 56px;
    height: 56px;
    place-items: center;
    padding: 0;
    color: #f3c96b;
    background:
      radial-gradient(circle at 35% 28%, rgba(255, 232, 167, .22), transparent 34%),
      linear-gradient(145deg, #202735 0%, #10151f 54%, #090d14 100%);
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 999px;
    box-shadow: 0 16px 34px rgba(0, 0, 0, .42), 0 0 0 1px rgba(243, 201, 107, .14);
    cursor: pointer;
    touch-action: none;
    user-select: none;
    transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  }

  .dwar-launcher:hover {
    border-color: rgba(243, 201, 107, .45);
    box-shadow: 0 18px 40px rgba(0, 0, 0, .5), 0 0 0 3px rgba(243, 201, 107, .14);
    transform: translateY(-1px);
  }

  .dwar-launcher:active {
    transform: translateY(0) scale(.98);
  }

  .dwar-launcher.is-dragging {
    cursor: grabbing;
    transform: scale(.98);
    transition: none;
  }

  .dwar-launcher:focus-visible,
  .dwar-panel__icon-button:focus-visible,
  .dwar-volume-control__slider:focus-visible,
  .dwar-panel__resize:focus-visible,
  .dwar-tabs__button:focus-visible,
  .dwar-action-button:focus-visible,
  .dwar-mining-action__menu-toggle:focus-visible,
  .dwar-mining-action__force-stop:focus-visible,
  .dwar-resource-picker__toggle:focus-visible,
  .dwar-option-checkbox__input:focus-visible,
  .dwar-exchange-monitoring__input:focus-visible,
  .dwar-exchange-rule__remove:focus-visible {
    outline: 2px solid #78d9c2;
    outline-offset: 3px;
  }

  .dwar-launcher svg {
    width: 31px;
    height: 31px;
    filter: drop-shadow(0 2px 5px rgba(0, 0, 0, .38));
  }

  .dwar-panel {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    width: 356px;
    height: 408px;
    min-width: 296px;
    min-height: 364px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    flex-direction: column;
    overflow: hidden;
    color: #e9edf5;
    background: linear-gradient(180deg, #171d28 0%, #0c1017 100%);
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 8px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, .55), 0 0 0 1px rgba(120, 217, 194, .08);
  }

  .dwar-panel[hidden] {
    display: none;
  }

  .dwar-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    padding: 0 8px 0 13px;
    background: #1c2431;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    cursor: grab;
    user-select: none;
    touch-action: none;
  }

  .dwar-panel.is-dragging .dwar-panel__header {
    cursor: grabbing;
  }

  .dwar-panel.is-resizing {
    user-select: none;
  }

  .dwar-panel__title {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 8px;
    color: #f7f8fb;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .dwar-panel__status {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    background: #78d9c2;
    border-radius: 999px;
    box-shadow: 0 0 12px rgba(120, 217, 194, .85);
  }

  .dwar-panel__actions {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 4px;
  }

  .dwar-volume-control {
    position: relative;
    display: inline-flex;
  }

  .dwar-volume-control__toggle svg {
    width: 18px;
    height: 18px;
    overflow: visible;
  }

  .dwar-volume-icon__speaker {
    fill: currentColor;
    stroke: none;
  }

  .dwar-volume-icon__wave,
  .dwar-volume-icon__mute {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-width: 1.8;
  }

  .dwar-volume-control[data-volume-level="muted"] .dwar-volume-icon__wave,
  .dwar-volume-control:not([data-volume-level="muted"]) .dwar-volume-icon__mute,
  .dwar-volume-control[data-volume-level="low"] .dwar-volume-icon__wave--high {
    display: none;
  }

  .dwar-volume-control__popover {
    position: absolute;
    top: 28px;
    left: 50%;
    z-index: 7;
    width: 34px;
    height: 104px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    background: rgba(20, 27, 38, .97);
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 7px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, .42);
    transform: translateX(-50%) translateY(-3px);
    transition: opacity .12s ease, transform .12s ease, visibility .12s ease;
  }

  .dwar-volume-control:hover .dwar-volume-control__popover,
  .dwar-volume-control:focus-within .dwar-volume-control__popover {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }

  .dwar-volume-control__slider {
    --dwar-volume-progress: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 78px;
    height: 4px;
    padding: 0;
    appearance: none;
    accent-color: #f7f8fb;
    background: linear-gradient(
      to right,
      #f7f8fb 0 var(--dwar-volume-progress),
      #5d6675 var(--dwar-volume-progress) 100%
    );
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    transform: translate(-50%, -50%) rotate(-90deg);
  }

  .dwar-volume-control__slider::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    background: #f7f8fb;
    border: 0;
    border-radius: 50%;
    box-shadow: 0 1px 5px rgba(0, 0, 0, .42);
  }

  .dwar-volume-control__slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #f7f8fb;
    border: 0;
    border-radius: 50%;
    box-shadow: 0 1px 5px rgba(0, 0, 0, .42);
  }

  .dwar-panel__icon-button {
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    padding: 0;
    color: #aeb8c7;
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    font: 22px/1 ui-sans-serif, system-ui, sans-serif;
    transition: color .14s ease, background-color .14s ease;
  }

  .dwar-panel__icon-button:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, .08);
  }

  .dwar-panel__clear-log {
    color: #78d9c2;
  }

  .dwar-panel__clear-log:hover {
    background: rgba(120, 217, 194, .12);
  }

  .dwar-panel__clear-log svg {
    width: 17px;
    height: 17px;
  }

  .dwar-panel__close {
    color: #aeb8c7;
  }

  .dwar-tabs {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
  }

  .dwar-tabs__list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    flex: 0 0 auto;
    padding: 5px 7px 0;
    background: #121923;
    border-bottom: 1px solid rgba(255, 255, 255, .07);
  }

  .dwar-tabs__button {
    position: relative;
    height: 40px;
    padding: 0 5px;
    color: #7f8ca1;
    background: transparent;
    border: 0;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    font: 800 11px/1.15 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition: color .14s ease, background-color .14s ease;
  }

  .dwar-tabs__label {
    position: relative;
    z-index: 1;
  }

  .dwar-tabs__button::after {
    position: absolute;
    right: 10px;
    bottom: 0;
    left: 10px;
    height: 2px;
    content: "";
    background: transparent;
    border-radius: 999px 999px 0 0;
    z-index: 2;
  }

  .dwar-tabs__button:hover {
    color: #dbe3f1;
    background: rgba(255, 255, 255, .035);
  }

  .dwar-tabs__button.is-active {
    color: #f7f8fb;
    background: rgba(120, 217, 194, .055);
  }

  .dwar-tabs__button.is-active::after {
    background: #78d9c2;
    box-shadow: 0 0 10px rgba(120, 217, 194, .58);
  }

  .dwar-tabs__button.has-exchange-alert {
    overflow: hidden;
    color: #fff0b8;
    background: rgba(176, 113, 24, .28);
    box-shadow: inset 0 0 0 1px rgba(255, 218, 111, .35), 0 0 14px rgba(244, 186, 64, .34);
  }

  .dwar-tabs__button.has-exchange-alert::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 200%;
    content: "";
    pointer-events: none;
    background: linear-gradient(
      110deg,
      rgba(176, 113, 24, .28),
      rgba(255, 220, 117, .5),
      rgba(176, 113, 24, .28)
    ) 0 0 / 50% 100% repeat-x;
    animation: dwar-exchange-shimmer 1.45s linear infinite;
  }

  .dwar-tabs__button.has-exchange-alert::after {
    background: #ffd66f;
    box-shadow: 0 0 12px rgba(255, 214, 111, .85);
  }

  .dwar-tabs__panels {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
  }

  .dwar-tabs__panel {
    display: flex;
    width: 100%;
    min-height: 0;
    flex-direction: column;
  }

  .dwar-tabs__panel[hidden] {
    display: none;
  }

  .dwar-panel__controls {
    display: flex;
    align-items: flex-start;
    flex: 0 0 auto;
    gap: 8px;
    padding: 10px;
    background: #101720;
    border-bottom: 1px solid rgba(255, 255, 255, .07);
  }

  .dwar-action-button,
  .dwar-resource-picker__toggle,
  .dwar-option-checkbox {
    height: 38px;
    border: 1px solid rgba(255, 255, 255, .11);
    border-radius: 7px;
    font: 700 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: 0;
    cursor: pointer;
    transition: border-color .14s ease, background-color .14s ease, color .14s ease;
  }

  .dwar-panel__action-buttons {
    display: grid;
    flex: 0 0 112px;
    align-content: start;
    gap: 8px;
  }

  .dwar-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
    padding: 0 10px;
  }

  .dwar-mining-action {
    position: relative;
    display: flex;
    width: 100%;
  }

  .dwar-mining-action .dwar-mining-button {
    min-width: 0;
    flex: 1 1 auto;
  }

  .dwar-mining-action.is-active .dwar-mining-button {
    border-radius: 7px 0 0 7px;
  }

  .dwar-mining-action__menu-toggle {
    display: grid;
    width: 30px;
    height: 38px;
    flex: 0 0 30px;
    place-items: center;
    padding: 0;
    color: #ffe9e9;
    background: linear-gradient(180deg, #d65a63 0%, #8f2e38 100%);
    border: 1px solid rgba(255, 173, 182, .44);
    border-left: 1px solid rgba(75, 20, 27, .42);
    border-radius: 0 7px 7px 0;
    cursor: pointer;
    font: 800 12px/1 ui-sans-serif, system-ui, sans-serif;
  }

  .dwar-mining-action__menu-toggle:hover,
  .dwar-mining-action__menu-toggle[aria-expanded="true"] {
    background: linear-gradient(180deg, #e66a74 0%, #9f3741 100%);
  }

  .dwar-mining-action__menu-toggle[hidden] {
    display: none;
  }

  .dwar-mining-action__menu {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    z-index: 4;
    min-width: 194px;
    padding: 4px;
    background: #171d28;
    border: 1px solid rgba(255, 255, 255, .13);
    border-radius: 7px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, .48);
  }

  .dwar-mining-action__menu[hidden] {
    display: none;
  }

  .dwar-mining-action__force-stop {
    width: 100%;
    padding: 9px 10px;
    color: #ffc8cc;
    background: transparent;
    border: 0;
    border-radius: 5px;
    cursor: pointer;
    font: 700 12px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: left;
    white-space: nowrap;
  }

  .dwar-mining-action__force-stop:hover {
    color: #fff0f1;
    background: rgba(214, 90, 99, .2);
  }

  .dwar-mining-button {
    color: #121620;
    background: linear-gradient(180deg, #f3c96b 0%, #d69b3f 100%);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .26);
  }

  .dwar-mining-button:hover {
    border-color: rgba(255, 232, 167, .58);
    background: linear-gradient(180deg, #ffd982 0%, #dda948 100%);
  }

  .dwar-crafting-button {
    color: #07110f;
    background: linear-gradient(180deg, #78d9c2 0%, #39a88f 100%);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .26);
  }

  .dwar-crafting-button:hover {
    border-color: rgba(166, 255, 233, .52);
    background: linear-gradient(180deg, #8cebd6 0%, #42b79c 100%);
  }

  .dwar-hunting-button {
    color: #f7f8fb;
    background: linear-gradient(180deg, #c7505c 0%, #7e2933 100%);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .26);
  }

  .dwar-hunting-button:hover {
    border-color: rgba(255, 167, 176, .54);
    background: linear-gradient(180deg, #dc626e 0%, #923640 100%);
  }

  .dwar-hunting-button.is-busy {
    color: #dbe3f1;
    background: linear-gradient(180deg, #4a5667 0%, #2c3542 100%);
  }

  .dwar-splinter-help-button {
    color: #dbe3f1;
    background: linear-gradient(180deg, #273548 0%, #182331 100%);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .2);
  }

  .dwar-splinter-help-button:hover {
    color: #ffffff;
    border-color: rgba(120, 217, 194, .42);
    background: linear-gradient(180deg, #30445c 0%, #1c2c3d 100%);
  }

  .dwar-action-button.dwar-splinter-help-button:disabled {
    color: #8d99aa;
    background: linear-gradient(180deg, #202b3a 0%, #151e2a 100%);
  }

  .dwar-action-button.is-active {
    color: #ffe9e9;
    background: linear-gradient(180deg, #d65a63 0%, #8f2e38 100%);
    border-color: rgba(255, 173, 182, .44);
  }

  .dwar-action-button.is-active:hover {
    background: linear-gradient(180deg, #e66a74 0%, #9f3741 100%);
  }

  .dwar-action-button:disabled {
    color: rgba(18, 22, 32, .62);
    cursor: wait;
    background: linear-gradient(180deg, #a88746 0%, #76592d 100%);
    box-shadow: none;
  }

  .dwar-action-button.dwar-hunting-button:disabled {
    color: #aeb8c7;
    background: linear-gradient(180deg, #4a5667 0%, #2c3542 100%);
  }

  .dwar-action-button svg {
    width: 18px;
    height: 18px;
  }

  .dwar-panel__selectors {
    display: grid;
    flex: 1 1 auto;
    min-width: 0;
    gap: 8px;
  }

  .dwar-option-checkbox {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    align-items: center;
    width: 100%;
    gap: 8px;
    padding: 0 10px;
    color: #dbe3f1;
    background: #0b1118;
    cursor: pointer;
  }

  .dwar-option-checkbox:hover {
    color: #ffffff;
    background: #111a24;
    border-color: rgba(120, 217, 194, .42);
  }

  .dwar-option-checkbox__input {
    display: block;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: #78d9c2;
  }

  .dwar-option-checkbox__label {
    min-width: 0;
    line-height: 1.2;
  }

  .dwar-resource-picker__toggle:disabled,
  .dwar-option-checkbox:has(.dwar-option-checkbox__input:disabled) {
    color: #7f8ca1;
    cursor: wait;
    background: #151d28;
  }

  .dwar-resource-picker {
    position: relative;
    min-width: 0;
  }

  .dwar-resource-picker__toggle {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    gap: 8px;
    padding: 0 10px;
    color: #dbe3f1;
    background: #0b1118;
  }

  .dwar-resource-picker__toggle:hover,
  .dwar-resource-picker__toggle:focus-visible {
    border-color: rgba(120, 217, 194, .42);
    color: #ffffff;
    background-color: #111a24;
  }

  .dwar-resource-picker__toggle-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-resource-picker__count {
    display: grid;
    flex: 0 0 auto;
    margin-left: auto;
    min-width: 24px;
    height: 22px;
    place-items: center;
    padding: 0 7px;
    color: #07110f;
    background: #78d9c2;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .dwar-resource-picker__chevron {
    flex: 0 0 auto;
    color: #aeb8c7;
    font-size: 12px;
    transition: transform .14s ease;
  }

  .dwar-resource-picker.is-open .dwar-resource-picker__chevron {
    transform: rotate(180deg);
  }

  .dwar-resource-picker__menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    left: 0;
    z-index: 2;
    padding: 6px;
    background: #0b1118;
    border: 1px solid rgba(120, 217, 194, .2);
    border-radius: 8px;
    box-shadow: 0 18px 36px rgba(0, 0, 0, .46);
  }

  .dwar-resource-picker__menu[hidden] {
    display: none;
  }

  .dwar-hunt-target-picker__menu {
    max-height: 290px;
    overflow-y: auto;
    scrollbar-color: #394353 #090d13;
  }

  .dwar-hunt-target-picker__group + .dwar-hunt-target-picker__group {
    margin-top: 5px;
  }

  .dwar-hunt-target-picker__group-title {
    padding: 6px 7px 4px;
    color: #78d9c2;
    font: 800 11px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-hunt-target-option__order {
    display: grid;
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    place-items: center;
    color: #07110f;
    background: #78d9c2;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
  }

  .dwar-hunt-target-option__order[hidden] {
    display: none;
  }

  .dwar-hunt-target-option__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-hunt-target-picker__empty {
    padding: 9px 7px;
    color: #7f8ca1;
    font-size: 12px;
  }

  .dwar-resource-option {
    display: flex;
    align-items: center;
    min-height: 34px;
    gap: 8px;
    padding: 6px;
    color: #dbe3f1;
    border-radius: 6px;
    cursor: pointer;
    font: 12px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-resource-option:hover {
    background: rgba(255, 255, 255, .06);
  }

  .dwar-resource-option input {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    margin: 0;
    accent-color: #78d9c2;
  }

  .dwar-resource-option__badge {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 7px;
    padding: 4px 8px;
    border: 1px solid var(--dwar-resource-color);
    border-radius: 999px;
    background: rgba(255, 255, 255, .04);
  }

  .dwar-resource-option__swatch {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    background: var(--dwar-resource-color);
    border-radius: 999px;
    box-shadow: 0 0 10px var(--dwar-resource-color);
  }

  .dwar-resource-option__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-panel__log-section {
    flex: 1 1 auto;
    display: flex;
    min-height: 0;
    flex-direction: column;
    background: #090d13;
  }

  .dwar-panel__log-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 0 0 auto;
    height: 34px;
    padding: 4px 8px;
    background: linear-gradient(180deg, rgba(120, 217, 194, .06), rgba(120, 217, 194, .015));
    border-bottom: 1px solid rgba(255, 255, 255, .06);
  }

  .dwar-panel__logs {
    flex: 1 1 auto;
    min-height: 0;
    padding: 10px 12px;
    overflow: auto;
    background:
      linear-gradient(180deg, rgba(120, 217, 194, .04), transparent 42px),
      #090d13;
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    scrollbar-color: #394353 #090d13;
  }

  .dwar-exchange-monitoring {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
    background: #090d13;
  }

  .dwar-exchange-monitoring__settings {
    display: grid;
    flex: 0 0 auto;
    gap: 6px;
    padding: 7px 8px 8px;
    background: #101720;
    border-bottom: 1px solid rgba(255, 255, 255, .07);
  }

  .dwar-exchange-monitoring__interval {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #cfd7e6;
    font: 700 11px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-monitoring__interval-control {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 6px;
    color: #8e9aac;
  }

  .dwar-exchange-monitoring__interval-control .dwar-exchange-monitoring__input {
    width: 58px;
  }

  .dwar-exchange-monitoring__input {
    display: block;
    width: 100%;
    height: 28px;
    min-width: 0;
    padding: 0 8px;
    color: #e9edf5;
    color-scheme: dark;
    background: #0b1118;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 6px;
    font: 600 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-monitoring__input:hover,
  .dwar-exchange-monitoring__input:focus-visible {
    background: #111a24;
    border-color: rgba(120, 217, 194, .42);
  }

  .dwar-exchange-monitoring__input:invalid {
    border-color: rgba(242, 99, 110, .62);
  }

  .dwar-exchange-rule-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 104px;
    gap: 5px 12px;
    padding: 6px;
    background: rgba(255, 255, 255, .025);
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 7px;
  }

  .dwar-exchange-rule-form__title {
    grid-column: 1 / -1;
    color: #f3c96b;
    font: 800 11px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-transform: uppercase;
  }

  .dwar-exchange-rule-form__field {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .dwar-exchange-rule-form__label {
    color: #8e9aac;
    font: 700 10px/1.15 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-rule-form__price-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    gap: 5px;
  }

  .dwar-exchange-rule-form__price-preview {
    display: inline-flex;
    min-width: 30px;
    justify-content: flex-end;
  }

  .dwar-exchange-rule-form__submit {
    align-self: end;
    height: 28px;
    padding: 0 8px;
    color: #15120b;
    background: linear-gradient(180deg, #f3c96b 0%, #d69b3f 100%);
    box-shadow: none;
  }

  .dwar-exchange-rule-form__submit:hover {
    background: linear-gradient(180deg, #ffd982 0%, #dda948 100%);
  }

  .dwar-exchange-money {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    color: #f6e7b8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .dwar-exchange-money__unit {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .dwar-exchange-money__unit img {
    display: block;
    flex: 0 0 auto;
  }

  .dwar-exchange-rules {
    display: grid;
    grid-auto-rows: max-content;
    align-content: start;
    flex: 1 1 auto;
    min-height: 0;
    gap: 8px;
    padding: 9px 10px 14px;
    overflow: auto;
    scrollbar-color: #394353 #090d13;
  }

  .dwar-exchange-rules__empty {
    padding: 18px 8px;
    color: #7f8ca1;
    font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center;
  }

  .dwar-exchange-rules__empty[hidden] {
    display: none;
  }

  .dwar-exchange-rule {
    position: relative;
    display: grid;
    gap: 7px;
    padding: 9px;
    overflow: hidden;
    background: linear-gradient(180deg, #141c27 0%, #0d141d 100%);
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 8px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, .2);
  }

  .dwar-exchange-rule.has-matches {
    background: rgba(88, 57, 14, .75);
    border-color: rgba(255, 215, 103, .58);
    box-shadow: 0 0 18px rgba(230, 169, 50, .28), inset 0 0 16px rgba(255, 221, 125, .08);
  }

  .dwar-exchange-rule.has-matches::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 200%;
    content: "";
    pointer-events: none;
    background: linear-gradient(
      110deg,
      rgba(88, 57, 14, .75),
      rgba(183, 127, 30, .7),
      rgba(255, 218, 108, .28),
      rgba(88, 57, 14, .75)
    ) 0 0 / 50% 100% repeat-x;
    animation: dwar-exchange-shimmer 1.8s linear infinite;
  }

  .dwar-exchange-rule__header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    gap: 8px;
  }

  .dwar-exchange-rule__title {
    min-width: 0;
    overflow: hidden;
    color: #f2f5fa;
    font: 800 12px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-exchange-rule__remove {
    display: grid;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    place-items: center;
    padding: 0;
    color: #9ba7b9;
    background: rgba(0, 0, 0, .18);
    border: 0;
    border-radius: 5px;
    cursor: pointer;
    font: 19px/1 ui-sans-serif, system-ui, sans-serif;
  }

  .dwar-exchange-rule__remove:hover {
    color: #fff;
    background: rgba(214, 90, 99, .28);
  }

  .dwar-exchange-rule__settings {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 10px;
    color: #aeb8c7;
    font: 700 10px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-rule__quality {
    color: var(--dwar-exchange-quality-color);
  }

  .dwar-exchange-rule__minimum {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .dwar-exchange-rule__toggle {
    position: relative;
    z-index: 1;
    height: 32px;
  }

  .dwar-exchange-rule__toggle:not(.is-active) {
    color: #e7edf6;
    background: linear-gradient(180deg, #2c3c50 0%, #1a2737 100%);
  }

  .dwar-exchange-rule__toggle:not(.is-active):hover {
    background: linear-gradient(180deg, #36506a 0%, #20354a 100%);
    border-color: rgba(120, 217, 194, .42);
  }

  .dwar-exchange-rule__status {
    position: relative;
    z-index: 1;
    color: #9eabbd;
    font: 10px/1.3 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-rule__status.is-error {
    color: #f2a3aa;
    font-weight: 800;
  }

  .dwar-exchange-rule__results {
    position: relative;
    z-index: 1;
    display: grid;
    min-height: 100px;
    max-height: 126px;
    gap: 1px;
    overflow: auto;
    background: rgba(3, 6, 10, .42);
    border: 1px solid rgba(255, 255, 255, .07);
    border-radius: 5px;
    scrollbar-color: #65522d rgba(3, 6, 10, .42);
  }

  .dwar-exchange-rule__results[hidden] {
    display: none;
  }

  .dwar-exchange-rule__result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    gap: 8px;
    padding: 5px 6px;
    color: #dce3ef;
    background: rgba(255, 255, 255, .025);
    font: 10px/1.25 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-exchange-rule__result-item {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-exchange-rule__result-price {
    flex: 0 0 auto;
    font-weight: 800;
  }

  @keyframes dwar-exchange-shimmer {
    from {
      transform: translateX(0);
    }

    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dwar-tabs__button.has-exchange-alert::before,
    .dwar-exchange-rule.has-matches::before {
      animation: none;
    }
  }

  .dwar-process-bars {
    flex: 0 0 auto;
    background: #090d13;
    border-top: 1px solid rgba(255, 255, 255, .06);
  }

  .dwar-process-bar {
    --dwar-process-color: #78d9c2;
    padding: 6px 0 0;
    background: #090d13;
  }

  .dwar-process-bar + .dwar-process-bar {
    border-top: 1px solid rgba(255, 255, 255, .06);
  }

  .dwar-crafting-process-bars .dwar-process-bar {
    border-top: 1px solid rgba(255, 255, 255, .06);
  }

  .dwar-process-bar__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 20px;
    gap: 10px;
    padding: 0 12px 5px;
    color: #dbe3f1;
    font: 700 11px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: 0;
  }

  .dwar-process-bar__label,
  .dwar-process-bar__timer {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dwar-process-bar__label {
    color: #aeb8c7;
  }

  .dwar-process-bar__timer {
    flex: 0 0 auto;
    color: #f3c96b;
    font-variant-numeric: tabular-nums;
  }

  .dwar-process-bar__rail {
    height: 10px;
    overflow: hidden;
    background: linear-gradient(180deg, #0e1620 0%, #070a0f 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
  }

  .dwar-process-bar__fill {
    width: 100%;
    height: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    background:
      linear-gradient(90deg, var(--dwar-process-color) 0%, #f3c96b 100%);
    box-shadow: 0 0 14px color-mix(in srgb, var(--dwar-process-color) 68%, transparent);
    transition: transform .12s linear;
  }

  .dwar-process-bar.is-idle .dwar-process-bar__fill {
    opacity: .42;
    background: #253141;
    box-shadow: none;
  }

  .dwar-process-bar.is-active .dwar-process-bar__label {
    color: #e9edf5;
  }

  .dwar-process-bar.is-busy .dwar-process-bar__label {
    color: #e9edf5;
  }

  .dwar-process-bar.is-busy .dwar-process-bar__fill {
    animation: dwar-process-bar-busy 1.05s ease-in-out infinite;
    transform-origin: left center;
  }

  .dwar-process-bar.is-complete .dwar-process-bar__fill {
    background: linear-gradient(90deg, #78d9c2 0%, #f3c96b 100%);
  }

  @keyframes dwar-process-bar-busy {
    0% {
      transform: translateX(-100%) scaleX(.34);
    }

    52% {
      transform: translateX(28%) scaleX(.48);
    }

    100% {
      transform: translateX(180%) scaleX(.34);
    }
  }

  .dwar-panel__resize {
    position: absolute;
    right: 0;
    bottom: 0;
    display: block;
    width: 18px;
    height: 18px;
    padding: 0;
    color: rgba(120, 217, 194, .7);
    background:
      linear-gradient(135deg, transparent 0 54%, currentColor 55% 59%, transparent 60%),
      linear-gradient(135deg, transparent 0 70%, currentColor 71% 75%, transparent 76%);
    border: 0;
    border-radius: 0 0 8px 0;
    cursor: nwse-resize;
    touch-action: none;
  }

  .dwar-panel__resize:hover {
    color: #78d9c2;
    background-color: rgba(120, 217, 194, .08);
  }

  .dwar-log-line {
    padding: 5px 0;
    color: #cfd7e6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border-bottom: 1px solid rgba(255, 255, 255, .05);
  }

  .dwar-log-line__time {
    color: #7f8ca1;
  }

  .dwar-log-line--success {
    color: #9fdbbd;
  }

  .dwar-log-line--failure {
    color: #f2a3aa;
  }

  .dwar-log-tag {
    color: var(--dwar-log-tag-color);
    font-weight: 700;
  }

  .dwar-minigame-recognition {
    display: grid;
    margin-top: 6px;
    gap: 6px;
  }

  .dwar-minigame-recognition__title {
    color: #dbe3f1;
    font-weight: 700;
  }

  .dwar-minigame-recognition__image {
    display: block;
    width: auto;
    max-width: min(200px, 100%);
    height: auto;
    justify-self: center;
    background: #05070a;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 5px;
  }

  .dwar-minigame-recognition__sequence {
    color: #f3c96b;
    font: 700 12px/1.3 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    text-align: center;
  }

  .dwar-log-line:last-child {
    border-bottom: 0;
  }
`;
