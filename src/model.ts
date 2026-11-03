import type { SceneId } from './scenes';

export type Lang = 'zh' | 'en';

/** A piece of text kept in both languages. `src` is the language it was typed in. */
export interface L10n {
  zh: string;
  en: string;
  src: Lang;
}

export interface Subtask {
  id: string;
  title: L10n;
  done: boolean;
  doneAt?: number;
  /** execution points granted for checking it off (taken back if unchecked) */
  award?: number;
}

export type Level3 = 1 | 2 | 3;

/** high / low / not urgent */
export type Urgency = 'high' | 'low' | 'none';
const URGENCY_RANK: Record<Urgency, number> = { high: 2, low: 1, none: 0 };

export interface Task {
  id: string;
  scene: SceneId;
  title: L10n;
  desc: L10n;
  urgency: Urgency;
  /** due date as a local calendar date, e.g. "2026-11-05" (optional) */
  due?: string;
  importance: Level3;
  difficulty: Level3;
  reward: Level3;
  private: boolean;
  subtasks: Subtask[];
  createdAt: number;
  updatedAt: number;
  done: boolean;
  doneAt?: number;
  award?: number;
  /** the one-off "split" bonus has been given */
  splitAwarded?: boolean;
  /** some text still waits for translation */
  needsTr?: boolean;
}

export interface DayActivity {
  t?: number; // whole tasks completed
  s?: number; // subtasks completed
}

export interface Stats {
  exec: number;
  growth: number;
  streak: number;
  lastOpen?: string;
  addDay?: string;
  addCount?: number;
  activity: Record<string, DayActivity>;
}

export type Reason = 'complete' | 'uncomplete' | 'sub' | 'unsub' | 'split' | 'open' | 'add' | 'streak';

export interface LogEntry {
  id?: string;
  ts: number;
  kind: 'exec' | 'growth';
  amount: number;
  reason: Reason;
  /** null for private tasks, so nothing private ends up in the public log */
  title: L10n | null;
}

export interface OwnerSettings {
  deanPhone?: string;
  deanMsg?: string;
  deanRemind?: string;
  pcShortcut?: string;
}

export const EMPTY_STATS: Stats = { exec: 0, growth: 0, streak: 0, activity: {} };

export const POINTS = {
  split: 2,
  sub: 3,
  complete: { 1: 10, 2: 20, 3: 40 } as Record<Level3, number>,
  open: 5,
  add: 2,
  addDailyMax: 5,
  streakEvery: 7,
  streakBonus: 20,
};

/** Points needed to *reach* a level: Lv1 = 0, Lv2 = 50, Lv3 = 150, Lv4 = 300 … (n × 50 per step). */
export const levelStart = (level: number) => 25 * level * (level - 1);

export function levelOf(points: number) {
  let level = 1;
  while (levelStart(level + 1) <= points) level++;
  const start = levelStart(level);
  const next = levelStart(level + 1);
  return { level, start, next, into: points - start, span: next - start };
}

const TITLES: { from: number; zh: string; en: string }[] = [
  { from: 15, zh: '领主', en: 'Lord' },
  { from: 10, zh: '骑士', en: 'Knight' },
  { from: 5, zh: '工匠', en: 'Artisan' },
  { from: 1, zh: '学徒', en: 'Apprentice' },
];
export const titleOf = (level: number, lang: Lang) => TITLES.find((t) => level >= t.from)![lang];

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day, e.g. "d20261031". */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `d${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
export function dayKeyOffset(days: number, from = Date.now()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return dayKey(d.getTime());
}

export const txt = (t: L10n | null | undefined, lang: Lang) => (t ? t[lang] || t[t.src] || t.zh || t.en : '');

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Today's date as "YYYY-MM-DD" (local time), the format used for due dates. */
export function isoDate(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from today until the due date: 0 = due today, negative = overdue, null = no due date. */
export function daysLeft(due: string | undefined, now = Date.now()): number | null {
  if (!due) return null;
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date(now);
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86400000);
}

export const ALERT_DAYS = 3;

/** Shown on the town map: not done, urgency "high", and due within 3 days (or already overdue). */
export function needsAlert(t: Task, now = Date.now()) {
  if (t.done || t.urgency !== 'high') return false;
  const left = daysLeft(t.due, now);
  return left !== null && left <= ALERT_DAYS;
}

/** Default order: more urgent first, then nearest due date, then important, high reward, easy, newest. */
export function sortTasks(list: Task[]) {
  const dueRank = (t: Task) => daysLeft(t.due) ?? Number.POSITIVE_INFINITY;
  return [...list].sort(
    (a, b) =>
      URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency] ||
      dueRank(a) - dueRank(b) ||
      b.importance - a.importance ||
      b.reward - a.reward ||
      a.difficulty - b.difficulty ||
      b.createdAt - a.createdAt,
  );
}

export interface BackupData {
  app: 'hogwarts';
  version: 1;
  exportedAt: number;
  tasks: Task[];
  stats: Stats;
  log: LogEntry[];
  settings: OwnerSettings;
}
