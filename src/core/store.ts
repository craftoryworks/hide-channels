import { browser } from 'wxt/browser';
import { migrate } from './data';
import type { Data } from './types';

const KEY = 'hc_data';
const BACKUPS = 'hc_backups';

export async function load(): Promise<Data> {
  const r = await browser.storage.local.get(KEY);
  return migrate(r[KEY]);
}

export async function save(d: Data): Promise<void> {
  await browser.storage.local.set({ [KEY]: d });
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Read-modify-write on a fresh read. Calls from the same page (content script, popup, settings) run
 * one after another, so quick clicks can't overwrite each other. Two different pages writing in the
 * very same moment can still race; with human-speed clicks that is not a practical problem.
 */
export function update(fn: (d: Data) => void): Promise<Data> {
  const run = queue.then(async () => {
    const d = await load();
    fn(d);
    await save(d);
    return d;
  });
  queue = run.catch(() => {});
  return run;
}

export function watch(cb: (d: Data) => void): () => void {
  const l = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[KEY]) cb(migrate(changes[KEY].newValue));
  };
  browser.storage.onChanged.addListener(l);
  return () => browser.storage.onChanged.removeListener(l);
}

/** Keeps a copy of the list from before the last import. Best effort: never blocks the import. */
export async function backup(): Promise<void> {
  try {
    await browser.storage.local.set({ [BACKUPS]: [{ at: Date.now(), data: await load() }] });
  } catch {
    // e.g. storage quota: the import itself matters more than its backup
  }
}
