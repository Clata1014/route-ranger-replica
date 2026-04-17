import { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'crisis1_cedi_console_v1';

const CORRECT = ['Recepción', 'Clasificación', 'Picking y Packing', 'Despacho'];
const IDEAL_METHOD = 'WMS';

type Method = 'WMS' | 'PAPEL';

interface CediNode {
  label: string;
  emoji: string;
  recognized: boolean;
  method: Method;
}

interface PersistedState {
  nodes: CediNode[];
  locked: boolean;
}

const NODE_MAP: Array<{ keys: string[]; label: string; emoji: string }> = [
  { keys: ['recepcion', 'recibir', 'entrada', 'descarga'], label: 'RECEPCIÓN', emoji: '📥' },
  { keys: ['clasificacion', 'acomodo', 'ubicar', 'almacenar', 'almacenamiento'], label: 'CLASIFICACIÓN', emoji: '🗄️' },
  { keys: ['picking', 'packing', 'alistamiento', 'separar', 'pickingypacking', 'pickingpacking'], label: 'PICKING Y PACKING', emoji: '📦' },
  { keys: ['despacho', 'salida', 'enviar', 'cargar'], label: 'DESPACHO', emoji: '🚚' },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function resolveNode(text: string): { label: string; emoji: string; recognized: boolean } {
  const n = normalize(text);
  for (const m of NODE_MAP) {
    if (m.keys.some(k => n === k || n.includes(k))) {
      return { label: m.label, emoji: m.emoji, recognized: true };
    }
  }
  return { label: text.trim().toUpperCase(), emoji: '❓', recognized: false };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { nodes: [], locked: false };
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export interface Crisis1Ref {
  validate: () => boolean;
  getStateDescription: () => string;
}

const Crisis1Console = forwardRef<Crisis1Ref>((_, ref) => {
  const initial = useRef<PersistedState>(loadState());
  const [nodes, setNodes] = useState<CediNode[]>(initial.current.nodes);
  const [locked, setLocked] = useState<boolean>(initial.current.locked);
  const [text, setText] = useState('');
  const [pendingNode, setPendingNode] = useState<{ label: string; emoji: string; recognized: boolean } | null>(null);

  useEffect(() => {
    saveState({ nodes, locked });
  }, [nodes, locked]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (nodes.length !== CORRECT.length) return false;
      const labelsMatch = nodes.every((n, i) => n.label === CORRECT[i].toUpperCase());
      const methodsOk = nodes.every(n => n.method === IDEAL_METHOD);
      // Lock on validation attempt
      if (!locked) setLocked(true);
      return labelsMatch && methodsOk;
    },
    getStateDescription: () => {
      const studentFlow = nodes.length > 0
        ? nodes.map(n => `${n.emoji} ${n.label} [${n.method === 'WMS' ? '📱 WMS' : '📋 PAPEL'}]`).join(' ➔ ')
        : '(vacío)';
      const correctFlow = CORRECT.map(c => c.toUpperCase()).join(' ➔ ') + ' (TODOS con 📱 Terminal WMS)';
      return `🗺️ TU FLUJO ARMADO: ${studentFlow}\n🎯 FLUJO CORRECTO EXIGIDO: ${correctFlow}\n✅ POR QUÉ: El flujo lógico de un CEDI es estricto: Recibes, acomodas, alistas y despachas. Además, ¿notaste que la operaria del video usa una planilla de papel? ¡Esa era la trampa visual! En logística de alto volumen, copiar lo que ves sin analizar es un error. El papel genera inventario fantasma, retrasos y descuadres. El uso de tecnología WMS (escáner) en tiempo real es la única respuesta gerencial correcta.`;
    },
  }), [nodes, locked]);

  const tryAdd = () => {
    if (locked) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const resolved = resolveNode(trimmed);
    setPendingNode(resolved);
  };

  const confirmMethod = (method: Method) => {
    if (!pendingNode) return;
    setNodes(prev => [...prev, { ...pendingNode, method }]);
    setPendingNode(null);
    setText('');
  };

  const clear = useCallback(() => {
    if (locked) return;
    setNodes([]);
  }, [locked]);

  return (
    <div className="space-y-4">
      {/* Canvas / lienzo */}
      <div className="bg-slate-900 rounded-lg p-4 min-h-[90px] border border-slate-700">
        {nodes.length === 0 ? (
          <p className="text-slate-600 text-xs font-mono text-center">
            [ Lienzo vacío — escribe abajo la etapa del proceso del CEDI ]
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {nodes.map((n, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={`relative bg-orange-500/20 border rounded-md px-3 py-2 text-xs font-mono ${
                  n.recognized ? 'border-orange-500/40 text-orange-300' : 'border-red-500/50 text-red-300'
                }`}>
                  <span className="mr-1">{n.emoji}</span>{n.label}
                  <span className="absolute -top-2 -right-2 bg-slate-800 border border-slate-600 rounded-full px-1.5 py-0.5 text-[10px]">
                    {n.method === 'WMS' ? '📱' : '📋'}
                  </span>
                </span>
                {i < nodes.length - 1 && <span className="text-green-400 text-lg font-bold">➔</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Input a ciegas */}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryAdd(); } }}
          placeholder="Escribe la etapa del proceso del CEDI y presiona Enter..."
          disabled={locked}
          readOnly={locked}
          className="bg-slate-900 border-slate-700 text-orange-200 placeholder:text-slate-500 font-mono text-xs"
        />
        <Button
          onClick={tryAdd}
          disabled={locked || !text.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs uppercase tracking-wider"
        >
          Agregar
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={clear}
          disabled={locked}
          className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          [🗑 LIMPIAR FLUJO]
        </button>
        {locked && (
          <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
            🔒 Registrado — solo lectura
          </span>
        )}
      </div>

      {/* Sub-punto: método de registro */}
      <Dialog open={!!pendingNode} onOpenChange={(o) => { if (!o) setPendingNode(null); }}>
        <DialogContent className="bg-slate-900 border-orange-500/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-orange-300 font-mono uppercase tracking-wider">
              Sub-punto operativo
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              ¿Con qué método registrarás este movimiento para evitar descuadres de inventario?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => confirmMethod('WMS')}
              className="p-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-orange-500 transition-all text-left"
            >
              <div className="text-2xl mb-1">📱</div>
              <div className="font-mono text-sm text-orange-300">Terminal WMS</div>
              <div className="text-[11px] text-slate-400 mt-1">Escáner digital en tiempo real</div>
            </button>
            <button
              onClick={() => confirmMethod('PAPEL')}
              className="p-4 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-orange-500 transition-all text-left"
            >
              <div className="text-2xl mb-1">📋</div>
              <div className="font-mono text-sm text-orange-300">Planilla física</div>
              <div className="text-[11px] text-slate-400 mt-1">Papel y tabla manual</div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

Crisis1Console.displayName = 'Crisis1Console';
export default Crisis1Console;
