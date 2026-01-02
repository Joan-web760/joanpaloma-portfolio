'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import PasswordInput from '@/components/admin/forms/PasswordInput';

import { getSession, isAdminUser, signOut, signUpWithPassword } from '@/lib/auth';

export default function AdminRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get('next') || '/admin';

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    let alive = true;

    const checkExisting = async () => {
      const { session } = await getSession();

      // Already logged in and admin -> go to admin
      if (session?.user) {
        const ok = await isAdminUser();
        if (!alive) return;

        if (ok) router.replace(nextUrl);
        else {
          await signOut();
          if (!alive) return;
          setError('Your account is not allowed to access admin.');
        }
      }
    };

    checkExisting();

    return () => {
      alive = false;
    };
  }, [router, nextUrl]);

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    const { data, error } = await signUpWithPassword(form.email, form.password);

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // If email confirmation is ON, session may be null until confirmed.
    // We'll handle both cases:
    if (!data?.session?.user) {
      setLoading(false);
      setInfo('Account created. Please check your email to confirm, then return to login.');
      return;
    }

    // If we do have a session, enforce allowlist
    const ok = await isAdminUser();
    if (!ok) {
      await signOut();
      setLoading(false);
      setError('Account created, but not allowlisted for admin. Ask the owner to grant access.');
      return;
    }

    setLoading(false);
    router.replace(nextUrl);
  };

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <AdminCard title="Admin Register">
        <form onSubmit={onSubmit}>
          <TextInput
            label="Email"
            value={form.email}
            onChange={(v) => update('email', v)}
            placeholder="you@example.com"
            required
          />

          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="Create a strong password"
            required
          />

          {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
          {info ? <div className="alert alert-info mt-3 mb-0">{info}</div> : null}

          <button className="btn btn-primary w-100 mt-3" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <div className="small opacity-75 mt-3">
            Note: Registration does not grant admin access automatically. Your account must be allowlisted in{' '}
            <code>admin_users</code>.
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
