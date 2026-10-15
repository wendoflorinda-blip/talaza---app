
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#0F6E5C',
  dark: '#083F35',
  purple: '#7252B8',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  gold: '#DDA10A',
  red: '#B93845',
};

const EVENT_TYPES = [
  { value: 'show', label: 'Shows e espetáculos' },
  { value: 'book_sale', label: 'Venda e lançamento de livros' },
  { value: 'special_date', label: 'Datas especiais' },
  { value: 'conference', label: 'Conferências e palestras' },
  { value: 'festival', label: 'Festivais e feiras' },
  { value: 'other', label: 'Outro evento' },
];

function getPlanName(plan) {
  return plan.name || plan.title || plan.plan_name || 'Plano de Eventos';
}

function getPlanPrice(plan) {
  const value = plan.price ?? plan.price_kz ?? plan.amount;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString('pt-PT')} Kz`
    : String(value);
}

function getPlanDuration(plan) {
  return Number(plan.duration_days || 0);
}

function getPlanArea(plan) {
  return String(plan.area || '').toLowerCase();
}

function getPlanType(plan) {
  return String(plan.plan_type || '').toLowerCase();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

async function findLocation(table, value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  let query = supabase.from(table).select('id, name').limit(1);

  if (isUuid(value)) {
    query = query.eq('id', value);
  } else {
    query = query.ilike('name', value);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível identificar ${table}: ${error.message}`
    );
  }

  return data || null;
}

