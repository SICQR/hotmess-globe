import { supabase } from '@/components/utils/supabaseClient';

const PASSKEY_KEY = 'hm_passkey_registered';

export const isPasskeyRegistered = (): boolean => {
  try { return localStorage.getItem(PASSKEY_KEY) === 'true'; } catch { return false; }
};

export const markPasskeyRegistered = (): void => {
  try { localStorage.setItem(PASSKEY_KEY, 'true'); } catch {}
};

export const isWebAuthnSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';

export const registerPasskey = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await (supabase.auth as any).enrollMFA({ factorType: 'webauthn' });
    if (!error) markPasskeyRegistered();
    return { error: error as Error | null };
  } catch (err) { return { error: err as Error }; }
};

export const signInWithPasskey = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await (supabase.auth as any).signInWithPasskey();
    return { error: error as Error | null };
  } catch (err) { return { error: err as Error }; }
};
