import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import ProductsView, { VIEW_MODES } from '../../../components/ProductsView';

export default function BusinessProductsPage() {
  const router = useRouter();
  const { id, country, province } = router.query;
  const [business, setBusiness] = useState(null);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const returnTo = useMemo(() => {
    const value = Array.isArray(router.query.returnTo) ? router.query.returnTo[0] : router.query.returnTo;
    return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\\\')
      ? value : (id ? '/businesses/' + id : '/explore');
  }, [router.query.returnTo, id]);

  useEffect(() => {
    if (!router.isReady || !id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data: b, error: be } = await supabase.from('businesses')
          .select('id,owner_id,name,country_id,province_id,is_active,approval_status,panel_view_mode')
          .eq('id', id).eq('approval_status', 'approved').maybeSingle();
        if (be) throw be;
        if (!b) throw new Error('Este negócio não está disponível publicamente.');
        if (country && b.country_id !== country) throw new Error('Este negócio pertence a outro país.');
        if (province && b.province_id !== province) throw new Error('Este negócio pertence a outra província.');

        const { data: subs, error: se } = await supabase.from('business_subscriptions')
          .select('id,status,expires_at,starts_at,created_at').eq('business_id', b.id)
          .order('starts_at', { ascending: false }).order('created_at', { ascending: false }).limit(1);
        if (se) throw se;
        const sub = subs?.[0];
        const expiry = sub?.expires_at ? new Date(sub.expires_at) : null;
        const active = Boolean(b.is_active && sub && String(sub.status || '').toLowerCase() === 'active' && expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now());
        if (!active) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('A hospedagem deste negócio expirou. Entre na sua conta e consulte os seus Guardados durante o período de tolerância.');
          const isOwner = String(b.owner_id) === String(user.id);
          const { data: saved, error: savedError } = isOwner ? { data: { id: 'owner' }, error: null } :
            await supabase.from('saved_businesses').select('id').eq('business_id', b.id).eq('user_id', user.id).maybeSingle();
          if (savedError || !saved) throw new Error('Este negócio está temporariamente inativo e só pode ser consultado pelos exploradores que já o guardaram.');
        }

        const { data: media, error: me } = await supabase.from('business_images')
          .select('id,business_id,kind,slot,image_url,video_url,media_type,storage_path,name,description,price,created_at')
          .eq('business_id', b.id).eq('kind', 'panel').order('slot', { ascending: true });
        if (me) throw me;
        if (cancelled) return;
        setBusiness(b);
        setItems(media || []);
        setMode(VIEW_MODES.includes(b.panel_view_mode) ? b.panel_view_mode : 'normal');
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Não foi possível carregar os produtos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router.isReady, id, country, province]);

  return <>
    <Head><title>{business?.name ? 'Produtos | ' + business.name + ' | Talaza' : 'Produtos | Talaza'}</title></Head>
    <main className="productsPage">
      <header className="bar">
        <Link href={returnTo} className="back">← Voltar ao perfil</Link>
        <span className="brand">TALAZA</span>
      </header>
      <section className="content">
        {loading ? <div className="state">A carregar produtos…</div> : error ? <div className="state error"><h1>Produtos indisponíveis</h1><p>{error}</p><Link href={returnTo}>Voltar ao perfil</Link></div> : <>
          <div className="heading"><span>GALERIA DA LOJA</span><h1>Produtos</h1><p>{business?.name} · Imagens e vídeos publicados pelo vendedor</p></div>
          <ProductsView items={items} mode={mode} onModeChange={setMode} editable={false} businessName={business?.name || ''} businessId={business?.id || ''} sellerId={business?.owner_id || ''} />
        </>}
      </section>
    </main>
    <style jsx>{`
      .productsPage{min-height:100vh;background:#F3F8F5;color:#17211F;padding-bottom:40px;font-family:Arial,Helvetica,sans-serif}
      .bar{height:58px;background:#fff;border-bottom:1px solid #DCE8E1;display:flex;align-items:center;justify-content:space-between;padding:0 max(18px,calc((100% - 900px)/2))}
      .back{color:#075B4E;text-decoration:none;font-size:13px;font-weight:800}.brand{font-size:14px;font-weight:1000;letter-spacing:2px;color:#075B4E}
      .content{width:min(900px,calc(100% - 28px));margin:18px auto;background:#fff;border:1px solid #DDE9E3;border-radius:18px;padding:20px;box-shadow:0 8px 25px rgba(20,54,44,.05)}
      .heading{margin-bottom:16px}.heading span{font-size:10px;letter-spacing:1.4px;font-weight:900;color:#A77A0B}.heading h1{margin:4px 0;font-size:26px;color:#075B4E}.heading p{margin:0;color:#687770;font-size:13px}
      .state{padding:40px 16px;text-align:center;color:#53665D}.state.error{color:#813D32}.state a{color:#075B4E;font-weight:800}
      @media(max-width:600px){.content{padding:14px;width:calc(100% - 20px);margin-top:12px}.heading h1{font-size:23px}}
    `}</style>
  </>;
}
