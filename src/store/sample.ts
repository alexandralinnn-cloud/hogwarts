import { dayKeyOffset, isoDate, type L10n, type LogEntry, type Stats, type Task } from '../model';
import type { SceneId } from '../scenes';

const T = (zh: string, en: string): L10n => ({ zh, en, src: 'zh' });
const DAY = 86400000;
const inDays = (n: number) => isoDate(Date.now() + n * DAY);
let n = 0;

function task(
  scene: SceneId,
  title: L10n,
  o: Partial<Task> & { subs?: [string, string, boolean][] } = {},
): Task {
  const now = Date.now();
  const { subs = [], ...rest } = o;
  return {
    id: `sample${++n}`,
    scene,
    title,
    desc: T('', ''),
    urgency: 'low',
    importance: 2,
    difficulty: 2,
    reward: 2,
    private: false,
    subtasks: subs.map(([zh, en, done], i) => ({
      id: `s${n}_${i}`,
      title: T(zh, en),
      done,
      doneAt: done ? now - DAY : undefined,
      award: done ? 3 : undefined,
    })),
    createdAt: now - n * DAY,
    updatedAt: now,
    done: false,
    splitAwarded: subs.length > 0,
    ...rest,
  };
}

/** Example tasks shown before the database is connected. */
export function sampleTasks(): Task[] {
  n = 0;
  return [
    task('library', T('搞懂强积金该怎么选基金', 'Figure out how to choose MPF funds'), {
      urgency: 'high', due: inDays(2), importance: 3, difficulty: 2, reward: 3,
      desc: T('公司下个月要我确认基金组合，想先弄清楚风险和收费再选。', 'Work wants my fund choice next month. I want to understand risk and fees first.'),
      subs: [
        ['找到强积金账户的登录方式', 'Find how to log in to the MPF account', true],
        ['列出现在持有的基金和收费', 'List current funds and their fees', false],
        ['看 3 篇基金对比文章', 'Read 3 fund comparison articles', false],
        ['决定新组合并提交', 'Decide the new mix and submit it', false],
      ],
    }),
    task('library', T('读完《思考，快与慢》第 3 章', 'Finish chapter 3 of "Thinking, Fast and Slow"'), {
      importance: 2, difficulty: 1, reward: 2,
      subs: [
        ['读前半章', 'Read the first half', true],
        ['读后半章', 'Read the second half', true],
        ['写三句笔记', 'Write three lines of notes', false],
      ],
    }),
    task('library', T('了解猫为什么会打呼噜', 'Learn why cats purr'), { importance: 1, difficulty: 1, reward: 1 }),
    task('clinic', T('预约洗牙', 'Book a dental cleaning'), { urgency: 'high', due: inDays(10), importance: 2, difficulty: 1, reward: 2 }),
    task('clinic', T('每周去游泳一次', 'Swim once a week'), { importance: 3, difficulty: 2, reward: 3 }),
    task('market', T('买一台小打印机', 'Buy a small printer'), { importance: 2, difficulty: 1, reward: 3 }),
    task('market', T('给书桌添一盏台灯', 'Get a desk lamp'), { urgency: 'none', importance: 1, difficulty: 1, reward: 2 }),
    task('guild', T('帮妈妈设置新手机', "Set up Mum's new phone"), {
      urgency: 'high', due: inDays(1), importance: 3, difficulty: 1, reward: 3,
    }),
    task('tavern', T('约朋友周末去行山', 'Plan a weekend hike with friends'), { urgency: 'none', importance: 1, difficulty: 1, reward: 3 }),
    task('farm', T('每天练习英文口语 10 分钟', 'Practise spoken English 10 minutes a day'), {
      importance: 3, difficulty: 2, reward: 3,
    }),
    task('dock', T('写下最近让我烦心的三件事', 'Write down three things bothering me lately'), {
      importance: 2, difficulty: 2, reward: 3,
    }),
    task('market', T('整理衣柜', 'Tidy the wardrobe'), {
      done: true, doneAt: Date.now() - 2 * 3600000, award: 20, importance: 2, difficulty: 2, reward: 2,
    }),
  ];
}

export function sampleStats(): Stats {
  const activity: Stats['activity'] = {};
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 180; i++) {
    const r = rnd();
    const recent = i < 50;
    if (r < (recent ? 0.45 : 0.25)) activity[dayKeyOffset(-i)] = { t: 1 };
    else if (r < (recent ? 0.7 : 0.45)) activity[dayKeyOffset(-i)] = { s: 1 };
  }
  return { exec: 243, growth: 560, streak: 12, activity };
}

export function sampleLog(): LogEntry[] {
  const now = Date.now();
  return [
    { ts: now - 3600000, kind: 'exec', amount: 20, reason: 'complete', title: T('整理衣柜', 'Tidy the wardrobe') },
    { ts: now - 5000000, kind: 'exec', amount: 3, reason: 'sub', title: T('搞懂强积金该怎么选基金', 'Figure out how to choose MPF funds') },
    { ts: now - 6000000, kind: 'growth', amount: 5, reason: 'open', title: null },
    { ts: now - DAY, kind: 'exec', amount: 2, reason: 'split', title: T('搞懂强积金该怎么选基金', 'Figure out how to choose MPF funds') },
    { ts: now - DAY - 1000, kind: 'growth', amount: 2, reason: 'add', title: T('买一台小打印机', 'Buy a small printer') },
  ].map((e, i) => ({ ...e, kind: e.kind as 'exec' | 'growth', reason: e.reason as LogEntry['reason'], id: `l${i}` }));
}
