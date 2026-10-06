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

  if (!router.isReady || loadingUser) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>Carregando...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link
            href={`/explore?country=${encodeURIComponent(
              country || ''
            )}&province=${encodeURIComponent(province || '')}`}
            style={styles.backButton}
          >
            ← Voltar
          </Link>

          <div style={styles.headerText}>
            <div style={styles.eyebrow}>TALAZA</div>
            <h1 style={styles.title}>Contratar</h1>

            {(countryName || provinceName) && (
              <p style={styles.location}>
                {countryName}
                {countryName && provinceName ? ' · ' : ''}
                {provinceName}
              </p>
            )}
          </div>
        </header>

        {mode === 'choose' && (
          <section style={styles.content}>
            <div style={styles.intro}>
              <h2 style={styles.sectionTitle}>
                O que você deseja publicar?
              </h2>

              <p style={styles.sectionDescription}>
                Publique uma oportunidade de trabalho de forma simples e
                alcance pessoas da sua província.
              </p>
            </div>

            {!user && (
              <div style={styles.warning}>
                <strong>Entre na sua conta para publicar.</strong>
                <p>
                  Você precisa estar conectado à sua conta Talaza para criar
                  uma oportunidade.
                </p>
              </div>
            )}

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
                <div style={styles.optionIcon}>✦</div>

                <div>
                  <h3 style={styles.optionTitle}>Publicar uma vaga</h3>

                  <p style={styles.optionDescription}>
                    Crie a oportunidade preenchendo os detalhes da vaga,
                    profissão, requisitos, salário e contacto.
                  </p>
                </div>

                <span style={styles.optionArrow}>→</span>
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
                <div style={styles.optionIcon}>▣</div>

                <div>
                  <h3 style={styles.optionTitle}>Enviar um post</h3>

                  <p style={styles.optionDescription}>
                    Já tem um cartaz, imagem ou publicação pronta? Envie-a
                    diretamente.
                  </p>
                </div>

                <span style={styles.optionArrow}>→</span>
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
          </section>
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

            <div style={styles.intro}>
              <h2 style={styles.sectionTitle}>Publicar uma vaga</h2>

              <p style={styles.sectionDescription}>
                Preencha os dados da oportunidade. A publicação ficará ativa
                por 30 dias.
              </p>
            </div>

            <form onSubmit={publishOpportunity} style={styles.form}>
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
                Imagem / cartaz (opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setSelectedImage(e.target.files?.[0] || null)
                  }
                  style={styles.fileInput}
                />
              </label>

              {selectedImage && (
                <p style={styles.fileName}>
                  Imagem selecionada: {selectedImage.name}
                </p>
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
                {loading ? 'Publicando...' : 'Publicar oportunidade'}
              </button>
            </form>
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

            <div style={styles.intro}>
              <h2 style={styles.sectionTitle}>Enviar um post</h2>

              <p style={styles.sectionDescription}>
                Envie um cartaz ou imagem que já tenha preparado. Informe
                apenas os dados necessários para encontrá-lo.
              </p>
            </div>

            <form onSubmit={publishOpportunity} style={styles.form}>
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
                  placeholder="Ex.: Empregada doméstica"
                  style={styles.input}
                  required
                />
              </label>

              <label style={styles.label}>
                Título da publicação *
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Oportunidade de trabalho"
                  style={styles.input}
                  required
                />
              </label>

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
                Imagem / cartaz *
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setSelectedImage(e.target.files?.[0] || null)
                  }
                  style={styles.fileInput}
                  required
                />
              </label>

              {selectedImage && (
                <div style={styles.imagePreviewBox}>
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Pré-visualização"
                    style={styles.imagePreview}
                  />

                  <p style={styles.fileName}>{selectedImage.name}</p>
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
                {loading ? 'Enviando...' : 'Enviar publicação'}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f6f7f9',
    color: '#151515',
    padding: '24px 16px 60px',
  },

  container: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
  },

  loading: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#666',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '32px',
  },

  backButton: {
    textDecoration: 'none',
    color: '#111',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 0',
    whiteSpace: 'nowrap',
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: '11px',
    letterSpacing: '2px',
    fontWeight: '800',
    color: '#777',
    marginBottom: '5px',
  },

  title: {
    margin: 0,
    fontSize: '34px',
    lineHeight: 1.1,
    fontWeight: '800',
  },

  location: {
    margin: '8px 0 0',
    color: '#777',
    fontSize: '14px',
  },

  content: {
    background: '#fff',
    borderRadius: '22px',
    padding: '28px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  },

  formSection: {
    background: '#fff',
    borderRadius: '22px',
    padding: '28px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
  },

  intro: {
    marginBottom: '26px',
  },

  sectionTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '800',
  },

  sectionDescription: {
    margin: '9px 0 0',
    color: '#6c6c6c',
    lineHeight: 1.6,
    fontSize: '15px',
  },

  options: {
    display: 'grid',
    gap: '14px',
  },

  optionCard: {
    width: '100%',
    border: '1px solid #e6e6e6',
    background: '#fff',
    borderRadius: '18px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'left',
    cursor: 'pointer',
  },

  optionIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: '#111',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },

  optionTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '800',
  },

  optionDescription: {
    margin: '5px 0 0',
    color: '#777',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  optionArrow: {
    marginLeft: 'auto',
    fontSize: '22px',
    color: '#777',
  },

  warning: {
    background: '#fff8e7',
    border: '1px solid #f1dfaa',
    borderRadius: '14px',
    padding: '15px',
    marginBottom: '18px',
    fontSize: '14px',
  },

  warningParagraph: {
    margin: '6px 0 0',
  },

  error: {
    marginTop: '18px',
    background: '#fff0f0',
    border: '1px solid #f1caca',
    color: '#a12626',
    padding: '13px 15px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
  },

  success: {
    marginTop: '18px',
    background: '#effaf2',
    border: '1px solid #cce8d2',
    color: '#216b32',
    padding: '13px 15px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
  },

  simpleBack: {
    border: 0,
    background: 'transparent',
    padding: 0,
    marginBottom: '22px',
    color: '#555',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    fontSize: '14px',
    fontWeight: '700',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '13px 14px',
    background: '#fff',
    fontSize: '15px',
    outline: 'none',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '13px 14px',
    background: '#fff',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },

  fileInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '11px',
    background: '#fff',
    fontSize: '14px',
  },

  fileName: {
    margin: '-8px 0 0',
    color: '#777',
    fontSize: '12px',
  },

  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },

  publishButton: {
    width: '100%',
    border: 0,
    borderRadius: '14px',
    background: '#111',
    color: '#fff',
    padding: '15px 18px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    marginTop: '4px',
  },

  imagePreviewBox: {
    border: '1px solid #e5e5e5',
    borderRadius: '14px',
    padding: '12px',
  },

  imagePreview: {
    width: '100%',
    maxHeight: '360px',
    objectFit: 'contain',
    borderRadius: '10px',
    display: 'block',
    background: '#f4f4f4',
  },
}; 
                          
