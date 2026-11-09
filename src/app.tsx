import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Actions, type Cheer, type Gain } from './actions';
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

export interface GainPop {
  id: number;
  kind: 'exec' | 'growth';
  by: number;
}

/** Windows shown one after another: first "why you got points", then any level-up. */
export type Popup =
  | { id: number; kind: 'cheer'; cheer: Cheer; gain: Gain }
  | { id: number; kind: 'level'; stat: 'exec' | 'growth'; level: number };

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
  const [gains, setGains] = useState<GainPop[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [question, setQuestion] = useState<{ text: string; done: (ok: boolean) => void } | null>(null);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, text, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 2200);
  }, []);

  const snapRef = useRef(snap);
  snapRef.current = snap;

  /**
   * Big "+20 Drive" in the middle of the screen (the bars at the top flash too), then a window
   * explaining the points with a few encouraging words, then any level-up. Level-ups are sent to Dean.
   */
  const celebrate = useCallback(
    (gain: Gain | null) => {
      if (!gain) return;
      const s = snapRef.current.stats;
      const items: GainPop[] = [];
      const windows: Popup[] = [];
      if (gain.cheer) windows.push({ id: Date.now() + Math.random(), kind: 'cheer', cheer: gain.cheer, gain });
      for (const kind of ['exec', 'growth'] as const) {
        const by = gain[kind];
        if (!by) continue;
        items.push({ id: Date.now() + Math.random(), kind, by });
        const before = levelOf(s[kind]).level;
        const after = levelOf(s[kind] + by).level;
        if (after > before) {
          windows.push({ id: Date.now() + Math.random(), kind: 'level', stat: kind, level: after });
          actions.notifyLevelUp(kind, after);
        }
      }
      if (items.length) {
        setGains((x) => [...x, ...items]);
        setTimeout(() => setGains((x) => x.filter((g) => !items.includes(g))), 2000);
      }
      // windows wait until the big "+points" has floated away
      if (windows.length) setTimeout(() => setPopups((q) => [...q, ...windows]), items.length ? 1800 : 0);
    },
    [actions],
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
          gains={gains}
          popup={popups[0] || null}
          closePopup={() => setPopups((q) => q.slice(1))}
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
