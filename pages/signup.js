import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      // 1. Criar a conta de autenticação
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Não foi possível criar a conta. Tente novamente.');
        setLoading(false);
        return;
      }

      // 2. Criar o perfil do utilizador
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: fullName.trim(),
        });

      if (profileError) {
        setError(
          'A conta foi criada, mas não foi possível criar o seu perfil. Tente novamente.'
        );
        setLoading(false);
        return;
      }

      // 3. Ir para a escolha do país
      router.push('/country');

    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>
        Criar conta na Talaza
      </h1>

      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        Crie a sua conta para explorar a Talaza.
      </p>

      <form onSubmit={handleSignup}>

        <input
          className="input"
          type="text"
          placeholder="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <input
          className="input"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && (
          <p
            style={{
              color: '#D92D20',
              fontSize: 13,
              marginTop: 10,
            }}
          >
            {error}
          </p>
        )}

        <button
          className="btn btn-brand"
          type="submit"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: 16,
          }}
          disabled={loading}
        >
          {loading ? 'A criar conta…' : 'Criar conta'}
        </button>

      </form>
    </div>
  );
}
