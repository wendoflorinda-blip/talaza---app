import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TalazaMenu from '../components/TalazaMenu';
import { supabase } from '../lib/supabaseClient';

export default function Seller() {
  const router = useRouter();

  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editMunicipality, setEditMunicipality] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [notice, setNotice] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadBusiness();
  }, [router.isReady, country, province]);

  async function loadBusiness() {
    setLoading(true);
    setError('');

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    setUser(session.user);

    const { data, error: businessError } =
      await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (businessError) {
      console.error(businessError);
      setError('Não foi possível carregar o seu negócio.');
      setLoading(false);
      return;
    }

    if (!data) {
      setError(
        'Não encontramos um negócio associado à sua conta nesta localização.'
      );
      setLoading(false);
      return;
    }

    setBusiness(data);
    setEditName(data.name || '');
    setEditDescription(data.description || '');
    setEditPhone(data.phone || '');
    setEditWhatsapp(data.whatsapp || '');
    setEditHours(data.opening_hours || '');
    setEditMunicipality(data.municipality || '');
    setEditNeighborhood(data.neighborhood || '');

    const { data: pendingRequest, error: pendingRequestError } = await supabase
      .from('payment_submissions')
      .select('id, plan_id, amount, created_at, status')
      .eq('business_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) console.error('Erro ao verificar pagamento pendente:', pendingRequestError);
    const requestStatus = String(pendingRequest?.status || '').toLowerCase();
    const isInVerification = Boolean(
      pendingRequest &&
      (requestStatus === 'pending' ||
        (requestStatus === 'approved' &&
          (!data.is_active || String(data.approval_status || '').toLowerCase() !== 'approved')))
    );
    setSubscriptionPending(isInVerification);
    if (pendingRequest?.plan_id && isInVerification) {
      const { data: selectedPlan, error: selectedPlanError } = await supabase
        .from('plans')
        .select('id, name, title, plan_name, nome, duration_days, price')
        .eq('id', pendingRequest.plan_id)
        .maybeSingle();
      if (selectedPlanError) console.error('Erro ao carregar plano pendente:', selectedPlanError);
      setPendingPlan(selectedPlan ? { ...selectedPlan, request: pendingRequest } : { id: pendingRequest.plan_id, request: pendingRequest });
    } else {
      setPendingPlan(null);
    }
    setLoading(false);
  }

  async function saveBusiness(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (subscriptionPending) {
      setEditing(false);
      setError('O perfil está em verificação para aprovação. Edite mais tarde, depois da validação.');
      return;
    }
    if (!editName.trim()) {
      setError('O nome do negócio é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        phone: editPhone.trim() || null,
        whatsapp: editWhatsapp.trim() || null,
        opening_hours: editHours.trim() || null,
        municipality: editMunicipality.trim() || null,
        neighborhood: editNeighborhood.trim() || null,
      };
      const stamp = Date.now();
      if (logoFile) {
        if (!logoFile.type.startsWith('image/')) throw new Error('O logo deve ser um ficheiro de imagem.');
        if (logoFile.size > 8 * 1024 * 1024) throw new Error('O logo deve ter no máximo 8 MB.');
        const ext = (logoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = business.id + '/logo-edit-' + stamp + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('business-media').upload(path, logoFile, { upsert: true, contentType: logoFile.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        updates.logo_url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl || null;
      }
      if (coverFile) {
        if (!coverFile.type.startsWith('image/')) throw new Error('A imagem principal deve ser um ficheiro de imagem.');
        if (coverFile.size > 10 * 1024 * 1024) throw new Error('A imagem principal deve ter no máximo 10 MB.');
        const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = business.id + '/cover-edit-' + stamp + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('business-media').upload(path, coverFile, { upsert: true, contentType: coverFile.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        updates.cover_url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl || null;
      }
      const { error: saveError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id)
        .eq('owner_id', user.id);
      if (saveError) throw saveError;

      // Atualiza a interface local sem depender de um SELECT de retorno,
      // que pode ser bloqueado por políticas RLS mesmo quando o UPDATE funciona.
      setBusiness({ ...business, ...updates });
      setLogoFile(null);
      setCoverFile(null);
      setEditing(false);
      setNotice('As alterações do negócio foram guardadas.');
    } catch (saveError) {
      console.error(saveError);
      setError('Não foi possível guardar as alterações. ' + (saveError.message || 'Confirme as permissões de edição no Supabase.'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadBrandAsset(file, field) {
    if (!file || !user || !business) return;
    if (!file.type.startsWith('image/')) {
      setError('Escolha um ficheiro de imagem válido.');
      return;
    }
    const limit = field === 'logo_url' ? 8 : 10;
    if (file.size > limit * 1024 * 1024) {
      setError('A imagem deve ter no máximo ' + limit + ' MB.');
      return;
    }
    setAssetUploading(true);
    setError('');
    setNotice('');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = business.id + '/' + field.replace('_url', '') + '-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('business-media').upload(path, file, {
        upsert: false, contentType: file.type, cacheControl: '3600'
      });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
      if (!url) throw new Error('Não foi possível obter o endereço público da imagem.');
      const { error: updateError } = await supabase.from('businesses').update({ [field]: url }).eq('id', business.id).eq('owner_id', user.id);
      if (updateError) throw updateError;
      setBusiness((previous) => ({ ...previous, [field]: url }));
      setNotice(field === 'logo_url' ? 'Logo atualizada.' : 'Imagem principal atualizada.');
    } catch (uploadError) {
      console.error(uploadError);
      setError('Não foi possível guardar a imagem. ' + (uploadError.message || 'Confirma as permissões do armazenamento.'));
    } finally {
      setAssetUploading(false);
    }
  }

  async function handleLogout() {
    setError('');
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      setError('Não foi possível terminar a sessão. Tente novamente.');
      return;
    }
    setUser(null);
    setBusiness(null);
    await router.replace('/');
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#075B4E',
          fontWeight: 700
        }}
      >
        A preparar o seu painel…
      </div>
    );
  }

  if (error && !business) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '80px auto',
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 30,
            textAlign: 'center'
          }}
        >
          <h2 style={{ color: '#075B4E' }}>
            Não foi possível abrir o negócio
          </h2>

          <p style={{ color: '#66736F', lineHeight: 1.6 }}>
            {error}
          </p>

          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: 15,
              padding: '13px 20px',
              background: '#075B4E',
              color: '#FFFFFF',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 800
            }}
          >
            Voltar à Talaza
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        paddingBottom: 50
      }}
    >
      <header
        style={{
          background: '#075B4E',
          color: '#FFFFFF',
          padding: '16px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2,
                color: '#E6A900',
                fontWeight: 900
              }}
            >
              TALAZA
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginTop: 3
              }}
            >
              Painel do negócio
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TalazaMenu
              country={business?.country_id || country}
              province={business?.province_id || province}
              countryName=""
              provinceName=""
              sellerPanelRoute="/seller"
            />
          </div>
        </div>
      </header>

      <input id="talaza-logo-upload" type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadBrandAsset(file, 'logo_url'); }} />
      <input id="talaza-cover-upload" type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadBrandAsset(file, 'cover_url'); }} />
      <main
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '24px 18px'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg,#075B4E,#0B7563)',
            color: '#FFFFFF',
            borderRadius: 24,
            padding: 25,
            boxShadow: '0 15px 40px rgba(0,70,60,.13)',
            position: 'relative'
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#E6A900',
              fontWeight: 900,
              letterSpacing: 1
            }}
          >
            O SEU NEGÓCIO
          </div>

          <h1
            style={{
              margin: '8px 0',
              fontSize: 'clamp(26px,5vw,38px)'
            }}
          >
            {business.name}
          </h1>

          <div style={{ position: 'relative', width: 88, height: 88, margin: '14px 0 12px' }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={"Logo de " + business.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 20, border: '3px solid rgba(255,255,255,.65)' }} />
            ) : <div aria-label="Logo ainda não adicionado" style={{ width: 88, height: 88, display: 'grid', placeItems: 'center', background: '#E6A900', color: '#075B4E', borderRadius: 20, fontSize: 30, fontWeight: 900 }}>{(business.name || 'T').charAt(0).toUpperCase()}</div>}
            <button type="button" aria-label="Adicionar ou alterar logo" disabled={assetUploading || subscriptionPending} onClick={() => document.getElementById('talaza-logo-upload')?.click()} style={{ position: 'absolute', right: -8, bottom: -8, width: 30, height: 30, borderRadius: '50%', border: '2px solid #075B4E', background: '#FFFFFF', color: '#075B4E', fontSize: 22, fontWeight: 900, lineHeight: 1, cursor: assetUploading || subscriptionPending ? 'not-allowed' : 'pointer' }}>+</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <div style={{ position: 'relative', width: 124, minHeight: 124, flex: '0 0 124px', borderRadius: 18, overflow: 'hidden', border: '2px dashed rgba(255,255,255,.55)', background: 'rgba(255,255,255,.10)' }}>
              {business.cover_url ? (
                <img src={business.cover_url} alt={"Imagem de " + business.name} style={{ width: '100%', height: '100%', minHeight: 124, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ minHeight: 124, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 8, color: '#FFFFFF', fontSize: 13 }}>＋<br />Adicionar imagem</div>
              )}
              <button type="button" aria-label="Adicionar ou alterar imagem" disabled={assetUploading || subscriptionPending} onClick={() => document.getElementById('talaza-cover-upload')?.click()} style={{ position: 'absolute', right: 6, bottom: 6, width: 30, height: 30, borderRadius: '50%', border: '2px solid #075B4E', background: '#FFFFFF', color: '#075B4E', fontSize: 22, fontWeight: 900, cursor: assetUploading || subscriptionPending ? 'not-allowed' : 'pointer' }}>+</button>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.78)', fontSize: 12, lineHeight: 1.5, flex: '1 1 100%' }}>
              {business.municipality || ''}{business.neighborhood ? ' · ' + business.neighborhood : ''}
            </p>
          </div>

          {subscriptionPending && pendingPlan?.id ? (
            <Link
              href={{ pathname: '/Pagamento', query: { plan: pendingPlan.id, business: business.id, status: 'verification' } }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '9px 13px', borderRadius: 999, background: '#FFF1C2', color: '#5B4300', fontSize: 12, fontWeight: 900, textDecoration: 'none', border: '1px solid #EBD58C' }}
            >
              Em verificação · Ver plano e referência <span aria-hidden="true">→</span>
            </Link>
          ) : (
            String(business.approval_status || '').toLowerCase() === 'pending' ? (
              <div style={{ display: 'inline-flex', marginTop: 18, padding: '7px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', fontSize: 12, fontWeight: 700 }}>
                Perfil criado · aguarda validação
              </div>
            ) : null
          )}
        </div>

        {subscriptionPending && (
          <div style={{ marginTop: 18, padding: 16, background: '#FFF5D6', border: '1px solid #EBD58C', borderRadius: 14, color: '#5B4300' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Em verificação para ativação do negócio</strong>
            <span>O comprovativo já foi enviado. Não é possível mudar de plano nem editar o perfil enquanto a equipa Talaza verifica o pagamento e a aprovação do negócio.</span>
            {pendingPlan && <div style={{ marginTop: 8 }}><strong>Plano escolhido:</strong> {pendingPlan.name || pendingPlan.title || pendingPlan.plan_name || pendingPlan.nome || (pendingPlan.duration_days ? pendingPlan.duration_days + ' dias' : 'Plano selecionado')}</div>}
          </div>
        )}


        {notice && <div role="status" style={{ marginTop: 16, padding: 13, background: '#E8F6F1', color: '#075B4E', borderRadius: 12, fontWeight: 700 }}>{notice}</div>}
        {error && <div role="alert" style={{ marginTop: 16, padding: 13, background: '#FCEBED', color: '#A52F3B', borderRadius: 12 }}>{error}</div>}



        <section style={{ marginTop: 16, padding: 22, borderRadius: 20, color: '#FFFFFF', background: 'linear-gradient(135deg,#4A1F73,#5B2A86 55%,#74399F)', boxShadow: '0 12px 28px rgba(91,42,134,.18)' }}>
          <div style={{ color: '#F3D77A', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 8 }}>DESCRIÇÃO DO NEGÓCIO</div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: 14 }}>{business.description || 'A descrição do teu negócio aparecerá aqui. Conta aos clientes o que ofereces, o que torna os teus produtos especiais e como podem entrar em contacto contigo.'}</p>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.2)', fontSize: 12, lineHeight: 1.8, color: '#F4EDFB' }}>
            <div><strong>Contacto:</strong> {business.phone || 'Não definido'}</div>
            <div><strong>WhatsApp:</strong> {business.whatsapp || 'Não definido'}</div>
            <div><strong>Horário:</strong> {business.opening_hours || 'Não definido'}</div>
            <div><strong>Endereço:</strong> {[business.municipality, business.neighborhood].filter(Boolean).join(' · ') || 'Não definido'}</div>
          </div>
        </section>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
          <button type="button" onClick={() => router.push({ pathname: '/businesses/' + business.id, query: { country: business.country_id, province: business.province_id } })} style={{ padding: '14px 22px', borderRadius: 12, background: '#E6A900', color: '#17342F', fontWeight: 900, border: 0, cursor: 'pointer' }}>Produtos</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 22 }}>
          <button type="button" onClick={() => router.push({ pathname: '/businesses/' + business.id, query: { country: business.country_id, province: business.province_id, gallery: 'principais' } })} style={{ padding: '14px 16px', borderRadius: 14, background: '#075B4E', color: '#FFFFFF', fontWeight: 900, border: 0, cursor: 'pointer' }}>Imagens principais</button>
          <button type="button" onClick={() => router.push({ pathname: '/businesses/' + business.id, query: { country: business.country_id, province: business.province_id, gallery: 'painel' } })} style={{ padding: '14px 16px', borderRadius: 14, background: '#5B2A86', color: '#FFFFFF', fontWeight: 900, border: 0, cursor: 'pointer' }}>Imagens de painel</button>
        </div>
        <button type="button" onClick={() => router.push({ pathname: '/businesses/' + business.id, query: { country: business.country_id, province: business.province_id } })} style={{ display: 'block', width: '100%', marginTop: 14, padding: 13, borderRadius: 12, border: '1.5px solid #075B4E', background: '#FFFFFF', color: '#075B4E', fontWeight: 800, cursor: 'pointer' }}>← Explorar a Talaza como cliente</button>
        <button type="button" onClick={() => { if (!subscriptionPending) router.push({ pathname: '/impulsionar', query: { business: business.id } }); }} disabled={subscriptionPending} style={{ position: 'fixed', right: 0, top: '44%', zIndex: 15, writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '18px 12px', borderRadius: '18px 0 0 18px', background: 'linear-gradient(160deg,#F7CF45,#E6A900 55%,#C98F00)', color: '#17342F', boxShadow: '-6px 8px 22px rgba(201,143,0,.35)', fontWeight: 900, letterSpacing: 1, border: 0, cursor: subscriptionPending ? 'not-allowed' : 'pointer' }} aria-label="Impulsionar negócio">⚡ Impulsionar</button>

      </main>
    </div>
  );
}
