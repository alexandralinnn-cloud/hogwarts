import { EMPTY_STATS, type BackupData, type OwnerSettings } from '../model';
import { sampleLog, sampleStats, sampleTasks } from './sample';
import { applyOps, type Op, type Snapshot, type Store } from './types';

const KEY = 'hogwarts-local-v1';

/**
 * Store used before the database is connected.
 * - "demo": read-only example data (what visitors see until Firebase is set up)
 * - "local": editable, saved only in this browser (for testing)
 */
export class LocalStore implements Store {
  private snap: Snapshot;
  private subs = new Set<(s: Snapshot) => void>();

  constructor(private mode: 'demo' | 'local') {
    const saved = mode === 'local' ? load() : null;
    this.snap = {
      mode,
      ready: true,
      statsFresh: true,
      tasks: saved?.tasks ?? sampleTasks(),
      stats: saved?.stats ?? (mode === 'local' ? { ...EMPTY_STATS, ...sampleStats(), lastOpen: undefined } : sampleStats()),
      log: saved?.log ?? sampleLog(),
      settings: saved?.settings ?? {},
      isOwner: mode === 'local',
      userEmail: null,
      error: null,
    };
  }

  get() {
    return this.snap;
  }

  subscribe(cb: (s: Snapshot) => void) {
    this.subs.add(cb);
    cb(this.snap);
    return () => void this.subs.delete(cb);
  }

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    if (this.mode === 'local') {
      const { tasks, stats, log, settings } = this.snap;
      localStorage.setItem(KEY, JSON.stringify({ tasks, stats, log, settings }));
    }
    this.subs.forEach((cb) => cb(this.snap));
  }

  async commit(ops: Op[]) {
    if (!this.snap.isOwner) return;
    this.set(applyOps(this.snap, ops));
  }

  async saveSettings(settings: OwnerSettings) {
    if (!this.snap.isOwner) return;
    this.set({ settings: { ...this.snap.settings, ...settings } });
  }

  async login() {
    throw new Error('not-connected');
  }

  async logout() {}

  async replaceAll(d: BackupData) {
    if (!this.snap.isOwner) return;
    this.set({ tasks: d.tasks, stats: d.stats, log: d.log, settings: d.settings || {} });
  }
}

function load(): Pick<Snapshot, 'tasks' | 'stats' | 'log' | 'settings'> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
