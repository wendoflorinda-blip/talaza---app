import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push('/');
  }

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>Entrar na Talaza</h1>
      <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
        <input className="input" type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Palavra-passe" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: '#D92D20', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }}>Entrar</button>
      </form>
    </div>
  );
}
