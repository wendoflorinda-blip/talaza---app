import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  canvas: '#F8F6F3',
  surface: '#FFFFFF',
  brand: '#0F6E5C',
  brandDark: '#083F35',
  brandSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  inkSoft: '#596560',
  inkFaint: '#89948F',
  line: '#E5E9E7',
  danger: '#A12626',
  dangerSoft: '#FFF0F0',
  success: '#216B32',
  successSoft: '#EFFAF2',
};

function Icon({ type, size = 22, color = COLORS.purple }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),

    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="M3 17l5-5 4 4 3-3 6 5" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </>
    ),

    sparkle: (
      <>
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
        <path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
      </>
    ),

    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    arrowUp: (
      <>
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" />
      </>
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  };

  return <svg {...common}>{icons[type] || icons.sparkle}</svg>;
}

export default function Contratar() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [user, setUser] = useState(null);
  const [publisherBusinesses, setPublisherBusinesses] = useState([]);
  const [publisherMode, setPublisherMode] = useState('explorer');
  const [publisherBusinessId, setPublisherBusinessId] = useState('');

  const [mode, setMode] = useState('choose');

  const [area, setArea] = useState('');
  const [professionalAreas, setProfessionalAreas] = useState([]);
  const [profession, setProfession] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [workAvailability, setWorkAvailability] = useState('');
  const [salary, setSalary] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [durationDays, setDurationDays] = useState('');

  const [selectedImage, setSelectedImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    loadUser();
    loadLocationNames();
    loadProfessionalAreas();
  }, [router.isReady, country, province]);

  async function loadProfessionalAreas() {
    const { data, error: areasError } = await supabase
      .from('professional_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (areasError) {
      console.error('Erro ao carregar áreas profissionais:', areasError);
      setError('Não foi possível carregar as áreas profissionais.');
      setProfessionalAreas([]);
      return;
    }
    setProfessionalAreas(data || []);
  }

  async function loadUser() {
    setLoadingUser(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser || null);
    if (currentUser) {
      const { data: businesses, error: businessesError } = await supabase.from('businesses')
        .select('id,name,logo_url').eq('owner_id', currentUser.id).order('created_at', { ascending: true });
      if (businessesError) { console.warn('Não foi possível carregar os negócios associados à conta:', businessesError); setPublisherBusinesses([]); }
      else setPublisherBusinesses(businesses || []);
    } else setPublisherBusinesses([]);
    setPublisherBusinessId('');
    setPublisherMode('explorer');
    setLoadingUser(false);
  }

  async function loadLocationNames() {
    try {
      if (country) {
        const { data: countryData } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country)
          .single();

        if (countryData) {
          setCountryName(countryData.name);
        }
      }

      if (province) {
        const { data: provinceData } = await supabase
          .from('provinces')
          .select('name')
          .eq('id', province)
          .single();

        if (provinceData) {
          setProvinceName(provinceData.name);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar localização:', err);
    }
  }

  function resetForm() {
    setArea('');
    setProfession('');
    setTitle('');
    setDescription('');
    setRequirements('');
    setWhatsapp('');
    setWorkAvailability('');
    setSalary('');
    setMunicipality('');
    setNeighborhood('');
    setDurationDays('');
    setSelectedImage(null);
    setMessage('');
    setError('');
  }

  function handleBackToOptions() {
    resetForm();
    setMode('choose');
  }

  async function uploadImageIfNeeded() {
    if (!selectedImage) {
      return null;
    }

    const fileExtension =
      selectedImage.name.split('.').pop()?.toLowerCase() || 'jpg';

    const fileName = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('opportunity-posts')
      .upload(fileName, selectedImage, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        'Não foi possível enviar a imagem. Confirme se o Storage "opportunity-posts" foi criado.'
      );
    }

    const { data } = supabase.storage
      .from('opportunity-posts')
      .getPublicUrl(fileName);

    return data?.publicUrl || null;
  }

  async function publishOpportunity(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!user) {
      setError('É necessário entrar na sua conta para publicar.');
      return;
    }

    if (!country || !province) {
      setError(
        'Não foi possível identificar o país ou a província desta publicação.'
      );
      return;
    }

    if (!area) {
      setError('Selecione a área profissional.');
      return;
    }

    if (!profession.trim()) {
      setError('Informe a profissão.');
      return;
    }

    if (mode === 'manual' && !title.trim()) {
      setError('Informe o título da oportunidade.');
      return;
    }

    if (mode === 'manual' && !description.trim()) {
      setError('Escreva uma descrição da oportunidade.');
      return;
    }

    if (mode === 'post' && !selectedImage) {
      setError('Selecione a imagem ou o cartaz que pretende publicar.');
      return;
    }

    if (!whatsapp.trim()) {
      setError('Informe um número de WhatsApp.');
      return;
    }

    if (![7, 15, 30].includes(Number(durationDays))) {
      setError('Selecione a duração da publicação: 7, 15 ou 30 dias.');
      return;
    }

    try {
      setLoading(true);

      const imageUrl = await uploadImageIfNeeded();

      const expiresAt = new Date(
        Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000
      ).toISOString();

      const { error: insertError } = await supabase
        .from('job_posts')
        .insert([
          {
            user_id: user.id,
            publisher_mode: publisherBusinesses.length && publisherMode === 'store' && publisherBusinesses.some(item => item.id === publisherBusinessId) ? 'store' : 'explorer',
            publisher_business_id: publisherBusinesses.length && publisherMode === 'store' && publisherBusinesses.some(item => item.id === publisherBusinessId) ? publisherBusinessId : null,
            country_id: country,
            province_id: province,
            area: area,
            profession: profession.trim(),
            title: mode === 'post' ? (title.trim() || profession.trim() || 'Publicação visual') : title.trim(),
            description: mode === 'post' ? (description.trim() || 'Publicação visual enviada pelo responsável.') : description.trim(),
            professional_competence: requirements.trim() || null,
            whatsapp: whatsapp.trim(),
            work_availability: workAvailability.trim() || null,
            salary: salary.trim() || null,
            municipality: municipality.trim() || null,
            neighborhood: neighborhood.trim() || null,
            image_url: imageUrl,
            duration_days: Number(durationDays),
            status: 'pending',
            is_active: false,
            expires_at: expiresAt,
          },
        ]);

      if (insertError) {
        console.error(insertError);
        throw new Error(
          insertError.message || 'Não foi possível publicar a oportunidade.'
        );
      }

      setMessage('');
      setError('');
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(
        err.message || 'Ocorreu um erro ao publicar. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  const opportunitiesUrl = `/oportunidades?country=${encodeURIComponent(
    country || ''
  )}&province=${encodeURIComponent(province || '')}`;

  const exploreUrl = `/explore?country=${encodeURIComponent(
    country || ''
  )}&province=${encodeURIComponent(province || '')}`;

  if (submitted) {
    return (
      <main style={styles.page}>
        <div style={{ ...styles.container, maxWidth: 760 }}>
          <section style={{ ...styles.contentCard, textAlign: 'center', marginTop: 36, padding: 'clamp(24px, 5vw, 46px)' }}>
            <div style={{ width: 76, height: 76, margin: '0 auto 20px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: COLORS.successSoft, color: COLORS.success, fontSize: 38, fontWeight: 900 }}>✓</div>
            <h1 style={{ color: COLORS.brandDark, fontSize: 28, margin: '0 0 16px' }}>A sua vaga foi publicada com sucesso.</h1>
            <p style={{ color: COLORS.inkSoft, fontSize: 15, lineHeight: 1.75, margin: '0 0 28px' }}>A sua vaga ficará visível na área de Oportunidades da província selecionada, e os profissionais com acesso ativo poderão entrar em contacto consigo diretamente através de mensagens na Talaza.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" onClick={() => router.push(exploreUrl)} style={{ ...styles.publishButton, background: '#FFFFFF', color: COLORS.brand, border: '1px solid ' + COLORS.line, boxShadow: 'none' }}>Voltar ao início</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!router.isReady || loadingUser) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>
          <div style={styles.loadingIcon}>
            <Icon type="sparkle" size={25} color={COLORS.purple} />
          </div>
          <span>A carregar Talaza...</span>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href={exploreUrl} style={styles.backButton}>
            <span style={styles.backArrow}>←</span>
            Voltar
          </Link>

          <div style={styles.headerText}>
            <div style={styles.eyebrow}>TALAZA</div>

            <h1 style={styles.title}>Contratar</h1>

            <p style={styles.subtitle}>
              Publique uma oportunidade e aproxime-se das pessoas certas.
            </p>

            {(countryName || provinceName) && (
              <div style={styles.locationPill}>
                <Icon type="location" size={14} color={COLORS.purple} />
                <span>
                  {countryName}
                  {countryName && provinceName ? ' · ' : ''}
                  {provinceName}
                </span>
              </div>
            )}
          </div>
        </header>

        {mode === 'choose' && (
          <>
            <section style={styles.heroCard}>
              <div style={styles.heroIcon}>
                <Icon type="briefcase" size={27} color={COLORS.purple} />
              </div>

              <div style={styles.heroContent}>
                <span style={styles.heroLabel}>PUBLICAR NO TALAZA</span>

                <h2 style={styles.heroTitle}>
                  Tem uma oportunidade?
                  <br />
                  Coloque-a diante de quem procura.
                </h2>

                <p style={styles.heroDescription}>
                  Publique uma vaga ou envie um cartaz que já tenha preparado.
                  A oportunidade ficará associada à sua província.
                </p>
              </div>

              <div style={styles.heroGlow} />
            </section>

            {!user && (
              <div style={styles.warning}>
                <div style={styles.warningIcon}>
                  <Icon type="lock" size={19} color={COLORS.gold} />
                </div>

                <div>
                  <strong>Entre na sua conta para publicar.</strong>

                  <p>
                    Precisa estar conectado à sua conta Talaza para criar uma
                    oportunidade.
                  </p>
                </div>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <section style={styles.contentCard}>
              <div style={styles.intro}>
                <span style={styles.sectionEyebrow}>COMO QUER PUBLICAR?</span>

                <h2 style={styles.sectionTitle}>
                  Escolha a melhor forma para si
                </h2>

                <p style={styles.sectionDescription}>
                  Pode criar a oportunidade do zero ou simplesmente enviar um
                  material que já tenha pronto.
                </p>
              </div>

              <div style={styles.options}>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setError('Entre na sua conta antes de publicar.');
                      return;
                    }

                    setError('');
                    setMode('manual');
                  }}
                  style={styles.optionCard}
                >
                  <div
                    style={{
                      ...styles.optionIcon,
                      background: COLORS.purpleSoft,
                    }}
                  >
                    <Icon
                      type="briefcase"
                      size={23}
                      color={COLORS.purple}
                    />
                  </div>

                  <div style={styles.optionBody}>
                    <div style={styles.optionTop}>
                      <h3 style={styles.optionTitle}>
                        Publicar uma vaga
                      </h3>

                      <span style={styles.optionBadge}>DETALHADA</span>
                    </div>

                    <p style={styles.optionDescription}>
                      Informe profissão, descrição, requisitos, salário,
                      contacto e outros detalhes.
                    </p>
                  </div>

                  <span style={styles.optionArrow}>
                    <Icon type="arrow" size={19} color={COLORS.purple} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setError('Entre na sua conta antes de publicar.');
                      return;
                    }

                    setError('');
                    setMode('post');
                  }}
                  style={styles.optionCard}
                >
                  <div
                    style={{
                      ...styles.optionIcon,
                      background: COLORS.goldSoft,
                    }}
                  >
                    <Icon type="image" size={23} color={COLORS.gold} />
                  </div>

                  <div style={styles.optionBody}>
                    <div style={styles.optionTop}>
                      <h3 style={styles.optionTitle}>
                        Enviar um post
                      </h3>

                      <span
                        style={{
                          ...styles.optionBadge,
                          color: COLORS.gold,
                          background: COLORS.goldSoft,
                        }}
                      >
                        CARTAZ
                      </span>
                    </div>

                    <p style={styles.optionDescription}>
                      Já tem um cartaz, imagem ou publicação pronta? Envie-a
                      diretamente.
                    </p>
                  </div>

                  <span style={styles.optionArrow}>
                    <Icon type="arrow" size={19} color={COLORS.purple} />
                  </span>
                </button>
              </div>
            </section>

            <section style={styles.ctaCard}>
              <div style={styles.ctaIcon}>
                <Icon type="sparkle" size={23} color={COLORS.purple} />
              </div>

              <div style={styles.ctaContent}>
                <span style={styles.ctaEyebrow}>
                  TALAZA · OPORTUNIDADES
                </span>

                <h2 style={styles.ctaTitle}>
                  Quer descobrir as vagas que estão a ser publicadas?
                </h2>

                <p style={styles.ctaText}>
                  Novas oportunidades podem surgir todos os dias. Veja as
                  vagas disponíveis na sua província e acompanhe aquelas que
                  podem abrir uma nova porta para si.
                </p>

                <Link href={opportunitiesUrl} style={styles.ctaButton}>
                  <span>Ver oportunidades</span>
                  <Icon type="arrow" size={17} color="#fff" />
                </Link>
              </div>
            </section>
          </>
        )}

        {mode === 'manual' && (
          <section style={styles.formSection}>
            <button
              type="button"
              onClick={handleBackToOptions}
              style={styles.simpleBack}
            >
              ← Voltar às opções
            </button>

            <div style={styles.formIntro}>
              <div style={styles.formIcon}>
                <Icon type="briefcase" size={22} color={COLORS.purple} />
              </div>

              <div>
                <span style={styles.sectionEyebrow}>
                  NOVA OPORTUNIDADE
                </span>

                <h2 style={styles.sectionTitle}>
                  Publicar uma vaga
                </h2>

                <p style={styles.sectionDescription}>
                  Preencha os dados da oportunidade e escolha por quanto tempo
                  pretende mantê-la publicada.
                </p>
              </div>
            </div>

            <OpportunityForm
              mode="manual"
              publisherBusinesses={publisherBusinesses}
              publisherMode={publisherMode}
              setPublisherMode={setPublisherMode}
              publisherBusinessId={publisherBusinessId}
              setPublisherBusinessId={setPublisherBusinessId}
              professionalAreas={professionalAreas}
              area={area}
              setArea={setArea}
              profession={profession}
              setProfession={setProfession}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              requirements={requirements}
              setRequirements={setRequirements}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              workAvailability={workAvailability}
              setWorkAvailability={setWorkAvailability}
              salary={salary}
              setSalary={setSalary}
              municipality={municipality}
              setMunicipality={setMunicipality}
              neighborhood={neighborhood}
              setNeighborhood={setNeighborhood}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              error={error}
              message={message}
              loading={loading}
              publishOpportunity={publishOpportunity}
            />
          </section>
        )}

        {mode === 'post' && (
          <section style={styles.formSection}>
            <button
              type="button"
              onClick={handleBackToOptions}
              style={styles.simpleBack}
            >
              ← Voltar às opções
            </button>

            <div style={styles.formIntro}>
              <div
                style={{
                  ...styles.formIcon,
                  background: COLORS.goldSoft,
                }}
              >
                <Icon type="image" size={22} color={COLORS.gold} />
              </div>

              <div>
                <span style={styles.sectionEyebrow}>
                  PUBLICAÇÃO VISUAL
                </span>

                <h2 style={styles.sectionTitle}>
                  Enviar um post
                </h2>

                <p style={styles.sectionDescription}>
                  Envie um cartaz ou imagem que já tenha preparado e informe
                  os dados necessários para encontrá-lo.
                </p>
              </div>
            </div>

            <OpportunityForm
              mode="post"
              publisherBusinesses={publisherBusinesses}
              publisherMode={publisherMode}
              setPublisherMode={setPublisherMode}
              publisherBusinessId={publisherBusinessId}
              setPublisherBusinessId={setPublisherBusinessId}
              professionalAreas={professionalAreas}
              area={area}
              setArea={setArea}
              profession={profession}
              setProfession={setProfession}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              requirements={requirements}
              setRequirements={setRequirements}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              workAvailability={workAvailability}
              setWorkAvailability={setWorkAvailability}
              salary={salary}
              setSalary={setSalary}
              municipality={municipality}
              setMunicipality={setMunicipality}
              neighborhood={neighborhood}
              setNeighborhood={setNeighborhood}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              error={error}
              message={message}
              loading={loading}
              publishOpportunity={publishOpportunity}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function OpportunityForm({
  mode,
  publisherBusinesses = [],
  publisherMode,
  setPublisherMode,
  publisherBusinessId,
  setPublisherBusinessId,
  professionalAreas = [],
  area,
  setArea,
  profession,
  setProfession,
  title,
  setTitle,
  description,
  setDescription,
  requirements,
  setRequirements,
  whatsapp,
  setWhatsapp,
  workAvailability,
  setWorkAvailability,
  salary,
  setSalary,
  municipality,
  setMunicipality,
  neighborhood,
  setNeighborhood,
  durationDays,
  setDurationDays,
  selectedImage,
  setSelectedImage,
  error,
  message,
  loading,
  publishOpportunity,
}) {
  const safeProfessionalAreas = Array.isArray(professionalAreas) ? professionalAreas : [];

  return (
    <form onSubmit={publishOpportunity} style={styles.form}>
      {publisherBusinesses.length > 0 && <section style={{padding:14,border:'1px solid #DDE8E2',borderRadius:14,background:'#F7FBF8',marginBottom:16}}>
        <strong style={{display:'block',marginBottom:9,color:COLORS.brandDark}}>Publicar como:</strong>
        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
          <input type="radio" name="opportunity-publisher" checked={publisherMode==='explorer'} onChange={()=>{setPublisherMode('explorer');setPublisherBusinessId('');}} />
          Explorador — perfil pessoal
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="radio" name="opportunity-publisher" checked={publisherMode==='store'} onChange={()=>{setPublisherMode('store');if(publisherBusinesses.length===1)setPublisherBusinessId(publisherBusinesses[0].id);}} />
          Loja
        </label>
        {publisherMode==='store' && <select value={publisherBusinessId} onChange={e=>setPublisherBusinessId(e.target.value)} required style={{...styles.input,marginTop:9}}>
          <option value="">Escolhe a loja</option>
          {publisherBusinesses.map(business=><option key={business.id} value={business.id}>{business.name}</option>)}
        </select>}
      </section>}
      <div style={styles.formNotice}>
        <Icon type="sparkle" size={17} color={COLORS.purple} />

        <span>
          Os campos marcados com <strong>*</strong> são obrigatórios.
        </span>
      </div>

      <label style={styles.label}>
        Duração da publicação *
        <select
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">Escolha a duração</option>
          <option value="7">7 dias</option>
          <option value="15">15 dias</option>
          <option value="30">30 dias</option>
        </select>
      </label>

      <label style={styles.label}>
        Área profissional *
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">Selecione uma área</option>

          {safeProfessionalAreas.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label style={styles.label}>
        Profissão *
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="Ex.: Eletricista"
          style={styles.input}
          required
        />
      </label>

      {mode === 'manual' && (
        <>
          <label style={styles.label}>
            Título da oportunidade *
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Procura-se eletricista"
              style={styles.input}
              required
            />
          </label>

          <label style={styles.label}>
            Descrição da oportunidade *
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a oportunidade, as funções e as informações importantes..."
              style={styles.textarea}
              rows={6}
              required
            />
          </label>
        </>
      )}

      {mode === 'manual' && (
        <label style={styles.label}>
          Competências e experiência
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Ex.: experiência de 2 anos, responsabilidade, disponibilidade..."
            style={styles.textarea}
            rows={4}
          />
        </label>
      )}

      <label style={styles.label}>
        WhatsApp *
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ex.: 923000000"
          style={styles.input}
          required
        />
      </label>

      {mode === 'manual' && (
        <>
          <label style={styles.label}>
            Horário / disponibilidade
            <input
              type="text"
              value={workAvailability}
              onChange={(e) => setWorkAvailability(e.target.value)}
              placeholder="Ex.: período integral"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Salário (opcional)
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Ex.: 150.000 Kz"
              style={styles.input}
            />
          </label>
        </>
      )}

      <div style={styles.twoColumns}>
        <label style={styles.label}>
          Município
          <input
            type="text"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="Município"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Bairro
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Bairro"
            style={styles.input}
          />
        </label>
      </div>

      <label style={styles.label}>
        Imagem / cartaz {mode === 'post' ? '*' : '(opcional)'}

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setSelectedImage(e.target.files?.[0] || null)
          }
          style={styles.fileInput}
          required={mode === 'post'}
        />
      </label>

      {selectedImage && (
        <div style={styles.imagePreviewBox}>
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Pré-visualização"
            style={styles.imagePreview}
          />

          <div style={styles.fileName}>
            <Icon type="image" size={14} color={COLORS.purple} />
            <span>{selectedImage.name}</span>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {message && <div style={styles.success}>{message}</div>}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.publishButton,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Icon
          type="sparkle"
          size={18}
          color="#fff"
        />

        <span>
          {loading
            ? mode === 'manual'
              ? 'Publicando...'
              : 'Enviando...'
            : mode === 'manual'
            ? 'Publicar oportunidade'
            : 'Enviar publicação'}
        </span>

        {!loading && (
          <Icon type="arrow" size={17} color="#fff" />
        )}
      </button>
    </form>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.canvas,
    color: COLORS.ink,
    padding: '20px 16px 70px',
  },

  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },

  loading: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: COLORS.inkSoft,
    fontSize: '14px',
  },

  loadingIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '16px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '18px',
    marginBottom: '24px',
  },

  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    textDecoration: 'none',
    color: COLORS.inkSoft,
    fontSize: '13px',
    fontWeight: '800',
    padding: '9px 0',
    whiteSpace: 'nowrap',
  },

  backArrow: {
    fontSize: '18px',
    color: COLORS.purple,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: '10px',
    letterSpacing: '2.2px',
    fontWeight: '900',
    color: COLORS.brand,
    marginBottom: '5px',
  },

  title: {
    margin: 0,
    fontSize: 'clamp(30px, 6vw, 42px)',
    lineHeight: 1.04,
    letterSpacing: '-0.045em',
    color: COLORS.brandDark,
    fontWeight: 900,
  },

  subtitle: {
    margin: '9px 0 0',
    color: COLORS.inkSoft,
    fontSize: '14px',
    lineHeight: 1.55,
    maxWidth: '580px',
  },

  locationPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    marginTop: '12px',
    padding: '7px 11px',
    borderRadius: '999px',
    background: COLORS.brandSoft,
    color: COLORS.brandDark,
    fontSize: '11px',
    fontWeight: 800,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '17px',
    background: COLORS.brandDark,
    color: '#fff',
    borderRadius: '25px',
    padding: '28px',
    marginBottom: '16px',
    boxShadow: '0 16px 40px rgba(8,63,53,.15)',
  },

  heroIcon: {
    width: '53px',
    height: '53px',
    borderRadius: '17px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
  },

  heroContent: {
    position: 'relative',
    zIndex: 2,
  },

  heroLabel: {
    display: 'block',
    color: '#CFC3EC',
    fontSize: '9px',
    letterSpacing: '1.8px',
    fontWeight: 900,
    marginBottom: '8px',
  },

  heroTitle: {
    margin: 0,
    fontSize: 'clamp(21px, 4vw, 29px)',
    lineHeight: 1.15,
    letterSpacing: '-0.025em',
    fontWeight: 900,
  },

  heroDescription: {
    margin: '12px 0 0',
    maxWidth: '650px',
    color: 'rgba(255,255,255,.73)',
    fontSize: '13px',
    lineHeight: 1.65,
  },

  heroGlow: {
    position: 'absolute',
    width: '220px',
    height: '220px',
    borderRadius: '50%',
    right: '-80px',
    top: '-100px',
    background: 'rgba(114,82,184,.22)',
    filter: 'blur(10px)',
  },

  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: COLORS.goldSoft,
    border: `1px solid #F0DFB4`,
    borderRadius: '17px',
    padding: '15px 16px',
    marginBottom: '16px',
  },

  warningIcon: {
    width: '35px',
    height: '35px',
    borderRadius: '11px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  contentCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: '23px',
    padding: '25px',
    boxShadow: '0 10px 35px rgba(23,33,31,.045)',
  },

  intro: {
    marginBottom: '20px',
  },

  sectionEyebrow: {
    display: 'block',
    color: COLORS.purple,
    fontSize: '9px',
    letterSpacing: '1.7px',
    fontWeight: 900,
    marginBottom: '6px',
  },

  sectionTitle: {
    margin: 0,
    color: COLORS.brandDark,
    fontSize: '23px',
    fontWeight: 900,
    letterSpacing: '-0.025em',
  },

  sectionDescription: {
    margin: '7px 0 0',
    color: COLORS.inkSoft,
    fontSize: '13px',
    lineHeight: 1.6,
  },

  options: {
    display: 'grid',
    gap: '12px',
  },

  optionCard: {
    width: '100%',
    border: `1px solid ${COLORS.line}`,
    background: COLORS.surface,
    borderRadius: '18px',
    padding: '17px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform .15s ease',
  },

  optionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  optionBody: {
    flex: 1,
    minWidth: 0,
  },

  optionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },

  optionTitle: {
    margin: 0,
    color: COLORS.ink,
    fontSize: '16px',
    fontWeight: 900,
  },

  optionBadge: {
    background: COLORS.purpleSoft,
    color: COLORS.purple,
    padding: '4px 7px',
    borderRadius: '999px',
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '.7px',
  },

  optionDescription: {
    margin: '5px 0 0',
    color: COLORS.inkSoft,
    fontSize: '12px',
    lineHeight: 1.5,
  },

  optionArrow: {
    width: '34px',
    height: '34px',
    borderRadius: '11px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  ctaCard: {
    marginTop: '17px',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #F6F1FC 100%)',
    border: `1px solid #DED4F0`,
    borderRadius: '23px',
    padding: '23px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    boxShadow: '0 10px 35px rgba(114,82,184,.08)',
  },

  ctaIcon: {
    width: '47px',
    height: '47px',
    borderRadius: '15px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  ctaContent: {
    flex: 1,
  },

  ctaEyebrow: {
    display: 'block',
    color: COLORS.purple,
    fontSize: '9px',
    letterSpacing: '1.5px',
    fontWeight: 900,
    marginBottom: '6px',
  },

  ctaTitle: {
    margin: 0,
    color: COLORS.brandDark,
    fontSize: '20px',
    lineHeight: 1.2,
    fontWeight: 900,
  },

  ctaText: {
    margin: '8px 0 15px',
    color: COLORS.inkSoft,
    fontSize: '13px',
    lineHeight: 1.6,
  },

  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '9px',
    textDecoration: 'none',
    background: COLORS.brand,
    color: '#fff',
    borderRadius: '12px',
    padding: '11px 15px',
    fontSize: '12px',
    fontWeight: 900,
    boxShadow: '0 7px 18px rgba(15,110,92,.18)',
  },

  error: {
    marginBottom: '16px',
    background: COLORS.dangerSoft,
    border: '1px solid #F1CACA',
    color: COLORS.danger,
    padding: '13px 15px',
    borderRadius: '13px',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  formSection: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: '23px',
    padding: '25px',
    boxShadow: '0 10px 35px rgba(23,33,31,.045)',
  },

  simpleBack: {
    border: 0,
    background: 'transparent',
    padding: 0,
    marginBottom: '20px',
    color: COLORS.inkSoft,
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  formIntro: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '13px',
    marginBottom: '22px',
  },

  formIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: COLORS.purpleSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  formNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: COLORS.purpleSoft,
    color: '#5C4B87',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '11px',
    marginBottom: '2px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '17px',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    color: COLORS.ink,
    fontSize: '13px',
    fontWeight: 800,
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${COLORS.line}`,
    borderRadius: '12px',
    padding: '13px 14px',
    background: '#FCFCFB',
    color: COLORS.ink,
    fontSize: '14px',
    outline: 'none',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${COLORS.line}`,
    borderRadius: '12px',
    padding: '13px 14px',
    background: '#FCFCFB',
    color: COLORS.ink,
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.55,
  },

  fileInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px dashed #CFC7DF`,
    borderRadius: '12px',
    padding: '11px',
    background: '#FAF8FD',
    color: COLORS.inkSoft,
    fontSize: '12px',
  },

  fileName: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    color: COLORS.inkSoft,
    fontSize: '11px',
  },

  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '13px',
  },

  imagePreviewBox: {
    border: `1px solid ${COLORS.line}`,
    borderRadius: '15px',
    padding: '10px',
    background: '#FCFCFB',
  },

  imagePreview: {
    width: '100%',
    maxHeight: '360px',
    objectFit: 'contain',
    borderRadius: '10px',
    display: 'block',
    background: COLORS.canvas,
    marginBottom: '8px',
  },

  success: {
    background: COLORS.successSoft,
    border: '1px solid #CCE8D2',
    color: COLORS.success,
    padding: '13px 15px',
    borderRadius: '12px',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  publishButton: {
    width: '100%',
    border: 0,
    borderRadius: '14px',
    background: COLORS.brand,
    color: '#fff',
    padding: '15px 18px',
    fontSize: '14px',
    fontWeight: 900,
    cursor: 'pointer',
    marginTop: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',
    boxShadow: '0 8px 20px rgba(15,110,92,.16)',
  },
};

export async function getServerSideProps() {
  return {
    props: {},
  };
}
