export interface TabDefinition<TabId extends string> {
  id: TabId;
  label: string;
  panel: HTMLElement;
}

export interface TabsElements<TabId extends string> {
  root: HTMLElement;
  tabList: HTMLElement;
  buttons: ReadonlyMap<TabId, HTMLButtonElement>;
  panels: ReadonlyMap<TabId, HTMLElement>;
  getActiveTab(): TabId;
  selectTab(tabId: TabId): void;
  onActiveTabChange(listener: (tabId: TabId) => void): () => void;
}

export function createTabs<TabId extends string>(
  definitions: readonly TabDefinition<TabId>[],
  initialTabId: TabId
): TabsElements<TabId> {
  if (definitions.length === 0) {
    throw new Error('At least one tab is required.');
  }

  const root = document.createElement('div');
  root.className = 'dwar-tabs';

  const tabList = document.createElement('div');
  tabList.className = 'dwar-tabs__list';
  tabList.setAttribute('role', 'tablist');

  const panelsRoot = document.createElement('div');
  panelsRoot.className = 'dwar-tabs__panels';

  const buttons = new Map<TabId, HTMLButtonElement>();
  const panels = new Map<TabId, HTMLElement>();
  const activeTabListeners = new Set<(tabId: TabId) => void>();
  let activeTabId = initialTabId;

  const selectTab = (tabId: TabId): void => {
    if (!buttons.has(tabId)) {
      throw new Error(`Unknown tab: ${tabId}.`);
    }

    activeTabId = tabId;

    for (const [candidateId, button] of buttons) {
      const isActive = candidateId === activeTabId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      const panel = panels.get(candidateId);

      if (panel) {
        panel.hidden = !isActive;
      }
    }

    activeTabListeners.forEach((listener) => {
      listener(activeTabId);
    });
  };

  definitions.forEach((definition, index) => {
    const tabId = `dwar-tab-${definition.id}`;
    const panelId = `dwar-tab-panel-${definition.id}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = tabId;
    button.className = 'dwar-tabs__button';
    button.textContent = definition.label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);

    const panel = definition.panel;
    panel.id = panelId;
    panel.classList.add('dwar-tabs__panel');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);

    button.addEventListener('click', () => {
      selectTab(definition.id);
    });
    button.addEventListener('keydown', (event) => {
      const nextIndex = getNextTabIndex(event.key, index, definitions.length);

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      const nextDefinition = definitions[nextIndex];

      if (!nextDefinition) {
        return;
      }

      selectTab(nextDefinition.id);
      buttons.get(nextDefinition.id)?.focus();
    });

    buttons.set(definition.id, button);
    panels.set(definition.id, panel);
    tabList.append(button);
    panelsRoot.append(panel);
  });

  root.append(tabList, panelsRoot);
  selectTab(buttons.has(initialTabId) ? initialTabId : definitions[0]!.id);

  return {
    root,
    tabList,
    buttons,
    panels,
    getActiveTab(): TabId {
      return activeTabId;
    },
    selectTab,
    onActiveTabChange(listener: (tabId: TabId) => void): () => void {
      activeTabListeners.add(listener);

      return () => {
        activeTabListeners.delete(listener);
      };
    }
  };
}

function getNextTabIndex(key: string, currentIndex: number, tabCount: number): number | null {
  switch (key) {
    case 'ArrowLeft':
      return (currentIndex - 1 + tabCount) % tabCount;

    case 'ArrowRight':
      return (currentIndex + 1) % tabCount;

    case 'Home':
      return 0;

    case 'End':
      return tabCount - 1;

    default:
      return null;
  }
}
