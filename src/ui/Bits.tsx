import type { ComponentChildren } from 'preact';
import { useApp } from '../app';
import { levelOf, titleOf, txt, type Task } from '../model';
import { IMG_H, IMG_W, sceneById, type SceneId } from '../scenes';
import { Icon } from './Icon';

export const TOWN_URL = `${import.meta.env.BASE_URL}town.webp`;

/** Three little marks: squares (importance), diamonds (difficulty) or coins (reward). */
export function Pips({ n, kind }: { n: number; kind: 'sq' | 'di' | 'co' }) {
  return (
    <span class="pips">
      {[0, 1, 2].map((i) => (
        <i key={i} class={`${kind}${i < n ? ' on' : ''}`} />
      ))}
    </span>
  );
}

/** A small square picture of a building, cut out of the town picture. */
export function Thumb({ scene, size = 48 }: { scene: SceneId; size?: number }) {
  const [x, y, s] = sceneById(scene).thumb;
  const k = size / s;
  return (
    <div
      class="thumb"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${TOWN_URL})`,
        backgroundSize: `${IMG_W * k}px ${IMG_H * k}px`,
        backgroundPosition: `${-x * k}px ${-y * k}px`,
      }}
    />
  );
}

/** The paper scroll with wooden rods at the top and bottom. */
export function Scroll({ children, class: cls = '' }: { children: ComponentChildren; class?: string }) {
  return (
    <div class={`scroll ${cls}`}>
      <div class="rod" />
      <div class="sheet">{children}</div>
      <div class="rod" />
    </div>
  );
}

export function StatBar({ kind, big = false }: { kind: 'exec' | 'growth'; big?: boolean }) {
  const { snap, lang, t } = useApp();
  const lv = levelOf(snap.stats[kind] || 0);
  return (
    <div class={`stat ${kind}`}>
      <div class="sl">
        <Icon name={kind === 'exec' ? 'zap' : 'heart'} size={12} />
        <span>{t(kind)}</span>
        <em>
          Lv.{lv.level} {titleOf(lv.level, lang)}
        </em>
      </div>
      <div class={`bar ${kind === 'growth' ? 'g' : ''} ${big ? 'big' : ''}`}>
        <i style={{ width: `${Math.max(0, Math.min(100, (lv.into / lv.span) * 100))}%` }} />
      </div>
    </div>
  );
}

/** One line in a task list. */
export function TaskRow({ task, showScene = false, onOpen }: { task: Task; showScene?: boolean; onOpen: () => void }) {
  const { lang, t, actions, canEdit, celebrate, ask } = useApp();
  const subsDone = task.subtasks.filter((s) => s.done).length;
  const toggle = async (e: Event) => {
    e.stopPropagation();
    if (!canEdit()) return;
    if (task.done && !(await ask(t('confirmUndo')))) return;
    celebrate(actions.toggleComplete(task.id));
  };
  const scene = sceneById(task.scene);
  return (
    <div class={`task${task.done ? ' done' : ''}`} onClick={onOpen}>
      <button class={`cb${task.done ? ' on' : ''}`} onClick={toggle} aria-label={t('complete')}>
        {task.done && <Icon name="check" size={12} />}
      </button>
      <div class="tb">
        {showScene && (
          <div class="tscene">
            <Thumb scene={task.scene} size={16} />
            <span>{scene.name[lang]}</span>
          </div>
        )}
        <div class="tt">
          {task.urgency === 'high' && !task.done && <em class="urg">{t('urgent')}</em>}
          {txt(task.title, lang)}
        </div>
        <div class="attrs">
          <span>
            {t('importanceShort')}
            <Pips n={task.importance} kind="sq" />
          </span>
          <span>
            {t('difficulty')}
            <Pips n={task.difficulty} kind="di" />
          </span>
          <span>
            {t('reward')}
            <Pips n={task.reward} kind="co" />
          </span>
          {task.subtasks.length > 0 && (
            <span class="sub">
              {t('subtasks')} {subsDone}/{task.subtasks.length}
            </span>
          )}
          {task.private && (
            <span class="lock">
              <Icon name="lock" size={12} /> {t('privateOnly')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ComponentChildren }[];
  onChange: (v: T) => void;
}) {
  return (
    <div class="seg">
      {options.map((o) => (
        <button key={String(o.value)} class={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      class={`tog${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
    />
  );
}
