
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  darkGreen: '#083F35',
  deepGreen: '#062F29',
  greenSoft: '#E8F3F0',
  gold: '#DDA10A',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
};

const cardStyle = {
  background: COLORS.white,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 16,
  padding: 18,
  boxShadow: '0 4px 18px rgba(23,33,31,0.04)',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 13px',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  background: COLORS.white,
  color: COLORS.ink,
  fontSize: 15,
  outlineColor: COLORS.green,
};

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}

function findByIdOrName(rows, value) {
  if (!value || !Array.isArray(rows)) return null;

  const wanted = normalized(value);

  return rows.find((row) => {
    const possibleValues = [
      row.id,
      row.name,
      row.title,
      row.nome,
      row.country,
      row.province,
      row.slug,
    ];

    return possibleValues.some(
      (item) => item != null && normalized(item) === wanted
    );
  }) || null;
}

function getPlanName(plan) {
  return plan?.name || plan?.title || plan?.plan_name || 'Plano de eventos';
}

function getPlanPrice(plan) {
  const value = plan?.price ?? plan?.price_kz ?? plan?.amount;

  if (value == null || value === '') return 'Preço não definido';

  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toLocaleString('pt-PT')} Kz`
    : String(value);
}

function getPlanDuration(plan) {
  const days = plan?.duration_days ?? plan?.duration ?? plan?.days;

  return days ? `${days} dias` : 'Duração não definida';
}

export default function Eventos() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [plans, setPlans] = useState([]);
  const [events, setEvents] = useState([]);

  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    event_type: '',
    description: '',
    location: '',
    starts_at: '',
    image_url: '',
  });

  const countryName = useMemo(
    () => countries.find((item) => String(item.id) === String(countryId)),
    [countries, countryId]
  );

  const provinceName = useMemo(
    () => provinces.find((item) => String(item.id) === String(provinceId)),
    [provinces, provinceId]
  );

  const filteredProvinces = useMemo(() => {
    if (!countryId) return provinces;

    return provinces.filter((province) => {
      const parentId =
        province.country_id ??
        province.countryId ??
        province.pais_id;

      // Algumas bases não têm country_id na tabela provinces.
      // Nesse caso, não escondemos todas as províncias.
      return parentId == null || String(parentId) === String(countryId);
    });
  }, [provinces, countryId]);

  const loadEvents = useCallback(async (province) => {
    if (!province) {
      setEvents([]);
      return;
    }

    const now = new Date().toISOString();

    const { data, error: queryError } = await supabase
      .from('events')
      .select('*')
      .eq('province_id', province)
      .eq('status', 'published')
      .eq('payment_status', 'paid')
      .not('expires_at', 'is', null)
      .gt('expires_at', now)
      .order('starts_at', { ascending: true });

    if (queryError) {
      console.error('Erro ao carregar eventos:', queryError);
      setError((current) =>
        current || 'Não foi possível carregar os eventos desta província.'
      );
      setEvents([]);
      return;
    }

    setEvents(data || []);
  }, []);

  const resolveLocation = useCallback(async (user) => {
    const [countryResult, provinceResult] = await Promise.all([
      supabase.from('countries').select('*'),
      supabase.from('provinces').select('*'),
    ]);

    if (countryResult.error) {
      throw new Error(
        `Não foi possível carregar os países: ${countryResult.error.message}`
      );
    }

    if (provinceResult.error) {
      throw new Error(
        `Não foi possível carregar as províncias: ${provinceResult.error.message}`
      );
    }

    const allCountries = countryResult.data || [];
    const allProvinces = provinceResult.data || [];

    setCountries(allCountries);
    setProvinces(allProvinces);

    const queryCountry =
      firstParam(router.query.country_id) ||
      firstParam(router.query.country);

    const queryProvince =
      firstParam(router.query.province_id) ||
      firstParam(router.query.province);

    let profile = null;

    if (user?.id) {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('Não foi possível consultar o perfil:', profileError);
      } else {
        profile = data;
      }
    }

    let storedCountry = '';
    let storedProvince = '';

    try {
      storedCountry = localStorage.getItem('talaza_country_id') || '';
      storedProvince = localStorage.getItem('talaza_province_id') || '';
    } catch {
      // A página continua a funcionar se o armazenamento não estiver disponível.
    }

    const countryCandidate =
      queryCountry ||
      profile?.country_id ||
      storedCountry;

    let country = findByIdOrName(allCountries, countryCandidate);

    if (!country && profile?.country) {
      country = findByIdOrName(allCountries, profile.country);
    }

    const provinceCandidate =
      queryProvince ||
      profile?.province_id ||
      storedProvince;

    let province = findByIdOrName(allProvinces, provinceCandidate);

    if (
      province &&
      country?.id &&
      province.country_id &&
      String(province.country_id) !== String(country.id)
    ) {
      province = null;
    }

    if (!province && profile?.province) {
      province = findByIdOrName(allProvinces, profile.province);
    }

    if (province && !country) {
      const parentId =
        province.country_id ??
        province.countryId ??
        province.pais_id;

      if (parentId) {
        country = allCountries.find(
          (item) => String(item.id) === String(parentId)
        ) || null;
      }
    }

    if (country) setCountryId(String(country.id));
    if (province) setProvinceId(String(province.id));

    return {
      countries: allCountries,
      provinces: allProvinces,
      country,
      province,
    };
  }, [router.query]);

  const loadPlans = useCallback(async () => {
    const { data, error: planError } = await supabase
      .from('plans')
      .select('*');

    if (planError) {
      console.warn('Não foi possível carregar os planos:', planError);
      setPlans([]);
      return;
    }

    const availablePlans = (data || []).filter((plan) => {
      if (plan.active === false || plan.is_active === false) return false;

      const area = normalized(plan.area);
      const type = normalized(plan.plan_type);
      const name = normalized(getPlanName(plan));

      // Se o plano estiver identificado por área/tipo, só mostramos
      // os planos de eventos. Se não tiver esses campos, mostramos
      // apenas os nomes que indiquem claramente eventos.
      if (area || type) {
        return (
          area.includes('evento') ||
          area.includes('event') ||
          type.includes('evento') ||
          type.includes('event')
        );
      }

      return name.includes('evento') || name.includes('event');
    });

    setPlans(availablePlans);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;
    let authSubscription;

    async function initialize() {
      setLoading(true);
      setError('');
      setNotice('');

      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Sessão não disponível:', sessionError.message);
        }

        const user = data?.session?.user || null;

        if (!active) return;

        setSession(data?.session || null);
        setAuthChecked(true);

        const [locationResult] = await Promise.all([
          resolveLocation(user),
          loadPlans(),
        ]);

        if (!active) return;

        if (locationResult.province?.id) {
          await loadEvents(String(locationResult.province.id));
        } else {
          setEvents([]);
          setNotice(
            'Seleciona o país e a província para veres os eventos dessa localização.'
          );
        }
      } catch (err) {
        console.error('Erro ao iniciar a página Eventos:', err);

        if (active) {
          setError(
            err?.message ||
            'Não foi possível iniciar a página de eventos. Tenta novamente.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    const { data: authData } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession || null);
        setAuthChecked(true);
      }
    );

    authSubscription = authData?.subscription;

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, [
    router.isReady,
    resolveLocation,
    loadPlans,
    loadEvents,
  ]);

  async function applyLocation() {
    setError('');
    setNotice('');

    if (!countryId || !provinceId) {
      setError('Seleciona primeiro o país e a província.');
      return;
    }

    const selectedProvince = provinces.find(
      (item) => String(item.id) === String(provinceId)
    );

    if (!selectedProvince) {
      setError('A província selecionada não foi encontrada na base de dados.');
      return;
    }

    try {
      localStorage.setItem('talaza_country_id', String(countryId));
      localStorage.setItem('talaza_province_id', String(provinceId));
    } catch {
      // Não impede a pesquisa se o armazenamento estiver indisponível.
    }

    setLoading(true);

    try {
      await loadEvents(String(provinceId));
      setNotice('Localização atualizada.');
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitEvent(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!session?.user?.id) {
      setError(
        'Para publicar um evento, inicia sessão na tua conta Talaza e volta a esta página.'
      );
      return;
    }

    if (!countryId || !provinceId) {
      setError('Seleciona o país e a província do evento.');
      return;
    }

    if (!selectedPlan) {
      setError('Seleciona um plano de eventos antes de continuar.');
      return;
    }

    if (
      !form.title.trim() ||
      !form.event_type.trim() ||
      !form.description.trim()
    ) {
      setError('Preenche o título, o tipo e a descrição do evento.');
      return;
    }

    setSaving(true);

    try {
      const newEvent = {
        user_id: session.user.id,
        country_id: countryId,
        province_id: provinceId,
        plan_id: selectedPlan,
        title: form.title.trim(),
        event_type: form.event_type.trim(),
        description: form.description.trim(),
        location: form.location.trim() || null,
        image_url: form.image_url.trim() || null,
        starts_at: form.starts_at
          ? new Date(form.starts_at).toISOString()
          : null,
        expires_at: null,
        status: 'pending_payment',
        payment_status: 'pending',
      };

      const { error: insertError } = await supabase
        .from('events')
        .insert(newEvent);

      if (insertError) throw insertError;

      setNotice(
        'Evento registado como pendente de pagamento. Ainda não está publicado.'
      );

      setForm({
        title: '',
        event_type: '',
        description: '',
        location: '',
        starts_at: '',
        image_url: '',
      });

      setSelectedPlan('');
      setShowForm(false);
    } catch (err) {
      console.error('Erro ao guardar evento:', err);

      setError(
        err?.message ||
        'Não foi possível guardar o evento. Confirma a sessão, as políticas RLS e os campos da tabela.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: COLORS.canvas,
      color: COLORS.ink,
      padding: '24px 16px 48px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header style={{
          ...cardStyle,
          background: COLORS.deepGreen,
          color: COLORS.white,
          border: 'none',
          padding: 24,
          marginBottom: 20,
        }}>
          <div style={{
            color: '#BDE3D9',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}>
            TALAZA · DESCOBRIR
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            margin: '10px 0 8px',
          }}>
            Eventos
          </h1>

          <p style={{
            margin: 0,
            color: '#E1ECE8',
            lineHeight: 1.6,
            maxWidth: 620,
          }}>
            Descobre o que acontece na tua província ou prepara a publicação
            de um evento.
          </p>
        </header>

        {error && (
          <div role="alert" style={{
            ...cardStyle,
            background: '#FFF0F0',
            color: COLORS.red,
            borderColor: '#F0CACA',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div role="status" style={{
            ...cardStyle,
            background: COLORS.greenSoft,
            color: COLORS.darkGreen,
            borderColor: '#C7E4DB',
            marginBottom: 16,
          }}>
            {notice}
          </div>
        )}

        <section style={{ ...cardStyle, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>
            Escolher localização
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            <label>
              <span style={{
                display: 'block',
                marginBottom: 7,
                fontSize: 13,
                color: COLORS.muted,
              }}>
                País
              </span>

              <select
                value={countryId}
                onChange={(e) => {
                  setCountryId(e.target.value);
                  setProvinceId('');
                }}
                style={inputStyle}
              >
                <option value="">Seleciona o país</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name || country.nome || country.title || 'País'}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span style={{
                display: 'block',
                marginBottom: 7,
                fontSize: 13,
                color: COLORS.muted,
              }}>
                Província
              </span>

              <select
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleciona a província</option>
                {filteredProvinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name || province.nome || province.title || 'Província'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={applyLocation}
            style={{
              marginTop: 14,
              border: 'none',
              borderRadius: 10,
              background: COLORS.green,
              color: COLORS.white,
              padding: '12px 18px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ver eventos desta província
          </button>

          {countryName && provinceName && (
            <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 0 }}>
              Localização selecionada:{' '}
              <strong>
                {countryName.name || countryName.nome} · {provinceName.name || provinceName.nome}
              </strong>
            </p>
          )}
        </section>

        <section style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <h2 style={{ margin: '0 0 5px', fontSize: 19 }}>
                Publicar um evento
              </h2>
              <p style={{
                color: COLORS.muted,
                fontSize: 14,
                margin: 0,
                lineHeight: 1.5,
              }}>
                A publicação fica pendente até à confirmação do pagamento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError('');
                setShowForm((current) => !current);
              }}
              style={{
                border: `1px solid ${COLORS.purple}`,
                borderRadius: 10,
                background: COLORS.purpleSoft,
                color: COLORS.purple,
                padding: '11px 15px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showForm ? 'Fechar formulário' : 'Criar evento'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submitEvent} style={{
              display: 'grid',
              gap: 14,
              marginTop: 20,
            }}>
              {!session?.user?.id && authChecked && (
                <p style={{
                  background: COLORS.goldSoft || '#FBF1D7',
                  padding: 12,
                  borderRadius: 10,
                  lineHeight: 1.5,
                }}>
                  Podes consultar os eventos sem iniciar sessão. Para publicar,
                  inicia sessão na tua conta Talaza.
                </p>
              )}

              <label>
                Título do evento
                <input
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  maxLength={150}
                  required
                  style={{ ...inputStyle, marginTop: 7 }}
                  placeholder="Ex.: Feira de empreendedorismo"
                />
              </label>

              <label>
                Tipo de evento
                <input
                  value={form.event_type}
                  onChange={(e) => updateForm('event_type', e.target.value)}
                  maxLength={100}
                  required
                  style={{ ...inputStyle, marginTop: 7 }}
                  placeholder="Ex.: Formação, música, feira"
                />
              </label>

              <label>
                Descrição
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  required
                  rows={4}
                  maxLength={5000}
                  style={{ ...inputStyle, marginTop: 7, resize: 'vertical' }}
                  placeholder="Explica o que vai acontecer, para quem é e como participar."
                />
              </label>

              <label>
                Local do evento (opcional)
                <input
                  value={form.location}
                  onChange={(e) => updateForm('location', e.target.value)}
                  maxLength={250}
                  style={{ ...inputStyle, marginTop: 7 }}
                  placeholder="Município, bairro ou local"
                />
              </label>

              <label>
                Data e hora (opcional)
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => updateForm('starts_at', e.target.value)}
                  style={{ ...inputStyle, marginTop: 7 }}
                />
              </label>

              <label>
                URL da imagem (opcional)
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => updateForm('image_url', e.target.value)}
                  style={{ ...inputStyle, marginTop: 7 }}
                  placeholder="https://..."
                />
              </label>

              <label>
                Plano de eventos
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: 7 }}
                >
                  <option value="">Seleciona um plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {getPlanName(plan)} — {getPlanPrice(plan)} — {getPlanDuration(plan)}
                    </option>
                  ))}
                </select>
              </label>

              {plans.length === 0 && (
                <p style={{
                  color: COLORS.red,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  Não foram encontrados planos de eventos ativos. Confirma
                  os registos da tabela plans e os campos que identificam
                  a área e o estado do plano.
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !session?.user?.id || plans.length === 0}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  background: saving ? '#89948F' : COLORS.green,
                  color: COLORS.white,
                  padding: 14,
                  fontWeight: 700,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? 'A guardar…' : 'Guardar evento pendente'}
              </button>
            </form>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 22, margin: '24px 0 14px' }}>
            Eventos publicados
          </h2>

          {loading ? (
            <div style={cardStyle}>A carregar eventos e localização…</div>
          ) : events.length === 0 ? (
            <div style={{
              ...cardStyle,
              textAlign: 'center',
              padding: 30,
            }}>
              <div style={{
                width: 48,
                height: 48,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
                borderRadius: 14,
                background: COLORS.purpleSoft,
                color: COLORS.purple,
                fontSize: 23,
              }}>
                ◷
              </div>
              <h3 style={{ margin: '0 0 8px' }}>
                Ainda não há eventos disponíveis
              </h3>
              <p style={{
                color: COLORS.muted,
                margin: 0,
                lineHeight: 1.5,
              }}>
                Escolhe uma província para consultar os eventos publicados
                nessa localização.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {events.map((item) => (
                <article key={item.id} style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: 'hidden',
                }}>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title || 'Imagem do evento'}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 180,
                        objectFit: 'cover',
                        background: COLORS.greenSoft,
                      }}
                    />
                  )}

                  <div style={{ padding: 18 }}>
                    <span style={{
                      display: 'inline-block',
                      background: COLORS.purpleSoft,
                      color: COLORS.purple,
                      borderRadius: 999,
                      padding: '5px 9px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {item.event_type || 'Evento'}
                    </span>

                    <h3 style={{ margin: '12px 0 8px', fontSize: 19 }}>
                      {item.title}
                    </h3>

                    <p style={{
                      color: COLORS.muted,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}>
                      {item.description}
                    </p>

                    {item.location && (
                      <p style={{ fontSize: 13, color: COLORS.muted }}>
                        <strong>Local:</strong> {item.location}
                      </p>
                    )}

                    {item.starts_at && (
                      <p style={{ fontSize: 13, color: COLORS.muted }}>
                        <strong>Data:</strong>{' '}
                        {new Date(item.starts_at).toLocaleString('pt-PT')}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
