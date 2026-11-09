import { useLayoutEffect, useRef } from 'preact/hooks';
import { useApp } from '../app';
import { dayKey, levelOf, titleOf, txt, type LogEntry } from '../model';
import type { StrKey } from '../i18n';
import { Icon } from './Icon';

const WEEKS = 53;
const REASON: Record<LogEntry['reason'], StrKey> = {
  complete: 'rComplete',
  uncomplete: 'rUncomplete',
  sub: 'rSub',
  unsub: 'rUnsub',
  split: 'rSplit',
  open: 'rOpen',
  add: 'rAdd',
  streak: 'rStreak',
};

export function Growth() {
  const { snap, t, lang } = useApp();
  const { stats } = snap;
  const done = snap.tasks.filter((x) => x.done).length;

  return (
    <div class="page">
      <h2 class="ptitle">{t('growthTitle')}</h2>
      <div class="card pdark">
        {(['exec', 'growth'] as const).map((kind) => {
          const lv = levelOf(stats[kind] || 0);
          return (
            <div class="lv" key={kind}>
              <div class={`lvbadge ${kind}`}>{lv.level}</div>
              <div class="lvt">
                <b>
                  {t(kind)} · {titleOf(lv.level, lang)}
                </b>
                <div class={`bar big num ${kind === 'growth' ? 'g' : ''}`}>
                  <i style={{ width: `${(lv.into / lv.span) * 100}%` }} />
                  <span class="barnum">
                    {lv.into}/{lv.span}
                  </span>
                </div>
                <small>
                  {t('toNext', { n: lv.next - (stats[kind] || 0), l: lv.level + 1 })}　{t('total', { n: stats[kind] || 0 })}
                </small>
              </div>
            </div>
          );
        })}
        <div class="gfoot">
          <span>
            <Icon name="fire" size={12} /> {t('streak', { n: stats.streak || 0 })}
          </span>
          <span>{lang === 'en' && done === 1 ? '1 task completed' : t('tasksDone', { n: done })}</span>
        </div>
      </div>
      <Heatmap />
      <div class="card pdark">
        <div class="ct">{t('recent')}</div>
        {snap.log.length === 0 && <div class="empty light">{t('noLog')}</div>}
        {snap.log.slice(0, 30).map((e) => (
          <div class="lg" key={e.id}>
            <b class={e.amount < 0 ? 'neg' : e.kind}>
              {e.amount > 0 ? '+' : ''}
              {e.amount}
            </b>
            <span>{t(REASON[e.reason], { t: e.title ? txt(e.title, lang) : t('privateTask') })}</span>
            <small>{when(e.ts, t)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function when(ts: number, t: (k: StrKey) => string) {
  const k = dayKey(ts);
  if (k === dayKey()) return t('today');
  if (k === dayKey(Date.now() - 86400000)) return t('yesterday');
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const COL = 12; // 9px square + 3px gap

/** One year of lit days as small plain squares (weeks are columns, Monday on top). Swipe to see earlier months. */
function Heatmap() {
  const { snap, t, lang } = useApp();
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (box.current) box.current.scrollLeft = box.current.scrollWidth;
  }, []);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(start.getDate() - mondayOffset - (WEEKS - 1) * 7);
  const todayKey = dayKey();
  const cells: { key: string; cls: string }[] = [];
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      if ((w === 0 && d === 0) || day.getDate() === 1) {
        const m = day.getMonth();
        const label = lang === 'zh' ? `${m + 1}月` : day.toLocaleString('en-GB', { month: 'short' });
        if (months[months.length - 1]?.col === w) months[months.length - 1].label = label;
        else months.push({ col: w, label });
      }
      const k = dayKey(day.getTime());
      const a = snap.stats.activity[k];
      const cls = day > today ? 'fut' : (a?.t || 0) > 0 ? 'full' : (a?.s || 0) > 0 ? 'half' : '';
      cells.push({ key: k, cls: cls + (k === todayKey ? ' today' : '') });
    }
  }

  return (
    <div class="card pdark">
      <div class="ct">{t('heatmap')}</div>
      <div class="hmwrap" ref={box}>
        <div class="hm-m sticky" style={{ width: WEEKS * COL }}>
          {/* each month label sticks to the left edge while its weeks are on screen */}
          {months.map((m, i) => (
            <div key={m.col} class="mseg" style={{ width: ((months[i + 1]?.col ?? WEEKS) - m.col) * COL }}>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <div class="hm" style={{ width: WEEKS * COL }}>
          {cells.map((c) => (
            <i key={c.key} class={c.cls} />
          ))}
        </div>
      </div>
      <div class="legend">
        <i />
        {t('legendNone')}
        <i class="half" />
        {t('legendHalf')}
        <i class="full" />
        {t('legendFull')}
      </div>
    </div>
  );
}
