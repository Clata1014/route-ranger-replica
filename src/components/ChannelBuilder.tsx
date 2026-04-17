import { useState, useCallback, useEffect } from 'react';
import { Factory, Home, Warehouse, ShoppingCart, Cloud, Truck, Zap, RotateCcw, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type NodeType = 'fabrica' | 'mayorista' | 'minorista' | 'nube' | 'flete' | 'cliente';

// Smart dictionary for normalizing free-text input → NodeType
function resolveNode(input: string): NodeType | null {
  const n = input.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!n) return null;
  if (/(fabrica|produccion|planta)/.test(n)) return 'fabrica';
  if (/(mayorista|bodega|cedi|distribuidor)/.test(n)) return 'mayorista';
  if (/(minorista|tienda|supermercado|vitrina|boutique)/.test(n)) return 'minorista';
  if (/(cliente|casa|consumidor|usuario)/.test(n)) return 'cliente';
  if (/(nube|cloud|internet|web|servidor)/.test(n)) return 'nube';
  if (/(flete especial|flete|grua|especializado)/.test(n)) return 'flete';
  return null;
}

// Per-product sub-point (extra technical decision) options
interface SubPointOption {
  id: string;
  emoji: string;
  label: string;
  hint: string;
}

interface ProductConfig {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  correctRoute: NodeType[];
  failMessage: string;
  whyTheory: string;
  subPointTitle: string;
  subPointOptions: [SubPointOption, SubPointOption];
}

const PRODUCTS: ProductConfig[] = [
  {
    emoji: '🧻',
    title: 'PRODUCTO 1: PAPEL HIGIÉNICO / CERVEZA',
    subtitle: 'Alto volumen, baja densidad de valor',
    description: 'El papel higiénico es 90% aire. Un camión se llena rápido pero la carga vale muy poco. Diseña la ruta que conecte la fábrica con miles de tiendas pequeñas sin quebrar por costos de flete.',
    correctRoute: ['fabrica', 'mayorista', 'minorista', 'cliente'],
    failMessage: '❌ ¡QUIEBRA POR FLETES! El papel ocupa mucho espacio. Tienes que incluir obligatoriamente al MAYORISTA en tu dibujo para diluir el volumen.',
    whyTheory: 'El papel higiénico es 90% aire. Si mandas un camión a cada tienda, el flete te quiebra. El Mayorista funciona como un "amortiguador logístico": usas Tractomulas para llevar volumen masivo barato y de ahí divides la carga repartiendo en Camionetas pequeñas para distancias urbanas.',
    subPointTitle: '¿En qué vehículo transportarás este tramo?',
    subPointOptions: [
      { id: 'tractomula', emoji: '🚛', label: 'Tractomula', hint: '30 Tons · Largas distancias' },
      { id: 'camioneta', emoji: '🚐', label: 'Camioneta Local', hint: 'Última milla · Calles estrechas' },
    ],
  },
  {
    emoji: '📱',
    title: 'PRODUCTO 2: CELULARES GAMA ALTA',
    subtitle: 'Alto valor, mínimo volumen',
    description: 'Un celular cuesta $1,500 y cabe en tu bolsillo. Diseña el canal que proteja la exclusividad y minimice el riesgo de robo sin usar intermediarios masivos.',
    correctRoute: ['fabrica', 'minorista', 'cliente'],
    failMessage: '❌ ¡RIESGO DE ROBO! Producto premium. Debes ir directo a la vitrina del MINORISTA, no uses mayoristas masivos.',
    whyTheory: 'Un celular premium tiene altísima densidad de valor. Si lo metes en un mayorista masivo lo expones a robo, mercado gris y dilución de marca. Lo correcto: Fábrica ➔ Minorista (vitrina exclusiva con seguros y vigilancia) ➔ Cliente.',
    subPointTitle: '¿Cómo aseguras este tramo del envío?',
    subPointOptions: [
      { id: 'transporte_seguro', emoji: '🛡️', label: 'Transporte Blindado', hint: 'Custodia armada + GPS' },
      { id: 'mensajeria_estandar', emoji: '📦', label: 'Mensajería Estándar', hint: 'Económico, sin custodia' },
    ],
  },
  {
    emoji: '💻',
    title: 'PRODUCTO 3: SOFTWARE / WEB',
    subtitle: 'Producto digital, costo marginal cero',
    description: 'El software no pesa, no ocupa espacio físico y se puede replicar infinitamente. ¿Cómo lo entregas al cliente sin gastar en logística física?',
    correctRoute: ['fabrica', 'nube', 'cliente'],
    failMessage: '❌ ¡CAOS ANALÓGICO! Es un bien digital. La ruta correcta exige usar la NUBE para llegar al cliente.',
    whyTheory: 'El software tiene costo marginal cero: replicarlo no cuesta nada. Mover bits por la NUBE elimina bodegas, camiones y mayoristas. El canal correcto es 100% digital: Fábrica ➔ Nube ➔ Cliente.',
    subPointTitle: '¿Qué modelo de entrega digital usarás?',
    subPointOptions: [
      { id: 'saas', emoji: '☁️', label: 'SaaS (Suscripción)', hint: 'Acceso vía navegador/login' },
      { id: 'descarga', emoji: '⬇️', label: 'Descarga Directa', hint: 'Instalador digital único' },
    ],
  },
  {
    emoji: '☢️',
    title: 'PRODUCTO 4: QUÍMICOS / B2B',
    subtitle: 'Venta B2B, alta complejidad técnica',
    description: 'Vendes turbinas industriales de 5 toneladas o barriles de químicos corrosivos a otras empresas. Son productos peligrosos que requieren instalación técnica especializada.',
    correctRoute: ['fabrica', 'flete', 'cliente'],
    failMessage: '❌ ¡DESASTRE INDUSTRIAL! Es logística B2B. Exige conectar la fábrica con un FLETE ESPECIAL y directo al cliente.',
    whyTheory: 'En B2B industrial el producto es peligroso, pesado o frágil. Meterlo en un mayorista o minorista es ilegal y suicida. Se contrata un FLETE ESPECIAL (grúa, plataforma, hazmat) que va directo de Fábrica al Cliente con instalación técnica.',
    subPointTitle: '¿Qué tipo de manejo especial requiere este tramo?',
    subPointOptions: [
      { id: 'hazmat', emoji: '☣️', label: 'Manejo Hazmat', hint: 'Permisos + escolta especial' },
      { id: 'instalacion', emoji: '🔧', label: 'Instalación Técnica', hint: 'Ingenieros en sitio' },
    ],
  },
];

