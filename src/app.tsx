import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Actions, type Gain } from './actions';
import { translateUi, type StrKey } from './i18n';
import { levelOf, type Lang } from './model';
import type { SceneId } from './scenes';
import type { Snapshot, Store } from './store/types';
import { Board } from './ui/Board';
import { Growth } from './ui/Growth';
import { Header, Nav } from './ui/Chrome';
import { Overlays } from './ui/Overlays';
import { SceneScroll } from './ui/SceneScroll';
import { Settings } from './ui/Settings';
import { TaskEditor } from './ui/TaskEditor';
import { TownMap } from './ui/TownMap';

export type View = 'town' | 'board' | 'growth';
export type Edit = { mode: 'new'; scene: SceneId } | { mode: 'edit'; id: string } | null;

export interface Toast {
  id: number;
  text: string;
  kind: 'exec' | 'growth' | 'info' | 'minus';
}

interface Ctx {
  store: Store;
  snap: Snapshot;
  actions: Actions;
  lang: Lang;
  setLang(l: Lang): void;
  t(key: StrKey, vars?: Record<string, string | number>): string;
  view: View;
  setView(v: View): void;
  scene: SceneId | null;
  taskId: string | null;
  openScene(id: SceneId | null, taskId?: string | null): void;
  openTask(id: string | null): void;
  edit: Edit;
  setEdit(e: Edit): void;
  settingsOpen: boolean;
  setSettingsOpen(v: boolean): void;
  toast(text: string, kind?: Toast['kind']): void;
  /** shows "+n" and a level-up message when a level is reached */
  celebrate(gain: Gain | null): void;
  /** true for the owner; otherwise shows "view only" and returns false */
  canEdit(): boolean;
  ask(message: string): Promise<boolean>;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function App({ store }: { store: Store }) {
  const [snap, setSnap] = useState<Snapshot>(store.get());
  useEffect(() => store.subscribe(setSnap), [store]);
  const actions = useMemo(() => new Actions(store), [store]);

  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('hogwarts-lang') as Lang) || 'zh');
  const setLang = (l: Lang) => {
    localStorage.setItem('hogwarts-lang', l);
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    setLangState(l);
  };
  const t = useCallback((key: StrKey, vars?: Record<string, string | number>) => translateUi(lang, key, vars), [lang]);

  const [view, setView] = useState<View>('town');
  const [scene, setScene] = useState<SceneId | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<{ kind: 'exec' | 'growth'; level: number } | null>(null);
  const [question, setQuestion] = useState<{ text: string; done: (ok: boolean) => void } | null>(null);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, text, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 2200);
  }, []);

  const snapRef = useRef(snap);
  snapRef.current = snap;

  const celebrate = useCallback(
    (gain: Gain | null) => {
      if (!gain) return;
      const s = snapRef.current.stats;
      for (const kind of ['exec', 'growth'] as const) {
        const by = gain[kind];
        if (!by) continue;
        toast(`${by > 0 ? '+' : ''}${by} ${translateUi(lang, kind)}`, by > 0 ? kind : 'minus');
        const before = levelOf(s[kind]).level;
        const after = levelOf(s[kind] + by).level;
        if (after > before) setTimeout(() => setLevelUp({ kind, level: after }), 500);
      }
    },
    [lang, toast],
  );

  const canEdit = () => {
    if (snapRef.current.isOwner) return true;
    toast(translateUi(lang, 'viewOnly'));
    return false;
  };

  const ask = (text: string) => new Promise<boolean>((done) => setQuestion({ text, done }));

  // First visit of the day, and translations that failed last time.
  useEffect(() => {
    if (!snap.ready || !snap.isOwner) return;
    const run = () => {
      celebrate(actions.dailyOpen());
      actions.retryTranslations();
    };
    if (snap.statsFresh) {
      run();
      return;
    }
    const timer = setTimeout(run, 4000); // offline: go with the saved copy
    return () => clearTimeout(timer);
  }, [snap.ready, snap.isOwner, snap.statsFresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && snapRef.current.isOwner) celebrate(actions.dailyOpen());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [actions, celebrate]);

  const ctx: Ctx = {
    store,
    snap,
    actions,
    lang,
    setLang,
    t,
    view,
    setView: (v) => {
      setView(v);
      setScene(null);
      setTaskId(null);
    },
    scene,
    taskId,
    openScene: (id, task = null) => {
      setScene(id);
      setTaskId(task);
      if (id) setView('town');
    },
    openTask: setTaskId,
    edit,
    setEdit,
    settingsOpen,
    setSettingsOpen,
    toast,
    celebrate,
    canEdit,
    ask,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div class={`app lang-${lang}`}>
        <Header />
        <main class="main">
          {view === 'town' && <TownMap />}
          {view === 'board' && <Board />}
          {view === 'growth' && <Growth />}
          {view === 'town' && scene && <SceneScroll key={scene} />}
        </main>
        <Nav />
        {edit && <TaskEditor />}
        {settingsOpen && <Settings />}
        <Overlays
          toasts={toasts}
          levelUp={levelUp}
          closeLevelUp={() => setLevelUp(null)}
          question={question}
          answer={(ok) => {
            question?.done(ok);
            setQuestion(null);
          }}
        />
      </div>
    </AppCtx.Provider>
  );
}
