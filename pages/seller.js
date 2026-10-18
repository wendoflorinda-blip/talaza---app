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
      .from('subscription_requests')
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
        const path = user.id + '/logo-edit-' + stamp + '.' + ext;
        const { error: uploadError } = await supabase.storage.from('business-media').upload(path, logoFile, { upsert: true, contentType: logoFile.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        updates.logo_url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl || null;
      }
      if (coverFile) {
        if (!coverFile.type.startsWith('image/')) throw new Error('A imagem principal deve ser um ficheiro de imagem.');
        if (coverFile.size > 10 * 1024 * 1024) throw new Error('A imagem principal deve ter no máximo 10 MB.');
        const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = user.id + '/cover-edit-' + stamp + '.' + ext;
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
            boxShadow: '0 15px 40px rgba(0,70,60,.13)'
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

          {business.logo_url ? (
            <img src={business.logo_url} alt={"Logo de " + business.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 20, border: '3px solid rgba(255,255,255,.65)', marginBottom: 12 }} />
          ) : <div aria-label="Logo ainda não adicionado" style={{ width: 86, height: 86, display: 'grid', placeItems: 'center', background: '#E6A900', color: '#075B4E', borderRadius: 20, fontSize: 30, fontWeight: 900, marginBottom: 12 }}>{(business.name || 'T').charAt(0).toUpperCase()}</div>}
          <p
            style={{
              margin: 0,
              color: 'rgba(255,255,255,.78)',
              lineHeight: 1.5
            }}
          >
            {business.municipality || 'Município não definido'}
            {business.neighborhood
              ? ` · ${business.neighborhood}`
              : ''}
          </p>

          {subscriptionPending && pendingPlan?.id ? (
            <Link
              href={{ pathname: '/Pagamento', query: { plan: pendingPlan.id, business: business.id, status: 'verification' } }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, padding: '9px 13px', borderRadius: 999, background: '#FFF1C2', color: '#5B4300', fontSize: 12, fontWeight: 900, textDecoration: 'none', border: '1px solid #EBD58C' }}
            >
              Em verificação · Ver plano e referência <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <div style={{ display: 'inline-flex', marginTop: 18, padding: '7px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', fontSize: 12, fontWeight: 700 }}>
              {String(business.approval_status || '').toLowerCase() === 'pending'
                ? 'Perfil criado · aguarda plano e validação'
                : business.is_active ? 'Ativo' : 'Inativo'}
            </div>
          )}
        </div>

        {business.cover_url && (
          <div style={{ marginTop: 18, borderRadius: 20, overflow: 'hidden', background: '#EAF4F1' }}>
            <img src={business.cover_url} alt={"Imagem principal de " + business.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'cover' }} />
          </div>
        )}

        {subscriptionPending && (
          <div style={{ marginTop: 18, padding: 16, background: '#FFF5D6', border: '1px solid #EBD58C', borderRadius: 14, color: '#5B4300' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Em verificação para ativação do negócio</strong>
            <span>O comprovativo já foi enviado. Não é possível mudar de plano nem editar o perfil enquanto a equipa Talaza verifica o pagamento e a aprovação do negócio.</span>
            {pendingPlan && <div style={{ marginTop: 8 }}><strong>Plano escolhido:</strong> {pendingPlan.name || pendingPlan.title || pendingPlan.plan_name || pendingPlan.nome || (pendingPlan.duration_days ? pendingPlan.duration_days + ' dias' : 'Plano selecionado')}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
          {subscriptionPending ? (
            <button type="button" disabled title="O comprovativo está em verificação" style={{ padding: '13px 18px', background: '#E6E9E7', color: '#596560', border: 0, borderRadius: 12, fontWeight: 800, cursor: 'not-allowed' }}>
              Em verificação
            </button>
          ) : (
            <Link href={{ pathname: '/impulsionar', query: { business: business.id } }} onClick={(event) => { if (!window.confirm('Pretende consultar ou mudar o plano de hospedagem deste negócio?')) event.preventDefault(); }} style={{ padding: '13px 18px', background: '#E6A900', color: '#17342F', borderRadius: 12, textDecoration: 'none', fontWeight: 800 }}>
              Mudar plano / Ver planos
            </Link>
          )}
          <button type="button" disabled={subscriptionPending} onClick={() => { setEditing((v) => !v); setError(''); setNotice(''); }} style={{ padding: '13px 18px', background: subscriptionPending ? '#E6E9E7' : '#FFFFFF', color: subscriptionPending ? '#596560' : '#075B4E', border: '1px solid #BFD8D0', borderRadius: 12, fontWeight: 800, cursor: subscriptionPending ? 'not-allowed' : 'pointer' }}>
            {subscriptionPending ? 'Edição bloqueada durante a verificação' : editing ? 'Cancelar edição' : 'Editar negócio'}
          </button>
        </div>

        {notice && <div role="status" style={{ marginTop: 16, padding: 13, background: '#E8F6F1', color: '#075B4E', borderRadius: 12, fontWeight: 700 }}>{notice}</div>}
        {error && <div role="alert" style={{ marginTop: 16, padding: 13, background: '#FCEBED', color: '#A52F3B', borderRadius: 12 }}>{error}</div>}

        {editing && (
          <form onSubmit={saveBusiness} style={{ marginTop: 20, background: '#FFFFFF', border: '1px solid #DDE7E3', borderRadius: 20, padding: 22, display: 'grid', gap: 13 }}>
            <h2 style={{ margin: 0, color: '#075B4E' }}>Editar negócio</h2>
            <p style={{ margin: 0, color: '#66736F', fontSize: 13, lineHeight: 1.5 }}>Pode alterar os dados do negócio, contactos, horário, descrição, logo e imagem principal. A província não pode ser alterada nesta área.</p>
            {[
              ['Nome do negócio', editName, setEditName],
              ['Contacto principal', editPhone, setEditPhone],
              ['Outro contacto / WhatsApp', editWhatsapp, setEditWhatsapp],
              ['Município', editMunicipality, setEditMunicipality],
              ['Bairro', editNeighborhood, setEditNeighborhood],
              ['Horário de funcionamento', editHours, setEditHours],
            ].map(([label, value, setter]) => (
              <label key={label} style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 800, color: '#17342F' }}>
                {label}
                <input value={value} onChange={(e) => setter(e.target.value)} style={{ padding: 12, border: '1px solid #DDE7E3', borderRadius: 10, font: 'inherit', fontWeight: 500 }} />
              </label>
            ))}
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 800, color: '#17342F' }}>Descrição
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} style={{ padding: 12, border: '1px solid #DDE7E3', borderRadius: 10, font: 'inherit', fontWeight: 500 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 800, color: '#17342F' }}>Mudar logo
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 800, color: '#17342F' }}>Mudar imagem principal
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </label>
            <button type="submit" disabled={saving} style={{ padding: 14, border: 0, borderRadius: 12, background: '#075B4E', color: '#FFFFFF', fontWeight: 900, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'A guardar…' : 'Guardar alterações'}</button>
          </form>
        )}

        <section
          style={{
            marginTop: 22,
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(210px,1fr))',
            gap: 14
          }}
        >
          {[
            ['✎', 'Editar negócio'],
            ['▣', 'Fotos e logo'],
            ['◫', 'Produtos'],
            ['◉', 'Mensagens'],
            ['●', 'Notificações'],
            ['◆', 'Impulsionar']
          ].map(([icon, title]) => (
            <button
              key={title}
              onClick={() => { if (title === 'Impulsionar' && !subscriptionPending) router.push({ pathname: '/impulsionar', query: { business: business.id } }); else if (title === 'Editar negócio' || title === 'Fotos e logo') setEditing(true); else if (title === 'Mensagens') router.push('/mensagens'); }}
              style={{
                border: '1px solid #DDE7E3',
                background: '#FFFFFF',
                borderRadius: 18,
                padding: 20,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#EAF4F1',
                  color: '#075B4E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  marginBottom: 12
                }}
              >
                {icon}
              </div>

              <strong style={{ color: '#17342F' }}>
                {title}
              </strong>
            </button>
          ))}
        </section>

        <div
          style={{
            marginTop: 25,
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 22
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: '#075B4E'
            }}
          >
            Informações do negócio
          </h3>

          <p style={{ color: '#66736F', lineHeight: 1.6 }}>
            {business.description || 'Ainda não adicionou uma descrição.'}
          </p>

          <div
            style={{
              marginTop: 15,
              display: 'grid',
              gap: 9,
              color: '#52615D',
              fontSize: 14
            }}
          >
            <div>
              <strong>Contacto:</strong>{' '}
              {business.phone || business.whatsapp || 'Não definido'}
            </div>

            <div>
              <strong>Telefone:</strong>{' '}
              {business.phone || 'Não definido'}
            </div>

            <div>
              <strong>Endereço:</strong>{' '}
              {business.address || 'Não definido'}
            </div>

            <div>
              <strong>Horário:</strong>{' '}
              {business.opening_hours || 'Não definido'}
            </div>
          </div>
        </div>

        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province
            }
          }}
          style={{
            display: 'block',
            marginTop: 22,
            textAlign: 'center',
            padding: 15,
            borderRadius: 14,
            border: '2px solid #075B4E',
            color: '#075B4E',
            textDecoration: 'none',
            fontWeight: 800,
            background: '#FFFFFF'
          }}
        >
          ← Explorar a Talaza como cliente
        </Link>
      </main>
    </div>
  );
}
