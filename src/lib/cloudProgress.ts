import { supabase } from '@/integrations/supabase/client';

/**
 * Cloud persistence: mirrors ALL simulator progress into the database so nothing
 * is lost if the tab, the browser or the whole machine is closed.
 * localStorage is kept as an instant local cache; the cloud is the source of truth.
 */

const SESSION_KEY = 'sim_session_code';
const LAST_SYNC_KEY = 'sim_last_cloud_sync';

/** localStorage keys that belong to the simulator progress. */
const TRACKED_PREFIXES = ['sim_persist_'];
const TRACKED_KEYS = [
  'simulator_forensic_log_v1',
  'taller_audit_v1',
  'crisis1_cedi_console_v1',
  'crisis6_twins_v1',
];

function isTracked(key: string) {
  return TRACKED_PREFIXES.some(p => key.startsWith(p)) || TRACKED_KEYS.includes(key);
}

export function getSessionCode(): string {
  let code = localStorage.getItem(SESSION_KEY);
  if (!code) {
    code = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, code);
  }
  return code;
}

/** Lets an instructor/student resume on another device with the same code. */
export function setSessionCode(code: string) {
  localStorage.setItem(SESSION_KEY, code);
}

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isTracked(k)) out[k] = localStorage.getItem(k) ?? '';
  }
  return out;
}

function applySnapshot(state: Record<string, string>) {
  Object.entries(state).forEach(([k, v]) => {
    if (isTracked(k)) localStorage.setItem(k, v);
  });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * Loads cloud progress into localStorage BEFORE React renders.
 * The cloud wins whenever it is newer than the last local sync.
 */
export async function hydrateFromCloud(): Promise<void> {
  const code = getSessionCode();
  try {
    const { data, error } = await supabase
      .from('simulator_progress')
      .select('state, updated_at')
      .eq('session_code', code)
      .maybeSingle();

    if (error || !data) return;

    const remoteTime = new Date(data.updated_at as string).getTime();
    const localTime = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
    const localHasProgress = !!localStorage.getItem('sim_persist_phase');

    if (!localHasProgress || remoteTime >= localTime) {
      applySnapshot((data.state || {}) as Record<string, string>);
      localStorage.setItem(LAST_SYNC_KEY, String(remoteTime));
    }
  } catch {
    /* offline: keep the local cache */
  }
}

let pending = false;
let timer: number | undefined;

async function push(): Promise<void> {
  pending = false;
  const code = getSessionCode();
  const state = snapshot();
  const teamName = readJson<string>('sim_persist_teamName', '');
  const phase = readJson<string>('sim_persist_phase', 'start');
  try {
    const { error } = await supabase
      .from('simulator_progress')
      .upsert(
        { session_code: code, team_name: teamName, phase, state },
        { onConflict: 'session_code' }
      );
    if (!error) localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* offline: retry on the next change */
  }
}

/** Debounced save of the whole progress snapshot to the cloud. */
export function saveToCloud() {
  pending = true;
  window.clearTimeout(timer);
  timer = window.setTimeout(push, 600);
}

/** Best-effort immediate flush (tab closing / hidden). */
export function flushToCloud() {
  if (!pending) return;
  window.clearTimeout(timer);
  void push();
}

/** Starts autosave: every local change and every 10s is mirrored to the cloud. */
export function startCloudSync() {
  // Mirror every tracked localStorage write to the cloud automatically.
  const nativeSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    nativeSetItem(key, value);
    if (isTracked(key)) saveToCloud();
  };
  const nativeRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = (key: string) => {
    nativeRemoveItem(key);
    if (isTracked(key)) saveToCloud();
  };

  saveToCloud();
  window.setInterval(() => saveToCloud(), 10000);
  window.addEventListener('pagehide', flushToCloud);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushToCloud();
  });
}
