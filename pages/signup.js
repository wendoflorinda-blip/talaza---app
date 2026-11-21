import DateOfBirthFields from '../components/DateOfBirthFields';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import Unavailable from '../components/Unavailable';
import {
  Card,
  Field,
  ErrorBox,
  PrimaryButton,
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
} from '../lib/talaza';

function calculateAge(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - year;

  if (
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
  ) {
    age--;
  }

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
  const [pendingProvinceId, setPendingProvinceId] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [existingPrivateDob, setExistingPrivateDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [blockedCountry, setBlockedCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const country = countries.find((item) => item.id === countryId);
  const dial = countryInfo(country?.name).dial;
  const age = calculateAge(dateOfBirth);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!countryId) {
      setProvinces([]);
      setProvinceId('');
      return;
    }

    loadProvinces(countryId);
  }, [countryId]);

  useEffect(() => {
    if (!pendingProvinceId || !provinces.length) return;

    const exists = provinces.some(
      (province) => province.id === pendingProvinceId
    );

    if (exists) {
      setProvinceId(pendingProvinceId);
      setPendingProvinceId('');
    }
  }, [provinces, pendingProvinceId]);

  async function initialize() {
    setAuthChecking(true);
    await loadCountries();
    await checkSession();
    setAuthChecking(false);
  }

  async function loadCountries() {
    const { data, error: countriesError } = await supabase
      .from('countries')
      .select('id, name')
      .order('name', { ascending: true });

    if (countriesError) {
      console.error('Erro ao carregar países:', countriesError);
      setError('Não foi possível carregar a lista de países.');
      return;
    }

    const list = [...(data || [])].sort(
      (a, b) =>
        (isAngola(b.name) ? 1 : 0) -
        (isAngola(a.name) ? 1 : 0)
    );

    setCountries(list);

    const angola = list.find((item) => isAngola(item.name));
    setCountryId((current) => current || angola?.id || list[0]?.id || '');
  }

  async function loadProvinces(id) {
    const { data, error: provincesError } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', id)
      .order('name', { ascending: true });

    if (provincesError) {
      console.error('Erro ao carregar províncias:', provincesError);
      setError('Não foi possível carregar as províncias.');
      return;
    }

    setProvinces(data || []);
  }

  async function checkSession() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) return;

      const user = session.user;
      const metadata = user.user_metadata || {};
      const appMetadata = user.app_metadata || {};

      setSessionUser(user);
      setEmail(user.email || '');

      const isCreator =
        metadata.media_account_type === 'creator' ||
        metadata.media_creator_onboarding === true ||
        appMetadata.media_account_type === 'creator';

      if (isCreator) {
        await router.replace('/media');
        return;
      }

      const { data: mainAdmin, error: mainAdminError } = await supabase
        .from('admin_users').select('id').eq('id', user.id).maybeSingle();
      if (mainAdminError) console.warn('Não foi possível verificar o perfil de administrador:', mainAdminError);
      if (mainAdmin?.id) {
        await router.replace('/admin/painel');
        return;
      }

      if (metadata.talaza_pending_signup_type === 'seller') {
        await router.replace('/post-business?resume=1');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,name,country_id,province_id,phone,gender,account_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const accountType = String(
        profile?.account_type || metadata.account_type || appMetadata.account_type || ''
      ).trim().toLowerCase();

      if (['vendedor', 'seller', 'business'].includes(accountType)) {
        await router.replace('/seller');
        return;
      }

      const { data: existingBusiness, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (businessError) throw businessError;

      if (existingBusiness?.id) {
        await router.replace('/seller');
        return;
      }

      if (profile?.name) setFullName(profile.name);

      if (profile?.country_id) {
        setCountryId(profile.country_id);
      }

      if (profile?.province_id) {
        setPendingProvinceId(profile.province_id);
      }

      if (profile?.phone) {
        const storedPhone = String(profile.phone);
        const prefix = '+244';
        setPhone(
          storedPhone.startsWith(prefix)
            ? storedPhone.slice(prefix.length).trim()
            : storedPhone
        );
      }

      if (profile?.gender) {
        const normalizedGender = String(profile.gender).toLowerCase();

        if (normalizedGender === 'feminino') setGender('Feminino');
        if (normalizedGender === 'masculino') setGender('Masculino');
      }

      const { data: privateDetails, error: privateError } = await supabase
        .from('profile_private_details')
        .select('date_of_birth')
        .eq('user_id', user.id)
        .maybeSingle();

      if (privateError) throw privateError;

      if (privateDetails?.date_of_birth) {
        setExistingPrivateDob(privateDetails.date_of_birth);
        setDateOfBirth(privateDetails.date_of_birth);
      }
    } catch (err) {
      console.error('Erro ao verificar sessão/perfil:', err);
      setError(
        'A tua sessão foi reconhecida, mas não foi possível carregar todos os dados do perfil. Podes rever os campos e tentar novamente.'
      );
    }
  }

  function nextStep(event) {
    event.preventDefault();
    setError('');

    if (authChecking || loading) return;

    if (step === 1) {
      if (!country) {
        setError('Escolhe o teu país.');
        return;
      }

      if (!isAngola(country.name)) {
        setBlockedCountry(country.name);
        return;
      }

      if (!provinceId) {
        setError('Escolhe a tua província.');
        return;
      }

      setStep(2);
      window.scrollTo(0, 0);
      return;
    }

    if (step === 2) {
      if (!fullName.trim()) {
        setError('Escreve o teu nome completo.');
        return;
      }

      if (!validAngolanPhone(phone, dial)) {
        setError('Introduz um número de telefone válido, com 9 dígitos (ex.: 923 456 789).');
        return;
      }

      if (!gender) {
        setError('Escolhe o teu género.');
        return;
      }

      if (!dateOfBirth) {
        setError('Indica a tua data de nascimento.');
        return;
      }

      if (age === null) {
        setError('A data de nascimento não é válida. Verifica o dia, mês e ano.');
        return;
      }

      if (age < 18) {
        setError('Para criar uma conta Talaza, é necessário ter pelo menos 18 anos completos.');
        return;
      }

      setStep(3);
      window.scrollTo(0, 0);
      return;
    }

    submit();
  }

  async function submit() {
    if (authChecking || loading) return;

    setLoading(true);
    setError('');

    try {
      // Voltar a consultar a sessão no momento do envio evita que uma
      // verificação inicial ainda pendente permita criar uma conta duplicada.
      const {
        data: { session: currentSession },
        error: currentSessionError,
      } = await supabase.auth.getSession();

      if (currentSessionError) throw currentSessionError;

      const activeUser = currentSession?.user || null;
      const completingExistingAccount = Boolean(activeUser);
      const normalizedEmail = String(
        activeUser?.email || email
      ).trim().toLowerCase();

      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
        setError('Introduz um endereço de e-mail válido.');
        return;
      }

      if (!completingExistingAccount && password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (
        completingExistingAccount &&
        existingPrivateDob &&
        existingPrivateDob !== dateOfBirth
      ) {
        setError(
          'Já existe uma data de nascimento protegida nesta conta e não pode ser alterada neste formulário.'
        );
        return;
      }

      if (completingExistingAccount && activeUser.id !== sessionUser?.id) {
        setSessionUser(activeUser);
      }

      const normalizedPhone = fullPhone(dial, phone);
      const pendingExplorer = {
        name: fullName.trim(),
        country_id: countryId,
        province_id: provinceId,
        phone: normalizedPhone,
        gender: gender.toLowerCase(),
      };

      if (completingExistingAccount) {
        // CONTA EXISTENTE: nunca chamar auth.signUp().
        let accessToken = currentSession.access_token;

        if (!existingPrivateDob) {
          const { data: proofData, error: proofError } =
            await supabase.functions.invoke('talaza-signup-proof', {
              body: {
                action: 'encrypt',
                signup_type: 'explorer',
                country_id: countryId,
                province_id: provinceId,
                email: normalizedEmail,
                name: fullName.trim(),
                phone: normalizedPhone,
                gender: gender.toLowerCase(),
                date_of_birth: dateOfBirth,
              },
            });

          if (proofError || !proofData?.proof || proofData?.version !== 4) {
            console.error('Falha ao proteger a data de nascimento:', proofError);
            throw new Error('PRIVATE_DETAILS_PROOF_FAILED');
          }

          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              ...(activeUser.user_metadata || {}),
              talaza_pending_signup_type: 'explorer',
              talaza_pending_explorer: pendingExplorer,
              talaza_dob_proof: proofData.proof,
            },
          });

          if (metadataError) throw metadataError;

          const {
            data: refreshedSession,
            error: refreshedSessionError,
          } = await supabase.auth.getSession();

          if (refreshedSessionError) throw refreshedSessionError;

          accessToken = refreshedSession?.session?.access_token;

          if (!accessToken) {
            throw new Error('SESSION_TOKEN_MISSING');
          }

          const { data: finalized, error: finalizeError } =
            await supabase.functions.invoke('talaza-signup-proof', {
              body: { action: 'finalize' },
              headers: {
                Authorization: 'Bearer ' + accessToken,
              },
            });

          if (finalizeError || !finalized?.ok || !finalized?.stored) {
            console.error('Falha ao guardar data privada:', finalizeError);
            throw new Error('PRIVATE_DETAILS_FINALIZE_FAILED');
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: activeUser.id,
              name: fullName.trim(),
              country_id: countryId,
              province_id: provinceId,
              phone: normalizedPhone,
              gender: gender.toLowerCase(),
              account_type: 'explorador',
            },
            { onConflict: 'id' }
          );

        if (profileError) throw profileError;

        // Limpeza dos dados temporários cifrados. A falha de limpeza não
        // desfaz o perfil já guardado nem deve prender o utilizador no fluxo.
        const { data: cleanupData, error: cleanupError } =
          await supabase.functions.invoke('talaza-signup-proof', {
            body: { action: 'complete' },
            headers: {
              Authorization: 'Bearer ' + accessToken,
            },
          });

        if (cleanupError || !cleanupData?.ok || !cleanupData?.proof_removed) {
          console.warn('Perfil concluído; limpeza temporária pendente:', cleanupError);
        }

        try {
          localStorage.setItem('talaza_country_id', String(countryId));
          localStorage.setItem('talaza_province_id', String(provinceId));
          localStorage.setItem('talaza_home_country_id', String(countryId));
          localStorage.setItem('talaza_home_province_id', String(provinceId));
        } catch {}

        await router.replace({
          pathname: '/explore',
          query: {
            country: countryId,
            province: provinceId,
            homeCountry: countryId,
            homeProvince: provinceId,
          },
        });

        return;
      }

      // CONTA NOVA: só executar signUp quando não existe sessão.
      const { data: proofData, error: proofError } =
        await supabase.functions.invoke('talaza-signup-proof', {
          body: {
            action: 'encrypt',
            signup_type: 'explorer',
            country_id: countryId,
            province_id: provinceId,
            email: normalizedEmail,
            name: fullName.trim(),
            phone: normalizedPhone,
            gender: gender.toLowerCase(),
            date_of_birth: dateOfBirth,
          },
        });

      if (proofError || !proofData?.proof || proofData?.version !== 4) {
        console.error('Falha ao proteger a data de nascimento:', proofError);
        throw new Error('PRIVATE_DETAILS_PROOF_FAILED');
      }

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              talaza_pending_signup_type: 'explorer',
              talaza_pending_explorer: pendingExplorer,
              talaza_dob_proof: proofData.proof,
            },
            emailRedirectTo:
              typeof window !== 'undefined'
                ? window.location.origin + '/auth/callback'
                : undefined,
          },
        });

      if (authError) {
        const message = String(authError.message || '').toLowerCase();
        if (
          message.includes('already registered') ||
          message.includes('already exists') ||
          message.includes('user already')
        ) {
          setError(
            'Este e-mail já está associado a uma conta. Entra em “Já tenho conta” para completar o teu perfil.'
          );
          return;
        }
        throw authError;
      }

      if (
        !authData?.user ||
        (Array.isArray(authData.user.identities) &&
          authData.user.identities.length === 0)
      ) {
        setError(
          'Este e-mail pode já estar associado a uma conta. Entra em “Já tenho conta” para completar o teu perfil.'
        );
        return;
      }

      if (authData.session) {
        await router.replace('/auth/callback');
        return;
      }

      setError(
        'Verifica o teu e-mail. Enviámos um link para confirmares e ativares a tua conta.'
      );
    } catch (err) {
      console.error('Erro ao concluir cadastro:', err);

      if (err?.message === 'PRIVATE_DETAILS_PROOF_FAILED') {
        setError('Não foi possível proteger a data de nascimento. Verifica os dados e tenta novamente.');
      } else if (err?.message === 'PRIVATE_DETAILS_FINALIZE_FAILED') {
        setError('Não foi possível guardar a data de nascimento protegida. Tenta novamente.');
      } else if (err?.message === 'SESSION_TOKEN_MISSING') {
        setError('A sessão expirou. Entra novamente para completar o teu perfil.');
      } else {
        setError('Não foi possível concluir o cadastro. Verifica os teus dados e tenta novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (blockedCountry) {
    return (
      <AuthShell backHref={sessionUser ? '/login' : '/start'}>
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

  return (
    <AuthShell backHref={sessionUser ? '/login' : '/start'}>
      <Head>
        <title>{sessionUser ? 'Completar perfil | Talaza' : 'Criar conta | Talaza'}</title>
      </Head>

      <Card>
        <div
          style={{
            display: 'inline-block',
            padding: '7px 12px',
            borderRadius: 999,
            background: C.soft,
            color: C.green,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Explorar Talaza
        </div>

        <h1 style={{ margin: '14px 0 6px', color: C.ink, fontSize: 27 }}>
          {sessionUser ? 'Completa o teu perfil' : 'Crie a sua conta'}
        </h1>

        <p
          style={{
            margin: '0 0 18px',
            color: C.muted,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {sessionUser
            ? 'A tua conta já existe. Preenche os dados em falta para continuares na Talaza.'
            : 'Uma conta para explorar a Talaza e encontrar negócios perto de si.'}
        </p>

        <Progress
          current={step}
          total={3}
          label={
            step === 1
              ? 'localização'
              : step === 2
                ? 'os teus dados'
                : sessionUser
                  ? 'concluir perfil'
                  : 'acesso'
          }
        />

        {authChecking ? (
          <p style={{ color: C.muted, fontSize: 14 }}>A verificar a tua sessão…</p>
        ) : (
          <form onSubmit={nextStep} noValidate>
            {step === 1 && (
              <>
                <Field id="country" label="País" required>
                  <CountrySelect
                    id="country"
                    countries={countries}
                    value={countryId}
                    onChange={setCountryId}
                  />
                </Field>

                <Field id="province" label="Província" required>
                  <select
                    id="province"
                    value={provinceId}
                    onChange={(event) => setProvinceId(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Escolher província</option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id}>
                        {String(province.name).trim()}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field id="name" label="Nome completo" required>
                  <input
                    id="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="O teu nome completo"
                    autoComplete="name"
                    style={inputStyle}
                  />
                </Field>

                <Field id="phone" label="Número de telefone (+244)" required>
                  <PhoneField
                    id="phone"
                    countryName={country?.name}
                    value={phone}
                    onChange={setPhone}
                  />
                </Field>

                <Field id="gender" label="Género" required>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    {['Feminino', 'Masculino'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setGender(value)}
                        aria-pressed={gender === value}
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          border:
                            gender === value
                              ? '2px solid #B98B2E'
                              : '1px solid #DDE3EC',
                          background:
                            gender === value ? '#FBF5E6' : '#FFFFFF',
                          color: C.ink,
                          fontWeight: 800,
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field id="dob" label="Data de nascimento" required>
                  {existingPrivateDob ? (
                    <p
                      style={{
                        padding: 13,
                        border: '1px solid #DDE3EC',
                        borderRadius: 12,
                        background: '#F3F5F4',
                        color: C.muted,
                        fontSize: 14,
                        margin: 0,
                      }}
                    >
                      Data já registada e protegida nesta conta.
                    </p>
                  ) : (
                    <DateOfBirthFields
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                      inputStyle={inputStyle}
                    />
                  )}
                </Field>

                {dateOfBirth && (
                  <p
                    role="status"
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: age !== null && age >= 18 ? C.green : C.red,
                      margin: '8px 0 12px',
                    }}
                  >
                    {age === null
                      ? 'Data inválida'
                      : age >= 18
                        ? 'Idade calculada: ' + age + ' anos'
                        : 'Tens ' + age + ' anos. É necessário ter pelo menos 18 anos completos.'}
                  </p>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Field id="email" label="E-mail" required>
                  <input
                    id="email"
                    type="email"
                    value={sessionUser ? sessionUser.email || '' : email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    readOnly={Boolean(sessionUser)}
                    style={{
                      ...inputStyle,
                      background: sessionUser ? '#F3F5F4' : '#FFFFFF',
                    }}
                  />
                </Field>

                {!sessionUser ? (
                  <>
                    <Field id="password" label="Senha" required>
                      <PasswordField
                        id="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="Mínimo de 6 caracteres"
                      />
                    </Field>
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                      Depois de criar a conta, confirma o teu e-mail através do link que vamos enviar.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    Não precisas de criar outra palavra-passe. Vamos apenas completar o perfil da tua conta atual.
                  </p>
                )}
              </>
            )}

            <ErrorBox>{error}</ErrorBox>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep((current) => current - 1);
                  }}
                  style={{
                    padding: '13px 18px',
                    borderRadius: 12,
                    border: '1px solid #DDE3EC',
                    background: '#FFF',
                    color: C.ink,
                    fontWeight: 800,
                  }}
                >
                  Voltar
                </button>
              )}

              <div style={{ flex: 1 }}>
                <PrimaryButton type="submit" loading={loading} disabled={authChecking}>
                  {loading
                    ? 'A processar…'
                    : step === 3
                      ? sessionUser
                        ? 'Concluir perfil'
                        : 'Criar conta'
                      : 'Seguinte'}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
