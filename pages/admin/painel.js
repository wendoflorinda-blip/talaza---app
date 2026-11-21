import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import ProductsView from '../../components/ProductsView';
import { Field, ImagePicker, CountrySelect, inputStyle } from '../../components/Fields';
import SubcategoryCards from '../../components/SubcategoryCards';

const colors = { green: '#075B4E', ink: '#173B35', gold: '#D4AF37', muted: '#66756F', border: '#DCE6E0', pale: '#F4F8F5' };
const input = { width: '100%', boxSizing: 'border-box', border: '1px solid #D8E2DC', borderRadius: 10, padding: '12px 13px', font: 'inherit', color: colors.ink, background: '#fff' };
const label = { display: 'block', margin: '14px 0 7px', color: colors.ink, fontSize: 13, fontWeight: 800 };
const primary = { border: 0, borderRadius: 10, padding: '12px 17px', color: '#fff', background: colors.green, fontWeight: 800, cursor: 'pointer' };
const secondary = { border: '1px solid #D8E2DC', borderRadius: 10, padding: '10px 14px', color: colors.ink, background: '#fff', fontWeight: 700, cursor: 'pointer' };

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}
function splitAreas(value) {
  return [...new Set(String(value || '').split(/[\n,;]+/).map(item => item.trim()).filter(Boolean))];
}
function optimizedImageDataUrl(file, square = false, maxSize = 1600) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = square ? 600 : width;
        canvas.height = square ? 600 : height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Não foi possível processar a imagem.');
        if (square) {
          const size = Math.min(img.width, img.height);
          const sx = Math.round((img.width - size) / 2), sy = Math.round((img.height - size) / 2);
          context.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);
        } else context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(objectUrl); }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Não foi possível abrir a imagem.')); };
    img.src = objectUrl;
  });
}

