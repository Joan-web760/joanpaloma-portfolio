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

/**
 * Checks if the CURRENT user is allowlisted in `admin_users`.
 * Expected schema: admin_users.user_id = auth.users.id (uuid)
 */
export async function isAdminUser(userId) {
  try {
    let uid = userId;

    if (!uid) {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) return false;
      uid = authData?.user?.id;
    }

    if (!uid) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) return false;
    return !!data?.user_id;
  } catch {
    return false;
  }
}
