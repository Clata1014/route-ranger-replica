import { useState, useRef } from 'react';
import { Truck, Store, Bike } from 'lucide-react';
import { speak } from '@/lib/speech';
import { recordForensic } from '@/lib/forensicLog';

interface ChannelQuestionProps {
  icon: 'truck' | 'store' | 'bike';
  imageUrl?: string;
  videoUrl?: string;
  nativeVideoUrl?: string;
  nativeVideoControls?: boolean;
  title: string;
  description: string;
  question: string;
  correctAnswer: string;
  options: string[];
  successVoice: string;
  errorVoice: string;
  onSuccess: () => void;
  onError: () => void;
  /** Forensic id for the report (e.g. 'c1_channel'). */
  forensicId?: string;
}

const ICONS = {
  truck: Truck,
  store: Store,
  bike: Bike,
};

export default function ChannelQuestion({
  icon,
  imageUrl,
  videoUrl,
  nativeVideoUrl,
  nativeVideoControls,
  title,
  description,
  question,
  correctAnswer,
  options,
  successVoice,
  onSuccess,
  onError,
  forensicId,
}: ChannelQuestionProps) {
  const [feedback, setFeedback] = useState<'success' | null>(null);
  const [disabled, setDisabled] = useState(false);
  const attemptsRef = useRef(0);
  const IconComp = ICONS[icon];

  const log = (studentAnswer: string, isCorrect: boolean) => {
    if (!forensicId) return;
    recordForensic({
      id: forensicId,
      kind: 'channel_question',
      phaseLabel: title,
      question,
      studentAnswer,
      correctAnswer,
      isCorrect,
      attempts: attemptsRef.current,
    });
  };

  const handleChoice = (choice: string) => {
    if (disabled) return;
    setDisabled(true);
    attemptsRef.current += 1;

    if (choice === correctAnswer) {
      log(choice, true);
      setFeedback('success');
      speak(successVoice);
      setTimeout(() => {
        setFeedback(null);
        onSuccess();
      }, 3000);
    } else {
      log(choice, false);
      onError();
      setDisabled(false);
    }
  };

  return (
    <div className="flex flex-col items-center text-center flex-1">
      {nativeVideoUrl ? (
        <video
          src={nativeVideoUrl}
          autoPlay={!nativeVideoControls}
          muted={!nativeVideoControls}
          loop={!nativeVideoControls}
          controls={nativeVideoControls}
          playsInline
          className="w-full aspect-video rounded-xl shadow-lg border-2 border-orange object-cover mb-6"
        />
      ) : videoUrl ? (
        <div className="w-full aspect-video mb-6 rounded-xl overflow-hidden shadow-lg border-2 border-orange min-h-[250px]">
          <iframe
            className="w-full h-full min-h-[250px]"
            src={videoUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : imageUrl ? (
        <div className="w-full rounded-xl overflow-hidden mb-4 mt-2 border border-border">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 mb-3">
        <IconComp className="text-orange shrink-0" size={36} />
        <h2 className="font-display text-base text-orange text-left">{title}</h2>
      </div>

      <p className="text-foreground text-sm leading-relaxed mb-4 text-left w-full">{description}</p>
      <p className="text-foreground font-medium text-sm mb-5 text-left w-full">{question}</p>

      {feedback === 'success' && (
        <div className="rounded-xl p-3 mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 w-full">
          {successVoice}
        </div>
      )}

      <div className="w-full space-y-3 mt-auto pb-4">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleChoice(opt)}
            disabled={disabled}
            className="w-full bg-card border border-border rounded-xl px-4 py-4 text-foreground font-display text-sm hover:border-orange hover:text-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          if (disabled) return;
          setDisabled(true);
          setFeedback('success');
          setTimeout(() => {
            setFeedback(null);
            onSuccess();
          }, 500);
        }}
        className="fixed bottom-0 right-0 w-24 h-24 bg-transparent z-[9999] opacity-0 cursor-default focus:outline-none outline-none"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