const NODE_OPTIONS: { type: NodeType; emoji: string; label: string; icon: typeof Factory }[] = [
  { type: 'fabrica', emoji: '🏭', label: 'Fábrica', icon: Factory },
  { type: 'mayorista', emoji: '🏢', label: 'Mayorista', icon: Warehouse },
  { type: 'minorista', emoji: '🏪', label: 'Minorista', icon: ShoppingCart },
  { type: 'nube', emoji: '☁️', label: 'Nube', icon: Cloud },
  { type: 'flete', emoji: '🚚', label: 'Flete Especial', icon: Truck },
  { type: 'cliente', emoji: '🏡', label: 'Cliente', icon: Home },
];

// ============= LocalStorage persistence (anti-cheat) =============
const STORAGE_KEY = 'taller_audit_v1';

export interface AuditEntry {
  productIdx: number;
  productTitle: string;
  productEmoji: string;
  studentRoute: { type: NodeType | string; label: string; emoji: string }[];
  studentSubPoints: SubPointOption[];
  correctRoute: { type: NodeType; label: string; emoji: string }[];
  isCorrect: boolean;
  whyTheory: string;
  failMessage: string;
  timestamp: number;
}

export function loadAudit(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAuditEntry(entry: AuditEntry) {
  const all = loadAudit().filter(e => e.productIdx !== entry.productIdx);
  all.push(entry);
  all.sort((a, b) => a.productIdx - b.productIdx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function clearAudit() {
  localStorage.removeItem(STORAGE_KEY);
}

interface ChannelBuilderProps {
  onVictory: () => void;
  onError?: (voice: string, detail?: string) => void;
  startProduct?: number;
  onProductAdvance?: (nextIdx: number) => void;
}

export default function ChannelBuilder({ onVictory, startProduct = 0, onProductAdvance }: ChannelBuilderProps) {
  const [currentProduct, setCurrentProduct] = useState(startProduct);
  // Route nodes: storing both NodeType (resolved) and raw text fallback
  const [route, setRoute] = useState<{ type: NodeType | string; label: string; emoji: string }[]>([]);
  // Sub-point decisions per transition (index 0 = first transition)
  const [subPoints, setSubPoints] = useState<(SubPointOption | null)[]>([]);
  const [alert, setAlert] = useState('');
  const [textInput, setTextInput] = useState('');
  const [pendingNode, setPendingNode] = useState<{ type: NodeType | string; label: string; emoji: string } | null>(null);
  const [subPointDialogOpen, setSubPointDialogOpen] = useState(false);

  const product = PRODUCTS[currentProduct];

  // Detect already-completed (locked) products from localStorage
  const audit = loadAudit();
  const lockedEntry = audit.find(e => e.productIdx === currentProduct);
  const isLocked = !!lockedEntry;

  // Restore locked route into UI for display purposes
  useEffect(() => {
    if (lockedEntry) {
      setRoute(lockedEntry.studentRoute);
      setSubPoints([null, ...lockedEntry.studentSubPoints]);
    } else {
      setRoute([]);
      setSubPoints([]);
      setTextInput('');
      setAlert('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProduct]);

  const clearRoute = () => {
    if (isLocked) return;
    setRoute([]);
    setSubPoints([]);
  };

  // Submit free text → resolve node → first node = direct push; rest = open sub-point dialog
  const submitTextNode = () => {
    if (isLocked) return;
    const raw = textInput.trim();
    if (!raw) return;
    const resolved = resolveNode(raw);
    let nodeData: { type: NodeType | string; label: string; emoji: string };
    if (resolved) {
      const opt = NODE_OPTIONS.find(o => o.type === resolved)!;
      nodeData = { type: resolved, label: opt.label, emoji: opt.emoji };
    } else {
      // Keep raw text as a "trap" node — will count as wrong on validation
      nodeData = { type: raw.toLowerCase(), label: raw, emoji: '❓' };
    }
    setAlert('');
    setTextInput('');
    if (route.length === 0) {
      setRoute([nodeData]);
      setSubPoints([null]);
    } else {
      setPendingNode(nodeData);
      setSubPointDialogOpen(true);
    }
  };

  const confirmSubPoint = (opt: SubPointOption) => {
    if (!pendingNode) return;
    setRoute(prev => [...prev, pendingNode]);
    setSubPoints(prev => [...prev, opt]);
    setPendingNode(null);
    setSubPointDialogOpen(false);
  };

  // Silent evaluation + persistence + advance
  const handleContinue = useCallback(() => {
    if (isLocked) {
      // Already submitted — just advance
      goToNext();
      return;
    }
    if (route.length === 0) {
      setAlert('⚠️ Debes escribir al menos un eslabón de la ruta antes de continuar.');
      return;
    }

    // Compare student route vs correct route silently
    const correct = product.correctRoute;
    const studentTypes = route.map(r => r.type);
    const isCorrect =
      studentTypes.length === correct.length &&
      studentTypes.every((t, i) => t === correct[i]);

    const correctRouteData = correct.map(t => {
      const opt = NODE_OPTIONS.find(o => o.type === t)!;
      return { type: t, label: opt.label, emoji: opt.emoji };
    });

    const entry: AuditEntry = {
      productIdx: currentProduct,
      productTitle: product.title,
      productEmoji: product.emoji,
      studentRoute: route,
      studentSubPoints: subPoints.slice(1).filter((s): s is SubPointOption => s !== null),
      correctRoute: correctRouteData,
      isCorrect,
      whyTheory: product.whyTheory,
      failMessage: product.failMessage,
      timestamp: Date.now(),
    };
    saveAuditEntry(entry);

    toast.success('✅ Estrategia registrada. Avanzando...', {
      description: 'Tu decisión quedó archivada en la auditoría.',
    });

    setTimeout(() => goToNext(), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, subPoints, currentProduct, isLocked, product]);

  const goToNext = () => {
    if (currentProduct >= PRODUCTS.length - 1) {
      onVictory();
    } else {
      const nextIdx = currentProduct + 1;
      setCurrentProduct(nextIdx);
      if (onProductAdvance) onProductAdvance(nextIdx);
    }
  };

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Product Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-display text-muted-foreground tracking-wider">
            FASE 4 — TALLER PRÁCTICO
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span className="text-xs font-display text-orange tracking-wider">
            {currentProduct + 1} / {PRODUCTS.length}
          </span>
          {isLocked && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-display tracking-wider">
              <Lock size={10} /> REGISTRADO
            </span>
          )}
        </div>
        <h2 className="font-display text-sm text-orange flex items-center gap-2">
          <span className="text-2xl">{product.emoji}</span>
          {product.title}
        </h2>
        <p className="text-[10px] text-muted-foreground italic">{product.subtitle}</p>
      </div>

      {/* Video Placeholder */}
      <div className="w-full aspect-video bg-gradient-to-br from-secondary to-muted rounded-xl flex items-center justify-center border border-border mb-3 overflow-hidden">
        {currentProduct === 0 ? (
          <video
            src="/videos/Video_Papel_Higienico_y_Logistica.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full min-h-[250px] object-cover rounded-lg"
          />
        ) : currentProduct === 1 ? (
          <video
            src="/videos/Video_de_iPhone_Seguro.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full min-h-[250px] object-cover rounded-lg"
          />
        ) : currentProduct === 2 ? (
          <video
            src="/videos/Software_Web_Producto3.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full min-h-[250px] object-cover rounded-lg"
          />
        ) : currentProduct === 3 ? (
          <video
            src="/videos/Quimicos_B2B_Producto4.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full min-h-[250px] object-cover rounded-lg"
          />
        ) : (
          <div className="text-center p-4">
            <span className="text-3xl block mb-2">{product.emoji}</span>
            <p className="text-[10px] font-display text-muted-foreground tracking-wider">ESPACIO PARA MULTIMEDIA DEL TUTOR</p>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-foreground leading-relaxed mb-3">{product.description}</p>

      {/* BLIND ROUTE BUILDER */}
      <div className="flex flex-col gap-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-display text-muted-foreground tracking-wider">
            ⚙️ ARMA TU RUTA A CIEGAS
          </span>
          {!isLocked && (
            <button onClick={clearRoute} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={10} /> Limpiar
            </button>
          )}
        </div>

        {/* Route Canvas */}
        <div className="relative bg-secondary/50 border border-border rounded-xl p-4 min-h-[80px] overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          <div className="relative">
            {route.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <p className="text-[10px] text-muted-foreground italic">
                  Lienzo vacío — escribe los nodos en el campo de abajo para dibujar la ruta
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {route.map((nodeData, i) => {
                  const sp = subPoints[i];
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <div className="flex flex-col items-center animate-scale-in">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange/80 to-orange-glow/80 flex items-center justify-center shadow-md">
                          <span className="text-lg">{nodeData.emoji}</span>
                        </div>
                        <span className="text-[8px] font-display text-foreground mt-0.5 max-w-[60px] truncate">{nodeData.label}</span>
                      </div>
                      {i < route.length - 1 && (
                        <div className="flex flex-col items-center mx-0.5">
                          {subPoints[i + 1] && (
                            <span className="text-xs leading-none" title={subPoints[i + 1]!.label}>
                              {subPoints[i + 1]!.emoji}
                            </span>
                          )}
                          <span className="text-orange font-bold text-sm">➔</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Blind Input — universal for all products */}
        {!isLocked ? (
          <div className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTextNode(); } }}
              placeholder={route.length === 0
                ? 'Escribe el primer punto de tu ruta y presiona Enter...'
                : 'Escribe el siguiente punto de tu ruta y presiona Enter...'}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-orange"
            />
            <button
              onClick={submitTextNode}
              className="px-4 rounded-md bg-gradient-to-r from-orange to-orange-glow text-primary-foreground font-display text-xs tracking-wider hover:shadow-md hover:shadow-orange/30 transition-all active:scale-95 shrink-0"
            >
              Agregar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <Lock size={14} className="text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-300/90">
              Ruta archivada en la auditoría. Esta sección quedó bloqueada (modo solo lectura).
            </p>
          </div>
        )}
      </div>

      {/* Alert */}
      {alert && (
        <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-shake">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">{alert}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-auto pt-4 pb-4">
        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-orange to-orange-glow text-primary-foreground font-display text-sm tracking-wider shadow-lg shadow-orange/30 hover:shadow-orange/50 transition-all active:scale-95"
        >
          <Zap size={16} />
          {isLocked ? 'AVANZAR AL SIGUIENTE PRODUCTO →' : '⚡ CONTINUAR'}
        </button>
      </div>

      {/* Bypass invisible */}
      <button
        onClick={() => onVictory()}
        className="fixed bottom-0 right-0 w-24 h-24 bg-transparent z-[9999] opacity-0 cursor-default focus:outline-none outline-none"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Sub-point dialog (per-product contextual) */}
      <Dialog open={subPointDialogOpen} onOpenChange={(o) => { if (!o) { setSubPointDialogOpen(false); setPendingNode(null); } }}>
        <DialogContent className="bg-slate-900 border-orange/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-orange font-display tracking-wider">{product.subPointTitle}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Próximo nodo: <span className="text-foreground font-semibold">{pendingNode?.label || ''}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {product.subPointOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => confirmSubPoint(opt)}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border bg-secondary/40 hover:border-orange hover:shadow-lg hover:shadow-orange/20 active:scale-95 transition-all"
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="font-display text-sm text-foreground">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground text-center">{opt.hint}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
