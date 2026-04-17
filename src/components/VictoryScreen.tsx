import { useEffect, useMemo, useState } from 'react';
import { Trophy, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speak } from '@/lib/speech';
import { loadAudit, clearAudit, type AuditEntry } from '@/components/ChannelBuilder';
import { loadForensicLog, clearForensicLog, type ForensicEntry } from '@/lib/forensicLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VictoryScreenProps {
  teamName: string;
  elapsedSeconds: number;
  errorCount: number;
  errorLog: string[];
}

function calcGrade(correct: number, total: number): string {
  if (total === 0) return 'N/A';
  const pct = (correct / total) * 100;
  if (pct >= 95) return `5.0 (${pct.toFixed(0)}% — Nivel Dios)`;
  if (pct >= 85) return `4.5 (${pct.toFixed(0)}% — Excelente)`;
  if (pct >= 70) return `4.0 (${pct.toFixed(0)}% — Sobresaliente)`;
  if (pct >= 60) return `3.5 (${pct.toFixed(0)}% — Aceptable)`;
  if (pct >= 50) return `3.0 (${pct.toFixed(0)}% — Sobrevivió)`;
  return `2.0 (${pct.toFixed(0)}% — Reprobado)`;
}

function kindLabel(kind: ForensicEntry['kind']): string {
  switch (kind) {
    case 'channel_question': return 'Pregunta de Canal';
    case 'pin_entry': return 'Secuencia de PINs';
    case 'channel_builder': return 'Taller de Ruta';
    case 'crisis': return 'Crisis Gerencial';
  }
}

