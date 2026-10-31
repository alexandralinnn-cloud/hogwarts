import type { BackupData, LogEntry, OwnerSettings, Stats, Task } from '../model';

/** One change to save. A group of these is saved together (all or nothing). */
export type Op =
  | { t: 'task'; task: Task }
  | { t: 'del'; id: string }
  | { t: 'pts'; kind: 'exec' | 'growth'; by: number }
  | { t: 'act'; day: string; k: 't' | 's'; by: number }
  | { t: 'stats'; patch: Partial<Omit<Stats, 'activity' | 'exec' | 'growth'>> }
  | { t: 'log'; entry: LogEntry };

export type Mode = 'firebase' | 'demo' | 'local';

export interface Snapshot {
  mode: Mode;
  /** first data has arrived */
  ready: boolean;
  /** stats confirmed by the server (not only from the offline copy) */
  statsFresh: boolean;
  tasks: Task[];
  stats: Stats;
  log: LogEntry[];
  settings: OwnerSettings;
  isOwner: boolean;
  userEmail: string | null;
  error: string | null;
}

export interface Store {
  get(): Snapshot;
  subscribe(cb: (s: Snapshot) => void): () => void;
  commit(ops: Op[]): Promise<void>;
  saveSettings(s: OwnerSettings): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  replaceAll(data: BackupData): Promise<void>;
}

/** Applies a group of changes to a plain copy of the data (used by the offline/demo store). */
export function applyOps(s: Pick<Snapshot, 'tasks' | 'stats' | 'log'>, ops: Op[]) {
  let tasks = s.tasks;
  const stats = { ...s.stats, activity: { ...s.stats.activity } };
  let log = s.log;
  for (const op of ops) {
    switch (op.t) {
      case 'task':
        tasks = tasks.some((x) => x.id === op.task.id)
          ? tasks.map((x) => (x.id === op.task.id ? op.task : x))
          : [...tasks, op.task];
        break;
      case 'del':
        tasks = tasks.filter((x) => x.id !== op.id);
        break;
      case 'pts':
        stats[op.kind] = (stats[op.kind] || 0) + op.by;
        break;
      case 'act': {
        const d = { ...(stats.activity[op.day] || {}) };
        d[op.k] = (d[op.k] || 0) + op.by;
        stats.activity[op.day] = d;
        break;
      }
      case 'stats':
        Object.assign(stats, op.patch);
        break;
      case 'log':
        log = [{ ...op.entry, id: op.entry.id || String(op.entry.ts) + Math.random() }, ...log].slice(0, 60);
        break;
    }
  }
  return { tasks, stats, log };
}
