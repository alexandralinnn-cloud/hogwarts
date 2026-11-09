// Automatic messages to Dean through ntfy (https://ntfy.sh): Dean installs the free ntfy app
// and subscribes to the channel name saved in Settings. No account or server is needed.
import type { OwnerSettings } from './model';

export type DeanEvent =
  | { kind: 'hard'; task: string; taskId: string; scene: string }
  | { kind: 'level'; stat: string; level: number; title: string }
  | { kind: 'urgent'; task: string; due: string; taskId: string; scene: string }
  | { kind: 'test' };

export const DEFAULT_MSG_HARD = 'Dean! I just finished a hard task: "{task}" 🎉';
export const DEFAULT_MSG_LEVEL = 'Level up! My {stat} is now Lv.{level} ({title}) ⬆️';
export const DEFAULT_MSG_URGENT = 'Heads-up Dean: I just added an urgent task due {due}: "{task}". Please keep me on track!';
const TEST_MSG = 'Test from Hogwarts: notifications are working ✅';

const TAGS: Record<DeanEvent['kind'], string> = { hard: 'tada', level: 'arrow_up', urgent: 'warning', test: 'white_check_mark' };
const QUEUE_KEY = 'hogwarts-ntfy-queue';

interface Pending {
  topic: string;
  message: string;
  tag: string;
  /** page that opens when Dean taps the notification */
  click?: string;
}

/** Hogwarts address, pointing at the task (or the progress page) the message is about. */
function linkFor(ev: DeanEvent) {
  const base = `${location.origin}${import.meta.env.BASE_URL}`;
  if (ev.kind === 'hard' || ev.kind === 'urgent') return `${base}?scene=${ev.scene}&task=${ev.taskId}`;
  if (ev.kind === 'level') return `${base}?view=growth`;
  return base;
}

function fill(template: string, vars: Record<string, string | number>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export function messageFor(settings: OwnerSettings, ev: DeanEvent) {
  switch (ev.kind) {
    case 'hard':
      return fill(settings.msgHardDone || DEFAULT_MSG_HARD, { task: ev.task });
    case 'level':
      return fill(settings.msgLevelUp || DEFAULT_MSG_LEVEL, { stat: ev.stat, level: ev.level, title: ev.title });
    case 'urgent':
      return fill(settings.msgUrgent || DEFAULT_MSG_URGENT, { task: ev.task, due: ev.due });
    case 'test':
      return TEST_MSG;
  }
}

async function post(p: Pending) {
  // A plain text POST with the title in the address, so the browser sends it without an extra check request.
  let url = `https://ntfy.sh/${encodeURIComponent(p.topic)}?title=Hogwarts&tags=${p.tag}`;
  if (p.click) url += `&click=${encodeURIComponent(p.click)}`;
  const res = await fetch(url, { method: 'POST', body: p.message });
  if (!res.ok) throw new Error(`ntfy ${res.status}`);
}

function loadQueue(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}
const saveQueue = (q: Pending[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20)));

/** Sends a message to Dean. If the phone is offline it is kept and sent on the next visit. Returns true if sent now. */
export async function notifyDean(settings: OwnerSettings, ev: DeanEvent): Promise<boolean> {
  const topic = settings.ntfyTopic?.trim();
  if (!topic) return false;
  const p: Pending = { topic, message: messageFor(settings, ev), tag: TAGS[ev.kind], click: linkFor(ev) };
  try {
    await post(p);
    return true;
  } catch {
    if (ev.kind !== 'test') saveQueue([...loadQueue(), p]);
    return false;
  }
}

/** Retries messages that could not be sent earlier. */
export async function flushDeanQueue() {
  const q = loadQueue();
  if (!q.length) return;
  const left: Pending[] = [];
  for (const p of q) {
    try {
      await post(p);
    } catch {
      left.push(p);
    }
  }
  saveQueue(left);
}

/** A hard-to-guess channel name, e.g. "hogwarts-k3v9x2m7q1p8z5w4". */
export function newTopic() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return 'hogwarts-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
