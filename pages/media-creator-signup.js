import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const C = { navy:'#111A32', navy2:'#1D2B4D', gold:'#E8C66A', gold2:'#B98B2E', white:'#FFFFFF', ink:'#182238', muted:'#687386', line:'#E5E9F0', green:'#146653', red:'#B43A49' };
const input = { width:'100%', boxSizing:'border-box', padding:'14px 15px', border:'1px solid #DDE3EC', borderRadius:13, background:'#FFFFFF', color:C.ink, fontSize:15, outlineColor:C.gold2 };
const label = { display:'block', margin:'17px 0 8px', color:'#26334C', fontSize:13, fontWeight:800 };
const niches = [
  { group:'Entretenimento', items:['Humor e comédia','Cinema e séries','Celebridades e cultura pop','Lifestyle e quotidiano','Desafios e tendências'] },
  { group:'Arte e cultura', items:['Música','Dança','Moda e estilo','Beleza e cuidados pessoais','Arte e fotografia','Cultura e tradições'] },
  { group:'Conhecimento', items:['Educação e aprendizagem','Tecnologia e inovação','Ciência','História e atualidade','Livros e literatura','Idiomas'] },
  { group:'Vida e bem-estar', items:['Desporto e fitness','Culinária e gastronomia','Viagens e turismo','Família e relações','Desenvolvimento pessoal','Saúde e bem-estar'] },
  { group:'Negócios e profissão', items:['Empreendedorismo','Finanças e literacia financeira','Marketing e comunicação','Carreira e profissões','Agricultura e ambiente','Imobiliário'] },
  { group:'Comunidade', items:['Notícias e sociedade','Religião e espiritualidade','Causas sociais','Animais e natureza','Conteúdo infantil e familiar'] },
];
const dialCodes = { Angola:'+244', Brasil:'+55', 'Portugal':'+351', 'Moçambique':'+258', 'Cabo Verde':'+238', 'Guiné-Bissau':'+245', 'São Tomé e Príncipe':'+239', 'Estados Unidos':'+1', 'Canadá':'+1', 'Reino Unido':'+44', França:'+33', Itália:'+39', Alemanha:'+49', Espanha:'+34', 'África do Sul':'+27', Nigéria:'+234', 'Quénia':'+254', Índia:'+91', China:'+86', Japão:'+81' };
const languages = ['Português','Inglês','Francês','Espanhol','Italiano','Árabe','Mandarim','Suaíli','Lingala','Umbundu','Kimbundu','Kikongo'];
function ageOn(dateString) {
  if (!dateString) return null;
  const dob = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

export default function MediaCreatorSignup() {
  const [step,setStep] = useState(0);
  const [countries,setCountries] = useState([]);
  const [provinces,setProvinces] = useState([]);
  const [countryId,setCountryId] = useState('');
  const [provinceId,setProvinceId] = useState('');
  const [phone,setPhone] = useState('');
  const [birthDay,setBirthDay] = useState('');
  const [birthMonth,setBirthMonth] = useState('');
  const [birthYear,setBirthYear] = useState('');
  const [gender,setGender] = useState('');
  const [selectedNiches,setSelectedNiches] = useState([]);
  const [contentLanguages,setContentLanguages] = useState(['Português']);
  const [interfaceLanguage,setInterfaceLanguage] = useState('Português');
  const [interests,setInterests] = useState([]);
  const [displayName,setDisplayName] = useState('');
  const [username,setUsername] = useState('');
  const [bio,setBio] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [user,setUser] = useState(null);

  useEffect(() => {
    supabase.from('countries').select('id,name').order('name').then(({data,error}) => {
      if (!error) setCountries(data || []);
      else setError('Não foi possível carregar a lista de países.');
    });
    supabase.auth.getUser().then(({data}) => { if (data?.user) setUser(data.user); });
  }, []);

  useEffect(() => {
    if (!countryId) { setProvinces([]); setProvinceId(''); return; }
    supabase.from('provinces').select('id,name').eq('country_id',countryId).order('name')
      .then(({data,error}) => {
        if (error) setError('Não foi possível carregar as províncias deste país.');
        else setProvinces(data || []);
      });
  }, [countryId]);

  const countryName = countries.find(c => c.id === countryId)?.name || '';
  const dialCode = dialCodes[countryName] || '';
  const dob = birthYear && birthMonth && birthDay
    ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`
    : '';
  const age = useMemo(() => ageOn(dob),[dob]);
  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({length: currentYear - 1900 + 1}, (_,i) => currentYear - i);
  const daysInBirthMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;

  function toggle(list,setList,value) { setList(current => current.includes(value) ? current.filter(x=>x!==value) : [...current,value]); }
  function next() {
    setError(''); setNotice('');
    if (step===0) {
      if (!countryId || !provinceId || phone.replace(/\D/g,'').length < 6) return setError('Escolha o país, a província e introduza um número de telefone válido.');
      if (!dialCode) return setError('O indicativo deste país ainda não está configurado. Contacte o suporte.');
    }
    if (step===1) {
      if (!dob || !gender) return setError('Indique o dia, mês e ano de nascimento e escolha o género.');
      if (age === null || age < 28) return setError('A MÍDIA TALAZA está disponível para criadores com 28 anos ou mais.');
    }
    if (step===2 && selectedNiches.length===0) return setError('Escolha pelo menos um nicho de conteúdo.');
    if (step===3 && contentLanguages.length===0) return setError('Escolha pelo menos um idioma de publicação.');
    if (step===4 && (!displayName.trim() || !username.trim())) return setError('Preencha o nome público e o nome de utilizador.');
    if (step===5) {
      if (!user && (!email.trim() || password.length<8)) return setError('Introduza um email válido e uma palavra-passe com pelo menos 8 caracteres.');
      if (!/^[a-zA-Z0-9._]{3,24}$/.test(username)) return setError('O nome de utilizador deve ter 3 a 24 caracteres: letras, números, ponto ou underscore.');
      return submit();
    }
    setStep(s=>Math.min(s+1,5));
  }
  async function submit() {
    setLoading(true); setError(''); setNotice('');
    try {
      const fullPhone = dialCode + phone.replace(/\D/g,'');
      const metadata = {
        media_creator_onboarding: true,
        media_country_id: countryId,
        media_country: countryName,
        media_province_id: provinceId,
        // Phone, date of birth and gender are deliberately not placed in Auth metadata.
        // They require a private Media-only profile table with owner-only RLS.
        media_niches: selectedNiches,
        media_content_languages: contentLanguages,
        media_interface_language: interfaceLanguage,
        media_interests: interests,
        media_display_name: displayName.trim(),
        media_username: username.trim().replace(/^@/,'').toLowerCase(),
        media_bio: bio.trim(),
        media_account_type: 'creator',
      };
      if (user) {
        const {error:updateError} = await supabase.auth.updateUser({data:metadata});
        if (updateError) throw updateError;
        setNotice('Informações guardadas na sua conta. A verificação por SMS e a ativação do perfil serão ligadas numa fase posterior.');
      } else {
        const {data,error:signupError} = await supabase.auth.signUp({
          email:email.trim().toLowerCase(), password,
          options:{data:metadata}
        });
        if (signupError) throw signupError;
        if (!data?.user) throw new Error('Não foi possível criar a conta.');
        setNotice(data.session
          ? 'Conta criada. O cadastro inicial da MÍDIA TALAZA foi recebido. A verificação por SMS ficará desativada durante os testes.'
          : 'Conta criada. Confirme o email enviado para concluir o acesso. A verificação por SMS ficará desativada durante os testes.');
      }
    } catch(err) {
      const msg=String(err?.message||'');
      setError(msg.toLowerCase().includes('already registered') ? 'Este email já tem uma conta. Entre na sua conta para continuar.' : msg || 'Não foi possível guardar o cadastro.');
    } finally { setLoading(false); }
  }

  const stepNames = ['Localização','Sobre si','Nichos','Idiomas e interesses','Perfil público','Acesso'];
  return <>
    <Head><title>Criar conta de Criador | MÍDIA TALAZA</title><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
    <main style={{minHeight:'100vh',padding:'28px 16px 56px',background:'radial-gradient(circle at top,#34466F 0,#17233F 44%,#10172A 100%)',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>
        <Link href="/media-access" style={{color:C.gold,textDecoration:'none',fontWeight:800}}>← Voltar</Link>
        <header style={{textAlign:'center',color:C.white,margin:'26px 0 22px'}}>
          <div style={{fontSize:11,letterSpacing:3,fontWeight:900,color:C.gold}}>TALAZA • ECOSSISTEMA DE CRIADORES</div>
          <h1 style={{fontSize:'clamp(28px,5vw,38px)',margin:'10px 0 7px'}}>Entre para a MÍDIA TALAZA</h1>
          <p style={{color:'#C8D0DF',fontSize:14,lineHeight:1.6,margin:0}}>Um cadastro simples, passo a passo, para uma comunidade internacional de criadores.</p>
        </header>
        <section style={{background:C.white,borderRadius:24,padding:'clamp(20px,4vw,34px)',boxShadow:'0 24px 70px rgba(0,0,0,.28)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:900,color:C.navy}}>{step+1} de 6 · {stepNames[step]}</span>
            <span style={{fontSize:12,color:C.muted}}>{Math.round((step+1)/6*100)}%</span>
          </div>
          <div style={{height:6,borderRadius:20,background:'#EDF0F5',overflow:'hidden',marginBottom:24}}><div style={{height:'100%',width:((step+1)/6*100)+'%',background:'linear-gradient(90deg,#B98B2E,#F0D889)',transition:'width .2s'}}/></div>

          {step===0 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Onde está?</h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.55,margin:'0 0 12px'}}>Esta localização ajuda a adaptar a experiência e a descobrir conteúdos relevantes.</p>
            <label style={label}>País</label>
            <select value={countryId} onChange={e=>{setCountryId(e.target.value);setPhone('');}} style={input}><option value="">Selecionar país</option>{countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label style={label}>Província / região</label>
            <select value={provinceId} onChange={e=>setProvinceId(e.target.value)} disabled={!countryId} style={input}><option value="">Selecionar província</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <label style={label}>Número de telefone</label>
            <div style={{display:'flex',gap:9}}>
              <div style={{minWidth:82,padding:'14px 10px',border:'1px solid #DDE3EC',borderRadius:13,background:'#F5F7FA',fontWeight:900,color:C.navy,textAlign:'center'}}>{dialCode||'+'}</div>
              <input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9\s()-]/g,''))} placeholder="Número sem indicativo" style={{...input,flex:1,minWidth:0}}/>
            </div>
            <p style={{fontSize:11,color:C.muted,lineHeight:1.5,marginTop:9}}>O número será guardado para contacto. A confirmação por SMS não será ativada durante os testes.</p>
          </>}
          {step===1 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Sobre si</h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.55}}>A MÍDIA TALAZA aceita criadores a partir dos 28 anos. A data de nascimento não será exibida no perfil público.</p>
            <label style={label}>Data de nascimento</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1.2fr',gap:8}}>
              <select aria-label="Dia de nascimento" value={birthDay} onChange={e=>setBirthDay(e.target.value)} style={input}>
                <option value="">Dia</option>{Array.from({length:daysInBirthMonth},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Mês de nascimento" value={birthMonth} onChange={e=>{setBirthMonth(e.target.value);setBirthDay('');}} style={input}>
                <option value="">Mês</option>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select aria-label="Ano de nascimento" value={birthYear} onChange={e=>{setBirthYear(e.target.value);setBirthDay('');}} style={input}>
                <option value="">Ano</option>{birthYears.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <p style={{fontSize:11,color:C.muted,margin:'7px 0 0'}}>Selecione o dia, o mês e o ano. A lista inclui todos os anos desde 1900.</p>
            {dob && <p style={{fontSize:13,fontWeight:800,color:age>=28?C.green:C.red,margin:'8px 0'}}>Idade calculada: {age} anos {age>=28?'— pode continuar':'— é necessário ter 28 anos completos'}</p>}
            <label style={label}>Género</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9}}>
              {['Feminino','Masculino','Outro','Prefiro não informar'].map(v=><button key={v} type="button" onClick={()=>setGender(v)} style={{padding:13,borderRadius:12,border:gender===v?'2px solid #B98B2E':'1px solid #DDE3EC',background:gender===v?'#FBF5E6':'#FFFFFF',color:C.ink,fontWeight:800,cursor:'pointer'}}>{v}</button>)}
            </div>
          </>}
          {step===2 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Que conteúdos gosta de criar?</h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.55}}>Escolha todos os nichos que combinam consigo. Esta seleção ajuda a organizar a descoberta e as recomendações.</p>
            {niches.map(group=><div key={group.group} style={{marginTop:17}}>
              <h3 style={{fontSize:13,color:C.navy,margin:'0 0 9px'}}>{group.group}</h3>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{group.items.map(item=><button key={item} type="button" onClick={()=>toggle(selectedNiches,setSelectedNiches,item)} style={{border:selectedNiches.includes(item)?'1px solid #B98B2E':'1px solid #E1E6EE',background:selectedNiches.includes(item)?'#FBF3DF':'#FFFFFF',color:selectedNiches.includes(item)?'#765414':'#48566D',borderRadius:30,padding:'9px 12px',fontSize:12,fontWeight:800,cursor:'pointer'}}>{selectedNiches.includes(item)?'✓ ':''}{item}</button>)}</div>
            </div>)}
            <p style={{fontSize:11,color:C.muted,marginTop:13}}>Pode selecionar vários nichos e alterá-los mais tarde no seu perfil.</p>
          </>}
          {step===3 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Idiomas e interesses</h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.55}}>O idioma em que publica pode ser diferente do idioma que prefere usar na aplicação.</p>
            <label style={label}>Idiomas em que pretende publicar</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{languages.map(v=><button key={v} type="button" onClick={()=>toggle(contentLanguages,setContentLanguages,v)} style={{border:contentLanguages.includes(v)?'1px solid #B98B2E':'1px solid #E1E6EE',background:contentLanguages.includes(v)?'#FBF3DF':'#FFFFFF',color:C.ink,borderRadius:25,padding:'9px 12px',fontSize:12,fontWeight:800}}>{contentLanguages.includes(v)?'✓ ':''}{v}</button>)}</div>
            <label style={label}>Idioma da aplicação</label>
            <select value={interfaceLanguage} onChange={e=>setInterfaceLanguage(e.target.value)} style={input}>{languages.slice(0,8).map(v=><option key={v}>{v}</option>)}</select>
            <label style={label}>Outros assuntos de que gosta (opcional)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{['Tecnologia','Viagens','Moda','Desporto','Música','Educação','Negócios','Culinária','Cultura','Natureza','Atualidade','Família'].map(v=><button key={v} type="button" onClick={()=>toggle(interests,setInterests,v)} style={{border:interests.includes(v)?'1px solid #B98B2E':'1px solid #E1E6EE',background:interests.includes(v)?'#FBF3DF':'#FFFFFF',color:C.ink,borderRadius:25,padding:'9px 12px',fontSize:12,fontWeight:800}}>{interests.includes(v)?'✓ ':''}{v}</button>)}</div>
          </>}
          {step===4 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Crie a sua identidade</h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.55}}>Estes dados formam a apresentação pública do seu perfil de criador.</p>
            <label style={label}>Nome público</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80} placeholder="Nome que as pessoas vão ver" style={input}/>
            <label style={label}>Nome de utilizador</label><input value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g,''))} maxLength={24} placeholder="ex.: @criador" style={input}/>
            <p style={{fontSize:11,color:C.muted,marginTop:6}}>3 a 24 caracteres. Letras, números, ponto e underscore. Sem links externos.</p>
            <label style={label}>Breve apresentação (opcional)</label><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={4} placeholder="Conte à comunidade o que cria e o que a inspira." style={{...input,resize:'vertical'}}/>
          </>}
          {step===5 && <>
            <h2 style={{fontSize:23,color:C.ink,margin:'0 0 6px'}}>Proteja o seu acesso</h2>
            {user ? <p style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Vai associar este perfil à conta já autenticada. Não será criada uma segunda identidade de acesso.</p> : <>
              <p style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Durante os testes, o acesso será criado com email e palavra-passe. A autenticação por telefone/SMS será ligada apenas quando a versão for preparada para produção.</p>
              <label style={label}>Email</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" style={input}/>
              <label style={label}>Palavra-passe</label><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" style={input}/>
            </>}
            <div style={{marginTop:18,padding:13,borderRadius:12,background:'#F5F7FA',fontSize:12,color:C.muted,lineHeight:1.6}}>Ao continuar, confirma que os dados fornecidos são verdadeiros e aceita os Termos e a Política de Privacidade da MÍDIA TALAZA. A data de nascimento e o género são privados. A personalização de anúncios deverá respeitar a legislação aplicável e as suas escolhas de privacidade.</div>
          </>}
          {error && <div role="alert" style={{marginTop:17,padding:12,borderRadius:11,background:'#FFF0F1',color:C.red,fontSize:13,lineHeight:1.5}}>{error}</div>}
          {notice && <div role="status" style={{marginTop:17,padding:14,borderRadius:11,background:'#EAF5F0',color:'#155B49',fontSize:13,lineHeight:1.6}}>{notice}{!user && <p style={{margin:'10px 0 0'}}><Link href="/login?next=/media" style={{color:'#155B49',fontWeight:900}}>Ir para entrar</Link></p>}</div>}
          <div style={{display:'flex',gap:10,marginTop:24}}>
            {step>0 && <button type="button" disabled={loading} onClick={()=>{setError('');setStep(s=>s-1)}} style={{padding:'14px 18px',borderRadius:13,border:'1px solid #DDE3EC',background:'#FFFFFF',color:C.navy,fontWeight:900,cursor:'pointer'}}>Voltar</button>}
            <button type="button" disabled={loading || !!notice} onClick={next} style={{flex:1,padding:15,border:0,borderRadius:13,background:'linear-gradient(100deg,#D5B15A,#F1D98F)',color:'#1B2540',fontWeight:900,fontSize:15,cursor:loading?'wait':'pointer',opacity:loading||notice?.5:1}}>{loading?'A guardar…':step===5?'Concluir cadastro':'Seguinte'}</button>
          </div>
          <p style={{textAlign:'center',fontSize:11,color:C.muted,margin:'18px 0 0'}}>MÍDIA TALAZA · Cadastro de Criador</p>
        </section>
      </div>
    </main>
  </>;
}
