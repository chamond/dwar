export interface BotPanelElements {
  panel: HTMLElement;
  header: HTMLElement;
  closeButton: HTMLButtonElement;
  logList: HTMLElement;
}

export function createBotPanel(): BotPanelElements {
  const panel = document.createElement('section');
  panel.className = 'dwar-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <header class="dwar-panel__header" data-dwar-drag-handle>
      <div class="dwar-panel__title">
        <span class="dwar-panel__status" aria-hidden="true"></span>
        <span>DWAR Bot</span>
      </div>
      <button class="dwar-panel__close" type="button" aria-label="Скрыть интерфейс" data-dwar-close>&times;</button>
    </header>
    <div class="dwar-panel__logs" role="log" aria-live="polite" data-dwar-log-list></div>
  `;

  return {
    panel,
    header: queryPanelElement(panel, '[data-dwar-drag-handle]', HTMLElement),
    closeButton: queryPanelElement(panel, '[data-dwar-close]', HTMLButtonElement),
    logList: queryPanelElement(panel, '[data-dwar-log-list]', HTMLElement)
  };
}

function queryPanelElement<TElement extends Element>(
  panel: HTMLElement,
  selector: string,
  constructor: new () => TElement
): TElement {
  const element = panel.querySelector(selector);

  if (!(element instanceof constructor)) {
    throw new Error(`Bot panel element is missing: ${selector}`);
  }

  return element;
}