export default function Eventos() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [country, setCountry] = useState(null);
  const [province, setProvince] = useState(null);
  const [plans, setPlans] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('show');
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const loadEvents = useCallback(async (provinceId) => {
    if (!provinceId) {
      setEvents([]);
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .select(
        'id, title, description, event_type, image_url, location, starts_at, expires_at, created_at'
      )
      .eq('province_id', provinceId)
      .eq('status', 'published')
      .eq('payment_status', 'paid')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Não foi possível carregar os eventos: ${error.message}`);
    }

    setEvents(data || []);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setErrorMessage('');

      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        const countryParam = Array.isArray(router.query.country)
          ? router.query.country[0]
          : router.query.country;

        const provinceParam = Array.isArray(router.query.province)
          ? router.query.province[0]
          : router.query.province;

        const [countryResult, provinceResult] = await Promise.all([
          findLocation('countries', countryParam),
          findLocation('provinces', provinceParam),
        ]);

        const { data: planRows, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true);

        if (plansError) {
          throw new Error(
            `Não foi possível carregar os planos: ${plansError.message}`
          );
        }

        const eventPlans = (planRows || []).filter((plan) => {
          const area = getPlanArea(plan);
          const type = getPlanType(plan);

          return (
            area === 'eventos' ||
            area === 'event' ||
            type === 'event' ||
            type === 'events' ||
            type === 'evento' ||
            type === 'eventos'
          );
        });

        const usablePlans = eventPlans.filter(
          (plan) => getPlanDuration(plan) > 0
        );

        if (cancelled) return;

        setUser(currentUser || null);
        setCountry(countryResult);
        setProvince(provinceResult);
        setPlans(usablePlans);

        if (usablePlans.length > 0) {
          setSelectedPlanId(String(usablePlans[0].id));
        }

        if (provinceResult?.id) {
          await loadEvents(provinceResult.id);
        } else {
          setEvents([]);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error.message || 'Ocorreu um erro ao abrir a área Eventos.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.country, router.query.province, loadEvents]);

  async function handlePublish(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      setErrorMessage('Inicia sessão para publicar um evento.');
      return;
    }

    if (!country?.id || !province?.id) {
      setErrorMessage(
        'Não foi possível identificar o país e a província do painel. Volta ao painel provincial e tenta novamente.'
      );
      return;
    }

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Preenche o título e a descrição do evento.');
      return;
    }

    if (!selectedPlanId) {
      setErrorMessage('Seleciona um plano de Eventos.');
      return;
    }

    const selectedPlan = plans.find(
      (plan) => String(plan.id) === String(selectedPlanId)
    );

    if (!selectedPlan) {
      setErrorMessage('O plano selecionado já não está disponível.');
      return;
    }

    if (!getPlanPrice(selectedPlan)) {
      setErrorMessage(
        'Este plano ainda não tem um preço configurado. Configura o preço no Supabase antes de publicar.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error(
          'Não foi encontrado um perfil associado à tua conta. Confirma a ligação entre auth.users e profiles.'
        );
      }

      const { error: insertError } = await supabase.from('events').insert({
        user_id: profile.id,
        country_id: country.id,
        province_id: province.id,
        plan_id: selectedPlan.id,
        title: title.trim(),
        description: description.trim(),
        event_type: eventType,
        image_url: imageUrl.trim() || null,
        location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: null,
        status: 'pending_payment',
        payment_status: 'pending',
      });

      if (insertError) throw insertError;

      setSuccessMessage(
        'O anúncio foi registado como pendente de pagamento. Ainda não está público. O passo seguinte será ligar este registo ao processo de pagamento do Talaza.'
      );

      setTitle('');
      setDescription('');
      setImageUrl('');
      setLocation('');
      setStartsAt('');
    } catch (error) {
      setErrorMessage(
        error.message || 'Não foi possível registar o anúncio.'
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value) {
    if (!value) return 'Data a confirmar';

    return new Date(value).toLocaleString('pt-PT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  if (loading) {
    return (
      <main className="page">
        <p className="loading">A carregar a área Eventos...</p>
        <style jsx>{`
          .page {
            min-height: 100vh;
            background: ${COLORS.canvas};
            display: grid;
            place-items: center;
            padding: 24px;
            color: ${COLORS.muted};
            font-family: Arial, sans-serif;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <p className="eyebrow">TALAZA · COMUNIDADE LOCAL</p>
            <h1>Eventos</h1>
            <p className="subtitle">
              Divulga shows, livros, feiras e datas especiais na tua província.
            </p>
          </div>

          <div className="location">
            <span className="locationLabel">Painel atual</span>
            <strong>{province?.name || 'Província não identificada'}</strong>
            <span>{country?.name || ''}</span>
          </div>
        </header>

        {errorMessage && (
          <div className="notice error" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="notice success" role="status">
            {successMessage}
          </div>
        )}

        <section className="intro card">
          <div className="introIcon">✦</div>
          <div>
            <h2>O teu evento merece ser visto</h2>
            <p>
              Escolhe um plano, apresenta o teu evento e divulga-o no painel
              provincial onde foi publicado. Cada anúncio tem um prazo definido
              pelo plano contratado.
            </p>
          </div>
        </section>

        <section className="contentGrid">
          <div className="card formCard">
            <div className="sectionHeading">
              <span className="sectionLabel">PUBLICAR</span>
              <h2>Criar anúncio</h2>
              <p>Preenche os dados do evento e seleciona a duração.</p>
            </div>

            {!user ? (
              <div className="emptyState">
                <h3>Inicia sessão para continuar</h3>
                <p>Precisas de entrar na tua conta para publicar um anúncio.</p>
                <button
                  className="primaryButton"
                  type="button"
                  onClick={() => router.push('/login')}
                >
                  Iniciar sessão
                </button>
              </div>
            ) : !province?.id || !country?.id ? (
              <div className="emptyState">
                <h3>Escolhe primeiro a tua província</h3>
                <p>
                  Abre a área Eventos a partir do painel provincial para
                  associarmos o anúncio ao local correto.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePublish}>
                <label>
                  Título do evento *
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Ex.: Concerto ao vivo neste sábado"
                    required
                  />
                </label>

                <label>
                  Categoria *
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    required
                  >
                    {EVENT_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Descrição *
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={3000}
                    rows={5}
                    placeholder="Explica o que vai acontecer, para quem é e como participar."
                    required
                  />
                </label>

                <label>
                  Local do evento
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={200}
                    placeholder="Ex.: Talatona, Luanda"
                  />
                </label>

                <label>
                  Data e hora do evento
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>

                <label>
                  URL da imagem (opcional nesta versão)
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <small>
                    O carregamento direto de fotografias será ligado ao
                    armazenamento do Supabase numa próxima etapa.
                  </small>
                </label>

                <fieldset className="planFieldset">
                  <legend>Escolhe a duração do anúncio *</legend>

                  {plans.length === 0 ? (
                    <div className="planWarning">
                      Ainda não existem planos ativos para Eventos. Cria os
                      registos na tabela plans antes de publicar.
                    </div>
                  ) : (
                    <div className="planList">
                      {plans.map((plan) => {
                        const planId = String(plan.id);
                        const price = getPlanPrice(plan);
                        const duration = getPlanDuration(plan);

                        return (
                          <label
                            className={`planOption ${
                              selectedPlanId === planId ? 'selected' : ''
                            }`}
                            key={planId}
                          >
                            <input
                              type="radio"
                              name="eventPlan"
                              value={planId}
                              checked={selectedPlanId === planId}
                              onChange={() => setSelectedPlanId(planId)}
                              required
                            />
                            <span className="planInfo">
                              <strong>{getPlanName(plan)}</strong>
                              <small>
                                {duration} {duration === 1 ? 'dia' : 'dias'}
                              </small>
                            </span>
                            <strong className="planPrice">
                              {price || 'Preço por configurar'}
                            </strong>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                <p className="paymentNote">
                  O anúncio ficará pendente até a confirmação do pagamento.
                  A contagem da duração começa quando a publicação for ativada.
                </p>

                <button
                  className="primaryButton"
                  type="submit"
                  disabled={saving || plans.length === 0}
                >
                  {saving
                    ? 'A registar...'
                    : 'Continuar com o anúncio'}
                </button>
              </form>
            )}
          </div>

          <aside className="asideColumn">
            <section className="card infoCard">
              <span className="sectionLabel">COMO FUNCIONA</span>
              <h2>Do anúncio à publicação</h2>

              <ol className="steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Prepara o anúncio</strong>
                    <p>Indica o título, os detalhes e o local.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Escolhe o plano</strong>
                    <p>Seleciona a duração e consulta o preço.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Confirma o pagamento</strong>
                    <p>A publicação só será ativada após confirmação.</p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="card infoCard">
              <span className="sectionLabel">VISIBILIDADE</span>
              <h2>Eventos da tua província</h2>
              <p>
                Os anúncios publicados neste painel não serão misturados com
                os de outras províncias.
              </p>
            </section>
          </aside>
        </section>

        <section className="eventsSection">
          <div className="sectionHeading">
            <span className="sectionLabel">DESCOBRIR</span>
            <h2>Eventos na tua província</h2>
            <p>Consulta os anúncios ativos disponíveis neste painel.</p>
          </div>

          {!province?.id ? (
            <div className="card emptyState">
              Não foi possível identificar a província atual.
            </div>
          ) : events.length === 0 ? (
            <div className="card emptyState">
              <div className="emptyIcon">✦</div>
              <h3>Ainda não há eventos publicados</h3>
              <p>
                Quando existirem anúncios pagos e ativos nesta província,
                aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="eventGrid">
              {events.map((item) => (
                <article className="card eventCard" key={item.id}>
                  {item.image_url ? (
                    <img
                      className="eventImage"
                      src={item.image_url}
                      alt={item.title}
                    />
                  ) : (
                    <div className="eventImagePlaceholder">TALAZA EVENTOS</div>
                  )}

                  <div className="eventBody">
                    <span className="eventTag">
                      {EVENT_TYPES.find(
                        (type) => type.value === item.event_type
                      )?.label || 'Evento'}
                    </span>

                    <h3>{item.title}</h3>
                    <p className="eventDescription">{item.description}</p>

                    {item.location && (
                      <p className="eventMeta">⌖ {item.location}</p>
                    )}

                    <p className="eventMeta">
                      ◷ {formatDate(item.starts_at)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          Talaza · Eventos locais
        </footer>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: ${COLORS.canvas};
          color: ${COLORS.ink};
          padding: 36px 20px 60px;
          font-family: Inter, Arial, sans-serif;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 28px;
        }

        .eyebrow,
        .sectionLabel {
          color: ${COLORS.brand};
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h1 {
          margin: 8px 0;
          font-size: clamp(32px, 5vw, 48px);
          letter-spacing: -1.5px;
        }

        h2 {
          margin: 0 0 9px;
          font-size: 21px;
          letter-spacing: -0.4px;
        }

        h3 {
          margin: 8px 0;
          font-size: 17px;
        }

        p {
          line-height: 1.65;
        }

        .subtitle {
          color: ${COLORS.muted};
          margin: 0;
          max-width: 600px;
        }

        .location {
          min-width: 190px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: ${COLORS.white};
          border: 1px solid ${COLORS.line};
          padding: 16px 18px;
          border-radius: 16px;
        }

        .locationLabel,
        .location span:last-child {
          font-size: 12px;
          color: ${COLORS.muted};
        }

        .card {
          background: ${COLORS.white};
          border: 1px solid ${COLORS.line};
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(23, 33, 31, 0.035);
        }

        .intro {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px;
          margin-bottom: 26px;
        }

        .intro p,
        .sectionHeading p,
        .infoCard p {
          color: ${COLORS.muted};
          margin: 0;
        }

        .introIcon,
        .emptyIcon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: #e8f3f0;
          color: ${COLORS.brand};
          font-size: 23px;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
          gap: 22px;
          align-items: start;
        }

        .formCard,
        .infoCard {
          padding: 25px;
        }

        .sectionHeading {
          margin-bottom: 23px;
        }

        .sectionHeading h2 {
          margin-top: 8px;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        form > label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
        }

        input:not([type='radio']),
        select,
        textarea {
          width: 100%;
          border: 1px solid ${COLORS.line};
          border-radius: 11px;
          background: #fff;
          color: ${COLORS.ink};
          padding: 12px 13px;
          font: inherit;
          font-size: 14px;
          box-sizing: border-box;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: 2px solid rgba(15, 110, 92, 0.15);
          border-color: ${COLORS.brand};
        }

        textarea {
          resize: vertical;
        }

        small {
          color: ${COLORS.muted};
          font-size: 12px;
          font-weight: 400;
          line-height: 1.5;
        }

        .planFieldset {
          border: 0;
          margin: 0;
          padding: 0;
          min-width: 0;
        }

        .planFieldset legend {
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 800;
        }

        .planList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .planOption {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid ${COLORS.line};
          border-radius: 13px;
          cursor: pointer;
        }

        .planOption.selected {
          border-color: ${COLORS.brand};
          background: #e8f3f0;
        }

        .planOption input {
          accent-color: ${COLORS.brand};
        }

        .planInfo {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
        }

        .planInfo strong,
        .planPrice {
          font-size: 13px;
        }

        .planPrice {
          text-align: right;
          color: ${COLORS.dark};
        }

        .planWarning {
          padding: 14px;
          border-radius: 12px;
          background: #fbf1d7;
          color: #765500;
          font-size: 13px;
          line-height: 1.6;
        }

        .paymentNote {
          margin: 0;
          color: ${COLORS.muted};
          font-size: 12px;
        }

        .primaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 47px;
          border: 0;
          border-radius: 12px;
          padding: 13px 18px;
          background: ${COLORS.brand};
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        }

        .primaryButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .asideColumn {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .infoCard h2 {
          margin-top: 10px;
        }

        .steps {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 0;
          margin: 22px 0 0;
        }

        .steps li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .steps li > span {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 29px;
          height: 29px;
          border-radius: 10px;
          background: #f1ecfa;
          color: ${COLORS.purple};
          font-size: 13px;
          font-weight: 800;
        }

        .steps strong {
          font-size: 13px;
        }

        .steps p {
          font-size: 12px;
          margin: 4px 0 0;
        }

        .eventsSection {
          margin-top: 46px;
        }

        .eventGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .eventCard {
          overflow: hidden;
        }

        .eventImage,
        .eventImagePlaceholder {
          width: 100%;
          height: 175px;
          object-fit: cover;
          display: grid;
          place-items: center;
          background: ${COLORS.dark};
          color: #fff;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .eventBody {
          padding: 18px;
        }

        .eventTag {
          display: inline-block;
          padding: 6px 9px;
          border-radius: 8px;
          background: #f1ecfa;
          color: ${COLORS.purple};
          font-size: 11px;
          font-weight: 800;
        }

        .eventDescription {
          color: ${COLORS.muted};
          font-size: 13px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .eventMeta {
          color: ${COLORS.muted};
          font-size: 12px;
        }

        .emptyState {
          text-align: center;
          padding: 28px 20px;
          color: ${COLORS.muted};
        }

        .emptyState h3 {
          color: ${COLORS.ink};
        }

        .emptyState p {
          margin-bottom: 0;
        }

        .notice {
          border-radius: 12px;
          padding: 14px 16px;
          margin: 0 0 18px;
          font-size: 13px;
          line-height: 1.6;
        }

        .error {
          background: #fcebed;
          color: ${COLORS.red};
        }

        .success {
          background: #e8f3f0;
          color: ${COLORS.dark};
        }

        .footer {
          text-align: center;
          margin-top: 42px;
          color: ${COLORS.muted};
          font-size: 12px;
        }

        @media (max-width: 820px) {
          .contentGrid {
            grid-template-columns: 1fr;
          }

          .eventGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 24px 14px 40px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .location {
            width: 100%;
            box-sizing: border-box;
          }

          .intro,
          .formCard,
          .infoCard {
            padding: 18px;
          }

          .eventGrid {
            grid-template-columns: 1fr;
          }

          .planOption {
            flex-wrap: wrap;
          }

          .planPrice {
            margin-left: 28px;
          }
        }
      `}</style>
    </main>
  );
}
