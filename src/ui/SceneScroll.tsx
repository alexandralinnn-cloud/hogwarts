import { useRef, useState } from 'preact/hooks';
import { useApp } from '../app';
import { sortTasks, txt, type Task } from '../model';
import { sceneById } from '../scenes';
import { DueTag, formatDue, Pips, Scroll, TaskRow, Thumb, Toggle } from './Bits';
import { Icon } from './Icon';

/** Opens over the town when a building is tapped: the task list, or one task. */
export function SceneScroll() {
  const { scene, taskId, openScene, snap } = useApp();
  if (!scene) return null;
  const task = taskId ? snap.tasks.find((t) => t.id === taskId) : null;
  return (
    <div class="shade" onClick={(e) => e.target === e.currentTarget && openScene(null)}>
      <Scroll class="unroll">{task ? <TaskDetail task={task} /> : <SceneList />}</Scroll>
    </div>
  );
}

function SceneList() {
  const { scene, snap, lang, t, openScene, openTask, setEdit, canEdit } = useApp();
  const [showDone, setShowDone] = useState(false);
  const s = sceneById(scene!);
  const mine = snap.tasks.filter((x) => x.scene === s.id);
  const open = sortTasks(mine.filter((x) => !x.done));
  const done = mine.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const subtitle = s.name.zh === s.category.zh ? s.blurb[lang] : `${s.category[lang]} · ${s.blurb[lang]}`;
  return (
    <>
      <div class="shead">
        <Thumb scene={s.id} size={56} />
        <div class="shtext">
          <h2>{s.name[lang]}</h2>
          <p>{subtitle}</p>
        </div>
        <button class="x" onClick={() => openScene(null)} aria-label="close">
          <Icon name="close" size={24} />
        </button>
      </div>
      <div class="sheet-body">
        <div class="sec">
          {t('inProgress')} · {open.length}
        </div>
        {open.length === 0 && <div class="empty">{t('emptyScene')}</div>}
        {open.map((x) => (
          <TaskRow key={x.id} task={x} onOpen={() => openTask(x.id)} />
        ))}
        {done.length > 0 && (
          <>
            <button class="sec dim" onClick={() => setShowDone(!showDone)}>
              {t('completed')} · {done.length} {showDone ? '▾' : '▸'}
            </button>
            {showDone && done.map((x) => <TaskRow key={x.id} task={x} onOpen={() => openTask(x.id)} />)}
          </>
        )}
      </div>
      <div class="sheet-foot">
        <button class="pbtn red" onClick={() => canEdit() && setEdit({ mode: 'new', scene: s.id })}>
          <Icon name="plus" size={12} /> {t('addTask')}
        </button>
      </div>
    </>
  );
}

