import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Validações específicas
    if (!cleanEmail) {
      setError('O e-mail está vazio. Por favor digite seu e-mail.');
      setLoading(false);
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('O e-mail está incorreto. Verifique se escreveu certo. Ex: seu@email.com');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('A palavra-passe está vazia. Por favor digite sua senha.');
      setLoading(false);
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (loginError) {
      console.error(loginError);
      
      // AQUI ESTÁ A DIFERENÇA QUE VOCÊ PEDIU
      // Supabase sempre retorna "Invalid login credentials" quando não encontra ou senha errada
      // Então vamos verificar se a conta existe na tabela profiles pelo email se você tiver
      // Se não tiver, mostramos as duas mensagens claras

      // Vamos tentar saber se o email existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      // Se você NÃO salva email em profiles, vai cair aqui e vai mostrar a mensagem de conta não identificada
      // que é o mais seguro
      if (loginError.message.toLowerCase().includes('invalid')) {
        if (!existingProfile) {
          // Tentamos buscar pelo auth via lista - se não achou perfil, provavelmente não tem conta
          // Mas para não quebrar, damos a mensagem que você pediu
          setError('Conta não identificada. Essa conta não existe, crie uma conta.');
        } else {
          setError('Palavra-passe incorreta. A senha que digitou está errada.');
        }
        setLoading(false);
        return;
      }

      setError('Não foi possível entrar. Verifique o e-mail e a palavra-passe.');
      setLoading(false);
      return;
    }

    if (!data?.user) {
      setError('Conta não identificada. Essa conta não existe, crie uma conta.');
      setLoading(false);
      return;
    }

    // SUA LÓGICA ORIGINAL - NÃO MUDEI NADA DAQUI PRA BAIXO
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`id, name, country_id, province_id`)
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) console.error(profileError);

    if (!profile) {
      setLoading(false);
      router.push('/country');
      return;
    }

    if (!profile.country_id || !profile.province_id) {
      setLoading(false);
      router.push('/country');
      return;
    }

    const { data: businesses } = await supabase
      .from('businesses')
      .select(`id, name, country_id, province_id, owner_id`)
      .eq('owner_id', data.user.id)
      .eq('country_id', profile.country_id)
      .eq('province_id', profile.province_id)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (businesses && businesses.length > 0) {
      router.push({
        pathname: '/seller',
        query: { country: profile.country_id, province: profile.province_id }
      });
      return;
    }

    router.push({
      pathname: '/explore',
      query: { country: profile.country_id, province: profile.province_id }
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <main style={{ width: '100%', maxWidth: 520, background: '#FFFFFF', borderRadius: 28, padding: 32, boxShadow: '0 18px 50px rgba(0,70,60,.09)' }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: '#075B4E', color: '#E6A900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900 }}>T</div>

        <h1 style={{ margin: '22px 0 8px', color: '#075B4E', fontSize: 32 }}>Entrar na Talaza</h1>
        <p style={{ color: '#66736F', lineHeight: 1.6, marginBottom: 26 }}>Aceda à sua conta e continue exatamente de onde parou.</p>

        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', marginBottom: 8, color: '#17342F', fontWeight: 700 }}>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required style={inputStyle} />

          <label style={{ display: 'block', marginTop: 18, marginBottom: 8, color: '#17342F', fontWeight: 700 }}>Palavra-passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="A sua palavra-passe" required style={inputStyle} />

          {error && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: error.includes('não identificada') ? '#FEF3C7' : '#FFF1F0', color: error.includes('não identificada') ? '#92400E' : '#9B2C2C', fontSize: 14, lineHeight: 1.5, fontWeight: 600 }}>
              {error}
              {error.includes('não identificada') && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" onClick={() => router.push('/register')} style={{ background: '#075B4E', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', width: '100%' }}>
                    Criar conta agora →
                  </button>
                </div>
              )}
              {error.includes('Palavra-passe incorreta') && (
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12 }}>Dica: Verifique se o Caps Lock está ligado.</div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 22, padding: 16, border: 'none', borderRadius: 14, background: loading ? '#8CAFA8' : '#075B4E', color: '#FFFFFF', fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'A entrar…' : 'Entrar →'}
          </button>
        </form>

        <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
          <button onClick={() => router.push('/register')} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid #075B4E', background: '#fff', color: '#075B4E', fontWeight: 800, cursor: 'pointer' }}>
            Criar conta
          </button>
          <button onClick={() => router.back()} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid #E7ECEA', background: '#F8F9F8', color: '#075B4E', fontWeight: 700, cursor: 'pointer' }}>
            Voltar
          </button>
        </div>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1px solid #D5DEDB', background: '#FFFFFF', color: '#17342F', fontSize: 15, outline: 'none'
};
