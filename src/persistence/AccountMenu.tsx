import {UserRound} from 'lucide-react';
import type {SupabaseAuthService} from './supabaseAuth';
import {supabaseAuth} from './supabaseClient';
import {useSupabaseSession} from './useSupabaseSession';

type AccountMenuProps = {
  auth?: SupabaseAuthService | null;
  onOpenAccount: () => void;
};

export function AccountMenu({auth = supabaseAuth, onOpenAccount}: AccountMenuProps) {
  const authState = useSupabaseSession(auth);
  const signedIn = authState.status === 'signed-in';

  return <button
    type="button"
    className="focus-ring flex min-h-10 items-center gap-2 border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:border-white/30 hover:text-white"
    onClick={onOpenAccount}
  >
    <span className="relative">
      <UserRound size={15} />
      {signedIn && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />}
    </span>
    <span className="hidden sm:inline">{signedIn ? 'Account' : 'Sign in'}</span>
  </button>;
}