function TaskDetail({ task }: { task: Task }) {
  const { lang, t, openTask, openScene, setEdit, canEdit, actions, celebrate, ask, snap, toast } = useApp();
  const [newSub, setNewSub] = useState('');
  // help menu: closed, the main list, or the choice of WhatsApp message
  const [help, setHelp] = useState<null | 'main' | 'wa'>(null);
  // "整理" mode: edit step names and drag them into a new order
  const [arranging, setArranging] = useState(false);
  const [draft, setDraft] = useState<{ id: string; text: string }[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const startArrange = () => {
    if (!canEdit()) return;
    setDraft(task.subtasks.map((x) => ({ id: x.id, text: x.title[x.title.src] })));
    setArranging(true);
  };
  const saveArrange = async () => {
    setArranging(false);
    await actions.editSubtasks(task.id, draft);
  };
  const startDrag = (e: PointerEvent, id: string) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragId(id);
  };
  const moveDrag = (e: PointerEvent) => {
    if (!dragId || !listRef.current) return;
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('.edrow')];
    let target = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        target = i;
        break;
      }
    }
    setDraft((list) => {
      const from = list.findIndex((x) => x.id === dragId);
      const to = from < target ? target - 1 : target;
      if (from < 0 || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const s = sceneById(task.scene);
  const subsDone = task.subtasks.filter((x) => x.done).length;
  const diffName = [t('easy'), t('medium'), t('hard')][task.difficulty - 1];

  const addSub = async () => {
    if (!canEdit() || !newSub.trim()) return;
    const text = newSub;
    setNewSub('');
    celebrate(await actions.addSubtask(task.id, text));
  };

  const complete = async () => {
    if (!canEdit()) return;
    if (task.done && !(await ask(t('confirmUndo')))) return;
    celebrate(actions.toggleComplete(task.id));
  };

  const phone = (snap.settings.deanPhone || '').replace(/\D/g, '');
  const taskName = task.title.en || task.title[task.title.src];
  const messages = {
    stuck: fillTask(snap.settings.deanMsg || DEFAULT_DEAN_MSG, taskName),
    remind: fillTask(snap.settings.deanRemind || DEFAULT_DEAN_REMIND, lowerFirst(taskName)),
  };

  const whatsapp = () => {
    if (!canEdit()) return;
    if (!phone) return toast(t('needDean'));
    setHelp('wa');
  };

  const sendWhatsapp = (msg: string) => {
    setHelp(null);
    location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  };

  const planCoach = async () => {
    if (!canEdit()) return;
    try {
      await navigator.clipboard.writeText(task.title[task.title.src]);
      toast(t('pcCopied'));
    } catch {
      /* copying is a bonus; still open the app */
    }
    const name = snap.settings.pcShortcut || DEFAULT_PC_SHORTCUT;
    setTimeout(() => (location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`), 150);
  };

  return (
    <>
      <div class="shead small">
        <button class="back" onClick={() => openTask(null)}>
          <Icon name="chevronLeft" size={16} />
          {s.name[lang]}
        </button>
        {lang === 'zh' && (
          <div class="privrow">
            <Icon name="lock" size={12} />
            <span>{t('privateOnly')}</span>
            <Toggle on={task.private} disabled={!snap.isOwner} onChange={(v) => canEdit() && actions.setPrivate(task.id, v)} />
          </div>
        )}
        <button class="x" onClick={() => canEdit() && setEdit({ mode: 'edit', id: task.id })} aria-label={t('edit')}>
          <Icon name="pencil" size={20} />
        </button>
        <button class="x" onClick={() => openScene(null)} aria-label="close">
          <Icon name="close" size={24} />
        </button>
      </div>
      <div class="sheet-body" onClick={() => help && setHelp(null)}>
        <h2 class="dt">
          {task.done && <span class="donemark">✓ </span>}
          {txt(task.title, lang)}
        </h2>
        <div class="badges">
          <div>
            <small>{t('urgency')}</small>
            <b class={task.urgency === 'high' ? 'r' : task.urgency === 'none' ? 'sm' : ''}>{t(task.urgency)}</b>
          </div>
          <div>
            <small>{t('importance')}</small>
            <Pips n={task.importance} kind="sq" />
          </div>
          <div>
            <small>{t('difficulty')}</small>
            <b class="sm">{diffName}</b>
          </div>
          <div>
            <small>{t('reward')}</small>
            <Pips n={task.reward} kind="co" />
          </div>
        </div>
        {task.due && (
          <div class="dueline">
            <span>
              {t('due')} · {formatDue(task.due, lang)}
            </span>
            {!task.done && <DueTag due={task.due} />}
          </div>
        )}
        {txt(task.desc, lang) && <p class="desc">{txt(task.desc, lang)}</p>}
        {task.done && task.doneAt && (
          <p class="doneinfo">
            {t('doneAt')} {new Date(task.doneAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB')}
          </p>
        )}
        <div class="sec secrow">
          <span>
            {t('subtasks')} · {subsDone}/{task.subtasks.length}
          </span>
          {snap.isOwner && task.subtasks.length > 0 && !arranging && (
            <button class="secbtn" onClick={startArrange}>
              <Icon name="menu" size={12} /> {t('arrange')}
            </button>
          )}
        </div>
        {arranging && (
          <>
            <div class="arrlist" ref={listRef}>
              {draft.map((d) => (
                <div key={d.id} class={`edrow${dragId === d.id ? ' dragging' : ''}`}>
                  <span
                    class="handle"
                    onPointerDown={(e) => startDrag(e, d.id)}
                    onPointerMove={moveDrag}
                    onPointerUp={() => setDragId(null)}
                    onPointerCancel={() => setDragId(null)}
                  >
                    <Icon name="menu" size={16} />
                  </span>
                  <input
                    class="fi small"
                    value={d.text}
                    onInput={(e) => {
                      const v = (e.target as HTMLInputElement).value;
                      setDraft((list) => list.map((x) => (x.id === d.id ? { ...x, text: v } : x)));
                    }}
                  />
                </div>
              ))}
            </div>
            <p class="note">{t('arrangeHint')}</p>
            <div class="btnrow end">
              <button class="pbtn dark small" onClick={() => setArranging(false)}>
                {t('cancel')}
              </button>
              <button class="pbtn green small" onClick={saveArrange}>
                <Icon name="check" size={12} /> {t('arrangeDone')}
              </button>
            </div>
          </>
        )}
        {!arranging && task.subtasks.map((x) => (
          <div key={x.id} class={`st${x.done ? ' done' : ''}`}>
            <button class="stbox" onClick={() => canEdit() && celebrate(actions.toggleSubtask(task.id, x.id))}>
              {x.done && <Icon name="check" size={12} />}
            </button>
            <span class="sttext" onClick={() => canEdit() && celebrate(actions.toggleSubtask(task.id, x.id))}>
              {txt(x.title, lang)}
            </span>
            {snap.isOwner && (
              <button
                class="stdel"
                aria-label={t('del')}
                onClick={async () => (await ask(t('confirmDeleteSub'))) && celebrate(actions.deleteSubtask(task.id, x.id))}
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
        ))}
        <div class="addsub" hidden={arranging}>
          <Icon name="plus" size={12} />
          <input
            value={newSub}
            placeholder={t('split')}
            onInput={(e) => setNewSub((e.target as HTMLInputElement).value)}
            onFocus={(e) => !snap.isOwner && ((e.target as HTMLInputElement).blur(), canEdit())}
            onKeyDown={(e) => e.key === 'Enter' && addSub()}
          />
          {newSub.trim() && (
            <button class="pbtn small" onClick={addSub}>
              {t('add')}
            </button>
          )}
        </div>
      </div>
      {help === 'main' && (
        <div class="help pbox">
          <button class="opt" onClick={whatsapp}>
            <Icon name="messageText" size={24} class="wa" />
            <div>
              <b>{t('waTitle')}</b>
              <small>{t('waSub')}</small>
            </div>
          </button>
          <button class="opt" onClick={planCoach}>
            <Icon name="human" size={24} class="pc" />
            <div>
              <b>{t('pcTitle')}</b>
              <small>{t('pcSub')}</small>
            </div>
          </button>
        </div>
      )}
      {help === 'wa' && (
        <div class="help pbox">
          <button class="opt head" onClick={() => setHelp('main')}>
            <Icon name="chevronLeft" size={16} />
            <span>{t('waPick')}</span>
          </button>
          {(['stuck', 'remind'] as const).map((k) => (
            <button key={k} class="opt" onClick={() => sendWhatsapp(messages[k])}>
              <Icon name="messageText" size={24} class="wa" />
              <div>
                <b>{t(k === 'stuck' ? 'waStuck' : 'waRemind')}</b>
                <small class="preview">{messages[k]}</small>
              </div>
            </button>
          ))}
        </div>
      )}
      <div class="sheet-foot acts">
        <button class={`pbtn ${task.done ? 'dark' : 'green'} grow`} onClick={complete}>
          <Icon name="check" size={12} /> {task.done ? t('undoComplete') : t('complete')}
        </button>
        <button class={`pbtn dark${help ? ' pressed' : ''}`} onClick={() => setHelp(help ? null : 'main')}>
          <Icon name="message" size={12} /> {t('help')}
        </button>
      </div>
    </>
  );
}

export const DEFAULT_DEAN_MSG = 'Hi Dean, I\'m stuck on "{task}". Could you help me?';
export const DEFAULT_DEAN_REMIND = 'Heyyy Dean, could you remind me to {task} today?';

const fillTask = (template: string, name: string) => template.split('{task}').join(name);

/** "Buy a printer" → "buy a printer" (keeps "I …", "MPF …" and other capitals that should stay) */
function lowerFirst(s: string) {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
export const DEFAULT_PC_SHORTCUT = 'PlanCoach';
