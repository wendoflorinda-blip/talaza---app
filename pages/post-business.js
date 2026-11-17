import DateOfBirthFields from '../components/DateOfBirthFields';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import Unavailable from '../components/Unavailable';
import {
  Card,
  Field,
  ErrorBox,
  PrimaryButton,
  ImagePicker,
  CountrySelect,
  PhoneField,
  PasswordField,
  Progress,
  inputStyle,
} from '../components/Fields';
import {
  C,
  countryInfo,
  isAngola,
  validAngolanPhone,
  fullPhone,
  resizeImage,
  uploadPublicImage,
} from '../lib/talaza';

function calculateAge(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(y,m-1,d);
  if (date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d) return null;
  const now = new Date(); let age=now.getFullYear()-y;
  if (now.getMonth()+1<m || (now.getMonth()+1===m && now.getDate()<d)) age--;
  return age;
}

const DAYS_OPTIONS = [
  'Segunda a sexta',
  'Segunda a sábado',
  'Todos os dias',
  'Fins de semana',
];

export default function PostBusiness() {
  const [step, setStep] = useState(1);
  const [blockedCountry, setBlockedCountry] = useState('');

  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const age = calculateAge(dateOfBirth);

  /* Passo 1: os dados do vendedor */
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryId, setCountryId] = useState('');
  const [password, setPassword] = useState('');

  /* Passo 2: o negócio */
  const [storeName, setStoreName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [days, setDays] = useState(DAYS_OPTIONS[0]);
  const [opensAt, setOpensAt] = useState('08:00');
  const [closesAt, setClosesAt] = useState('18:00');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  /* Listas */
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* Resultado */
  const [businessId, setBusinessId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const country = countries.find((c) => c.id === countryId);
  const dial = countryInfo(country?.name).dial;

  useEffect(() => {
    loadCountries();
    loadCategories();
    checkSession();
  }, []);

  useEffect(() => {
    setProvinceId('');

    if (!countryId) {
      setProvinces([]);
      return;
    }

    loadProvinces(countryId);
  }, [countryId]);

  useEffect(() => {
    setSubcategoryId('');
    setSubcategories([]);

    if (!categoryId) return;

    loadSubcategories(categoryId);
  }, [categoryId]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    setUser(session.user);
    setEmail(session.user.email || '');

    const isResume = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('resume') === '1';
    const pending = session.user.user_metadata?.talaza_pending_seller;

    if (isResume) {
      if (pending?.name) setProfileName(pending.name);
      if (pending?.phone) setPhone(pending.phone);
      if (pending?.country_id) setCountryId(pending.country_id);
      if (!pending?.name || !pending?.phone || !pending?.country_id) {
        setError('Não foi possível recuperar todos os dados do cadastro. Contacta o suporte Talaza.');
      } else {
        setStep(2);
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, country_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.name) setProfileName(profile.name);
      if (profile?.country_id) setCountryId(profile.country_id);
    }

    // Se já existe um negócio, não repetir o cadastro: abrir diretamente o painel.
    const { data: existingBusiness, error: existingBusinessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingBusinessError && existingBusiness?.id) {
      window.location.replace('/seller');
    }
  }

  async function loadCountries() {
    const { data, error: countriesError } = await supabase
      .from('countries')
      .select('id, name')
      .order('name', { ascending: true });

    if (countriesError) {
      console.error(countriesError);
      setError('Não foi possível carregar a lista de países.');
      return;
    }

    const list = [...(data || [])].sort(
      (a, b) => (isAngola(b.name) ? 1 : 0) - (isAngola(a.name) ? 1 : 0)
    );

    setCountries(list);

    const angola = list.find((c) => isAngola(c.name));
    setCountryId((prev) => prev || angola?.id || list[0]?.id || '');
  }

  async function loadProvinces(id) {
    const { data, error: provincesError } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', id)
      .order('name', { ascending: true });

    if (provincesError) {
      console.error(provincesError);
      return;
    }

    setProvinces(data || []);
  }

  async function loadCategories() {
    const { data, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('active', true)
      .eq('signup_visible', true)
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error(categoriesError);
      setError('Não foi possível carregar as categorias.');
      return;
    }

    setCategories(data || []);
  }

  async function loadSubcategories(id) {
    const { data, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('id, name')
      .eq('category_id', id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (subcategoriesError) {
      console.error(subcategoriesError);
      setError('Não foi possível carregar as subcategorias.');
      return;
    }

    // Ignora respostas atrasadas de uma categoria que já deixou de estar selecionada.
    if (categoryId !== id) return;

    setSubcategories(data || []);
  }

  function pickLogo(file) {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function pickCover(file) {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  // Passo 1: validar apenas a localização. Nenhuma conta é criada nesta etapa.
  async function handleStep1(e) {
    e.preventDefault(); setError('');
    if (!countryId) return setError('Escolha o seu país.');
    if (!provinceId) return setError('Escolha a sua província.');
    if (!isAngola(country?.name)) { setBlockedCountry(country?.name || ''); return; }
    setStep(2); window.scrollTo(0, 0);
  }

  // Passo 2: dados pessoais e dados completos do negócio.
  async function handleStep2(e) {
    e.preventDefault(); setError('');
    if (!profileName.trim()) return setError('Digite o seu nome completo.');
    if (!validAngolanPhone(phone, dial)) return setError('Digite um telefone válido com 9 dígitos.');
    if (!gender) return setError('Escolha Feminino ou Masculino.');
    if (!dateOfBirth || age === null) return setError('Indique uma data de nascimento válida.');
    if (age < 18) return setError('É necessário ter pelo menos 18 anos completos.');
    if (!storeName.trim()) return setError('Digite o nome da loja.');
    if (!categoryId) return setError('Escolha uma categoria.');
    if (!subcategoryId) return setError('Escolha uma subcategoria.');
    const selectedSubcategory = subcategories.find(
      (subcategory) => subcategory.id === subcategoryId
    );
    if (!selectedSubcategory) {
      return setError('A subcategoria escolhida não pertence à categoria selecionada. Escolha novamente.');
    }
    if (whatsapp.trim() && !validAngolanPhone(whatsapp, dial)) return setError('O contacto deve ter 9 dígitos.');
    setStep(3); window.scrollTo(0, 0);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
      reader.readAsDataURL(blob);
    });
  }

  // Passo 3: só agora é criada a conta, com o envelope cifrado completo.
  async function submitRegistration(e) {
    e.preventDefault(); setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) return setError('Introduza um e-mail válido.');
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    setLoading(true);
    try {
      const businessPending = {
        name: profileName.trim(), phone: fullPhone(dial, phone), country_id: countryId, province_id: provinceId,
        store_name: storeName.trim(), description: description.trim(), category_id: categoryId, subcategory_id: subcategoryId,
        municipality: municipality.trim(), neighborhood: neighborhood.trim(),
        business_phone: fullPhone(dial, phone), whatsapp: whatsapp.trim() ? fullPhone(dial, whatsapp) : null,
        opening_hours: `${days}, ${opensAt} às ${closesAt}`,
      };
      const pendingMedia = {};
      if (logoFile) pendingMedia.logo = await blobToDataUrl(await resizeImage(logoFile, { max:640, square:true }));
      if (coverFile) pendingMedia.cover = await blobToDataUrl(await resizeImage(coverFile, { max:1280 }));
      if (Object.keys(pendingMedia).length) {
        try { localStorage.setItem('talaza_pending_seller_media', JSON.stringify(pendingMedia)); }
        catch { throw new Error('IMAGE_STORAGE_LIMIT'); }
      }
      const { data: proofData, error: proofError } = await supabase.functions.invoke('talaza-signup-proof', {
        body: { action:'encrypt', signup_type:'seller', country_id:countryId, province_id:provinceId,
          name:profileName.trim(), phone:fullPhone(dial,phone), gender:gender.toLowerCase(),
          date_of_birth:dateOfBirth, email:normalizedEmail },
      });
      if (proofError || !proofData?.proof || proofData?.version !== 4) throw new Error('PROOF_FAILED');
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail, password,
        options: { data: { talaza_pending_signup_type:'seller', talaza_pending_seller:businessPending,
          talaza_dob_proof:proofData.proof }, emailRedirectTo:`${window.location.origin}/auth/callback` },
      });
      if (signupError || !data?.user || (Array.isArray(data.user.identities) && data.user.identities.length===0)) {
        throw new Error('SIGNUP_FAILED');
      }
      if (data.session) { window.location.assign('/auth/callback'); return; }
      setError('Cadastro guardado. Confirma o teu e-mail através do link enviado para ativar a conta.');
    } catch (err) {
      console.error('Erro no cadastro do vendedor:', err);
      setError('Não foi possível concluir o cadastro. Verifica os dados e tenta novamente.');
    } finally { setLoading(false); }
  }

  // Ecrãs

  if (blockedCountry) {
    return (
      <AuthShell backHref="/start">
        <Head>
          <title>País indisponível | Talaza</title>
        </Head>

        <Unavailable
          country={blockedCountry}
          onBack={() => setBlockedCountry('')}
        />
      </AuthShell>
    );
  }

  /* Passo 3: email e palavra-passe */
  if (step === 3) {
    return (
      <AuthShell onBack={() => { setError(''); setStep(2); }}>
        <Head><title>Acesso de vendedor | Talaza</title></Head>
        <Progress current={3} total={3} label="acesso" />
        <Card>
          <h1 style={{ margin:'0 0 8px', color:C.ink, fontSize:26 }}>Crie o seu acesso</h1>
          <p style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>Os dados pessoais e do negócio ficam associados à confirmação deste e-mail.</p>
          <form onSubmit={submitRegistration} noValidate>
            <Field id="email" label="E-mail" required><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="seu@email.com" style={inputStyle}/></Field>
            <Field id="password" label="Senha" required><PasswordField id="password" value={password} onChange={setPassword} placeholder="Mínimo de 8 caracteres"/></Field>
            <ErrorBox>{error}</ErrorBox>
            <PrimaryButton type="submit" loading={loading}>{loading?'A criar a conta…':'Criar conta'}</PrimaryButton>
          </form>
        </Card>
      </AuthShell>
    );
  }

  /* Passo 2: configurar o negócio */
  if (step === 2) {
    return (
      <AuthShell
        onBack={() => {
          setError('');
          setStep(1);
        }}
      >
        <Head>
          <title>Configure o seu negócio | Talaza</title>
        </Head>

        <Progress current={2} total={3} label="os seus dados e negócio" />

        <Card>
          <h1 style={{ margin: '0 0 6px', color: C.ink, fontSize: 26 }}>
            Configure o seu negócio
          </h1>

          <p
            style={{
              margin: 0,
              color: C.muted,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Estas informações aparecem no perfil da sua loja.
          </p>

          <form onSubmit={handleStep2} noValidate>
            <Field id="profileName" label="Nome completo" required><input id="profileName" value={profileName} onChange={e=>setProfileName(e.target.value)} autoComplete="name" placeholder="O seu nome completo" style={inputStyle}/></Field>
            <Field id="phone" label="Telefone (+244)" required><PhoneField id="phone" countryName={country?.name} value={phone} onChange={setPhone}/></Field>
            <Field id="gender" label="Género" required><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{['Feminino','Masculino'].map(v=><button key={v} type="button" onClick={()=>setGender(v)} aria-pressed={gender===v} style={{padding:13,borderRadius:12,border:gender===v?'2px solid #B98B2E':'1px solid #DDE3EC',background:gender===v?'#FBF5E6':'#FFF',fontWeight:800}}>{v}</button>)}</div></Field>
            <Field id="dob" label="Data de nascimento" required><DateOfBirthFields value={dateOfBirth} onChange={setDateOfBirth} inputStyle={inputStyle}/></Field>
            {dateOfBirth && <p style={{fontSize:12,color:age>=18?C.green:C.red}}>Idade calculada: {age===null?'data inválida':age+' anos'}</p>}

            <Field id="storeName" label="Nome da loja" required>
              <input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex.: Boutique Flor"
                style={inputStyle}
              />
            </Field>

            <div style={{ marginTop: 20 }}>
              <ImagePicker
                id="logo"
                preview={logoPreview}
                onFile={pickLogo}
                icon="🖼️"
                caption="Logo da loja"
              />
            </div>

            <Field id="category" label="Categoria" required>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Escolher categoria</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {String(category.name).trim()}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="subcategory" label="Subcategoria" required>
              <select
                id="subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId}
                style={inputStyle}
              >
                <option value="">
                  {categoryId
                    ? 'Escolher subcategoria'
                    : 'Escolha primeiro a categoria'}
                </option>

                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </Field>



            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                gap: 14,
              }}
            >
              <Field id="municipality" label="Município">
                <input
                  id="municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ex.: Talatona"
                  style={inputStyle}
                />
              </Field>

              <Field id="neighborhood" label="Bairro">
                <input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex.: Benfica"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field id="description" label="Descrição">
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Conte em poucas linhas o que o seu negócio oferece."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>

            <Field id="whatsapp" label="Contacto">
              <PhoneField
                id="whatsapp"
                countryName={country?.name}
                value={whatsapp}
                onChange={setWhatsapp}
              />
            </Field>

            <Field id="days" label="Horário de atendimento">
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              >
                {DAYS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <input
                  type="time"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  aria-label="Abre às"
                  style={inputStyle}
                />

                <input
                  type="time"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  aria-label="Fecha às"
                  style={inputStyle}
                />
              </div>
            </Field>

            <div style={{ marginTop: 18 }}>
              <span
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 700,
                  color: C.ink,
                  fontSize: 14,
                }}
              >
                Imagem de vitrine
              </span>

              <ImagePicker
                id="cover"
                shape="rect"
                preview={coverPreview}
                onFile={pickCover}
                icon="🖼️"
                caption="É a imagem principal que os clientes vão ver"
              />
            </div>

            <ErrorBox>{error}</ErrorBox>

            <PrimaryButton type="submit" loading={loading}>
              {loading ? 'A criar o seu perfil…' : 'Seguinte'}
            </PrimaryButton>
          </form>
        </Card>
      </AuthShell>
    );
  }

  /* Passo 1: país e província */
  return (
    <AuthShell backHref="/start">
      <Head><title>Localização do vendedor | Talaza</title></Head>
      <Progress current={1} total={3} label="localização" />
      <Card>
        <h1 style={{ margin:'0 0 8px', color:C.ink, fontSize:26 }}>Onde fica o seu negócio?</h1>
        <p style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>Escolha primeiro o país e a província. A conta só será criada no último passo.</p>
        <form onSubmit={handleStep1} noValidate>
          <Field id="country" label="País" required><CountrySelect id="country" countries={countries} value={countryId} onChange={setCountryId}/></Field>
          <Field id="province" label="Província" required>
            <select id="province" value={provinceId} onChange={e=>setProvinceId(e.target.value)} disabled={!countryId} style={inputStyle}>
              <option value="">Escolher província</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <PrimaryButton type="submit">Seguinte</PrimaryButton>
        </form>
      </Card>
    </AuthShell>
  );
}
