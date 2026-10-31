import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  increment,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentSingleTabManager,
  query,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { EMPTY_STATS, type BackupData, type LogEntry, type OwnerSettings, type Stats, type Task } from '../model';
import type { Op, Snapshot, Store } from './types';

/*
 Database layout (Cloud Firestore):
   tasks/{id}        every task; readable by everyone unless `private` is true
   public/stats      points, streak, lit days; readable by everyone
   log/{id}          "recent" list; private tasks are logged without their title
   owner/settings    Dean's number etc.; only the owner can read it
 Writing anything requires the owner account (see firestore.rules).
*/
export class FirebaseStore implements Store {
  private db: Firestore;
  private auth;
  private snap: Snapshot = {
    mode: 'firebase',
    ready: false,
    statsFresh: false,
    tasks: [],
    stats: EMPTY_STATS,
    log: [],
    settings: {},
    isOwner: false,
    userEmail: null,
    error: null,
  };
  private subs = new Set<(s: Snapshot) => void>();
  private live: Unsubscribe[] = [];
  private got = { tasks: false, stats: false, log: false };

  constructor(config: Record<string, string>, private ownerUid: string) {
    const app = initializeApp(config);
    this.auth = getAuth(app);
    this.db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
    onAuthStateChanged(this.auth, (user) => this.listen(user));
  }

  get() {
    return this.snap;
  }

  subscribe(cb: (s: Snapshot) => void) {
    this.subs.add(cb);
    cb(this.snap);
    return () => void this.subs.delete(cb);
  }

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.subs.forEach((cb) => cb(this.snap));
  }

  private fail = (e: Error & { code?: string }) => {
    console.error(e);
    this.set({ error: e.code || e.message, ready: true });
  };

  private markGot(part: keyof typeof this.got) {
    this.got[part] = true;
    if (this.got.tasks && this.got.stats && this.got.log && !this.snap.ready) this.set({ ready: true });
  }

  private listen(user: User | null) {
    this.live.forEach((u) => u());
    this.live = [];
    this.got = { tasks: false, stats: false, log: false };
    const isOwner = !!user && !!this.ownerUid && user.uid === this.ownerUid;
    this.set({ isOwner, userEmail: user?.email ?? null, ready: false, statsFresh: false, settings: {}, error: null });

    const tasksQuery = isOwner
      ? collection(this.db, 'tasks')
      : query(collection(this.db, 'tasks'), where('private', '==', false));
    this.live.push(
      onSnapshot(
        tasksQuery,
        (qs) => {
          this.set({ tasks: qs.docs.map((d) => ({ ...(d.data() as Task), id: d.id })) });
          this.markGot('tasks');
        },
        this.fail,
      ),
      onSnapshot(
        doc(this.db, 'public', 'stats'),
        { includeMetadataChanges: true },
        (ds) => {
          const data = (ds.data() as Partial<Stats>) || {};
          this.set({
            stats: { ...EMPTY_STATS, ...data, activity: data.activity || {} },
            statsFresh: this.snap.statsFresh || !ds.metadata.fromCache,
          });
          this.markGot('stats');
        },
        this.fail,
      ),
      onSnapshot(
        query(collection(this.db, 'log'), orderBy('ts', 'desc'), limit(40)),
        (qs) => {
          this.set({ log: qs.docs.map((d) => ({ ...(d.data() as LogEntry), id: d.id })) });
          this.markGot('log');
        },
        this.fail,
      ),
    );
    if (isOwner) {
      this.live.push(
        onSnapshot(
          doc(this.db, 'owner', 'settings'),
          (ds) => this.set({ settings: (ds.data() as OwnerSettings) || {} }),
          this.fail,
        ),
      );
    }
  }

  async commit(ops: Op[]) {
    if (!this.snap.isOwner) return;
    const batch = writeBatch(this.db);
    const stats: Record<string, unknown> = {};
    const pts: Record<string, number> = {};
    const act: Record<string, Record<string, number>> = {};
    for (const op of ops) {
      switch (op.t) {
        case 'task':
          batch.set(doc(this.db, 'tasks', op.task.id), op.task);
          break;
        case 'del':
          batch.delete(doc(this.db, 'tasks', op.id));
          break;
        case 'pts':
          pts[op.kind] = (pts[op.kind] || 0) + op.by;
          break;
        case 'act':
          act[op.day] = act[op.day] || {};
          act[op.day][op.k] = (act[op.day][op.k] || 0) + op.by;
          break;
        case 'stats':
          Object.assign(stats, op.patch);
          break;
        case 'log': {
          const { id: _ignored, ...entry } = op.entry;
          batch.set(doc(collection(this.db, 'log')), entry);
          break;
        }
      }
    }
    for (const [k, v] of Object.entries(pts)) stats[k] = increment(v);
    if (Object.keys(act).length) {
      stats.activity = Object.fromEntries(
        Object.entries(act).map(([day, ks]) => [day, Object.fromEntries(Object.entries(ks).map(([k, v]) => [k, increment(v)]))]),
      );
    }
    if (Object.keys(stats).length) batch.set(doc(this.db, 'public', 'stats'), stats, { merge: true });
    // The change shows up on screen right away (offline copy); the promise finishes once the server has it.
    await batch.commit();
  }

  async saveSettings(s: OwnerSettings) {
    if (!this.snap.isOwner) return;
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'owner', 'settings'), s, { merge: true });
    await batch.commit();
  }

  async login(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    await signOut(this.auth);
  }

  async replaceAll(d: BackupData) {
    if (!this.snap.isOwner) return;
    const existing = await getDocs(collection(this.db, 'tasks'));
    const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
    existing.docs.forEach((x) => writes.push((b) => b.delete(x.ref)));
    d.tasks.forEach((t) => writes.push((b) => b.set(doc(this.db, 'tasks', t.id), t)));
    writes.push((b) => b.set(doc(this.db, 'public', 'stats'), d.stats));
    if (d.settings) writes.push((b) => b.set(doc(this.db, 'owner', 'settings'), d.settings));
    for (let i = 0; i < writes.length; i += 400) {
      const b = writeBatch(this.db);
      writes.slice(i, i + 400).forEach((w) => w(b));
      await b.commit();
    }
  }
}
