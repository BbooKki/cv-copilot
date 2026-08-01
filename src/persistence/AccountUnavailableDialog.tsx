import {useEffect, useRef} from 'react';
import {ArrowRight, UserRound, X} from 'lucide-react';

type AccountUnavailableDialogProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export function AccountUnavailableDialog({open, onClose, onContinue}: AccountUnavailableDialogProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    continueButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={onClose}>
    <section
      className="glass-panel w-full max-w-md rounded-2xl p-5 shadow-2xl md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-unavailable-title"
      aria-describedby="account-unavailable-description"
      onMouseDown={event => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/80 bg-white/70 text-neutral-700 shadow-sm">
          <UserRound size={18} strokeWidth={1.5} />
        </div>
        <button type="button" className="focus-ring p-1 text-neutral-500 hover:text-white" aria-label="Close account notice" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.18em] text-neutral-500">Account access</p>
      <h2 id="account-unavailable-title" className="mt-2 font-display text-2xl font-semibold tracking-tight">Accounts are temporarily unavailable</h2>
      <p id="account-unavailable-description" className="mt-3 text-sm leading-6 text-neutral-500">
        Sign in and sign-up are paused while cloud accounts are offline. You can still create, tailor, and export your CV — drafts are saved locally in this browser.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="focus-ring min-h-10 border border-white/15 px-4 py-2.5 text-xs text-neutral-500 hover:border-white/30 hover:text-white" onClick={onClose}>Close</button>
        <button ref={continueButtonRef} type="button" className="focus-ring flex min-h-10 items-center justify-center gap-2 bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200" onClick={onContinue}>Continue to editor <ArrowRight size={14} /></button>
      </div>
    </section>
  </div>;
}
