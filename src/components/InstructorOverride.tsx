import { useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const DEFAULT_PASS = '1015';

interface InstructorOverrideProps {
  /** Render-prop: receives an onDoubleClick handler to attach to any innocuous-looking element. */
  children: (props: { onDoubleClick: () => void }) => ReactNode;
  /** Called when the correct password is entered. Should clear localStorage for this section + reset state. */
  onUnlock: () => void;
  /** Optional override password. Defaults to '1015'. */
  password?: string;
}

export default function InstructorOverride({ children, onUnlock, password = DEFAULT_PASS }: InstructorOverrideProps) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pass === ADMIN_PASS) {
      onUnlock();
      setOpen(false);
      setPass('');
      setError(false);
      toast.success('🛠️ Sección desbloqueada por instructor.');
    } else {
      setError(true);
      setPass('');
      toast.error('Clave inválida. Intento registrado.');
    }
  };

  return (
    <>
      {children({ onDoubleClick: () => { setError(false); setPass(''); setOpen(true); } })}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPass(''); setError(false); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange font-display tracking-wider text-base">
              🛠️ Override de Instructor
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Acceso restringido. Esta acción borrará el bloqueo de esta sección.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <Input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false); }}
              placeholder="Ingrese código de autorización..."
              autoFocus
              className="bg-slate-950 border-slate-700 text-foreground"
            />
            {error && (
              <p className="text-[11px] text-red-400 font-mono">Clave inválida. Intento registrado.</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-md bg-gradient-to-r from-orange to-orange-glow text-primary-foreground font-display text-xs tracking-wider hover:shadow-md hover:shadow-orange/30 transition-all active:scale-95"
            >
              Desbloquear Sección
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
