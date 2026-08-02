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
  .dwar-human-attention-alarm__button:focus-visible,
  .dwar-tabs__button:focus-visible,
  .dwar-action-button:focus-visible,
  .dwar-mining-action__menu-toggle:focus-visible,
  .dwar-mining-action__force-stop:focus-visible,
  .dwar-craft-amount:focus-within,
  .dwar-location-select__control:focus-visible,
  .dwar-resource-picker__toggle:focus-visible {
    outline: 2px solid #78d9c2;
    outline-offset: 3px;
  }

  .dwar-minigame-recognition__solve:focus-visible {
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

  .dwar-human-attention-alarm {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    padding: 20px;
    overflow: hidden;
    background:
      radial-gradient(circle at center, rgba(118, 14, 24, .34) 0%, rgba(8, 10, 15, .9) 58%),
      rgba(5, 7, 11, .86);
    backdrop-filter: blur(5px) saturate(.7);
  }

  .dwar-human-attention-alarm[hidden] {
    display: none;
  }

  .dwar-human-attention-alarm__button {
    position: relative;
    isolation: isolate;
    display: flex;
    width: 200px;
    height: 200px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 7px;
    padding: 22px;
    color: #fff5f5;
    background:
      radial-gradient(circle at 34% 24%, rgba(255, 255, 255, .25), transparent 30%),
      linear-gradient(145deg, #ff5462 0%, #d32031 48%, #760d19 100%);
    border: 2px solid rgba(255, 213, 216, .72);
    border-radius: 50%;
    box-shadow:
      0 20px 48px rgba(0, 0, 0, .58),
      0 0 0 9px rgba(255, 61, 76, .13),
      0 0 50px rgba(255, 42, 58, .5),
      inset 0 1px 0 rgba(255, 255, 255, .3),
      inset 0 -12px 22px rgba(71, 0, 9, .28);
    cursor: pointer;
    text-align: center;
    text-shadow: 0 2px 8px rgba(54, 0, 7, .58);
    animation: dwar-human-attention-alarm-beat 1.15s ease-in-out infinite;
  }

  .dwar-human-attention-alarm__button::before {
    position: absolute;
    inset: -16px;
    z-index: -1;
    content: "";
    border: 2px solid rgba(255, 73, 87, .65);
    border-radius: 50%;
    animation: dwar-human-attention-alarm-ring 1.15s ease-out infinite;
  }

  .dwar-human-attention-alarm__button:hover {
    background:
      radial-gradient(circle at 34% 24%, rgba(255, 255, 255, .3), transparent 32%),
      linear-gradient(145deg, #ff6672 0%, #e12638 48%, #86101e 100%);
  }

  .dwar-human-attention-alarm__button:active {
    transform: scale(.97);
  }

  .dwar-human-attention-alarm__icon {
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    filter: drop-shadow(0 5px 10px rgba(67, 0, 8, .45));
  }

  .dwar-human-attention-alarm__icon svg {
    width: 100%;
    height: 100%;
    stroke-width: 2;
  }

  .dwar-human-attention-alarm__title {
    font: 900 20px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: .1em;
  }

  .dwar-human-attention-alarm__hint {
    max-width: 132px;
    color: rgba(255, 241, 242, .88);
    font: 700 11px/1.25 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  @keyframes dwar-human-attention-alarm-beat {
    0%,
    100% {
      transform: scale(1);
      filter: brightness(1);
    }

    48% {
      transform: scale(1.045);
      filter: brightness(1.12);
    }
  }

  @keyframes dwar-human-attention-alarm-ring {
    0% {
      opacity: .82;
      transform: scale(.92);
    }

    78%,
    100% {
      opacity: 0;
      transform: scale(1.18);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dwar-human-attention-alarm__button,
    .dwar-human-attention-alarm__button::before {
      animation: none;
    }
  }

  .dwar-tabs {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
  }

  .dwar-tabs__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex: 0 0 auto;
    padding: 5px 7px 0;
    background: #121923;
    border-bottom: 1px solid rgba(255, 255, 255, .07);
  }

  .dwar-tabs__button {
    position: relative;
    height: 34px;
    padding: 0 12px;
    color: #7f8ca1;
    background: transparent;
    border: 0;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    font: 800 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    transition: color .14s ease, background-color .14s ease;
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
  .dwar-craft-amount,
  .dwar-location-select__control,
  .dwar-resource-picker__toggle {
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

  .dwar-panel__recipe-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 74px;
    min-width: 0;
    gap: 8px;
  }

  .dwar-resource-picker {
    position: relative;
    min-width: 0;
  }

  .dwar-location-select {
    display: block;
    min-width: 0;
  }

  .dwar-location-select__control {
    width: 100%;
    padding: 0 32px 0 10px;
    color: #dbe3f1;
    background: #0b1118;
    border-radius: 7px;
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, #aeb8c7 50%),
      linear-gradient(135deg, #aeb8c7 50%, transparent 50%);
    background-position:
      calc(100% - 17px) 16px,
      calc(100% - 12px) 16px;
    background-size: 5px 5px, 5px 5px;
    background-repeat: no-repeat;
  }

  .dwar-craft-amount {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 0 8px 0 0;
    color: #dbe3f1;
    background: #0b1118;
  }

  .dwar-craft-amount:hover,
  .dwar-craft-amount:focus-within {
    border-color: rgba(120, 217, 194, .42);
    color: #ffffff;
    background-color: #111a24;
  }

  .dwar-craft-amount__input {
    width: 100%;
    min-width: 0;
    height: 100%;
    padding: 0 3px 0 8px;
    color: inherit;
    background: transparent;
    border: 0;
    outline: 0;
    font: 800 12px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center;
    appearance: textfield;
  }

  .dwar-craft-amount__input::-webkit-outer-spin-button,
  .dwar-craft-amount__input::-webkit-inner-spin-button {
    margin: 0;
    appearance: none;
  }

  .dwar-craft-amount__unit {
    flex: 0 0 auto;
    color: #aeb8c7;
    font-size: 11px;
    font-weight: 700;
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

  .dwar-location-select__control:hover,
  .dwar-location-select__control:focus-visible,
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
    width: 100%;
    height: auto;
    background: #05070a;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 5px;
  }

  .dwar-minigame-recognition__sequence {
    color: #f3c96b;
    font: 700 12px/1.3 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    text-align: center;
  }

  .dwar-minigame-recognition__solve {
    min-height: 34px;
    padding: 7px 10px;
    color: #07110f;
    background: linear-gradient(180deg, #78d9c2 0%, #39a88f 100%);
    border: 1px solid rgba(166, 255, 233, .36);
    border-radius: 6px;
    cursor: pointer;
    font: 700 12px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .dwar-minigame-recognition__solve:hover {
    background: linear-gradient(180deg, #8cebd6 0%, #42b79c 100%);
  }

  .dwar-minigame-recognition__solve:disabled {
    color: #9aa4b3;
    background: #29313d;
    border-color: rgba(255, 255, 255, .08);
    cursor: wait;
  }

  .dwar-log-line:last-child {
    border-bottom: 0;
  }
`;