export default function VictoryScreen({ teamName, elapsedSeconds, errorCount, errorLog }: VictoryScreenProps) {
  const [studentEmail, setStudentEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const auditEntries: AuditEntry[] = useMemo(() => loadAudit(), []);
  const forensic: ForensicEntry[] = useMemo(() => loadForensicLog(), []);

  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const secs = String(elapsedSeconds % 60).padStart(2, '0');
  const timeStr = `${mins}:${secs}`;

  const totalSections = forensic.length;
  const correctSections = forensic.filter(f => f.isCorrect).length;
  const grade = calcGrade(correctSections, totalSections);

  useEffect(() => {
    speak('Reporte forense completo generado. Revisa cada sección, sus aciertos y los conceptos que debes reforzar. Felicidades ' + teamName);
    const end = Date.now() + 4000;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [teamName]);

  // Plain-text summary for email
  const fullForensicText = forensic.map((f, i) => {
    const verdict = f.isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO';
    const lines = [
      `${i + 1}. [${kindLabel(f.kind)}] ${f.phaseLabel}`,
      `   Veredicto: ${verdict}  (Intentos: ${f.attempts})`,
      `   Tu respuesta: ${f.studentAnswer}`,
      `   Respuesta correcta: ${f.correctAnswer}`,
    ];
    if (f.justification) {
      lines.push(`   📝 Justificación: "${f.justification.slice(0, 300)}"`);
    }
    if (f.keywordAnalysis) {
      lines.push(`   🔑 Palabras clave esperadas: ${f.keywordAnalysis.expected.join(', ')}`);
      lines.push(`   ✅ Encontradas: ${f.keywordAnalysis.found.join(', ') || '(ninguna)'}`);
      lines.push(`   ❌ Faltaron: ${f.keywordAnalysis.missing.join(', ') || '(ninguna)'}`);
    }
    if (f.whyTheory) {
      lines.push(`   💡 Teoría: ${f.whyTheory}`);
    }
    return lines.join('\n');
  }).join('\n\n-------------------\n\n');

  const handleSilentSend = () => {
    if (!studentEmail) {
      alert('Por favor ingresa tu correo institucional para registrar la nota.');
      return;
    }
    setIsSending(true);

    fetch('https://formsubmit.co/ajax/tabaresmaria329@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: '🎓 NOTA SIMULADOR - ' + teamName,
        '1. Nombre del Estudiante': teamName,
        '2. Correo del Estudiante': studentEmail,
        '3. NOTA FINAL': grade,
        '4. Tiempo Total': timeStr,
        '5. Aciertos': `${correctSections} / ${totalSections}`,
        '6. Total de Errores en Vivo': errorCount,
        '7. REPORTE FORENSE COMPLETO (DESDE EL INICIO)': fullForensicText,
        '8. BITÁCORA DE PENALIDADES': errorLog.join('\n\n---\n\n') || 'Sin penalidades',
      }),
    })
      .then((response) => response.json())
      .then(() => {
        setIsSent(true);
        setIsSending(false);
        clearAudit();
        clearForensicLog();
      })
      .catch(() => {
        alert('Error de conexión. Revisa tu internet e intenta de nuevo.');
        setIsSending(false);
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-background">
      <Trophy className="text-amber-500 mt-6 mb-2" size={100} />
      <h1 className="font-display text-2xl text-gradient-orange mb-1 text-center">REPORTE FORENSE TOTAL</h1>
      <p className="text-foreground text-sm mb-4 text-center">Cada decisión que tomaste, desde el primer segundo.</p>

      <div className="bg-card border border-border rounded-xl p-4 mb-3 w-full max-w-md text-center shadow-sm">
        <p className="text-muted-foreground text-xs mb-1">Estudiante</p>
        <p className="font-display text-lg text-foreground">{teamName}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
          <p className="text-muted-foreground text-[10px] mb-1">Tiempo</p>
          <p className="font-display text-lg text-orange">{timeStr}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
          <p className="text-muted-foreground text-[10px] mb-1">Aciertos</p>
          <p className="font-display text-lg text-emerald-600">{correctSections}/{totalSections}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center shadow-sm">
          <p className="text-muted-foreground text-[10px] mb-1">Penalidades</p>
          <p className="font-display text-lg text-red-600">{errorCount}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-5 w-full max-w-md text-center shadow-sm">
        <p className="text-muted-foreground text-xs mb-1">Nota del Sistema</p>
        <p className="font-display text-2xl text-emerald-600">{grade}</p>
      </div>

      {/* === REPORTE FORENSE TOTAL — sección por sección === */}
      <div className="w-full max-w-md mb-6">
        <p className="text-orange font-display text-sm mb-3 tracking-wider">🔬 REPORTE FORENSE — TODAS LAS SECCIONES</p>

        {forensic.length === 0 ? (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">No se registraron interacciones (¿saltó el simulador?).</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {forensic.map((f, i) => (
              <Card key={f.id} className={`bg-card shadow-sm ${f.isCorrect ? 'border-emerald-300' : 'border-red-300'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        {i + 1}. {kindLabel(f.kind)} · {f.attempts} intento{f.attempts !== 1 ? 's' : ''}
                      </p>
                      <CardTitle className="text-sm text-foreground text-left mt-1">
                        {f.phaseLabel}
                      </CardTitle>
                    </div>
                    {f.isCorrect ? (
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
                    ) : (
                      <XCircle className="text-red-600 shrink-0" size={22} />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-left">
                  <div className="bg-secondary rounded-md p-2">
                    <p className="text-[10px] font-display text-muted-foreground tracking-wider mb-1">TU RESPUESTA:</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">{f.studentAnswer || '(vacío)'}</p>
                  </div>

                  <div className="bg-emerald-50 rounded-md p-2 border border-emerald-200">
                    <p className="text-[10px] font-display text-emerald-700 tracking-wider mb-1">💡 RESPUESTA CORRECTA:</p>
                    <p className="text-xs text-emerald-900">{f.correctAnswer}</p>
                  </div>

                  {f.justification && (
                    <div className="bg-secondary rounded-md p-2">
                      <p className="text-[10px] font-display text-orange tracking-wider mb-1">📝 TU JUSTIFICACIÓN GERENCIAL:</p>
                      <p className="text-xs text-foreground italic whitespace-pre-wrap break-words">"{f.justification}"</p>
                    </div>
                  )}

                  {f.keywordAnalysis && (
                    <div className="bg-secondary rounded-md p-2 space-y-1">
                      <p className="text-[10px] font-display text-amber-700 tracking-wider">🔑 ANÁLISIS DE PALABRAS CLAVE:</p>
                      <div className="flex flex-wrap gap-1">
                        {f.keywordAnalysis.expected.map(kw => {
                          const found = f.keywordAnalysis!.found.includes(kw);
                          return (
                            <span
                              key={kw}
                              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                found
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-red-50 text-red-700 border border-red-200 line-through'
                              }`}
                            >
                              {found ? '✓' : '✗'} {kw}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-1">
                        {f.keywordAnalysis.found.length}/{f.keywordAnalysis.expected.length} conceptos clave detectados.
                      </p>
                    </div>
                  )}

                  {f.whyTheory && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-[10px] font-display text-muted-foreground tracking-wider mb-1">¿POR QUÉ?</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{f.whyTheory}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bitácora de penalidades en vivo (legacy) */}
      {errorLog.length > 0 && (
        <div className="bg-card border border-red-300 rounded-xl p-4 mb-6 w-full max-w-md max-h-[300px] overflow-y-auto shadow-sm">
          <p className="text-red-600 font-display text-sm mb-3 tracking-wider">📋 BITÁCORA DE PENALIDADES EN VIVO</p>
          <div className="space-y-2">
            {errorLog.map((entry, i) => (
              <div key={i} className="whitespace-pre-wrap text-xs leading-relaxed text-foreground bg-red-50 p-3 rounded border-l-4 border-red-500">
                <span className="text-red-700 font-bold text-[10px]">🔴 #{i + 1}</span>
                <div className="mt-1">{entry}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de envío */}
      <div className="w-full max-w-md">
        {!isSent ? (
          <div className="flex flex-col gap-3 mt-2 border-t border-border pt-4">
            <p className="text-sm text-foreground mb-1">Para oficializar tu nota con la profesora, envía tu reporte:</p>
            <input
              type="email"
              placeholder="✉️ Escribe TU correo (Estudiante)..."
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              className="w-full p-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none text-base shadow-sm"
            />
            <button
              onClick={handleSilentSend}
              disabled={isSending}
              className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-colors shadow-md ${isSending ? 'bg-orange animate-pulse' : 'bg-orange hover:bg-orange-glow'}`}
            >
              {isSending ? '⏳ ENVIANDO REPORTE FORENSE...' : '🚀 ENVIAR CALIFICACIÓN OFICIAL'}
            </button>
            <p className="text-red-600 text-xs text-center font-bold">⚠️ Si no envías tu reporte, tu nota será 0.0</p>
          </div>
        ) : (
          <div className="mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-lg text-center animate-fade-in">
            <p className="text-emerald-700 font-bold text-xl mb-2">✅ ¡REPORTE ENVIADO EXITOSAMENTE!</p>
            <p className="text-emerald-900/80 text-sm">Tu reporte forense completo (con todas tus respuestas, justificaciones y palabras clave detectadas) fue enviado a la profesora. Ya puedes cerrar esta ventana.</p>
          </div>
        )}
      </div>
    </div>
  );
}
