import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const field = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: '1px solid #D9E2DF', borderRadius: 12, fontSize: 14, background: '#FFFFFF', color: '#17211F' };
const label = { display: 'block', fontSize: 13, fontWeight: 800, color: '#263B35', margin: '15px 0 7px' };

export default function MediaCreatorSignup() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [category, setCategory] = useState('');
  const [languages, setLanguages] = useState('Português');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setEmail(data.user.email || '');
      }
    });
    supabase.from('countries').select('id,name').order('name').then(({ data, error: loadError }) => {
      if (loadError) setError('Não foi possível carregar os países.');
      else setCountries(data || []);
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!displayName.trim() || !category.trim() || !countryId) {
      setError('Preencha o nome público, o país e a categoria de conteúdo.');
      return;
    }
    if (!user && (!email.trim() || password.length < 6)) {
      setError('Introduza o e-mail e uma palavra-passe com pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      let activeUser = user;
      if (!activeUser) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (authError) {
          const msg = String(authError.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already been registered')) {
            throw new Error('Este e-mail já tem uma conta. Entre com a sua conta existente para continuar, sem criar outro utilizador.');
          }
          throw authError;
        }
        activeUser = data?.user;
        if (!activeUser) throw new Error('Não foi possível criar a conta.');
        if (!data.session) {
          setNotice('A conta foi criada. Confirme o e-mail e depois entre na sua conta para concluir a candidatura. Os dados desta candidatura ainda não foram enviados.');
          setLoading(false);
          return;
        }
        setUser(activeUser);
      }

      const socialLinks = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (youtube.trim()) socialLinks.youtube = youtube.trim();
      if (tiktok.trim()) socialLinks.tiktok = tiktok.trim();

      const { data: application, error: applicationError } = await supabase
        .from('media_applications')
        .insert({
          user_id: activeUser.id,
          display_name: displayName.trim(),
          country_id: countryId,
          content_category: category.trim(),
          languages: languages.split(',').map((item) => item.trim()).filter(Boolean),
          bio: bio.trim() || null,
          social_links: socialLinks,
          application_status: 'submitted',
        })
        .select('id')
        .single();
      if (applicationError) throw applicationError;
      await router.push('/media-payment?application=' + encodeURIComponent(application.id));
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar a candidatura.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Candidatura de Criador | MÍDIA TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <main style={{ minHeight: '100vh', padding: '26px 16px 50px', background: 'linear-gradient(150deg,#10172D,#26395F)', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 650, margin: '0 auto' }}>
          <Link href="/start" style={{ color: '#F4D77D', textDecoration: 'none', fontWeight: 700 }}>← Voltar às opções</Link>
          <div style={{ marginTop: 28, padding: '30px clamp(18px,5vw,38px)', borderRadius: 24, background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'inline-block', background: '#F8F0D9', color: '#85620D', borderRadius: 99, padding: '7px 12px', fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>MÍDIA TALAZA</div>
            <h1 style={{ color: '#17213C', fontSize: 29, margin: '15px 0 8px' }}>Candidatura de Criador</h1>
            <p style={{ color: '#657080', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Crie o seu perfil internacional de conteúdos. A candidatura e o pagamento serão analisados separadamente; o painel de criador só será ativado depois das duas confirmações.</p>

            {user && <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#EEF6F2', color: '#17604E', fontSize: 13 }}>Está ligado à sua conta existente{user.email ? ' (' + user.email + ')' : ''}. Não será criada outra conta.</div>}

            <form onSubmit={handleSubmit}>
              {!user && <>
                <label style={label} htmlFor="email">E-mail da conta</label>
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} placeholder="voce@email.com" />
                <label style={label} htmlFor="password">Palavra-passe</label>
                <input id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} placeholder="Mínimo de 6 caracteres" />
                <p style={{ color: '#657080', fontSize: 12, lineHeight: 1.5 }}>Já tem uma conta TALAZA? <Link href="/login?next=/media-creator-signup" style={{ color: '#0F6E5C', fontWeight: 800 }}>Entre aqui</Link>. Usaremos o mesmo acesso.</p>
              </>}

              <label style={label} htmlFor="displayName">Nome público do criador</label>
              <input id="displayName" required maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={field} placeholder="Como quer aparecer na MÍDIA TALAZA" />

              <label style={label} htmlFor="country">País principal</label>
              <select id="country" required value={countryId} onChange={(e) => setCountryId(e.target.value)} style={field}>
                <option value="">Escolher país</option>
                {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
              </select>

              <label style={label} htmlFor="category">Categoria de conteúdo</label>
              <input id="category" required maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} style={field} placeholder="Ex.: Música, Educação, Humor, Notícias..." />

              <label style={label} htmlFor="languages">Idiomas (separados por vírgulas)</label>
              <input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} style={field} placeholder="Português, Inglês..." />

              <label style={label} htmlFor="bio">Apresentação (opcional)</label>
              <textarea id="bio" maxLength={1200} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...field, resize: 'vertical' }} placeholder="Fale brevemente sobre o seu trabalho e os conteúdos que publica." />

              <div style={{ marginTop: 20, fontWeight: 900, color: '#17213C', fontSize: 14 }}>Redes sociais (opcional)</div>
              <label style={label} htmlFor="instagram">Instagram</label>
              <input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} style={field} placeholder="https://instagram.com/..." />
              <label style={label} htmlFor="youtube">YouTube</label>
              <input id="youtube" value={youtube} onChange={(e) => setYoutube(e.target.value)} style={field} placeholder="https://youtube.com/..." />
              <label style={label} htmlFor="tiktok">TikTok</label>
              <input id="tiktok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} style={field} placeholder="https://tiktok.com/@..." />

              {error && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#FCEBEC', color: '#A12B36', fontSize: 13 }}>{error}</div>}
              {notice && <div role="status" style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#EEF6F2', color: '#17604E', fontSize: 13, lineHeight: 1.55 }}>{notice} <Link href="/login?next=/media-creator-signup" style={{ color: '#0F6E5C', fontWeight: 800 }}>Entrar</Link></div>}
              <button disabled={loading} type="submit" style={{ width: '100%', marginTop: 22, border: 0, borderRadius: 13, padding: 15, background: 'linear-gradient(100deg,#D9B65C,#F1D88D)', color: '#1B2540', fontWeight: 900, fontSize: 15, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'A enviar candidatura…' : 'Continuar para o plano anual'}</button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
