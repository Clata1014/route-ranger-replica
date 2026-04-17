import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';

export interface Crisis5Ref {
  validate: () => boolean;
  getStateDescription: () => string;
}

const Crisis5Console = forwardRef<Crisis5Ref>((_, ref) => {
  const [input, setInput] = useState('');
  const [blink, setBlink] = useState(true);

  useImperativeHandle(ref, () => ({
    validate: () => input.trim().toLowerCase() === 'rfid',
    getStateDescription: () => {
      return `⌨️ TU RESPUESTA: "${input.trim() || '(vacío)'}"\n🎯 CORRECTO: RFID\n✅ POR QUÉ: RFID (Identificación por Radiofrecuencia) permite lectura automática de pallets enteros en milisegundos mediante ondas electromagnéticas, sin necesidad de línea de visión directa. Supera al código de barras que exige apuntar manualmente caja por caja.`;
    },
  }));

  useEffect(() => {
    const id = setInterval(() => setBlink(p => !p), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-emerald-500/40 font-mono shadow-inner">
        <p className="text-emerald-400/70 text-xs mb-2">root@cedi-server:~$ identificar_tecnologia</p>
        <p className="text-emerald-300 text-xs mb-3">&gt; Ingrese la sigla de 4 letras de la tecnología de lectura por ondas electromagnéticas:</p>
        <div className="flex items-center gap-1">
          <span className="text-emerald-300">&gt;</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 10))}
            maxLength={10}
            className="bg-transparent border-none outline-none text-emerald-300 text-lg font-mono uppercase tracking-[0.3em] w-full caret-transparent"
            placeholder=""
            autoFocus
          />
          <span className={`text-emerald-300 text-lg ${blink ? 'opacity-100' : 'opacity-0'}`}>█</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-mono text-center">Escribe la sigla y autoriza la intervención</p>
    </div>
  );
});

Crisis5Console.displayName = 'Crisis5Console';
export default Crisis5Console;
