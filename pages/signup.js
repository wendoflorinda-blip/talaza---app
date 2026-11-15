import DateOfBirthFields from '../components/DateOfBirthFields';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import Unavailable from '../components/Unavailable';
import { Card, Field, ErrorBox, PrimaryButton, CountrySelect, PhoneField, PasswordField, Progress, inputStyle } from '../components/Fields';
import { C, countryInfo, isAngola, validAngolanPhone, fullPhone } from '../lib/talaza';

function calculateAge(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
  return age;
}

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [blockedCountry, setBlockedCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const country = countries.find((c) => c.id === countryId);
  const dial = countryInfo(country?.name).dial;
  const age = calculateAge(dateOfBirth);

  useEffect(() => { loadCountries(); }, []);
  useEffect(() => {
    if (!countryId) { setProvinces([]); setProvinceId(''); return; }
    loadProvinces(countryId);
  }, [countryId]);

  async function loadCountries() {
    const { data, error: countriesError } = await supabase.from('countries').select('id, name').order('name', { ascending: true });
    if (countriesError) { setError('Não foi possível carregar a lista de países.'); return; }
    const list = [...(data || [])].sort((a,b)=>(isAngola(b.name)?1:0)-(isAngola(a.name)?1:0));
    setCountries(list);
    const angola = list.find((c)=>isAngola(c.name));
    setCountryId((prev)=>prev || angola?.id || list[0]?.id || '');
  }
  async function loadProvinces(id) {
    const { data, error: provincesError } = await supabase.from('provinces').select('id, name').eq('country_id',id).order('name',{ascending:true});
    if (provincesError) { setError('Não foi possível carregar as províncias.'); return; }
    setProvinces(data || []);
  }
  function nextStep(e) {
    e.preventDefault(); setError('');
    if (step===1) {
      if (!country) return setError('Escolhe o teu país.');
      if (!isAngola(country.name)) { setBlockedCountry(country.name); return; }
      if (!provinceId) return setError('Escolhe a tua província.');
      setStep(2); window.scrollTo(0,0); return;
    }
    if (step===2) {
      if (!fullName.trim()) return setError('Escreve o teu nome completo.');
      if (!validAngolanPhone(phone,dial)) return setError('Introduz um número de telefone válido, com 9 dígitos (ex.: 923 456 789).');
      if (!gender) return setError('Escolhe o teu género.');
      if (!dateOfBirth) return setError('Indica a tua data de nascimento.');
      if (age===null) return setError('A data de nascimento não é válida. Verifica o dia, mês e ano.');
      if (age<18) return setError('Para criar uma conta Talaza, é necessário ter pelo menos 18 anos completos.');
      setStep(3); window.scrollTo(0,0); return;
    }
    submit();
  }
  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Introduz um endereço de e-mail válido.');
    if (password.length<6) return setError('A senha deve ter pelo menos 6 caracteres.');
    setLoading(true); setError('');
    try {
      const { data: proofData, error: proofError } = await supabase.functions.invoke('talaza-signup-proof', { body: { action:'encrypt', signup_type:'explorer', country_id:countryId, province_id:provinceId, email:email.trim().toLowerCase(), name:fullName.trim(), phone:fullPhone(dial,phone), gender:gender.toLowerCase(), date_of_birth:dateOfBirth } });
      if (proofError || !proofData?.proof) throw new Error('PROOF_FAILED');
      const pendingExplorer = { name:fullName.trim(), country_id:countryId, province_id:provinceId, phone:fullPhone(dial,phone), gender:gender.toLowerCase() };
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:email.trim().toLowerCase(), password,
        options:{ data:{ talaza_pending_signup_type:'explorer', talaza_pending_explorer:pendingExplorer, talaza_dob_proof:proofData.proof }, emailRedirectTo:typeof window!=='undefined'? `${window.location.origin}/auth/callback`:undefined }
      });
      if (authError || !authData?.user || (Array.isArray(authData.user.identities)&&authData.user.identities.length===0)) {
        setError('Não foi possível concluir o cadastro com estes dados. Verifica as informações ou entra na tua conta.'); return;
      }
      if (authData.session) { await router.replace('/auth/callback'); return; }
      setError('Verifica o teu e-mail. Enviámos um link para confirmares e ativares a tua conta.');
    } catch(err) {
      console.error(err);
      setError('Não foi possível concluir o cadastro neste momento. Verifica os dados e tenta novamente.');
    } finally { setLoading(false); }
  }

  if (blockedCountry) return <AuthShell backHref="/start"><Head><title>País indisponível | Talaza</title></Head><Unavailable country={blockedCountry} onBack={()=>setBlockedCountry('')}/></AuthShell>;

  return <AuthShell backHref="/start">
    <Head><title>Explorar Talaza | Criar conta</title></Head>
    <Card>
      <div style={{display:'inline-block',padding:'7px 12px',borderRadius:999,background:C.soft,color:C.green,fontSize:12,fontWeight:800}}>Explorar Talaza</div>
      <h1 style={{margin:'14px 0 6px',color:C.ink,fontSize:27}}>Crie a sua conta</h1>
      <p style={{margin:'0 0 18px',color:C.muted,fontSize:14,lineHeight:1.6}}>Uma conta para explorar a Talaza e encontrar negócios perto de si.</p>
      <Progress current={step} total={3} label={step===1?'localização':step===2?'os seus dados':'acesso'}/>
      <form onSubmit={nextStep} noValidate>
        {step===1 && <>
          <Field id="country" label="País" required><CountrySelect id="country" countries={countries} value={countryId} onChange={setCountryId}/></Field>
          <Field id="province" label="Província" required><select id="province" value={provinceId} onChange={e=>setProvinceId(e.target.value)} style={inputStyle}><option value="">Escolher província</option>{provinces.map(p=><option key={p.id} value={p.id}>{String(p.name).trim()}</option>)}</select></Field>
        </>}
        {step===2 && <>
          <Field id="name" label="Nome completo" required><input id="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="O teu nome completo" autoComplete="name" style={inputStyle}/></Field>
          <Field id="phone" label="Número de telefone (+244)" required><PhoneField id="phone" countryName={country?.name} value={phone} onChange={setPhone}/></Field>
          <Field id="gender" label="Género" required><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{['Feminino','Masculino'].map(v=><button key={v} type="button" onClick={()=>setGender(v)} aria-pressed={gender===v} style={{padding:14,borderRadius:12,border:gender===v?'2px solid #B98B2E':'1px solid #DDE3EC',background:gender===v?'#FBF5E6':'#FFFFFF',color:C.ink,fontWeight:800}}>{v}</button>)}</div></Field>
          <Field id="dob" label="Data de nascimento" required><DateOfBirthFields value={dateOfBirth} onChange={setDateOfBirth} inputStyle={inputStyle}/></Field>
          {dateOfBirth && <p role="status" style={{fontSize:13,fontWeight:800,color:age!==null&&age>=18?C.green:C.red,margin:'8px 0 12px'}}>{age===null?'Data inválida':age>=18?`Idade calculada: ${age} anos`:`Tens ${age} anos. É necessário ter pelo menos 18 anos completos.`}</p>}
        </>}
        {step===3 && <>
          <Field id="email" label="E-mail" required><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" style={inputStyle}/></Field>
          <Field id="password" label="Senha" required><PasswordField id="password" value={password} onChange={setPassword} placeholder="Mínimo de 6 caracteres"/></Field>
          <p style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Depois de criar a conta, confirma o teu e-mail através do link que vamos enviar.</p>
        </>}
        <ErrorBox>{error}</ErrorBox>
        {error.includes('Verifica o teu e-mail') && <button type="button" onClick={()=>router.push('/resend-confirmation')} style={{width:'100%',marginTop:10,padding:12,borderRadius:12,border:'1px solid #B98B2E',background:'#FBF5E6',color:C.green,fontWeight:800}}>Não recebeste o e-mail? Reenviar link</button>}
        <div style={{display:'flex',gap:10,marginTop:16}}>
          {step>1 && <button type="button" onClick={()=>{setError('');setStep(s=>s-1)}} style={{padding:'13px 18px',borderRadius:12,border:'1px solid #DDE3EC',background:'#FFF',color:C.ink,fontWeight:800}}>Voltar</button>}
          <div style={{flex:1}}><PrimaryButton type="submit" loading={loading}>{loading?'A processar…':step===3?'Criar conta':'Seguinte'}</PrimaryButton></div>
        </div>
      </form>
    </Card>
  </AuthShell>;
}
