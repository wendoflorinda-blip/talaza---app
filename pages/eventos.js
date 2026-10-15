import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const BUCKET = 'event-images';

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
  );
}

function getPlanName(plan) {
  return plan.name || plan.title || plan.plan_name || 'Plano';
}

function getPlanPrice(plan) {
  const price = plan.price ?? plan.amount ?? plan.valor;
  return price === undefined || price === null
    ? 'Preço apresentado na página de planos'
    : `${price} Kz`;
}

export default function Eventos() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('Geral');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function initialise() {
      setLoading(true);
      setError('');

      const { data: sessionData } =
        await supabase.auth.getSession();

      const currentUser = sessionData?.session?.user;

      if (!currentUser) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setUser(currentUser);

      let storedCountry = '';
      let storedProvince = '';

      try {
        storedCountry = localStorage.getItem(
          'talaza_country_id'
        ) || '';

        storedProvince = localStorage.getItem(
          'talaza_province_id'
        ) || '';
      } catch {
        // O navegador pode não permitir acesso ao armazenamento.
      }

      let profile = null;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      profile = profileData;

      const resolvedCountry = firstValue(
        router.query.country_id,
        router.query.countryId,
        storedCountry,
        profile?.country_id
      );

      const resolvedProvince = firstValue(
        router.query.province_id,
        router.query.provinceId,
        storedProvince,
        profile?.province_id
      );

      if (!cancelled) {
        setCountryId(resolvedCountry || '');
        setProvinceId(resolvedProvince || '');
      }

      if (resolvedProvince) {
        const { data: province } = await supabase
          .from('provinces')
          .select('*')
          .eq('id', resolvedProvince)
          .maybeSingle();

        if (!cancelled) {
          setProvinceName(
            province?.name ||
            province?.province_name ||
            String(
              router.query.province ||
              'Província selecionada'
            )
          );
        }
      }

      // Carrega os planos sem depender de uma coluna
      // "active" que pode não existir na tabela.
      const { data: planRows, error: plansError } =
        await supabase.from('plans').select('*');

      if (!cancelled) {
        if (plansError) {
          setError(
            'Não foi possível carregar os planos. Verifica a tabela plans.'
          );
        } else {
          const availablePlans = (planRows || []).filter(
            (plan) => {
              if (plan.active === false) return false;
              if (plan.is_active === false) return false;

              const area = String(
                plan.area ||
                plan.plan_type ||
                plan.type ||
                ''
              ).toLowerCase();

              // Se os planos forem identificados por área,
              // mostra apenas os destinados a Eventos.
              if (area && !area.includes('evento')) {
                return false;
              }

              return true;
            }
          );

          setPlans(availablePlans);
        }

        setLoading(false);
      }
    }

    initialise();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Inicia sessão para publicar um evento.');
      return;
    }

    if (!countryId || !provinceId) {
      setError(
        'Não foi possível identificar a localização ativa. Abre Eventos a partir do painel da província.'
      );
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Preenche o título e a descrição do evento.');
      return;
    }

    if (!planId) {
      setError('Seleciona o plano para esta publicação.');
      return;
    }

    if (!image) {
      setError('Seleciona uma imagem para o evento.');
      return;
    }

    if (image.size > 5 * 1024 * 1024) {
      setError('A imagem não pode ultrapassar 5 MB.');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(image.type)) {
      setError('Usa uma imagem JPG, PNG ou WEBP.');
      return;
    }

    setSaving(true);

    let uploadedPath = '';

    try {
      const extension = image.name
        .split('.')
        .pop()
        .toLowerCase();

      const safeExtension = [
        'jpg',
        'jpeg',
        'png',
        'webp',
      ].includes(extension)
        ? extension
        : 'jpg';

      uploadedPath =
        `${user.id}/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Falha ao carregar a imagem: ${uploadError.message}. Verifica as políticas do Storage.`
        );
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(uploadedPath);

      const imageUrl = publicData?.publicUrl;

      if (!imageUrl) {
        throw new Error(
          'Não foi possível obter o endereço da imagem.'
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error(
          'Não foi encontrado um perfil associado à tua conta. Verifica se profiles.id corresponde ao utilizador autenticado.'
        );
      }

      const { data: createdEvent, error: insertError } =
        await supabase
          .from('events')
          .insert({
            user_id: user.id,
            country_id: countryId,
            province_id: provinceId,
            plan_id: planId,
            title: title.trim(),
            description: description.trim(),
            event_type: eventType,
            image_url: imageUrl,
            location: location.trim() || null,
            starts_at: startsAt
              ? new Date(startsAt).toISOString()
              : null,
            expires_at: null,
            status: 'pending_payment',
            payment_status: 'pending',
          })
          .select('id')
          .single();

      if (insertError) {
        throw new Error(
          `O evento não foi guardado: ${insertError.message}`
        );
      }

      setSuccess(
        'Evento registado! A publicação está pendente de pagamento. Terá de ser confirmada antes de ficar ativa.'
      );

      setTitle('');
      setDescription('');
      setEventType('Geral');
      setLocation('');
      setStartsAt('');
      setImage(null);

      const fileInput = document.getElementById(
        'event-image'
      );
      if (fileInput) fileInput.value = '';

      // O evento continua pendente. O pagamento e a ativação
      // devem ser tratados no fluxo de pagamentos/admin.
      if (createdEvent?.id) {
        router.push(
          `/planos?plan_id=${encodeURIComponent(planId)}` +
          `&country=${encodeURIComponent(countryId)}` +
          `&province=${encodeURIComponent(provinceId)}` +
          `&area=Eventos&event_id=${encodeURIComponent(createdEvent.id)}`
        );
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao publicar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={styles.page}>A carregar Eventos...</main>;
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1>Eventos</h1>
          <p>Inicia sessão para publicar um evento.</p>
          <button
            style={styles.button}
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent('/eventos')}`
              )
            }
          >
            Iniciar sessão
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.heading}>Publicar evento</h1>

        <p style={styles.muted}>
          Localização ativa: <strong>{provinceName || 'Província atual'}</strong>
        </p>

        <p style={styles.muted}>
          A publicação fica pendente até o pagamento ser confirmado.
        </p>

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="event-title">
            Nome do evento
          </label>
          <input
            id="event-title"
            style={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={150}
          />

          <label style={styles.label} htmlFor="event-description">
            Descrição
          </label>
          <textarea
            id="event-description"
            style={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
          />

          <label style={styles.label} htmlFor="event-type">
            Tipo de evento
          </label>
          <select
            id="event-type"
            style={styles.input}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option>Geral</option>
            <option>Formação</option>
            <option>Negócios</option>
            <option>Cultura</option>
            <option>Desporto</option>
            <option>Entretenimento</option>
            <option>Religião</option>
          </select>

          <label style={styles.label} htmlFor="event-location">
            Local do evento
          </label>
          <input
            id="event-location"
            style={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex.: Município, bairro ou local"
          />

          <label style={styles.label} htmlFor="event-date">
            Data e hora (opcional)
          </label>
          <input
            id="event-date"
            type="datetime-local"
            style={styles.input}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />

          <label style={styles.label} htmlFor="event-image">
            Imagem do evento
          </label>
          <input
            id="event-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={styles.input}
            onChange={(e) =>
              setImage(e.target.files?.[0] || null)
            }
            required
          />
          <small style={styles.muted}>
            JPG, PNG ou WEBP. Máximo: 5 MB.
          </small>

          <label style={styles.label} htmlFor="event-plan">
            Plano para ativar a publicação
          </label>
          <select
            id="event-plan"
            style={styles.input}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            required
          >
            <option value="">Seleciona um plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {getPlanName(plan)} — {getPlanPrice(plan)}
              </option>
            ))}
          </select>

          {plans.length === 0 && (
            <p style={styles.error}>
              Não foram encontrados planos para Eventos. Verifica
              a tabela plans e os nomes das colunas que identificam
              os planos ativos e a respetiva área.
            </p>
          )}

          <button
            type="submit"
            style={styles.button}
            disabled={saving || plans.length === 0}
          >
            {saving
              ? 'A guardar...'
              : 'Guardar evento e continuar para pagamento'}
          </button>
        </form>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#F8F6F3',
    padding: '24px 16px 100px',
    color: '#17211F',
  },
  card: {
    maxWidth: 680,
    margin: '0 auto',
    background: '#FFFFFF',
    border: '1px solid #E5E9E7',
    borderRadius: 18,
    padding: 24,
  },
  heading: { marginTop: 0, color: '#083F35' },
  muted: { color: '#596560', fontSize: 14 },
  form: { display: 'grid', gap: 10, marginTop: 20 },
  label: { fontWeight: 600, marginTop: 8 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    border: '1px solid #D5DEDA',
    borderRadius: 9,
    background: '#FFFFFF',
    color: '#17211F',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    border: '1px solid #D5DEDA',
    borderRadius: 9,
    minHeight: 110,
    font: 'inherit',
  },
  button: {
    marginTop: 12,
    border: 0,
    borderRadius: 10,
    padding: 14,
    background: '#0F6E5C',
    color: '#FFFFFF',
    fontWeight: 700,
    cursor: 'pointer',
  },
  error: {
    background: '#FBEAEC',
    color: '#B93845',
    padding: 12,
    borderRadius: 8,
  },
  success: {
    background: '#E8F3F0',
    color: '#083F35',
    padding: 12,
    borderRadius: 8,
  },
};
