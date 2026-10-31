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

export interface Task {
  id: string;
  scene: SceneId;
  title: L10n;
  desc: L10n;
  urgency: 'high' | 'low';
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

export const isUrgentOpen = (t: Task) => !t.done && t.urgency === 'high';

/** Default order inside a list: urgent first, then important, then high reward, then easy, then newest. */
export function sortTasks(list: Task[]) {
  return [...list].sort(
    (a, b) =>
      Number(b.urgency === 'high') - Number(a.urgency === 'high') ||
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
