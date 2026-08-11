import {
  concat,
  defer,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  timer,
  Observable
} from 'rxjs';
import type {
  MainChatHtmlObserveOptions,
  MainChatHtmlReader
} from '../../application/ports/main-chat-html-reader';
import { findInAccessibleWindowTree } from './accessible-window-tree';

const CHAT_FRAME_SEARCH_INTERVAL_MS = 500;

export class BrowserMainChatHtmlReader implements MainChatHtmlReader {
  observe(options: MainChatHtmlObserveOptions = {}): Observable<string> {
    const includeCurrent = options.includeCurrent ?? true;

    return defer(() => concat(
      of(findInAccessibleWindowTree(window, readMainChatBuffer)),
      timer(CHAT_FRAME_SEARCH_INTERVAL_MS, CHAT_FRAME_SEARCH_INTERVAL_MS).pipe(
        map(() => findInAccessibleWindowTree(window, readMainChatBuffer))
      )
    )).pipe(
      filter((buffer): buffer is Node => buffer !== null),
      distinctUntilChanged(),
      switchMap((buffer) => observeChatBuffer(buffer, includeCurrent))
    );
  }
}

function readMainChatBuffer(candidate: Window): Node | null {
  let chatOptions: unknown;

  try {
    chatOptions = (candidate as unknown as Record<string, unknown>).chatOpts;
  } catch {
    return null;
  }

  if (!isRecord(chatOptions)) {
    return null;
  }

  const mainChatOptions = chatOptions.main;

  if (!isRecord(mainChatOptions)) {
    return null;
  }

  return readFirstNode(mainChatOptions.data);
}

function readFirstNode(value: unknown): Node | null {
  if (!isRecord(value)) {
    return null;
  }

  let firstValue = value[0];
  const get = value.get;

  if (firstValue === undefined && typeof get === 'function') {
    try {
      firstValue = get.call(value, 0);
    } catch {
      return null;
    }
  }

  return isNode(firstValue) ? firstValue : null;
}

function observeChatBuffer(buffer: Node, includeCurrent: boolean): Observable<string> {
  return new Observable<string>((subscriber) => {
    const emittedNodes = new WeakSet<Node>();

    const emitNode = (node: Node): void => {
      if (isElementNode(node)) {
        if (!emittedNodes.has(node)) {
          emittedNodes.add(node);
          subscriber.next(node.outerHTML);
        }

        return;
      }

      for (const childNode of Array.from(node.childNodes)) {
        emitNode(childNode);
      }
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const addedNode of Array.from(record.addedNodes)) {
          emitNode(addedNode);
        }
      }
    });

    observer.observe(buffer, { childList: true });

    if (includeCurrent) {
      for (const childNode of Array.from(buffer.childNodes)) {
        emitNode(childNode);
      }
    }

    return () => {
      observer.disconnect();
    };
  });
}

function isNode(value: unknown): value is Node {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.nodeType === 'number'
    && typeof value.nodeName === 'string'
    && isRecord(value.childNodes);
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === 1 && typeof (node as Element).outerHTML === 'string';
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}
