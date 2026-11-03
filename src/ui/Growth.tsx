import { useLayoutEffect, useRef, useState } from 'preact/hooks';
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
                <div class={`bar big ${kind === 'growth' ? 'g' : ''}`}>
                  <i style={{ width: `${(lv.into / lv.span) * 100}%` }} />
                </div>
                <small>
                  {stats[kind] || 0} / {lv.next}　{t('toNext', { n: lv.next - (stats[kind] || 0), l: lv.level + 1 })}
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

const WEEKS_ON_SCREEN = 5; // about one month
const GAP = 6;
const WEEKDAYS = { zh: ['一', '二', '三', '四', '五', '六', '日'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] };

/** One year of lit days. Big squares: one screen shows about a month; swipe right-to-left to go back in time. */
function Heatmap() {
  const { snap, t, lang } = useApp();
  const outer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = outer.current!;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const labelW = 21;
  const col = width ? Math.floor((width - labelW) / WEEKS_ON_SCREEN) : 0;
  const cell = Math.max(24, col - GAP);

  useLayoutEffect(() => {
    if (box.current) box.current.scrollLeft = box.current.scrollWidth;
  }, [col]);

  // Columns are weeks (Monday at the top); the last column holds today.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(start.getDate() - mondayOffset - (WEEKS - 1) * 7);
  const todayKey = dayKey();
  const cells: { key: string; cls: string; day: number }[] = [];
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
      const future = day > today;
      const cls = future ? 'fut' : (a?.t || 0) > 0 ? 'full' : (a?.s || 0) > 0 ? 'half' : '';
      cells.push({ key: k, cls: cls + (k === todayKey ? ' today' : ''), day: day.getDate() });
    }
  }

  return (
    <div class="card pdark">
      <div class="ct">{t('heatmap')}</div>
      <div class="hmbox" ref={outer}>
        {col > 0 && (
          <>
            <div class="hmdays" style={{ width: labelW, gap: GAP, gridAutoRows: cell }}>
              {WEEKDAYS[lang].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div class="hmwrap" ref={box}>
              <div class="hm-m sticky" style={{ width: WEEKS * col }}>
                {/* each month label sticks to the left edge while its weeks are on screen */}
                {months.map((m, i) => (
                  <div key={m.col} class="mseg" style={{ width: ((months[i + 1]?.col ?? WEEKS) - m.col) * col }}>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
              <div
                class="hm big"
                style={{ width: WEEKS * col, gap: GAP, gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoColumns: `${cell}px` }}
              >
                {cells.map((c) => (
                  <i key={c.key} class={c.cls}>
                    {!c.cls.startsWith('fut') && <span>{c.day}</span>}
                  </i>
                ))}
              </div>
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
