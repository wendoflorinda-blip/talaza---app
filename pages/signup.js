import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const USAGE_OPTIONS = [
  { value: 'encontrar', label: '👤 Quero Encontrar' },
  { value: 'trabalhar', label: '💼 Quero Trabalhar' },
  { value: 'negocio', label: '🏪 Quero Divulgar um Negócio' },
  { value: 'empresa', label: '🏢 Quero Divulgar uma Empresa' },
  { value: 'transporte', label: '🚖 Quero Oferecer Transporte' },
];

export default function Signup() {
  const router = useRouter();
  const [usage, setUsage] = useState('encontrar');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from('profiles').insert({ id: userId, full_name: fullName, usage_type: usage });
    }
    setLoading(false);
    if (usage === 'trabalhar') router.push('/jobs/candidate');
    else if (usage === 'negocio' || usage === 'empresa' || usage === 'transporte') router.push('/post-business');
    else router.push('/');
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>Como pretende utilizar a Talaza?</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0 24px' }}>
        {USAGE_OPTIONS.map(o => (
          <div key={o.value} className="card"
            style={{ cursor: 'pointer', textAlign: 'center', borderColor: usage === o.value ? 'var(--brand)' : 'var(--line)' }}
            onClick={() => setUsage(o.value)}>
            {o.label}
          </div>
        ))}
      </div>

      <form onSubmit={handleSignup}>
        <input className="input" placeholder="Nome completo" value={fullName} onChange={e => setFullName(e.target.value)} required />
        <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Palavra-passe" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        {error && <p style={{ color: '#D92D20', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'A criar conta…' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
