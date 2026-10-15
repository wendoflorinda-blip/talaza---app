import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Signup() {
  const router = useRouter();
  const { country, province, next } = router.query;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Cria a conta no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Essa conta já existe. Tente iniciar sessão.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Não foi possível criar a conta.');
        setLoading(false);
        return;
      }

      // 2. Tenta logar na hora para conseguir criar o perfil (resolve seu erro da foto)
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      // 3. Cria/atualiza o perfil com UPSERT (não dá erro se já existir)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: fullName.trim(),
          country_id: country || null,
          province_id: province || null,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error(profileError);
        // Não bloqueia mais - mesmo se falhar o perfil, a conta foi criada e vamos mandar pra escolher localização
      }

      setLoading(false);

      // 4. Redireciona certo
      if (next === 'mensagens' || next === 'mensages') {
        router.push('/mensagens');
      } else if (country && province) {
        router.push({ pathname: '/start', query: { country, province } });
      } else {
        router.push('/country');
      }

    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', display:'flex', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth: 480, width:'100%' }}>
        <Link href="/" style={{ textDecoration:'none', color:'#075B4E', fontWeight:900, fontSize:22, display:'flex', gap:8, alignItems:'center' }}>
          <div style={{width:36,height:36, background:'#075B4E', color:'#E6A900', borderRadius:10, display:'grid', placeItems:'center'}}>T</div> Talaza
        </Link>

        <h1 style={{ fontSize: 26, marginTop: 32, color:'#17342F' }}>Criar conta na Talaza</h1>
        <p style={{ fontSize: 14, color: '#596B68' }}>Crie a sua conta para continuar e explorar a Talaza.</p>

        <form onSubmit={handleSignup} style={{ marginTop: 24, display:'grid', gap:12 }}>
          <input className="input" type="text" placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
          <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />

          {/* CAMPO SENHA COM OLHO */}
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Palavra-passe (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{...inputStyle, paddingRight:44}}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{
              position:'absolute', right:8, top:8, height:36, width:36, border:'none', background:'#F1F5F3', borderRadius:8, cursor:'pointer'
            }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p style={{ color: '#D92D20', fontSize: 13, background:'#FFF1F0', padding:10, borderRadius:10 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 16, borderRadius:12, background: loading ? '#8CAFA8' : '#075B4E', color: '#fff', border:'none', fontWeight:800, cursor:'pointer'
          }}>
            {loading ? 'A criar conta…' : 'Criar conta'}
          </button>
        </form>

        <p style={{textAlign:'center', marginTop:20, fontSize:13, color:'#66736F'}}>
          Já tem conta? <Link href="/login" style={{color:'#075B4E', fontWeight:700}}>Iniciar sessão</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width:'100%', boxSizing:'border-box', padding:14, borderRadius:12, border:'1px solid #D5DEDB', background:'#fff', fontSize:15
};
