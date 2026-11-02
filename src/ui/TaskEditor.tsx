import { useState } from 'preact/hooks';
import type { TaskForm } from '../actions';
import { useApp } from '../app';
import type { Level3 } from '../model';
import { SCENES } from '../scenes';
import { Pips, Scroll, Segmented, Thumb, Toggle } from './Bits';
import { Icon } from './Icon';

/** Form for a new task or for changing one. */
export function TaskEditor() {
  const { edit, setEdit, snap, lang, t, actions, celebrate, toast, ask, openScene, scene } = useApp();
  const existing = edit?.mode === 'edit' ? snap.tasks.find((x) => x.id === edit.id) : undefined;
  const [f, setF] = useState<TaskForm>(() =>
    existing
      ? {
          title: existing.title[existing.title.src],
          desc: existing.desc[existing.desc.src],
          scene: existing.scene,
          urgency: existing.urgency,
          due: existing.due || '',
          importance: existing.importance,
          difficulty: existing.difficulty,
          reward: existing.reward,
          private: existing.private,
        }
      : {
          title: '',
          desc: '',
          scene: edit?.mode === 'new' ? edit.scene : 'library',
          urgency: 'low',
          due: '',
          importance: 2,
          difficulty: 2,
          reward: 2,
          private: false,
          subtasks: [],
        },
  );
  const otherOf = (x?: { zh: string; en: string; src: 'zh' | 'en' }) => (x ? x[x.src === 'zh' ? 'en' : 'zh'] : '');
  const [titleOther, setTitleOther] = useState<string | undefined>(undefined);
  const [descOther, setDescOther] = useState<string | undefined>(undefined);
  const [subDraft, setSubDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const close = () => setEdit(null);

  if (!edit) return null;

  const save = async () => {
    if (!f.title.trim()) return toast(t('nameRequired'));
    setBusy(true);
    const subs = [...(f.subtasks || []), subDraft].map((x) => x.trim()).filter(Boolean);
    const form: TaskForm = { ...f, subtasks: subs, titleOther, descOther };
    if (existing) {
      await actions.editTask(existing.id, form);
      if (f.scene !== existing.scene && scene) openScene(f.scene, existing.id);
    } else {
      const { gain } = await actions.createTask(form);
      celebrate(gain);
    }
    setBusy(false);
    close();
  };

  const remove = async () => {
    if (!existing || !(await ask(t('confirmDelete')))) return;
    actions.deleteTask(existing.id);
    close();
    if (scene) openScene(scene, null);
  };

  const levels: Level3[] = [1, 2, 3];
  const otherLabel = (src?: 'zh' | 'en') => (src === 'en' ? t('fOtherLangZh') : t('fOtherLang'));

  return (
    <div class="modal-shade">
      <Scroll class="editor unroll">
        <div class="shead small">
          <h2 class="ftitle">{existing ? t('formEditTitle') : t('formNewTitle')}</h2>
          <button class="x" onClick={close} aria-label={t('cancel')}>
            <Icon name="close" size={24} />
          </button>
        </div>
        <div class="sheet-body form">
          <label class="fl">{t('fName')}</label>
          <input class="fi" value={f.title} placeholder={t('fNameHint')} onInput={(e) => set('title', (e.target as HTMLInputElement).value)} />
          {existing && existing.title[existing.title.src] && (
            <>
              <label class="fl sub">{otherLabel(existing.title.src)}</label>
              <input
                class="fi small"
                value={titleOther ?? otherOf(existing.title)}
                placeholder={t('fOtherLangHint')}
                onInput={(e) => setTitleOther((e.target as HTMLInputElement).value)}
              />
            </>
          )}

          <label class="fl">{t('fDesc')}</label>
          <textarea class="fi" rows={3} value={f.desc} placeholder={t('fDescHint')} onInput={(e) => set('desc', (e.target as HTMLTextAreaElement).value)} />
          {existing && existing.desc[existing.desc.src] && (
            <>
              <label class="fl sub">{otherLabel(existing.desc.src)}</label>
              <textarea
                class="fi small"
                rows={2}
                value={descOther ?? otherOf(existing.desc)}
                placeholder={t('fOtherLangHint')}
                onInput={(e) => setDescOther((e.target as HTMLTextAreaElement).value)}
              />
            </>
          )}

          <label class="fl">{t('fScene')}</label>
          <div class="scenepick">
            {SCENES.map((s) => (
              <button key={s.id} type="button" class={f.scene === s.id ? 'on' : ''} onClick={() => set('scene', s.id)}>
                <Thumb scene={s.id} size={32} />
                <span>{s.name[lang]}</span>
              </button>
            ))}
          </div>

          <div class="frow">
            <label class="fl">{t('urgency')}</label>
            <Segmented
              value={f.urgency}
              onChange={(v) => set('urgency', v)}
              options={[
                { value: 'high', label: t('high') },
                { value: 'low', label: t('low') },
                { value: 'none', label: t('none') },
              ]}
            />
          </div>
          <div class="frow">
            <label class="fl">
              <Icon name="calendar" size={12} /> {t('due')}
            </label>
            <div class="duepick">
              <input
                type="date"
                class={`fi date${f.due ? '' : ' empty'}`}
                value={f.due}
                onInput={(e) => set('due', (e.target as HTMLInputElement).value)}
                onChange={(e) => set('due', (e.target as HTMLInputElement).value)}
              />
              {!f.due && <span class="dueph">{t('noDue')}</span>}
              {f.due && (
                <button type="button" class="pbtn small dark" onClick={() => set('due', '')}>
                  {t('clear')}
                </button>
              )}
            </div>
          </div>
          <div class="frow">
            <label class="fl">{t('importance')}</label>
            <Segmented value={f.importance} onChange={(v) => set('importance', v)} options={levels.map((n) => ({ value: n, label: <Pips n={n} kind="sq" /> }))} />
          </div>
          <div class="frow">
            <label class="fl">{t('difficulty')}</label>
            <Segmented
              value={f.difficulty}
              onChange={(v) => set('difficulty', v)}
              options={levels.map((n) => ({ value: n, label: [t('easy'), t('medium'), t('hard')][n - 1] }))}
            />
          </div>
          <div class="frow">
            <label class="fl">{t('reward')}</label>
            <Segmented value={f.reward} onChange={(v) => set('reward', v)} options={levels.map((n) => ({ value: n, label: <Pips n={n} kind="co" /> }))} />
          </div>
          <div class="frow">
            <label class="fl">
              <Icon name="lock" size={12} /> {t('privateOnly')}
            </label>
            <Toggle on={f.private} onChange={(v) => set('private', v)} />
          </div>

          {!existing && (
            <>
              <label class="fl">{t('fSubs')}</label>
              {(f.subtasks || []).map((x, i) => (
                <div class="subline" key={i}>
                  <span>· {x}</span>
                  <button type="button" class="stdel" onClick={() => set('subtasks', (f.subtasks || []).filter((_, j) => j !== i))}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
              <div class="addsub">
                <Icon name="plus" size={12} />
                <input
                  value={subDraft}
                  placeholder={t('newSub')}
                  onInput={(e) => setSubDraft((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && subDraft.trim()) {
                      set('subtasks', [...(f.subtasks || []), subDraft.trim()]);
                      setSubDraft('');
                    }
                  }}
                />
                {subDraft.trim() && (
                  <button
                    type="button"
                    class="pbtn small"
                    onClick={() => {
                      set('subtasks', [...(f.subtasks || []), subDraft.trim()]);
                      setSubDraft('');
                    }}
                  >
                    {t('add')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div class="sheet-foot acts">
          {existing && (
            <button class="pbtn dark" onClick={remove}>
              <Icon name="trash" size={12} /> {t('del')}
            </button>
          )}
          <button class="pbtn dark" onClick={close}>
            {t('cancel')}
          </button>
          <button class="pbtn green grow" onClick={save} disabled={busy}>
            <Icon name="check" size={12} /> {busy ? t('translating') : t('save')}
          </button>
        </div>
      </Scroll>
    </div>
  );
}
