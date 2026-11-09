import {
  ALERT_DAYS,
  dayKey,
  dayKeyOffset,
  daysLeft,
  newId,
  POINTS,
  titleOf,
  type L10n,
  type Level3,
  type LogEntry,
  type Reason,
  type Subtask,
  type Task,
  type Urgency,
} from './model';
import type { SceneId } from './scenes';
import type { Op, Store } from './store/types';
import { flushDeanQueue, notifyDean, type DeanEvent } from './notify';
import { needsTranslation, prepareText, translateText } from './translate';

/** What happened, so the screen can explain the points and cheer you on. */
export type Cheer =
  | { type: 'open'; streak: number; bonus: boolean }
  | { type: 'complete'; title: L10n; difficulty: Level3 }
  | { type: 'hardSub'; title: L10n; sub: L10n };

export interface Gain {
  exec: number;
  growth: number;
  cheer?: Cheer;
}

/** Task name for messages to Dean (he reads English). */
const englishName = (t: Task) => t.title.en || t.title[t.title.src];

function dueInEnglish(due: string) {
  const [y, m, d] = due.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface TaskForm {
  title: string;
  desc: string;
  titleOther?: string;
  descOther?: string;
  scene: SceneId;
  urgency: Urgency;
  /** "YYYY-MM-DD" or empty for no due date */
  due: string;
  importance: Level3;
  difficulty: Level3;
  reward: Level3;
  private: boolean;
  subtasks?: string[];
}

const logOp = (kind: 'exec' | 'growth', amount: number, reason: Reason, task: Task | null): Op => ({
  t: 'log',
  entry: {
    ts: Date.now(),
    kind,
    amount,
    reason,
    title: task && !task.private ? task.title : null,
  } as LogEntry,
});

/** All rule logic lives here. Every action returns the points gained so the screen can celebrate. */
export class Actions {
  constructor(private store: Store) {}

  /** Our own latest copy of tasks we just changed, so quick taps never work on stale data. */
  private recent = new Map<string, Task | null>();

  private save(ops: Op[]) {
    for (const op of ops) {
      if (op.t === 'task') this.recent.set(op.task.id, op.task);
      if (op.t === 'del') this.recent.set(op.id, null);
    }
    // Not awaited: the screen updates at once, the server catches up (also works offline).
    this.store.commit(ops).catch((e) => console.error('save failed', e));
  }

  /** Sends Dean a message in the background (only if a ntfy channel is set in Settings). */
  private tellDean(ev: DeanEvent) {
    notifyDean(this.store.get().settings, ev).catch(() => {});
  }

  private task(id: string) {
    const stored = this.store.get().tasks.find((t) => t.id === id);
    if (!this.recent.has(id)) return stored;
    const mine = this.recent.get(id);
    if (mine === null) return undefined;
    return mine && (!stored || mine.updatedAt >= stored.updatedAt) ? mine : stored;
  }

  /** +5 growth for the first visit of the day, +20 every 7 days in a row. */
  dailyOpen(): Gain | null {
    const s = this.store.get();
    if (!s.isOwner) return null;
    const today = dayKey();
    const guard = 'hogwarts-open-' + today;
    if (s.stats.lastOpen === today || localStorage.getItem(guard)) return null;
    localStorage.setItem(guard, '1');
    const streak = s.stats.lastOpen === dayKeyOffset(-1) ? (s.stats.streak || 0) + 1 : 1;
    const ops: Op[] = [
      { t: 'pts', kind: 'growth', by: POINTS.open },
      { t: 'stats', patch: { lastOpen: today, streak } },
      logOp('growth', POINTS.open, 'open', null),
    ];
    let growth = POINTS.open;
    const bonus = streak % POINTS.streakEvery === 0;
    if (bonus) {
      ops.push({ t: 'pts', kind: 'growth', by: POINTS.streakBonus }, logOp('growth', POINTS.streakBonus, 'streak', null));
      growth += POINTS.streakBonus;
    }
    this.save(ops);
    flushDeanQueue().catch(() => {});
    return { exec: 0, growth, cheer: { type: 'open', streak, bonus } };
  }

  /** Tells Dean about a new level, once per level (undo + redo does not repeat it). */
  notifyLevelUp(kind: 'exec' | 'growth', level: number) {
    const s = this.store.get();
    if (!s.isOwner) return;
    const told = s.stats.lvNotified?.[kind] ?? 0;
    if (level <= told) return;
    this.save([{ t: 'stats', patch: { lvNotified: { ...s.stats.lvNotified, [kind]: level } } }]);
    this.tellDean({ kind: 'level', stat: kind === 'exec' ? 'Drive' : 'Growth', level, title: titleOf(level, 'en') });
  }

  async createTask(f: TaskForm): Promise<{ gain: Gain; id: string }> {
    const s = this.store.get();
    const now = Date.now();
    const subs = (f.subtasks || []).map((x) => x.trim()).filter(Boolean);
    const task: Task = {
      id: newId(),
      scene: f.scene,
      title: await prepareText(f.title, undefined, f.titleOther),
      desc: await prepareText(f.desc, undefined, f.descOther),
      urgency: f.urgency,
      due: f.due || undefined,
      importance: f.importance,
      difficulty: f.difficulty,
      reward: f.reward,
      private: f.private,
      subtasks: await Promise.all(
        subs.map(async (x) => ({ id: newId(), title: await prepareText(x), done: false }) as Subtask),
      ),
      createdAt: now,
      updatedAt: now,
      done: false,
    };
    const gain: Gain = { exec: 0, growth: 0 };
    const ops: Op[] = [];
    const today = dayKey();
    const addedToday = s.stats.addDay === today ? s.stats.addCount || 0 : 0;
    if (addedToday < POINTS.addDailyMax) {
      ops.push({ t: 'pts', kind: 'growth', by: POINTS.add }, logOp('growth', POINTS.add, 'add', task));
      gain.growth += POINTS.add;
    }
    ops.push({ t: 'stats', patch: { addDay: today, addCount: addedToday + 1 } });
    if (task.subtasks.length) {
      task.splitAwarded = true;
      ops.push({ t: 'pts', kind: 'exec', by: POINTS.split }, logOp('exec', POINTS.split, 'split', task));
      gain.exec += POINTS.split;
    }
    task.needsTr = hasPending(task);
    ops.unshift({ t: 'task', task });
    this.save(ops);
    const translated = this.translateLater(task.id);
    // A new high-urgency task due within 3 days: tell Dean (after the English name is ready).
    const left = daysLeft(task.due);
    if (task.urgency === 'high' && task.due && left !== null && left <= ALERT_DAYS && !task.private) {
      translated.finally(() => {
        const latest = this.task(task.id) ?? task;
        this.tellDean({ kind: 'urgent', task: englishName(latest), due: dueInEnglish(task.due!) });
      });
    }
    return { gain, id: task.id };
  }

  async editTask(id: string, f: TaskForm) {
    const old = this.task(id);
    if (!old) return;
    const task: Task = {
      ...old,
      scene: f.scene,
      title: await prepareText(f.title, old.title, f.titleOther),
      desc: await prepareText(f.desc, old.desc, f.descOther),
      urgency: f.urgency,
      due: f.due || undefined,
      importance: f.importance,
      difficulty: f.difficulty,
      reward: f.reward,
      private: f.private,
      updatedAt: Date.now(),
    };
    task.needsTr = hasPending(task);
    this.save([{ t: 'task', task }]);
    this.translateLater(id);
  }

  setPrivate(id: string, value: boolean) {
    const t = this.task(id);
    if (t) this.save([{ t: 'task', task: { ...t, private: value, updatedAt: Date.now() } }]);
  }

  /** Deleting a task keeps the points already earned. */
  deleteTask(id: string) {
    this.save([{ t: 'del', id }]);
  }

  toggleComplete(id: string): Gain {
    const t = this.task(id);
    if (!t) return { exec: 0, growth: 0 };
    if (!t.done) {
      const award = POINTS.complete[t.difficulty];
      const now = Date.now();
      const task: Task = { ...t, done: true, doneAt: now, award, updatedAt: now };
      // Finishing a hard (困难) task that is not private: tell Dean, once per task.
      const tell = t.difficulty === 3 && !t.private && !t.notifiedDone;
      if (tell) task.notifiedDone = true;
      this.save([
        { t: 'task', task },
        { t: 'pts', kind: 'exec', by: award },
        { t: 'act', day: dayKey(now), k: 't', by: 1 },
        logOp('exec', award, 'complete', task),
      ]);
      if (tell) this.tellDean({ kind: 'hard', task: englishName(t) });
      return { exec: award, growth: 0, cheer: { type: 'complete', title: t.title, difficulty: t.difficulty } };
    }
    const back = t.award || 0;
    const task: Task = { ...t, done: false, doneAt: undefined, award: undefined, updatedAt: Date.now() };
    const ops: Op[] = [{ t: 'task', task }];
    if (back) ops.push({ t: 'pts', kind: 'exec', by: -back }, logOp('exec', -back, 'uncomplete', task));
    if (t.doneAt) ops.push({ t: 'act', day: dayKey(t.doneAt), k: 't', by: -1 });
    this.save(ops);
    return { exec: -back, growth: 0 };
  }

  /** The first time a task is split it earns +2 (only once per task). */
  async addSubtask(id: string, text: string): Promise<Gain> {
    const t = this.task(id);
    if (!t || !text.trim()) return { exec: 0, growth: 0 };
    const sub: Subtask = { id: newId(), title: await prepareText(text), done: false };
    const task: Task = { ...t, subtasks: [...t.subtasks, sub], updatedAt: Date.now() };
    const ops: Op[] = [];
    let exec = 0;
    if (!t.splitAwarded) {
      task.splitAwarded = true;
      exec = POINTS.split;
      ops.push({ t: 'pts', kind: 'exec', by: exec }, logOp('exec', exec, 'split', task));
    }
    task.needsTr = hasPending(task);
    ops.unshift({ t: 'task', task });
    this.save(ops);
    this.translateLater(id);
    return { exec, growth: 0 };
  }

  toggleSubtask(id: string, subId: string): Gain {
    const t = this.task(id);
    const sub = t?.subtasks.find((x) => x.id === subId);
    if (!t || !sub) return { exec: 0, growth: 0 };
    const now = Date.now();
    let next: Subtask;
    const ops: Op[] = [];
    let exec: number;
    if (!sub.done) {
      exec = POINTS.sub;
      next = { ...sub, done: true, doneAt: now, award: exec };
      ops.push({ t: 'pts', kind: 'exec', by: exec }, { t: 'act', day: dayKey(now), k: 's', by: 1 });
      ops.push(logOp('exec', exec, 'sub', t));
    } else {
      exec = -(sub.award || 0);
      next = { ...sub, done: false, doneAt: undefined, award: undefined };
      if (exec) ops.push({ t: 'pts', kind: 'exec', by: exec }, logOp('exec', exec, 'unsub', t));
      if (sub.doneAt) ops.push({ t: 'act', day: dayKey(sub.doneAt), k: 's', by: -1 });
    }
    const task: Task = { ...t, subtasks: t.subtasks.map((x) => (x.id === subId ? next : x)), updatedAt: now };
    ops.unshift({ t: 'task', task });
    this.save(ops);
    // a step of a hard task gets its own cheer window
    const cheer: Cheer | undefined = !sub.done && t.difficulty === 3 ? { type: 'hardSub', title: t.title, sub: sub.title } : undefined;
    return { exec, growth: 0, cheer };
  }

  /** Saves edited step names and a new step order (no points change). */
  async editSubtasks(id: string, items: { id: string; text: string }[]) {
    const t = this.task(id);
    if (!t) return;
    const byId = new Map(t.subtasks.map((x) => [x.id, x]));
    const ordered: Subtask[] = [];
    for (const it of items) {
      const sub = byId.get(it.id);
      if (!sub) continue;
      byId.delete(it.id);
      const text = it.text.trim();
      ordered.push(text && text !== sub.title[sub.title.src] ? { ...sub, title: await prepareText(text, sub.title) } : sub);
    }
    const latest = this.task(id) ?? t;
    // steps added meanwhile (not in the edited list) stay at the end
    const extra = latest.subtasks.filter((x) => byId.has(x.id));
    const task: Task = { ...latest, subtasks: [...ordered, ...extra], updatedAt: Date.now() };
    task.needsTr = hasPending(task);
    this.save([{ t: 'task', task }]);
    this.translateLater(id);
  }

  /** Deleting a ticked step takes its +3 back (so steps can't be farmed). */
  deleteSubtask(id: string, subId: string): Gain {
    const t = this.task(id);
    const sub = t?.subtasks.find((x) => x.id === subId);
    if (!t || !sub) return { exec: 0, growth: 0 };
    const task: Task = { ...t, subtasks: t.subtasks.filter((x) => x.id !== subId), updatedAt: Date.now() };
    const ops: Op[] = [{ t: 'task', task }];
    const back = sub.done ? sub.award || 0 : 0;
    if (back) ops.push({ t: 'pts', kind: 'exec', by: -back }, logOp('exec', -back, 'unsub', t));
    if (sub.done && sub.doneAt) ops.push({ t: 'act', day: dayKey(sub.doneAt), k: 's', by: -1 });
    this.save(ops);
    return { exec: -back, growth: 0 };
  }

  // ----- translation -----

  private pending = new Set<string>();

  /** Translates whatever is missing in a task, in the background. Failures are retried on the next visit. */
  async translateLater(id: string) {
    if (this.pending.has(id)) return;
    this.pending.add(id);
    try {
      const t = this.task(id);
      if (!t || !hasPending(t)) return;
      const title = await translateText(t.title);
      const desc = await translateText(t.desc);
      const subs = await Promise.all(t.subtasks.map(async (s) => ({ id: s.id, title: await translateText(s.title) })));
      const latest = this.task(id);
      if (!latest) return;
      const pick = (now: L10n, before: L10n, done: L10n | null) =>
        done && now[now.src] === before[before.src] && now.src === before.src ? done : now;
      const task: Task = {
        ...latest,
        title: pick(latest.title, t.title, title),
        desc: pick(latest.desc, t.desc, desc),
        subtasks: latest.subtasks.map((s) => {
          const done = subs.find((x) => x.id === s.id)?.title;
          const before = t.subtasks.find((x) => x.id === s.id)?.title;
          return before && done ? { ...s, title: pick(s.title, before, done) } : s;
        }),
      };
      task.needsTr = hasPending(task);
      if (JSON.stringify(task) !== JSON.stringify(latest)) this.save([{ t: 'task', task }]);
    } finally {
      this.pending.delete(id);
    }
  }

  retryTranslations() {
    const s = this.store.get();
    if (!s.isOwner) return;
    s.tasks.filter((t) => t.needsTr || hasPending(t)).forEach((t) => this.translateLater(t.id));
  }
}

function hasPending(t: Task) {
  return needsTranslation(t.title) || needsTranslation(t.desc) || t.subtasks.some((s) => needsTranslation(s.title));
}
