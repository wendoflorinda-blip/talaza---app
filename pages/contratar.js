import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const AREAS_PROFISSIONAIS = [
  'Administração e Escritório',
  'Agricultura e Produção',
  'Alimentação',
  'Beleza e Cuidados Pessoais',
  'Construção e Manutenção',
  'Educação e Formação',
  'Eventos e Entretenimento',
  'Informática e Tecnologia',
  'Saúde e Cuidados',
  'Transporte e Logística',
  'Vendas e Comércio',
  'Outros',
];

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

  const [mode, setMode] = useState('choose');

  const [area, setArea] = useState('');
  const [profession, setProfession] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [workAvailability, setWorkAvailability] = useState('');
  const [salary, setSalary] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [selectedImage, setSelectedImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadUser();
    loadLocationNames();
  }, [router.isReady, country, province]);

  async function loadUser() {
    setLoadingUser(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser || null);
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

    if (!title.trim()) {
      setError('Informe o título da oportunidade.');
      return;
    }

    if (!description.trim()) {
      setError('Escreva uma descrição da oportunidade.');
      return;
    }

    if (!whatsapp.trim()) {
      setError('Informe um número de WhatsApp.');
      return;
    }

    try {
      setLoading(true);

      const imageUrl = await uploadImageIfNeeded();

      const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { error: insertError } = await supabase
        .from('job_posts')
        .insert([
          {
            user_id: user.id,
            country_id: country,
            province_id: province,
            area: area,
            profession: profession.trim(),
            title: title.trim(),
            description: description.trim(),
            requirements: requirements.trim() || null,
            whatsapp: whatsapp.trim(),
            work_availability: workAvailability.trim() || null,
            salary: salary.trim() || null,
            municipality: municipality.trim() || null,
            neighborhood: neighborhood.trim() || null,
            image_url: imageUrl,
            status: 'published',
            is_active: true,
            expires_at: expiresAt,
          },
        ]);

      if (insertError) {
        console.error(insertError);
        throw new Error(
          insertError.message || 'Não foi possível publicar a oportunidade.'
        );
      }

      setMessage(
        'Oportunidade publicada com sucesso. Ela ficará disponível por 30 dias.'
      );

      resetForm();

      setTimeout(() => {
        router.push(
          `/oportunidades?country=${encodeURIComponent(
            country
          )}&province=${encodeURIComponent(province)}`
        );
      }, 1200);
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
                  Preencha os dados da oportunidade. A publicação ficará ativa
                  por 30 dias.
                </p>
              </div>
            </div>

            <OpportunityForm
              mode="manual"
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
  selectedImage,
  setSelectedImage,
  error,
  message,
  loading,
  publishOpportunity,
}) {
  return (
    <form onSubmit={publishOpportunity} style={styles.form}>
      <div style={styles.formNotice}>
        <Icon type="sparkle" size={17} color={COLORS.purple} />

        <span>
          Os campos marcados com <strong>*</strong> são obrigatórios.
        </span>
      </div>

      <label style={styles.label}>
        Área profissional *
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          style={styles.input}
          required
        >
          <option value="">Selecione uma área</option>

          {AREAS_PROFISSIONAIS.map((item) => (
            <option key={item} value={item}>
              {item}
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

      <label style={styles.label}>
        {mode === 'manual'
          ? 'Título da oportunidade *'
          : 'Título da publicação *'}

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            mode === 'manual'
              ? 'Ex.: Procura-se eletricista'
              : 'Ex.: Oportunidade de trabalho'
          }
          style={styles.input}
          required
        />
      </label>

      {mode === 'manual' && (
        <>
          <label style={styles.label}>
            Descrição *
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a oportunidade..."
              style={styles.textarea}
              rows={6}
              required
            />
          </label>

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
        </>
      )}

      <label style={styles.label}>
        WhatsApp *
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ex.: +244 9XX XXX XXX"
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
            Salário
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
