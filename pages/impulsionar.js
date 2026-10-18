import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#075B4E',
  brandLight: '#EAF4F1',
  gold: '#E6A900',
  ink: '#17342F',
  muted: '#66736F',
  background: '#F5F7F6',
  line: '#DDE7E3',
  white: '#FFFFFF',
};

function formatPrice(plan) {
  const value = plan.price ?? plan.price_kz ?? plan.amount ?? plan.valor;
  if (value === null || value === undefined || value === '') return 'Preço não definido';
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('pt-PT').format(numeric) + ' Kz'
    : String(value);
}

function planTitle(plan) {
  return plan.name || plan.title || plan.plan_name || plan.nome || plan.description || 'Plano de hospedagem';
}

function planType(plan) {
  return String(plan.plan_type || plan.type || '').trim().toLowerCase();
}

export default function Impulsionar() {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    loadData();
  }, [router.isReady]);

  async function loadData() {
    setLoading(true);
    setError('');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      router.replace('/login');
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category_id, subcategory_id, country_id, province_id, is_active, approval_status')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (businessError) {
      console.error(businessError);
      setError('Não foi possível carregar o seu negócio. Tente novamente.');
      setLoading(false);
      return;
    }

    if (!businessData) {
      setError('Ainda não encontramos um negócio associado à sua conta. Crie primeiro o seu perfil de negócio.');
      setLoading(false);
      return;
    }

    setBusiness(businessData);

    const { data: planData, error: plansError } = await supabase
      .from('plans')
      .select('*');

    if (plansError) {
      console.error(plansError);
      setError('O perfil foi carregado, mas não foi possível consultar os planos. Verifique as permissões da tabela plans no Supabase.');
      setLoading(false);
      return;
    }

    setPlans(planData || []);
    setLoading(false);
  }

  const hostingPlans = useMemo(() => {
    if (!business) return [];
    return plans.filter((plan) => {
      const type = planType(plan);
      const matchesType = type === 'hospedagem';
      const matchesCategory = !plan.category_id || String(plan.category_id) === String(business.category_id);
      const subcategoryId = plan.subcategory_id;
      const matchesSubcategory = !subcategoryId || String(subcategoryId) === String(business.subcategory_id);
      const isEnabled = plan.is_active !== false && plan.active !== false && plan.enabled !== false;
      return matchesType && matchesCategory && matchesSubcategory && isEnabled;
    }).sort((a, b) => Number(a.duration_days || 0) - Number(b.duration_days || 0));
  }, [plans, business]);

  const premiumPlans = useMemo(() => {
    if (!business) return [];
    return plans.filter((plan) => {
      const type = planType(plan);
      const isPremium = type.includes('destaque') || type.includes('premium');
      const matchesCategory = !plan.category_id || String(plan.category_id) === String(business.category_id);
      const subcategoryId = plan.subcategory_id;
      const matchesSubcategory = !subcategoryId || String(subcategoryId) === String(business.subcategory_id);
      const isEnabled = plan.is_active !== false && plan.active !== false && plan.enabled !== false;
      return isPremium && matchesCategory && matchesSubcategory && isEnabled;
    });
  }, [plans, business]);

  if (loading) {
    return <main style={styles.center}><p>A carregar a área Impulsionar…</p></main>;
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.brand}>TALAZA</div>
            <div style={styles.headerTitle}>Impulsionar</div>
          </div>
          <Link href="/seller" style={styles.backLink}>Painel do vendedor</Link>
        </div>
      </header>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        {business && (
          <section style={styles.intro}>
            <div style={styles.eyebrow}>ÁREA DO VENDEDOR</div>
            <h1 style={styles.title}>Dê mais visibilidade ao seu negócio</h1>
            <p style={styles.subtitle}>
              Negócio: <strong>{business.name}</strong>. A hospedagem mantém o perfil elegível para aparecer na Vitrine; os destaques são uma contratação separada.
            </p>
            <div style={styles.status}>
              Estado do perfil: {business.is_active ? 'Ativo' : 'Inativo'}
              {business.approval_status ? ' · ' + business.approval_status : ''}
            </div>
          </section>
        )}

        <section style={styles.section}>
          <div style={styles.sectionHeading}>
            <div style={styles.iconBox}>◷</div>
            <div>
              <h2 style={styles.sectionTitle}>Hospedagem</h2>
              <p style={styles.sectionDescription}>Consulte os planos registados no sistema para a categoria do seu negócio.</p>
            </div>
          </div>

          {hostingPlans.length === 0 ? (
            <div style={styles.empty}>
              Ainda não há planos de hospedagem disponíveis para esta categoria, ou os planos não puderam ser associados ao perfil.
            </div>
          ) : (
            <div style={styles.grid}>
              {hostingPlans.map((plan) => (
                <article key={plan.id} style={styles.planCard}>
                  <div style={styles.planTag}>HOSPEDAGEM</div>
                  <h3 style={styles.planTitle}>{planTitle(plan)}</h3>
                  <div style={styles.price}>{formatPrice(plan)}</div>
                  <div style={styles.duration}>
                    {plan.duration_days ? plan.duration_days + ' dias' : 'Duração conforme o plano'}
                  </div>
                  {plan.description && <p style={styles.planDescription}>{plan.description}</p>}
                  <div style={styles.pendingAction}>
                    Pagamento online e ativação serão ligados nesta etapa seguinte.
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeading}>
            <div style={{ ...styles.iconBox, background: '#FFF4D2', color: '#8A6500' }}>✦</div>
            <div>
              <h2 style={styles.sectionTitle}>Destaque Premium</h2>
              <p style={styles.sectionDescription}>
                Um plano separado para destacar o negócio na Vitrine principal, na Vitrine da subcategoria ou em ambas, conforme a opção contratada.
              </p>
            </div>
          </div>

          {premiumPlans.length === 0 ? (
            <div style={styles.empty}>
              Os planos de Destaque Premium ainda não estão registados na tabela plans. Não apresentamos preços nem opções inventadas. Quando forem cadastrados, esta área poderá mostrá-los.
            </div>
          ) : (
            <div style={styles.grid}>
              {premiumPlans.map((plan) => (
                <article key={plan.id} style={styles.planCard}>
                  <div style={{ ...styles.planTag, background: '#FFF4D2', color: '#8A6500' }}>DESTAQUE PREMIUM</div>
                  <h3 style={styles.planTitle}>{planTitle(plan)}</h3>
                  <div style={styles.price}>{formatPrice(plan)}</div>
                  <div style={styles.duration}>
                    {plan.duration_days ? plan.duration_days + ' dias' : 'Duração conforme o plano'}
                  </div>
                  {plan.description && <p style={styles.planDescription}>{plan.description}</p>}
                  <div style={styles.pendingAction}>
                    A contratação e a escolha das posições de destaque serão ligadas na etapa de pagamento.
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={styles.promotionNote}>
          <div style={styles.iconBox}>↗</div>
          <div>
            <h2 style={styles.sectionTitle}>Promoção de publicações</h2>
            <p style={styles.sectionDescription}>
              Será um produto independente para destacar uma publicação na área “Novidades”, futuramente chamada “Promoção”. Não está incluído na hospedagem nem no Destaque Premium.
            </p>
            <span style={styles.comingSoon}>Estrutura comercial definida · integração futura</span>
          </div>
        </section>

        <Link href={{ pathname: '/seller', query: { country: business?.country_id, province: business?.province_id } }} style={styles.footerLink}>
          ← Voltar ao painel do vendedor
        </Link>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: '100vh', background: COLORS.background, color: COLORS.ink, paddingBottom: 48 },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background, color: COLORS.brand, padding: 24 },
  header: { background: COLORS.brand, color: COLORS.white, padding: '16px 20px' },
  headerInner: { maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { color: COLORS.gold, fontSize: 12, fontWeight: 900, letterSpacing: 2 },
  headerTitle: { fontSize: 18, fontWeight: 800, marginTop: 3 },
  backLink: { color: COLORS.white, textDecoration: 'none', border: '1px solid rgba(255,255,255,.35)', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 700 },
  content: { maxWidth: 1000, margin: '0 auto', padding: '26px 18px' },
  intro: { background: 'linear-gradient(145deg,#075B4E,#0B7563)', color: COLORS.white, borderRadius: 24, padding: 25, boxShadow: '0 15px 40px rgba(0,70,60,.12)' },
  eyebrow: { color: COLORS.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: 900 },
  title: { fontSize: 'clamp(26px,5vw,36px)', margin: '10px 0' },
  subtitle: { color: 'rgba(255,255,255,.84)', lineHeight: 1.6, marginBottom: 0 },
  status: { display: 'inline-block', marginTop: 16, padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,.13)', fontSize: 12, fontWeight: 700 },
  section: { marginTop: 26 },
  sectionHeading: { display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 },
  iconBox: { width: 46, height: 46, flexShrink: 0, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.brandLight, color: COLORS.brand, fontSize: 22, fontWeight: 900 },
  sectionTitle: { margin: 0, fontSize: 21, color: COLORS.brand },
  sectionDescription: { margin: '6px 0 0', color: COLORS.muted, lineHeight: 1.55, fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 },
  planCard: { background: COLORS.white, border: '1px solid ' + COLORS.line, borderRadius: 18, padding: 20, boxShadow: '0 8px 24px rgba(20,50,43,.04)' },
  planTag: { display: 'inline-block', background: COLORS.brandLight, color: COLORS.brand, borderRadius: 999, padding: '6px 9px', fontSize: 10, fontWeight: 900, letterSpacing: .6 },
  planTitle: { fontSize: 17, lineHeight: 1.35, margin: '14px 0 8px' },
  price: { color: COLORS.brand, fontSize: 25, fontWeight: 900 },
  duration: { color: COLORS.muted, marginTop: 4, fontSize: 12, fontWeight: 700 },
  planDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 1.5 },
  pendingAction: { marginTop: 14, padding: 11, background: '#F7F8F7', borderRadius: 10, color: COLORS.muted, fontSize: 11, lineHeight: 1.5 },
  empty: { background: COLORS.white, border: '1px dashed ' + COLORS.line, borderRadius: 16, padding: 20, color: COLORS.muted, lineHeight: 1.6, fontSize: 13 },
  promotionNote: { display: 'flex', gap: 14, marginTop: 26, background: COLORS.white, border: '1px solid ' + COLORS.line, borderRadius: 18, padding: 20 },
  comingSoon: { display: 'inline-block', marginTop: 10, color: '#8A6500', fontSize: 11, fontWeight: 800 },
  footerLink: { display: 'block', marginTop: 24, color: COLORS.brand, textAlign: 'center', textDecoration: 'none', fontWeight: 800, fontSize: 13 },
  error: { background: '#FFF0EE', color: '#9C3027', padding: 14, borderRadius: 12, marginBottom: 18, lineHeight: 1.5 },
};