export default function AdminStoreDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [data, setData] = useState(null);
  const [dashboardReadFailed, setDashboardReadFailed] = useState(false);
  const [catalog, setCatalog] = useState({ countries: [], provinces: [], categories: [], subcategories: [] });
  const [tab, setTab] = useState('loja');
  const [editingStore, setEditingStore] = useState(false);

  const [storeForm, setStoreForm] = useState({ nome: '', descricao: '', telefone: '', countryId: '', categoryId: '', subcategoryId: '', secretCode: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedProvinceIds, setSelectedProvinceIds] = useState([]);
  const [areasByProvince, setAreasByProvince] = useState({});

  const [locationProvinceIds, setLocationProvinceIds] = useState([]);
  const [locationAreas, setLocationAreas] = useState({});
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '' });
  const [productPhotos, setProductPhotos] = useState([]);
  const [productBusy, setProductBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [adminThreads, setAdminThreads] = useState([]);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [adminThreadsLoading, setAdminThreadsLoading] = useState(false);
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [assetBusy, setAssetBusy] = useState('');

  const currentCountryProvinces = useMemo(
    () => catalog.provinces.filter(item => item.country_id === storeForm.countryId),
    [catalog.provinces, storeForm.countryId]
  );
  const subcategories = useMemo(
    () => catalog.subcategories.filter(item => item.category_id === storeForm.categoryId),
    [catalog.subcategories, storeForm.categoryId]
  );

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: 'Bearer ' + token, ...(options.headers || {}) },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o pedido.');
    return result;
  }, [token]);

  const loadDashboard = useCallback(async (accessToken) => {
    const response = await fetch('/api/admin-store/me', { headers: { Authorization: 'Bearer ' + accessToken } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o painel.');
    setData(result);
    setDashboardReadFailed(false);
    if (result.store) {
      setLocationProvinceIds((result.provinces || []).map(row => row.province_id).filter(Boolean));
      setLocationAreas(Object.fromEntries((result.provinces || []).map(row => [row.province_id, (row.areas || []).join(', ')])));
    }
    return result;
  }, []);

  const loadMessages = useCallback(async () => {
    if (!token || !data?.store) return;
    setMessagesLoading(true);
    try {
      const result = await api('/api/admin-store/mensagens');
      setMessages(result.messages || []);
    } catch (err) { setError(err.message); }
    finally { setMessagesLoading(false); }
  }, [api, token, data?.store]);

  const loadAllStoreConversations = useCallback(async () => {
    if (!token) return;
    setAdminThreadsLoading(true);
    try {
      const result = await api('/api/admin-store/conversas');
      setAllBusinesses(result.businesses || []);
      setAdminThreads(result.threads || []);
      setSelectedBusinessFilter(current => current || '');
      setSelectedThreadId(current => (result.threads || []).some(t => t.conversationId === current) ? current : '');
    } catch (err) { setError(err.message || 'Não foi possível carregar mensagens das lojas.'); }
    finally { setAdminThreadsLoading(false); }
  }, [api, token]);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          router.replace('/login?redirect=' + encodeURIComponent('/admin/painel'));
          return;
        }
        if (!active) return;
        setToken(accessToken);
        const [locationResponse, dashboardResponse] = await Promise.all([
          fetch('/api/admin-store/localizacoes', { headers: { Authorization: 'Bearer ' + accessToken } }),
          fetch('/api/admin-store/me', { headers: { Authorization: 'Bearer ' + accessToken } }),
        ]);
        const [locations, dashboard] = await Promise.all([locationResponse.json(), dashboardResponse.json()]);
        if (!locationResponse.ok) throw new Error(locations.error || 'Não foi possível carregar as listas.');
        if (!dashboardResponse.ok) throw new Error(dashboard.error || 'Acesso não autorizado.');
        if (!active) return;
        setCatalog(locations);
        setData(dashboard);
        if (dashboard.store) {
          setLocationProvinceIds((dashboard.provinces || []).map(row => row.province_id).filter(Boolean));
          setLocationAreas(Object.fromEntries((dashboard.provinces || []).map(row => [row.province_id, (row.areas || []).join(', ')])));
        }
      } catch (err) {
        if (active) { setError(err.message || 'Não foi possível abrir o painel administrativo.'); setDashboardReadFailed(true); }
      } finally { if (active) setLoading(false); }
    }
    start();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (tab === 'mensagens' && token) {
      if (data?.store) loadMessages();
      loadAllStoreConversations();
    }
  }, [tab, data?.store, token, loadMessages, loadAllStoreConversations]);

  function updateStoreField(key, value) {
    setStoreForm(current => ({ ...current, [key]: value }));
  }
  function toggleProvince(id) {
    setSelectedProvinceIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  function toggleLocationProvince(id) {
    setLocationProvinceIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  function chooseStorePhoto(file) {
    if (!file) { setPhoto(null); setPhotoPreview(''); return; }
    if (!file.type.startsWith('image/')) { setError('Escolha uma imagem para o logótipo.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('O logótipo deve ter no máximo 4 MB.'); return; }
    setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); setError('');
  }

  async function uploadAdminStoreAsset(action, file, slot = null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Escolha uma imagem válida.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('A imagem deve ter no máximo 15 MB.'); return; }
    const key = action === 'main' ? 'main-' + slot : action;
    setAssetBusy(key); setError(''); setNotice('');
    try {
      const imageDataUrl = await optimizedImageDataUrl(file, action === 'main', action === 'main' ? 600 : action === 'logo' ? 800 : 1600);
      const result = await api('/api/admin-store/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,slot,imageDataUrl}) });
      setNotice(result.message || 'Imagem atualizada.');
      await loadDashboard(token);
    } catch(err) { setError(err.message || 'Não foi possível atualizar a imagem.'); }
    finally { setAssetBusy(''); }
  }

  async function createStore(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!selectedProvinceIds.length) { setError('Escolha pelo menos uma província.'); return; }
    const provincePayload = selectedProvinceIds.map(provinceId => ({
      provinceId,
      areas: splitAreas(areasByProvince[provinceId]),
    }));
    setSaving(true);
    try {
      const photoDataUrl = photo ? await fileToDataUrl(photo) : null;
      const result = await api('/api/admin-store/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...storeForm, provinces: provincePayload, photoDataUrl }),
      });
      setNotice(result.message || 'Loja criada e ativada.');
      setError('');
      setStoreForm(current => ({ ...current, secretCode: '' }));
      if (result.store) {
        setData({ isAdmin: true, store: result.store, provinces: result.provinces || [], products: [] });
        setLocationProvinceIds((result.provinces || []).map(row => row.province_id).filter(Boolean));
        setLocationAreas(Object.fromEntries((result.provinces || []).map(row => [row.province_id, (row.areas || []).join(', ')])));
      }
      try {
        await loadDashboard(token);
      } catch (refreshError) {
        setError('');
        setNotice('Loja criada e ativada. A leitura atualizada falhou temporariamente; a loja já aparece no painel. Usa Atualizar para tentar novamente.');
      }
      setTab('loja');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function saveLocations(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!locationProvinceIds.length) { setError('A loja precisa de pelo menos uma província.'); return; }
    const provinces = locationProvinceIds.map(provinceId => ({ provinceId, areas: splitAreas(locationAreas[provinceId]) }));
    setSaving(true);
    try {
      const result = await api('/api/admin-store/atualizar-localizacoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provinces }),
      });
      setNotice(result.message);
      await loadDashboard(token);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function addProduct(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!productPhotos.length) { setError('Escolha pelo menos uma fotografia do produto.'); return; }
    setProductBusy(true);
    try {
      const photosDataUrls = await Promise.all(productPhotos.slice(0,10).map(file => optimizedImageDataUrl(file, false, 1200)));
      const result = await api('/api/admin-store/produtos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...productForm, photosDataUrls }),
      });
      setData(current => ({ ...current, products: [...(result.products || []), ...(current.products || [])] }));
      setProductForm({ name: '', description: '', price: '' });
      setProductPhotos([]);
      setNotice('Produto adicionado à Loja do Administrador.');
    } catch (err) { setError(err.message); }
    finally { setProductBusy(false); }
  }

  async function saveStoreDetails(event) {
    event.preventDefault(); setError(''); setNotice('');
    setSaving(true);
    try {
      const photoDataUrl = photo ? await fileToDataUrl(photo) : null;
      const result = await api('/api/admin-store/editar', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: storeForm.nome, descricao: storeForm.descricao, telefone: storeForm.telefone, whatsapp: storeForm.whatsapp, address: storeForm.address, municipality: storeForm.municipality, neighborhood: storeForm.neighborhood, openingHours: storeForm.openingHours, categoryId: storeForm.categoryId, subcategoryId: storeForm.subcategoryId, photoDataUrl }),
      });
      setNotice(result.message || 'Dados da loja atualizados.');
      setPhoto(null); setPhotoPreview(''); setEditingStore(false);
      try { await loadDashboard(token); }
      catch (refreshError) {
        setError('');
        setNotice('Alterações guardadas. A leitura atualizada falhou temporariamente; usa Atualizar dados para recarregar.');
      }
    } catch (err) { setError(err.message || 'Não foi possível atualizar a loja.'); }
    finally { setSaving(false); }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Queres remover este produto da loja?')) return;
    setError(''); setNotice('');
    try {
      await api('/api/admin-store/produtos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setData(current => ({ ...current, products: (current.products || []).filter(item => item.id !== id) }));
      setNotice('Produto removido.');
    } catch (err) { setError(err.message); }
  }

  async function markMessage(message) {
    try {
      await api('/api/admin-store/mensagens', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: message.id, lida: !message.lida }),
      });
      setMessages(current => current.map(row => row.id === message.id ? { ...row, lida: !message.lida } : row));
    } catch (err) { setError(err.message); }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const filteredAdminThreads = adminThreads.filter(thread => !selectedBusinessFilter || String(thread.businessId) === String(selectedBusinessFilter));
  const selectedAdminThread = filteredAdminThreads.find(thread => thread.conversationId === selectedThreadId) || filteredAdminThreads[0] || null;

  if (loading) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: colors.pale, color: colors.green }}>A carregar o painel da Loja do Administrador…</main>;

  return <>
    <Head><title>Loja do Administrador | Talaza</title><meta name="robots" content="noindex,nofollow" /></Head>
    <main style={{ minHeight: '100vh', background: colors.pale, color: colors.ink, fontFamily: 'Arial,sans-serif' }}>
      <header style={{ background: colors.green, color: '#fff', padding: '16px clamp(16px,4vw,40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div><div style={{ color: colors.gold, fontWeight: 900, letterSpacing: 2 }}>TALAZA</div><div style={{ fontSize: 13, opacity: .88 }}>Painel da Loja do Administrador</div></div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {data?.store && <a href="/loja-administrador" target="_blank" rel="noreferrer" style={{ ...secondary, textDecoration: 'none' }}>Ver loja pública ↗</a>}
          <button type="button" onClick={async()=>{if(window.confirm('Para criar uma conta normal, vamos terminar a sessão administrativa e abrir o cadastro. Depois poderá voltar a entrar como administrador.')){await supabase.auth.signOut();router.replace('/signup');}}} style={{...secondary}}>Criar Conta</button>
          <button type="button" onClick={logout} style={{ border: '1px solid #ffffff70', borderRadius: 10, padding: '10px 14px', color: '#fff', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Terminar sessão</button>
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <div><h1 style={{ margin: 0, fontSize: 27 }}>Loja do Administrador</h1><p style={{ color: colors.muted, margin: '7px 0 0' }}>Uma única loja oficial, com presença em várias províncias.</p></div>
          {data?.store && <span style={{ background: '#E5F4EB', color: '#17633A', borderRadius: 999, padding: '8px 13px', fontWeight: 800, fontSize: 12 }}>● ATIVA</span>}
        </div>

        {error && <div role="alert" style={{ background: '#FFF0EE', color: '#9C3027', border: '1px solid #F0C8C2', padding: 13, borderRadius: 11, marginBottom: 15 }}>{error}<button onClick={() => setError('')} style={{ float: 'right', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>×</button></div>}
        {notice && <div role="status" style={{ background: '#EAF6EE', color: '#17633A', border: '1px solid #C8E5D1', padding: 13, borderRadius: 11, marginBottom: 15 }}>{notice}</div>}

        {!data ? <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 'clamp(18px,4vw,30px)' }}><h2 style={{ marginTop: 0 }}>Não foi possível confirmar a Loja do Administrador</h2><p style={{ color: colors.muted, lineHeight: 1.6 }}>Por segurança, o formulário de criação não é mostrado enquanto a leitura da loja não for confirmada.</p><button type="button" onClick={async () => { setError(''); setNotice(''); setLoading(true); try { await loadDashboard(token); setDashboardReadFailed(false); } catch (refreshError) { setError(refreshError.message || 'Não foi possível carregar os dados da loja.'); setDashboardReadFailed(true); } finally { setLoading(false); } }} style={primary}>Atualizar dados</button></section> : !data.store ? <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 'clamp(18px,4vw,30px)' }}>
          <h2 style={{ marginTop: 0 }}>Criar a única Loja do Administrador</h2>
          <p style={{ color: colors.muted, lineHeight: 1.6 }}>O formulário está disponível apenas para o administrador principal autenticado. A loja fica ativa imediatamente depois da validação do código secreto.</p>
          <form onSubmit={createStore}>
            <h3 style={{ margin: '22px 0 8px' }}>Dados da loja</h3>
            <Field id="admin-store-name" label="Nome da loja" required><input id="admin-store-name" required maxLength={120} value={storeForm.nome} onChange={e => updateStoreField('nome', e.target.value)} placeholder="Nome oficial da loja" style={inputStyle} /></Field>
            <Field id="admin-store-description" label="Descrição"><textarea id="admin-store-description" rows={4} maxLength={1200} value={storeForm.descricao} onChange={e => updateStoreField('descricao', e.target.value)} placeholder="Apresentação da Loja do Administrador" style={{ ...inputStyle, resize: 'vertical' }} /></Field>
            <Field id="admin-store-phone" label="WhatsApp / Telefone" required><input id="admin-store-phone" type="tel" required maxLength={40} value={storeForm.telefone} onChange={e => updateStoreField('telefone', e.target.value)} placeholder="+244 ..." style={inputStyle} /></Field>
            <Field id="admin-store-logo" label="Logo / Foto"><ImagePicker id="admin-store-logo" preview={photoPreview} onFile={chooseStorePhoto} caption="Escolher logótipo da loja" icon="🖼️" /></Field>

            <h3 style={{ margin: '26px 0 8px' }}>Categoria e subcategoria</h3>
            <label style={label}>Categoria *</label><select required value={storeForm.categoryId} onChange={e => { updateStoreField('categoryId', e.target.value); updateStoreField('subcategoryId', ''); }} style={input}><option value="">Escolher categoria</option>{catalog.categories.map(item => <option key={item.id} value={item.id}>{item.name.trim()}</option>)}</select>
            <label style={label}>Subcategoria *</label>{!storeForm.categoryId ? <p style={{color:colors.muted,fontSize:13}}>Escolha primeiro a categoria.</p> : <SubcategoryCards items={subcategories} value={storeForm.subcategoryId} onChange={value => updateStoreField('subcategoryId', value)} idPrefix="admin-store-subcategory" />}

            <h3 style={{ margin: '26px 0 8px' }}>País e províncias de hospedagem</h3>
            <Field id="admin-store-country" label="País" required><CountrySelect id="admin-store-country" countries={catalog.countries} value={storeForm.countryId} onChange={value => { updateStoreField('countryId', value); setSelectedProvinceIds([]); setAreasByProvince({}); }} /></Field>
            {storeForm.countryId && <><p style={{ color: colors.muted, fontSize: 13, margin: '12px 0' }}>Escolha uma ou várias províncias. É sempre a mesma loja, não serão criadas lojas separadas.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
                {currentCountryProvinces.map(item => <label key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'center', border: '1px solid ' + colors.border, borderRadius: 10, padding: 11, cursor: 'pointer' }}><input type="checkbox" checked={selectedProvinceIds.includes(item.id)} onChange={() => toggleProvince(item.id)} />{item.name}</label>)}
              </div>
            </>}
            {selectedProvinceIds.map(id => {
              const province = currentCountryProvinces.find(item => item.id === id);
              return <div key={id} style={{ marginTop: 13, padding: 14, border: '1px solid ' + colors.border, borderRadius: 12 }}>
                <strong>{province?.name}</strong>
                <label style={label}>Municípios / Áreas (opcional — vazio significa toda a província)</label>
                <textarea rows={2} value={areasByProvince[id] || ''} onChange={e => setAreasByProvince(current => ({ ...current, [id]: e.target.value }))} placeholder="Ex.: Talatona, Kilamba, Benfica" style={{ ...input, resize: 'vertical' }} />
                <small style={{ color: colors.muted }}>Separe os nomes por vírgula ou escreva um por linha.</small>
              </div>;
            })}

            <h3 style={{ margin: '26px 0 8px' }}>Ativação imediata</h3>
            <label style={label}>Código Secreto da Loja do Administrador *</label><input required type="password" autoComplete="off" value={storeForm.secretCode} onChange={e => updateStoreField('secretCode', e.target.value)} placeholder="Introduza o código secreto" style={input} />
            <p style={{ color: colors.muted, fontSize: 12 }}>O código é validado no servidor através de ADMIN_STORE_SECRET_CODE. Não é enviado por e-mail.</p>
            <button disabled={saving} type="submit" style={{ ...primary, width: '100%', marginTop: 18, opacity: saving ? .65 : 1 }}>{saving ? 'A criar e ativar a loja…' : 'Criar e ativar Loja do Administrador'}</button>
          </form>
        </section> : <>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[['loja','A loja'],['localizacoes','Províncias e áreas'],['produtos','Produtos'],['mensagens','Ver Mensagens']].map(([id,title]) => <button key={id} type="button" onClick={() => setTab(id)} style={{ ...(tab === id ? primary : secondary), padding: '11px 15px' }}>{title}</button>)}
          </nav>

          {tab === 'loja' && <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 24 }}>
            <div style={{position:'relative',minHeight:220,borderRadius:15,overflow:'hidden',background:'#0B5A4A',marginBottom:18}}>
              {data.business?.cover_url && <img src={data.business.cover_url} alt="Capa da Loja Administrador" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
              <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72))'}}/>
              <label style={{position:'absolute',right:14,top:14,padding:'9px 12px',background:'#fff',color:colors.green,borderRadius:9,fontSize:12,fontWeight:800,cursor:'pointer'}}>Alterar capa
                <input type="file" accept="image/*" hidden disabled={!!assetBusy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)uploadAdminStoreAsset('cover',file);}}/>
              </label>
              <div style={{position:'absolute',left:16,bottom:16,display:'flex',alignItems:'center',gap:14,color:'#fff'}}>
                <div style={{position:'relative',width:80,height:80,borderRadius:18,border:'2px solid #C9A24B',background:'#fff',overflow:'hidden'}}>
                  {data.store.foto_url ? <img src={data.store.foto_url} alt="Logótipo" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{display:'grid',placeItems:'center',width:'100%',height:'100%',fontSize:25,fontWeight:900,color:colors.green}}>T</div>}
                  <label style={{position:'absolute',right:1,bottom:1,width:26,height:26,display:'grid',placeItems:'center',borderRadius:'50%',background:'#C9A24B',color:colors.green,fontSize:20,fontWeight:900,cursor:'pointer'}}>+
                    <input type="file" accept="image/*" hidden disabled={!!assetBusy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)uploadAdminStoreAsset('logo',file);}}/>
                  </label>
                </div>
                <div><div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#F5D98B'}}>LOJA OFICIAL · ATIVA SEM HOSPEDAGEM</div><h2 style={{margin:'4px 0',fontSize:24}}>{data.store.nome_da_loja}</h2><p style={{margin:0,fontSize:13}}>{data.store.country} · {data.provinces.length} província(s)</p></div>
              </div>
              {assetBusy && <span style={{position:'absolute',left:14,top:14,background:'#fff',color:colors.green,padding:'6px 9px',borderRadius:8,fontSize:11,fontWeight:800}}>A carregar imagem…</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginBottom:18}}>
              {[0,1,2].map(slot=>{const item=(data.mainImages||[]).find(row=>Number(row.slot)===slot);return <label key={slot} style={{position:'relative',display:'block',aspectRatio:'1/1',border:'1px dashed '+colors.border,borderRadius:12,overflow:'hidden',background:'#F3F6F2',cursor:'pointer'}}>
                {item?.image_url?<img src={item.image_url} alt={'Imagem principal '+(slot+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{height:'100%',display:'grid',placeItems:'center',color:colors.green,fontWeight:800}}>＋ Imagem {slot+1}</div>}
                {item && <span style={{position:'absolute',bottom:6,left:6,right:6,textAlign:'center',background:'#fff',color:colors.green,borderRadius:7,padding:5,fontSize:11,fontWeight:800}}>Alterar imagem</span>}
                <input type="file" accept="image/*" hidden disabled={!!assetBusy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)uploadAdminStoreAsset('main',file,slot);}}/>
              </label>})}
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>
              <button type="button" onClick={() => { setStoreForm({ nome:data.store.nome_da_loja||'', descricao:data.store.descricao||'', telefone:data.store.telefone||'', whatsapp:data.business?.whatsapp||'', address:data.business?.address||'', municipality:data.business?.municipality||'', neighborhood:data.business?.neighborhood||'', openingHours:data.business?.opening_hours||'', countryId:data.store.country_id||'', categoryId:data.store.category_id||'', subcategoryId:data.store.subcategory_id||'', secretCode:'' }); setPhoto(null); setPhotoPreview(''); setEditingStore(v=>!v); setError(''); }} style={secondary}>{editingStore?'Cancelar edição':'Editar'}</button>
              <button type="button" onClick={async()=>{setError('');setNotice('');setLoading(true);try{await loadDashboard(token);setNotice('Dados da loja atualizados.')}catch(e){setError(e.message||'Falha na leitura.')}finally{setLoading(false)}}} style={secondary}>Atualizar dados</button>
            </div>
            {editingStore && <form onSubmit={saveStoreDetails} style={{marginTop:18,padding:18,border:'1px solid '+colors.border,borderRadius:14,background:colors.pale}}>
              <h3 style={{marginTop:0}}>Editar dados da loja</h3>
              <label style={label}>Nome da loja *</label><input required maxLength={120} value={storeForm.nome} onChange={e=>updateStoreField('nome',e.target.value)} style={input}/>
              <label style={label}>Descrição</label><textarea rows={4} maxLength={1200} value={storeForm.descricao} onChange={e=>updateStoreField('descricao',e.target.value)} style={{...input,resize:'vertical'}}/>
              <label style={label}>WhatsApp / Telefone *</label><input required maxLength={40} value={storeForm.telefone} onChange={e=>updateStoreField('telefone',e.target.value)} style={input}/>
              <label style={label}>WhatsApp</label><input maxLength={40} value={storeForm.whatsapp||''} onChange={e=>updateStoreField('whatsapp',e.target.value)} style={input}/>
              <label style={label}>Endereço</label><input maxLength={240} value={storeForm.address||''} onChange={e=>updateStoreField('address',e.target.value)} style={input}/>
              <label style={label}>Município</label><input maxLength={100} value={storeForm.municipality||''} onChange={e=>updateStoreField('municipality',e.target.value)} style={input}/>
              <label style={label}>Bairro</label><input maxLength={100} value={storeForm.neighborhood||''} onChange={e=>updateStoreField('neighborhood',e.target.value)} style={input}/>
              <label style={label}>Horário de funcionamento</label><input maxLength={200} value={storeForm.openingHours||''} onChange={e=>updateStoreField('openingHours',e.target.value)} placeholder="Ex.: Segunda a sábado, 08h–18h" style={input}/>
              <label style={label}>Logo / Foto (opcional)</label><ImagePicker id="admin-store-edit-logo" preview={photoPreview} onFile={chooseStorePhoto} caption="Trocar logótipo da loja" icon="🖼️"/>
              <label style={label}>Categoria *</label><select required value={storeForm.categoryId} onChange={e=>{updateStoreField('categoryId',e.target.value);updateStoreField('subcategoryId','')}} style={input}><option value="">Escolher categoria</option>{catalog.categories.map(item=><option key={item.id} value={item.id}>{item.name.trim()}</option>)}</select>
              <label style={label}>Subcategoria *</label>{!storeForm.categoryId?<p style={{color:colors.muted,fontSize:13}}>Escolha primeiro a categoria.</p>:<SubcategoryCards items={subcategories} value={storeForm.subcategoryId} onChange={value=>updateStoreField('subcategoryId',value)} idPrefix="admin-store-edit-subcategory"/>}
              <button disabled={saving} type="submit" style={{...primary,marginTop:16}}>{saving?'A guardar…':'Guardar alterações'}</button>
            </form>}
            <p style={{ lineHeight: 1.65 }}>{data.store.descricao || 'Sem descrição.'}</p>
            <p><strong>WhatsApp / Telefone:</strong> {data.store.telefone}</p>
            <p><strong>Categoria:</strong> {catalog.categories.find(item => item.id === data.store.category_id)?.name || '—'}</p>
            <p><strong>Subcategoria:</strong> {catalog.subcategories.find(item => item.id === data.store.subcategory_id)?.name || '—'}</p>
            <p style={{ color: colors.muted, fontSize: 13 }}>A loja é única e permanece ativa. A presença em províncias e áreas é gerida no separador próprio.</p>
          </section>}

          {tab === 'localizacoes' && <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Províncias e Municípios / Áreas</h2>
            <p style={{ color: colors.muted }}>Adicione ou retire províncias sem apagar a loja. A localização principal não muda.</p>
            <form onSubmit={saveLocations}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
                {catalog.provinces.filter(item => item.country_id === data.store.country_id).map(item => <label key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'center', border: '1px solid ' + colors.border, borderRadius: 10, padding: 11, cursor: 'pointer' }}><input type="checkbox" checked={locationProvinceIds.includes(item.id)} onChange={() => toggleLocationProvince(item.id)} />{item.name}</label>)}
              </div>
              {locationProvinceIds.map(id => {
                const province = catalog.provinces.find(item => item.id === id);
                return <div key={id} style={{ marginTop: 13, padding: 14, border: '1px solid ' + colors.border, borderRadius: 12 }}>
                  <strong>{province?.name}</strong>
                  <label style={label}>Municípios / Áreas (opcional — vazio significa toda a província)</label>
                  <textarea rows={2} value={locationAreas[id] || ''} onChange={e => setLocationAreas(current => ({ ...current, [id]: e.target.value }))} placeholder="Separe por vírgula ou linha" style={{ ...input, resize: 'vertical' }} />
                </div>;
              })}
              <button disabled={saving} type="submit" style={{ ...primary, marginTop: 20 }}>{saving ? 'A guardar…' : 'Guardar localizações'}</button>
            </form>
          </section>}

          {tab === 'produtos' && <section style={{ display: 'grid', gap: 18 }}>
            <form onSubmit={addProduct} style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Adicionar Produto</h2>
              <p style={{ color: colors.muted, fontSize: 13 }}>Os produtos herdam automaticamente o país, as províncias e as áreas configuradas na loja.</p>
              <label style={label}>Nome do produto *</label><input required maxLength={120} value={productForm.name} onChange={e => setProductForm(current => ({ ...current, name: e.target.value }))} style={input} />
              <label style={label}>Descrição</label><textarea rows={3} maxLength={1000} value={productForm.description} onChange={e => setProductForm(current => ({ ...current, description: e.target.value }))} style={{ ...input, resize: 'vertical' }} />
              <label style={label}>Preço (opcional)</label><input type="number" min="0" step="any" value={productForm.price} onChange={e => setProductForm(current => ({ ...current, price: e.target.value }))} style={input} />
              <label style={label}>Fotografias do produto * (até 10)</label><input required type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setProductPhotos(Array.from(e.target.files||[]).slice(0,10))} style={{ ...input, padding: 9 }} />
              {productPhotos.length>0 && <p style={{fontSize:12,color:colors.muted}}>{productPhotos.length} fotografia(s) selecionada(s): {productPhotos.map(f=>f.name).join(', ')}</p>}
              <button disabled={productBusy} type="submit" style={{ ...primary, marginTop: 18 }}>{productBusy ? 'A adicionar…' : 'Adicionar Produto'}</button>
            </form>
            <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Produtos da loja ({data.products?.length || 0})</h2>
              <ProductsView items={data.products || []} mode="normal" editable onDelete={item => deleteProduct(item.id)} businessName={data.store.nome_da_loja} businessId={data.store.business_id || ''} />
            </section>
          </section>}

          {tab === 'mensagens' && <section style={{ display:'grid',gap:18 }}>
            <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:18,padding:24}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><h2 style={{margin:0}}>Mensagens de todas as lojas</h2><button type="button" onClick={loadAllStoreConversations} style={secondary}>Atualizar</button></div>
              <p style={{color:colors.muted,fontSize:13,lineHeight:1.55}}>Lista das lojas e conversas de clientes ligadas aos negócios. Selecione uma loja e depois uma conversa.</p>
              <label style={label}>Loja</label><select value={selectedBusinessFilter} onChange={e=>{setSelectedBusinessFilter(e.target.value);setSelectedThreadId('');}} style={input}><option value="">Todas as lojas</option>{allBusinesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
              {adminThreadsLoading?<p>A carregar conversas…</p>:!filteredAdminThreads.length?<p style={{color:colors.muted}}>Não existem conversas com mensagens para esta seleção.</p>:<div style={{display:'grid',gridTemplateColumns:'minmax(210px,1fr) minmax(0,2fr)',gap:12,marginTop:14}}>
                <div style={{display:'grid',gap:8,alignContent:'start'}}>
                  {filteredAdminThreads.map(thread=><button key={thread.conversationId} type="button" onClick={()=>setSelectedThreadId(thread.conversationId)} style={{textAlign:'left',padding:12,borderRadius:11,border:'1px solid '+(selectedAdminThread?.conversationId===thread.conversationId?colors.green:colors.border),background:selectedAdminThread?.conversationId===thread.conversationId?'#EAF2EC':'#fff',color:colors.ink,cursor:'pointer'}}>
                    <strong style={{display:'block',fontSize:13}}>{thread.businessName}</strong><span style={{display:'block',fontSize:11,color:colors.muted,marginTop:4}}>{thread.source||'Conversa'} · {thread.messages.length} mensagem(ns)</span><small style={{color:colors.muted}}>{new Date(thread.updated_at||thread.created_at).toLocaleString('pt-PT')}</small>
                  </button>)}
                </div>
                <div style={{border:'1px solid '+colors.border,borderRadius:12,padding:14,minHeight:240,maxHeight:560,overflowY:'auto',background:'#F7FAF8'}}>
                  {selectedAdminThread? <div style={{display:'grid',gap:10}}>
                    <h3 style={{margin:'0 0 4px'}}>{selectedAdminThread.businessName}</h3>
                    {selectedAdminThread.messages.map(message=><article key={message.id} style={{background:'#fff',border:'1px solid #E2EBE6',borderRadius:10,padding:11}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{fontSize:12}}>{message.sender_name}</strong><small style={{color:colors.muted}}>{new Date(message.created_at).toLocaleString('pt-PT')}</small></div>
                      <p style={{whiteSpace:'pre-wrap',lineHeight:1.5,fontSize:13,margin:'7px 0 0'}}>{message.body||((message.attachment_name)?'Anexo: '+message.attachment_name:'[Mensagem sem texto]')}</p>
                      {message.attachment_name&&<small style={{color:colors.muted}}>Anexo: {message.attachment_name}</small>}
                    </article>)}
                  </div>:<p style={{color:colors.muted}}>Escolha uma conversa para ver o histórico.</p>}
                </div>
              </div>}
            </section>
            {data?.store && <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:18,padding:24}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><h2 style={{margin:0}}>Mensagens da Loja do Administrador</h2><button type="button" onClick={loadMessages} style={secondary}>Atualizar</button></div>
              {messagesLoading?<p>A carregar…</p>:!messages.length?<p style={{color:colors.muted}}>Ainda não recebeu mensagens diretas na loja oficial.</p>:<div style={{display:'grid',gap:12,marginTop:18}}>
                {messages.map(message=><article key={message.id} style={{border:'1px solid '+colors.border,borderRadius:13,padding:15,background:message.lida?'#fff':'#F5FAF6'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong>{message.nome_cliente}</strong><small style={{color:colors.muted}}>{new Date(message.created_at).toLocaleString('pt-PT')}</small></div>
                  <p style={{margin:'7px 0',color:colors.muted,fontSize:13}}>{message.country} · {message.province_origem}</p><p style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{message.mensagem}</p>
                  <button type="button" onClick={()=>markMessage(message)} style={secondary}>{message.lida?'Marcar como não lida':'Marcar como lida'}</button>
                </article>)}
              </div>}
            </section>}
          </section>}
        </>}
      </div>
    </main>
  </>;
}
