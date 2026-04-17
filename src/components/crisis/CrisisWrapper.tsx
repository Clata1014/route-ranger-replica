import { useState, useRef, ReactNode } from 'react';
import { speak } from '@/lib/speech';
import { detectSpam, SPAM_PENALTY } from '@/lib/keywordValidator';
import { recordForensic, analyzeKeywords } from '@/lib/forensicLog';
import SignatureCanvas from './SignatureCanvas';

interface CrisisWrapperProps {
  crisisNumber: number;
  icon: string;
  title: string;
  dossier: string;
  children: ReactNode;
  validateGame: () => boolean;
  getGameStateDescription?: () => string;
  successVoice: string;
  errorExplanation: string;
  onSuccess: () => void;
  onError: (voice: string, detail?: string) => void;
  videoUrl?: string;
  videoUrl2?: string;
  videoLabel1?: string;
  videoLabel2?: string;
  forensicId?: string;
  expectedKeywords?: string[];
  correctAnswerSummary?: string;
  whyTheory?: string;
}

export default function CrisisWrapper({
  crisisNumber,
  icon,
  title,
  dossier,
  children,
  validateGame,
  getGameStateDescription,
  successVoice,
  errorExplanation,
  onSuccess,
  onError,
  videoUrl,
  videoUrl2,
  videoLabel1,
  videoLabel2,
  forensicId,
  expectedKeywords,
  correctAnswerSummary,
  whyTheory,
}: CrisisWrapperProps) {
  const [justification, setJustification] = useState('');
  const hasSigRef = useRef(false);
  const attemptsRef = useRef(0);

  const log = (isCorrect: boolean, gameStateLine: string) => {
    if (!forensicId) return;
    const kwAnalysis = expectedKeywords && expectedKeywords.length > 0
      ? analyzeKeywords(justification, expectedKeywords)
      : undefined;
    recordForensic({
      id: forensicId,
      kind: 'crisis',
      phaseLabel: `Crisis ${crisisNumber}: ${title}`,
      question: dossier,
      studentAnswer: gameStateLine,
      correctAnswer: correctAnswerSummary || '(ver justificación teórica)',
      isCorrect,
      attempts: attemptsRef.current,
      justification,
      keywordAnalysis: kwAnalysis,
      whyTheory: whyTheory || errorExplanation,
    });
  };

  const handleAuthorize = () => {
    if (justification.trim().length < 40) {
      alert('⚠️ Tu justificación gerencial debe tener al menos 40 caracteres. Explica tu razonamiento.');
      return;
    }
    if (detectSpam(justification)) {
      attemptsRef.current += 1;
      const stateDesc = getGameStateDescription ? getGameStateDescription() : '';
      log(false, '🚫 SPAM detectado en justificación. ' + stateDesc);
      onError(SPAM_PENALTY, `❌ CRISIS ${crisisNumber}: ${title}\n🚫 INTENTO DE FRAUDE\n✍️ LO QUE TÚ ESCRIBISTE: "${justification.slice(0, 200)}"\n📊 ANÁLISIS: El sistema detectó caracteres repetitivos consecutivos (regex anti-trampa). Esto evidencia relleno de texto sin contenido académico.`);
      return;
    }
    if (!hasSigRef.current) {
      alert('⚠️ Debes firmar el canvas como Gerente Responsable antes de autorizar.');
      return;
    }
    attemptsRef.current += 1;
    const ok = validateGame();
    const stateDesc = getGameStateDescription ? getGameStateDescription() : '';
    log(ok, stateDesc);
    if (ok) {
      speak(successVoice);
      onSuccess();
    } else {
      const truncatedText = justification.length > 200 ? justification.slice(0, 200) + '...' : justification;
      const detail = `❌ CRISIS ${crisisNumber}: ${title}\n✍️ TU JUSTIFICACIÓN: "${truncatedText}"\n${stateDesc}`;
      onError(errorExplanation, detail);
    }
  };

  return (
    <div className="animate-fade-in space-y-5 pb-8">
      {/* Crisis header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-mono text-destructive uppercase tracking-widest">Crisis {crisisNumber} de 6</p>
          <h2 className="font-display text-sm text-orange leading-tight">{title}</h2>
        </div>
      </div>

      {/* Dossier */}
      <div className="bg-card border border-destructive/30 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-destructive animate-pulse text-lg">●</span>
          <span className="text-[10px] font-mono text-destructive uppercase tracking-widest">Dossier de Crisis — Clasificado</span>
        </div>
        <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">{dossier}</p>
      </div>

      {/* Media */}
      {videoUrl2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border-2 border-dashed border-orange/40 bg-card h-56 rounded-xl shadow-sm overflow-hidden relative">
            <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            {videoLabel1 && (
              <span className="absolute top-2 left-2 bg-card/90 text-orange text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-border">
                {videoLabel1}
              </span>
            )}
          </div>
          <div className="border-2 border-dashed border-cyan-400/50 bg-card h-56 rounded-xl shadow-sm overflow-hidden relative">
            <video src={videoUrl2} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            {videoLabel2 && (
              <span className="absolute top-2 left-2 bg-card/90 text-cyan-700 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-border">
                {videoLabel2}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-orange/40 bg-card h-56 flex flex-col items-center justify-center text-orange rounded-xl shadow-sm text-center overflow-hidden">
          {videoUrl ? (
            <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="p-4">
              🎬 [ZONA MULTIMEDIA DE LA PROFESORA]
              <span className="block text-sm text-muted-foreground mt-2">Espacio reservado para inyectar foto/video real de la operación</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive console */}
      <div className="bg-card border border-orange/20 rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-4">▶ Consola Interactiva</p>
        {children}
      </div>

      {/* Triple Lock */}
      <div className="bg-card border border-orange/30 rounded-xl p-4 space-y-4 shadow-sm">
        <p className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">🔒 Triple Candado de Autorización</p>

        <div className="space-y-1">
          <label className="text-xs text-orange font-mono uppercase tracking-wider">📝 Justificación Gerencial (mín. 40 caracteres)</label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explica tu razonamiento profesional para esta decisión operativa..."
            className="w-full min-h-[80px] bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange font-mono resize-none"
          />
          <p className="text-[10px] text-muted-foreground font-mono text-right">{justification.trim().length}/40 mín.</p>
        </div>

        <SignatureCanvas onSignatureChange={(has) => { hasSigRef.current = has; }} />

        <button
          onClick={handleAuthorize}
          className="w-full py-3 rounded-xl font-display text-sm uppercase tracking-wider bg-gradient-to-r from-orange to-orange-glow text-primary-foreground hover:shadow-lg hover:shadow-orange/30 transition-all active:scale-[0.98]"
        >
          ⚡ AUTORIZAR INTERVENCIÓN
        </button>
      </div>
    </div>
  );
}
