import {useEffect, useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import type {SupabaseAuthService} from './supabaseAuth';

export type SupabaseSessionState = {
  status: 'unavailable' | 'loading' | 'signed-out' | 'signed-in' | 'error';
  session: Session | null;
  error: string;
};

export function useSupabaseSession(auth: SupabaseAuthService | null): SupabaseSessionState {
  const [state, setState] = useState<SupabaseSessionState>(() => auth
    ? {status: 'loading', session: null, error: ''}
    : {status: 'unavailable', session: null, error: ''});

  useEffect(() => {
    if (!auth) {
      setState({status: 'unavailable', session: null, error: ''});
      return;
    }

    let active = true;
    let receivedAuthEvent = false;
    setState({status: 'loading', session: null, error: ''});
    const unsubscribe = auth.subscribe(session => {
      if (!active) return;
      receivedAuthEvent = true;
      setState({status: session ? 'signed-in' : 'signed-out', session, error: ''});
    });

    void auth.getSession().then(session => {
      if (!active || receivedAuthEvent) return;
      setState({status: session ? 'signed-in' : 'signed-out', session, error: ''});
    }).catch(cause => {
      if (!active || receivedAuthEvent) return;
      setState({status: 'error', session: null, error: cause instanceof Error ? cause.message : 'Could not check your sign-in session.'});
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  return state;
}
