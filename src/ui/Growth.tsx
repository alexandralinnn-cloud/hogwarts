import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app';
import { dayKey, levelOf, titleOf, txt, type LogEntry } from '../model';
import type { StrKey } from '../i18n';
import { Icon } from './Icon';

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

const HM_WEEKS = 13; // about 3 months
const GAP = 3;

/** The last 3 months of lit days as plain squares (weeks are columns, Monday on top), filling the card width. */
function Heatmap() {
  const { snap, t, lang } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const col = width ? Math.floor((width + GAP) / HM_WEEKS) : 0;
  const cell = col - GAP;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(start.getDate() - mondayOffset - (HM_WEEKS - 1) * 7);
  const todayKey = dayKey();
  const cells: { key: string; cls: string }[] = [];
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < HM_WEEKS; w++) {
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
  // a month name that would sit on top of the next one is dropped (only the first column can be that short)
  const shown = months.filter((m, i) => (months[i + 1]?.col ?? HM_WEEKS) - m.col >= 2 || i === months.length - 1);

  return (
    <div class="card pdark">
      <div class="ct">{t('heatmap')}</div>
      <div class="hm3" ref={box}>
        {col > 0 && (
          <>
            <div class="hm-m">
              {shown.map((m) => (
                <span key={m.col} style={{ left: m.col * col }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div class="hm" style={{ gap: GAP, gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoColumns: `${cell}px` }}>
              {cells.map((c) => (
                <i key={c.key} class={c.cls} style={{ width: cell, height: cell }} />
              ))}
            </div>
          </>
        )}
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
