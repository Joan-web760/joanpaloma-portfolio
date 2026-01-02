import { supabase } from '@/lib/supabaseClient';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  return { session: data.session, error: null };
}

export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function isAdminUser() {
  const { data, error } = await supabase.from('admin_users').select('user_id').limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}
