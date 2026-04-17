/**
 * Forensic Log — captura TODA la actividad del alumno desde el inicio del simulador.
 * Se persiste en localStorage para sobrevivir refrescos y para que el reporte final
 * pueda mostrar exactamente qué hizo, qué falló y qué palabras clave usó/le faltaron.
 */

const STORAGE_KEY = 'simulator_forensic_log_v1';

export type SectionKind =
  | 'channel_question'
  | 'pin_entry'
  | 'channel_builder'
  | 'crisis';

export interface KeywordAnalysis {
  expected: string[];
  found: string[];
  missing: string[];
}

export interface ForensicEntry {
  id: string;                  // unique key per section (e.g. 'c1_channel', 'c5_r3')
  order: number;               // chronological order
  kind: SectionKind;
  phaseLabel: string;          // human-readable section name
  question?: string;           // the prompt presented
  studentAnswer: string;       // what they answered (literal)
  correctAnswer: string;       // canonical answer
  isCorrect: boolean;
  attempts: number;
  justification?: string;      // for crisis: gerencial textarea
  keywordAnalysis?: KeywordAnalysis;  // for crisis justifications
  whyTheory?: string;          // explanation shown in report
  timestamp: number;
}

function load(): ForensicEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(entries: ForensicEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function loadForensicLog(): ForensicEntry[] {
  return load().sort((a, b) => a.order - b.order);
}

export function clearForensicLog() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Upsert by `id`. If section already logged, increments attempts and updates final answer. */
export function recordForensic(entry: Omit<ForensicEntry, 'order' | 'attempts' | 'timestamp'> & { attempts?: number }) {
  const all = load();
  const existing = all.find(e => e.id === entry.id);
  if (existing) {
    existing.studentAnswer = entry.studentAnswer;
    existing.isCorrect = entry.isCorrect;
    existing.attempts = (existing.attempts || 1) + 1;
    existing.justification = entry.justification ?? existing.justification;
    existing.keywordAnalysis = entry.keywordAnalysis ?? existing.keywordAnalysis;
    existing.timestamp = Date.now();
    save(all);
    return;
  }
  const order = all.length;
  all.push({
    ...entry,
    attempts: entry.attempts ?? 1,
    order,
    timestamp: Date.now(),
  });
  save(all);
}

/** Tolerant keyword matcher: normalizes accents/case and looks for inclusion. */
export function analyzeKeywords(text: string, expected: string[]): KeywordAnalysis {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normText = normalize(text || '');
  const found: string[] = [];
  const missing: string[] = [];
  expected.forEach(kw => {
    if (normText.includes(normalize(kw))) found.push(kw);
    else missing.push(kw);
  });
  return { expected, found, missing };
}
