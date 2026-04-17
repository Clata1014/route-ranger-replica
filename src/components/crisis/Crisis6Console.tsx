import { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import InstructorOverride from '@/components/InstructorOverride';

const STORAGE_KEY = 'crisis6_twins_v1';

const PICKING_KEYS = ['picking', 'alistamiento', 'recoleccion'];
const PACKING_KEYS = ['packing', 'empacado', 'embalaje'];

function normalize(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function isPicking(v: string) { return PICKING_KEYS.some(k => normalize(v).includes(k)); }
function isPacking(v: string) { return PACKING_KEYS.some(k => normalize(v).includes(k)); }

interface PersistedState {
  answerA: string;
  answerB: string;
  locked: boolean;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { answerA: '', answerB: '', locked: false };
}

export interface Crisis6Ref {
  validate: () => boolean;
  getStateDescription: () => string;
}

const Crisis6Console = forwardRef<Crisis6Ref>((_, ref) => {
  const initial = useRef<PersistedState>(loadState());
  const [answerA, setAnswerA] = useState(initial.current.answerA);
  const [answerB, setAnswerB] = useState(initial.current.answerB);
  const [locked, setLocked] = useState(initial.current.locked);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answerA, answerB, locked }));
  }, [answerA, answerB, locked]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (!locked) setLocked(true);
      return isPicking(answerA) && isPacking(answerB);
    },
    getStateDescription: () => {
      const aOk = isPicking(answerA);
      const bOk = isPacking(answerB);
      return `🃏 TUS RESPUESTAS A CIEGAS:\n  Gemelo A (el viajero): "${answerA.trim() || '(vacío)'}" → ${aOk ? '✅ Correcto' : '❌ Incorrecto'}\n  Gemelo B (el empacador): "${answerB.trim() || '(vacío)'}" → ${bOk ? '✅ Correcto' : '❌ Incorrecto'}\n🎯 CORRECTO: Gemelo A = PICKING (alistamiento/recolección), Gemelo B = PACKING (empacado/embalaje)\n✅ POR QUÉ: PICKING (Pick = Recoger) es el operario que CAMINA por la bodega recolectando artículos. PACKING (Pack = Empacar) es la estación FIJA donde se arma la caja con burbujas y cinta. Cruzarlos genera devoluciones millonarias.`;
    },
  }));

  const tryLock = () => {
    if (locked) return;
    if (!answerA.trim() || !answerB.trim()) return;
    setLocked(true);
  };

  const unlockSection = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAnswerA('');
    setAnswerB('');
    setLocked(false);
  };

  return (
    <div className="space-y-4">
      {/* Gemelo A — riddle only, no spoiler labels */}
      <div className="bg-slate-800 border border-orange-500/30 rounded-xl p-5 shadow-lg">
        <div className="text-orange-300 text-lg font-bold mb-2">🧭 Gemelo A</div>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          «Soy el viajero explorador. Camino kilómetros por los pasillos con un escáner y un carrito.
          Mi única misión es ir a las estanterías a <span className="text-orange-400 font-bold">BUSCAR y RECOLECTAR</span> los
          productos exactos que pide el cliente. ¿Quién soy?»
        </p>
        <Input
          value={answerA}
          onChange={(e) => setAnswerA(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryLock(); } }}
          placeholder="Escribe de qué proceso habla el acertijo y presiona Enter..."
          disabled={locked}
          readOnly={locked}
          className="bg-slate-900 border-slate-600 text-orange-200 placeholder:text-slate-500 font-mono text-sm focus-visible:ring-orange-500"
        />
      </div>

      {/* Gemelo B */}
      <div className="bg-slate-800 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
        <div className="text-cyan-300 text-lg font-bold mb-2">📦 Gemelo B</div>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          «Soy el protector estático. Me quedo quieto en mi mesa de trabajo. Tengo cajas, plástico burbuja
          y cinta adhesiva. Mi misión es <span className="text-cyan-400 font-bold">EMPACAR</span> el producto que me traen, sellarlo
          y etiquetarlo para el rudo viaje en camión. ¿Quién soy?»
        </p>
        <Input
          value={answerB}
          onChange={(e) => setAnswerB(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryLock(); } }}
          placeholder="Escribe de qué proceso habla el acertijo y presiona Enter..."
          disabled={locked}
          readOnly={locked}
          className="bg-slate-900 border-slate-600 text-cyan-200 placeholder:text-slate-500 font-mono text-sm focus-visible:ring-cyan-500"
        />
      </div>

      {/* Lock banner with hidden instructor backdoor */}
      {locked && (
        <InstructorOverride onUnlock={unlockSection} password="admin123">
          {({ onDoubleClick }) => (
            <div
              onDoubleClick={onDoubleClick}
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 select-none"
            >
              <Lock size={14} className="text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300/90">
                🔒 Ruta archivada en la auditoría. Esta sección quedó bloqueada (modo solo lectura).
              </p>
            </div>
          )}
        </InstructorOverride>
      )}
    </div>
  );
});

Crisis6Console.displayName = 'Crisis6Console';
export default Crisis6Console;
