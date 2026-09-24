/** The live save + debounced persistence. All game code mutates progress through `store.update`. */
import type { SaveData } from './core/progress';
import { writeSave } from './storage/db';

type Listener = (s: SaveData) => void;

class Store {
  private s!: SaveData;
  private timer: number | null = null;
  private listeners = new Set<Listener>();

  init(save: SaveData) {
    this.s = save;
  }

  get save(): SaveData {
    return this.s;
  }

  update(fn: (s: SaveData) => SaveData) {
    this.s = fn(this.s);
    for (const l of this.listeners) l(this.s);
    this.schedule();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private schedule() {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void writeSave(this.s);
    }, 400);
  }

  /** Write immediately (page hide, end of day). */
  async flush() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await writeSave(this.s);
  }
}

export const store = new Store();
