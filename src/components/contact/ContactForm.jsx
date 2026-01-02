'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ContactCTAButton from './ContactCTAButton';

export default function ContactForm({ settings }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.from('contact_messages').insert({
      name: form.name,
      email: form.email,
      message: form.message,
      user_agent: navigator.userAgent,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm({ name: '', email: '', message: '' });
    setSuccess(settings.success_message);
  };

  return (
    <form onSubmit={submit} className="card bg-dark text-light border-0">
      <div className="card-body">
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input
            className="form-control"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Message</label>
          <textarea
            className="form-control"
            rows={4}
            required
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
          />
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}

        <ContactCTAButton label={settings.submit_label} loading={loading} />
      </div>
    </form>
  );
}
