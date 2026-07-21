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

  .dwar-launcher:focus-visible,
  .dwar-panel__close:focus-visible {
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
    width: min(324px, calc(100vw - 24px));
    min-height: 232px;
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

  .dwar-panel__close {
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

  .dwar-panel__close:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, .08);
  }

  .dwar-panel__logs {
    height: 190px;
    padding: 10px 12px;
    overflow: auto;
    background:
      linear-gradient(180deg, rgba(120, 217, 194, .04), transparent 42px),
      #090d13;
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    scrollbar-color: #394353 #090d13;
  }

  .dwar-log-line {
    padding: 5px 0;
    color: #cfd7e6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    border-bottom: 1px solid rgba(255, 255, 255, .05);
  }

  .dwar-log-line:last-child {
    border-bottom: 0;
  }
`;

