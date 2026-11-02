import { useState } from 'preact/hooks';
import { useApp } from '../app';
import { ALERT_DAYS, daysLeft, sortTasks, type Level3, type Urgency } from '../model';
import { Pips, TaskRow } from './Bits';

type F<T> = T | 'all';

/** All open tasks, filtered by the four attributes. Tapping one jumps to its building. */
export function Board() {
  const { snap, t, openScene } = useApp();
  const [urg, setUrg] = useState<F<Urgency>>('all');
  const [due, setDue] = useState<F<'soon'>>('all');
  const [imp, setImp] = useState<F<Level3>>('all');
  const [dif, setDif] = useState<F<Level3>>('all');
  const [rew, setRew] = useState<F<Level3>>('all');

  const list = sortTasks(
    snap.tasks.filter(
      (x) =>
        !x.done &&
        (urg === 'all' || x.urgency === urg) &&
        (due === 'all' || (daysLeft(x.due) ?? Infinity) <= ALERT_DAYS) &&
        (imp === 'all' || x.importance === imp) &&
        (dif === 'all' || x.difficulty === dif) &&
        (rew === 'all' || x.reward === rew),
    ),
  );
  const lv: Level3[] = [1, 2, 3];

  return (
    <div class="page">
      <h2 class="ptitle">{t('boardTitle')}</h2>
      <div class="filters pdark">
        <Chips
          label={t('urgency')}
          value={urg}
          set={setUrg}
          options={[
            ['high', t('high')],
            ['low', t('low')],
            ['none', t('none')],
          ]}
          all={t('all')}
        />
        <Chips label={t('dueFilter')} value={due} set={setDue} options={[['soon', t('within3')]]} all={t('all')} />
        <Chips label={t('importance')} value={imp} set={setImp} options={lv.map((n) => [n, <Pips n={n} kind="sq" />])} all={t('all')} />
        <Chips
          label={t('difficulty')}
          value={dif}
          set={setDif}
          options={lv.map((n) => [n, [t('easy'), t('medium'), t('hard')][n - 1]])}
          all={t('all')}
        />
        <Chips label={t('reward')} value={rew} set={setRew} options={lv.map((n) => [n, <Pips n={n} kind="co" />])} all={t('all')} />
      </div>
      <div class="boardlist parch">
        <div class="sec">
          {t('inProgress')} · {list.length}
        </div>
        {list.length === 0 && <div class="empty">{t('noMatch')}</div>}
        {list.map((x) => (
          <TaskRow key={x.id} task={x} showScene onOpen={() => openScene(x.scene, x.id)} />
        ))}
      </div>
    </div>
  );
}

function Chips<T extends string | number>({
  label,
  value,
  set,
  options,
  all,
}: {
  label: string;
  value: T | 'all';
  set: (v: T | 'all') => void;
  options: [T, preact.ComponentChildren][];
  all: string;
}) {
  return (
    <div class="chips">
      <span class="clabel">{label}</span>
      <button class={value === 'all' ? 'on' : ''} onClick={() => set('all')}>
        {all}
      </button>
      {options.map(([v, l]) => (
        <button key={String(v)} class={value === v ? 'on' : ''} onClick={() => set(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}
