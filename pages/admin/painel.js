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

function slugifyAdminStore(value) {
  return String(value||'loja-administrador').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'loja-administrador';
}

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
  const [accountCreationOpen, setAccountCreationOpen] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [accountForm, setAccountForm] = useState({ type: 'client', name: '', email: '', password: '', phone: '' });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountResult, setAccountResult] = useState('');

  const [storeForm, setStoreForm] = useState({ nome: '', descricao: '', telefone: '', countryId: '', categoryId: '', subcategoryId: '', secretCode: '' });
  const [adminStorePaymentFlow, setAdminStorePaymentFlow] = useState(null);
  const [adminStorePlanOptions, setAdminStorePlanOptions] = useState([]);
  const [adminStorePlanLoading, setAdminStorePlanLoading] = useState(false);
  const [adminStoreSelectedPlanId, setAdminStoreSelectedPlanId] = useState('');
  const [adminStoreProofFile, setAdminStoreProofFile] = useState(null);
  const [adminStoreExpressPhone, setAdminStoreExpressPhone] = useState('');
  const [adminStorePaymentBusy, setAdminStorePaymentBusy] = useState(false);
  const [adminStorePaymentSubmitted, setAdminStorePaymentSubmitted] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedProvinceIds, setSelectedProvinceIds] = useState([]);
  const [areasByProvince, setAreasByProvince] = useState({});

  const [locationProvinceIds, setLocationProvinceIds] = useState([]);
  const [locationAreas, setLocationAreas] = useState({});
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '' });
  const [editingProductId, setEditingProductId] = useState('');
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', price: '' });
  const [productEditBusy, setProductEditBusy] = useState(false);
  const [productPhotos, setProductPhotos] = useState([]);
  const [productPhotoPreviews, setProductPhotoPreviews] = useState([]);
  const [productBusy, setProductBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [adminThreads, setAdminThreads] = useState([]);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [adminThreadsLoading, setAdminThreadsLoading] = useState(false);
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [assetBusy, setAssetBusy] = useState('');
  const [premiumPlans, setPremiumPlans] = useState([]);
  const [premiumPromotions, setPremiumPromotions] = useState([]);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumSelectedPlanId, setPremiumSelectedPlanId] = useState('');
  const [premiumFile, setPremiumFile] = useState(null);
  const [premiumProofFile, setPremiumProofFile] = useState(null);
  const [premiumExpressPhone, setPremiumExpressPhone] = useState('');
  const [premiumProvinceIds, setPremiumProvinceIds] = useState([]);
  const [premiumDescription, setPremiumDescription] = useState('');
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [premiumEditing, setPremiumEditing] = useState(null);
  const [premiumEditDescription, setPremiumEditDescription] = useState('');
  const [premiumEditFile, setPremiumEditFile] = useState(null);

  const loadPremium = useCallback(async () => {
    if (!data?.store?.business_id) return;
    setPremiumLoading(true);
    try {
      const [{ data: plans, error: plansError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from('plans').select('id,duration_days,name,price,description,area').eq('plan_type','Destaque Premium').eq('is_active',true).in('duration_days',[15,30]).gt('price',0).order('duration_days',{ascending:true}),
        supabase.from('premium_promotions').select('id,business_id,user_id,plan_id,media_url,storage_path,media_type,description,status,starts_at,expires_at,created_at').eq('business_id',data.store.business_id).order('created_at',{ascending:false})
      ]);
      if (plansError) throw plansError;
      if (rowsError) throw rowsError;
      const pricedPlans=(plans||[]).filter(plan=>Number(plan.price)>0&&Number(plan.duration_days)>0);
      setPremiumPlans(pricedPlans);
      setPremiumSelectedPlanId(current=>pricedPlans.some(plan=>plan.id===current)?current:(pricedPlans[0]?.id||''));
      setPremiumProvinceIds(current=>current.filter(id=>catalog.provinces.some(p=>p.id===id&&p.country_id===data.store.country_id)));
      setPremiumPromotions(rows || []);
    } catch (err) { setError(err.message || 'Não foi possível carregar Destaques Premium.'); }
    finally { setPremiumLoading(false); }
  }, [data?.store?.business_id, data?.store?.country_id, catalog.provinces]);

  useEffect(() => {
    if (tab === 'premium' && data?.store?.business_id) loadPremium();
  }, [tab, data?.store?.business_id, loadPremium]);

  function premiumFileValid(file) {
    if (!file) return true;
    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) { setError('Escolha uma fotografia ou vídeo válido.'); return false; }
    if (file.size > 50 * 1024 * 1024) { setError('O ficheiro não pode ultrapassar 50 MB.'); return false; }
    return true;
  }


  async function publishPremium(event) {
    event.preventDefault(); setError(''); setNotice('');
    const plan=premiumPlans.find(item=>item.id===premiumSelectedPlanId);
    if(!premiumFile){setError('Escolha uma fotografia ou vídeo para publicar.');return;}
    if(!premiumFileValid(premiumFile))return;
    if(!plan||Number(plan.price)<=0){setError('Escolha um plano Premium pago ativo.');return;}
    if(!premiumProvinceIds.length){setError('Escolha pelo menos uma província de destino.');return;}
    const senderPhone=String(premiumExpressPhone||'').replace(/[^0-9]/g,'');
    if(senderPhone.length<7||senderPhone.length>15){setError('Informe o número remetente Express.');return;}
    if(!premiumProofFile){setError('Anexe o comprovativo do pagamento.');return;}
    if(premiumProofFile.size>8*1024*1024){setError('O comprovativo deve ter até 8 MB.');return;}
    if(premiumProofFile.type!=='application/pdf'&&!premiumProofFile.type.startsWith('image/')){setError('Comprovativo deve ser imagem ou PDF.');return;}
    setPremiumBusy(true);
    try{
      const mediaDataUrl=premiumFile.type.startsWith('image/')?await optimizedImageDataUrl(premiumFile,false,1600):await fileToDataUrl(premiumFile);
      const proofDataUrl=premiumProofFile.type==='application/pdf'?await fileToDataUrl(premiumProofFile):await optimizedImageDataUrl(premiumProofFile,false,1200);
      await api('/api/admin-store/premium-submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        businessId:data.store.business_id,planId:plan.id,provinceIds:premiumProvinceIds,description:premiumDescription.trim(),
        mediaDataUrl,proofDataUrl,expressSenderPhone:senderPhone
      })});
      setPremiumFile(null);setPremiumProofFile(null);setPremiumExpressPhone('');setPremiumDescription('');
      setNotice('Destaque Premium enviado para Administração Normal. Só será ativado após aprovação do comprovativo.');
      await loadPremium();
    }catch(err){setError(err.message||'Não foi possível enviar o Destaque Premium.');}
    finally{setPremiumBusy(false);}
  }
  function startEditPremium(item) {
    setPremiumEditing(item.id);
    setPremiumEditDescription(item.description || '');
    setPremiumEditFile(null);
    setError(''); setNotice('');
  }

  async function savePremiumEdit(event) {
    event.preventDefault();
    if (!premiumEditing) return;
    if (premiumEditFile && !premiumFileValid(premiumEditFile)) return;
    setPremiumBusy(true); setError(''); setNotice('');
    let replacement = null;
    try {
      const current = premiumPromotions.find(item => item.id === premiumEditing);
      if (!current) throw new Error('Publicação não encontrada.');
      if (premiumEditFile) replacement = await uploadPremiumFile(premiumEditFile);
      const updates = { description:premiumEditDescription.trim() };
      if (replacement) Object.assign(updates,{media_url:replacement.url,storage_path:replacement.path,media_type:replacement.media_type});
      const { error: updateError } = await supabase.from('premium_promotions').update(updates).eq('id',premiumEditing).eq('business_id',data.store.business_id);
      if (updateError) throw updateError;
      if (replacement && current.storage_path) await supabase.storage.from('premium-media').remove([current.storage_path]);
      setPremiumEditing(null); setPremiumEditFile(null);
      setNotice('Publicação atualizada.');
      await loadPremium();
    } catch(err) {
      if (replacement?.path) await supabase.storage.from('premium-media').remove([replacement.path]);
      setError(err.message || 'Não foi possível editar a publicação.');
    } finally { setPremiumBusy(false); }
  }

  async function deletePremium(item) {
    if (!window.confirm('Apagar este Destaque Premium?')) return;
    setPremiumBusy(true); setError(''); setNotice('');
    try {
      const { error: deleteError } = await supabase.from('premium_promotions').delete().eq('id',item.id).eq('business_id',data.store.business_id);
      if (deleteError) throw deleteError;
      if (item.storage_path) await supabase.storage.from('premium-media').remove([item.storage_path]);
      setPremiumPromotions(current=>current.filter(row=>row.id!==item.id));
      setNotice('Publicação apagada.');
    } catch(err) { setError(err.message || 'Não foi possível apagar a publicação.'); }
    finally { setPremiumBusy(false); }
  }


  useEffect(() => {
    const urls=productPhotos.map(file=>URL.createObjectURL(file));
    setProductPhotoPreviews(urls);
    return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
  }, [productPhotos]);

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

  const loadDashboard = useCallback(async (accessToken, storeId = selectedStoreId) => {
    const query = storeId ? '?storeId=' + encodeURIComponent(storeId) : '';
    const response = await fetch('/api/admin-store/me' + query, { headers: { Authorization: 'Bearer ' + accessToken } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar o painel.');
    setData(result);
    setDashboardReadFailed(false);
    if (result.store) {
      setLocationProvinceIds((result.provinces || []).map(row => row.province_id).filter(Boolean));
      setLocationAreas(Object.fromEntries((result.provinces || []).map(row => [row.province_id, (row.areas || []).join(', ')])));
    }
    if (result.hostingActive && result.store?.is_lifetime) {
      result.hostingStatus = 'active';
    }
    return result;
  }, [selectedStoreId]);

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
          router.replace('/login?next=' + encodeURIComponent('/admin/painel'));
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
        const initialStoreId = dashboard.store?.id || dashboard.stores?.[0]?.id || '';
        setSelectedStoreId(initialStoreId);
        setCreatingStore(!(dashboard.stores || []).length);
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
      const result = await api('/api/admin-store/assets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,slot,imageDataUrl,businessId:data?.store?.business_id}) });
      setNotice(result.message || 'Imagem atualizada.');
      await loadDashboard(token);
    } catch(err) { setError(err.message || 'Não foi possível atualizar a imagem.'); }
    finally { setAssetBusy(''); }
  }

  async function openAdminStorePlanFlow(storeInfo) {
    setAdminStorePaymentFlow(storeInfo);
    setAdminStorePlanOptions([]);
    setAdminStoreSelectedPlanId('');
    setAdminStoreProofFile(null);
    setAdminStoreExpressPhone('');
    setAdminStorePaymentSubmitted(false);
    setAdminStorePlanLoading(true);
    setError('');
    try {
      const { data: rows, error: plansError } = await supabase.from('plans')
        .select('id,name,price,duration_days,description,plan_type,area,category_id,subcategory_id')
        .eq('is_active', true).eq('category_id', storeInfo.categoryId)
        .ilike('plan_type', 'Hospedagem%')
        .gt('price', 0).gt('duration_days', 0).order('price', { ascending: true });
      if (plansError) throw plansError;
      const activeRows = (rows || []).filter(row => Number(row.price)>0 && Number(row.duration_days)>0);
      const subPlans = activeRows.filter(row => row.subcategory_id && String(row.subcategory_id)===String(storeInfo.subcategoryId||''));
      const categoryPlans = activeRows.filter(row => !row.subcategory_id);
      const options = subPlans.length ? subPlans : categoryPlans;
      setAdminStorePlanOptions(options);
      if (options.length) setAdminStoreSelectedPlanId(options[0].id);
      else setError('Não há planos de hospedagem ativos no Supabase para esta categoria/subcategoria. Não foi inventado nenhum plano.');
    } catch(err) {
      setError('Não foi possível carregar planos reais do Supabase: '+(err.message||'erro desconhecido'));
    } finally { setAdminStorePlanLoading(false); }
  }

  async function submitAdminStorePayment(event) {
    event.preventDefault(); setError(''); setNotice('');
    const selectedPlan=adminStorePlanOptions.find(row=>row.id===adminStoreSelectedPlanId);
    if(!adminStorePaymentFlow?.businessId||!selectedPlan){setError('Escolha um plano real de hospedagem.');return;}
    const senderPhone=String(adminStoreExpressPhone||'').replace(/[^0-9]/g,'');
    if(senderPhone.length<7||senderPhone.length>15){setError('Informe o número do remetente Express usado no pagamento.');return;}
    if(!adminStoreProofFile){setError('Envie o comprovativo de pagamento (imagem ou PDF).');return;}
    const isPdf=adminStoreProofFile.type==='application/pdf';
    if(!isPdf&&!adminStoreProofFile.type.startsWith('image/')){setError('O comprovativo deve ser imagem ou PDF.');return;}
    if(adminStoreProofFile.size>8*1024*1024){setError('O comprovativo deve ter até 8 MB.');return;}
    setAdminStorePaymentBusy(true);let proofPath=null;
    try {
      const {data:sessionData,error:sessionError}=await supabase.auth.getSession();if(sessionError)throw sessionError;
      const user=sessionData?.session?.user;if(!user?.id)throw new Error('Sessão expirada. Entre novamente.');
      const ext=isPdf?'pdf':(adminStoreProofFile.type.split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();
      const path=user.id+'/admin-store/'+Date.now()+'-hosting-proof.'+ext;
      const {error:uploadError}=await supabase.storage.from('payment-proofs').upload(path,adminStoreProofFile,{contentType:adminStoreProofFile.type,cacheControl:'3600',upsert:false});
      if(uploadError)throw uploadError;proofPath=path;
      const submission={business_id:adminStorePaymentFlow.businessId,plan_id:selectedPlan.id,user_id:user.id,amount:Number(selectedPlan.price),currency:'Kz',payment_method:'Express',express_sender_phone:senderPhone,proof_url:proofPath,proof_type:isPdf?'pdf':(adminStoreProofFile.type.split('/')[1]||'image'),proof_image_url:isPdf?null:proofPath,proof_file_url:isPdf?proofPath:null,status:'pending',notes:'Pagamento de hospedagem da Loja do Administrador: '+adminStorePaymentFlow.storeName};
      const {data:inserted,error:insertError}=await supabase.from('payment_submissions').insert(submission).select('id').single();
      if(insertError)throw insertError;if(!inserted?.id)throw new Error('Não foi possível confirmar o pedido de pagamento.');
      setAdminStorePaymentSubmitted(true);setNotice('Comprovativo enviado para Administração Normal. A loja só será ativada depois da aprovação do pagamento.');
    } catch(err) {
      if(proofPath)await supabase.storage.from('payment-proofs').remove([proofPath]);
      setError(err.message||'Não foi possível enviar comprovativo.');
    } finally {setAdminStorePaymentBusy(false);}
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
      setNotice('Cadastro concluído. Escolha agora um plano de hospedagem real e envie o comprovativo; a loja ficará ativa apenas após aprovação na Administração Normal.');
      setCreatingStore(false);
      setSelectedStoreId(result.store?.id || result.storeId || '');
      setError('');
      setStoreForm(current => ({ ...current, secretCode: '' }));
      await openAdminStorePlanFlow({storeId:result.store?.id||result.storeId||'',businessId:result.businessId||result.store?.business_id||'',storeName:result.store?.nome_da_loja||storeForm.nome,categoryId:storeForm.categoryId,subcategoryId:storeForm.subcategoryId});
      if (result.store) {
        setData(current => ({ ...(current || {}), isAdmin: true, stores: [...(current?.stores || []).filter(item=>item.id!==result.store.id), result.store], store: result.store, provinces: result.provinces || [], products: [], mainImages: [], business: null }));
        setLocationProvinceIds((result.provinces || []).map(row => row.province_id).filter(Boolean));
        setLocationAreas(Object.fromEntries((result.provinces || []).map(row => [row.province_id, (row.areas || []).join(', ')])));
      }
      try {
        await loadDashboard(token, result.store?.id || result.storeId || selectedStoreId);
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
        body: JSON.stringify({ ...productForm, photosDataUrls, businessId: data?.store?.business_id }),
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

  function beginEditProduct(item) {
    setEditingProductId(item.id);
    setEditProductForm({ name:item.name||'', description:item.description||'', price:item.price==null?'':String(item.price) });
  }

  async function saveEditedProduct(event) {
    event.preventDefault();
    if(!editingProductId) return;
    setProductEditBusy(true); setError(''); setNotice('');
    try {
      const result=await api('/api/admin-store/produtos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editingProductId,businessId:data?.store?.business_id,...editProductForm})});
      setData(current=>({...current,products:(current.products||[]).map(item=>item.id===editingProductId?result.product:item)}));
      setEditingProductId(''); setNotice('Produto atualizado.');
    } catch(err) { setError(err.message||'Não foi possível editar o produto.'); }
    finally { setProductEditBusy(false); }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Queres remover este produto da loja?')) return;
    setError(''); setNotice('');
    try {
      await api('/api/admin-store/produtos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, businessId: data?.store?.business_id }) });
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
          {data?.store && <a href={'/loja/'+data.store.id} target="_blank" rel="noreferrer" style={{ ...secondary, textDecoration: 'none' }}>Ver loja pública ↗</a>}
          <button type="button" onClick={()=>setAccountCreationOpen(true)} style={{...secondary}}>Criar Conta</button>
          <button type="button" onClick={logout} style={{ border: '1px solid #ffffff70', borderRadius: 10, padding: '10px 14px', color: '#fff', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}>Terminar sessão</button>
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 16px 60px' }}>
      {accountCreationOpen && <div role="dialog" aria-modal="true" aria-label="Criar conta Talaza pelo administrador" style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(8,25,20,.55)',display:'grid',placeItems:'center',padding:16,overflowY:'auto'}}>
        <section style={{width:'100%',maxWidth:520,background:'#fff',borderRadius:18,padding:22,boxShadow:'0 20px 70px rgba(0,0,0,.2)',maxHeight:'90vh',overflowY:'auto'}}>
          <h2 style={{marginTop:0,color:colors.green}}>Criar Conta</h2><p style={{fontSize:13,color:colors.muted,lineHeight:1.6}}>Cria uma conta Cliente ou Vendedor sem terminar a sessão administrativa. Não será criada automaticamente nenhuma loja de vendedor.</p>
          {accountResult && <div role="status" style={{padding:12,background:'#EAF6EE',color:'#17633A',borderRadius:10,marginBottom:12}}>{accountResult}</div>}
          <form onSubmit={async event=>{
            event.preventDefault();setAccountBusy(true);setAccountResult('');setError('');
            try {
              const result=await api('/api/admin-store/criar-conta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(accountForm)});
              setAccountResult('Conta '+(accountForm.type==='client'?'Cliente':'Vendedor')+' criada com sucesso. ID: '+result.account.id);
              setAccountForm({type:accountForm.type,name:'',email:'',password:'',phone:''});
            } catch(err) {setAccountResult(err.message||'Falha ao criar a conta.');}
            finally {setAccountBusy(false);}
          }}>
            <label style={label}>Tipo de conta</label><select value={accountForm.type} onChange={e=>setAccountForm(v=>({...v,type:e.target.value}))} style={input}><option value="client">Cliente</option><option value="seller">Vendedor</option></select>
            <label style={label}>Nome completo</label><input required maxLength={120} value={accountForm.name} onChange={e=>setAccountForm(v=>({...v,name:e.target.value}))} style={input} placeholder="Nome"/>
            <label style={label}>E-mail</label><input required type="email" value={accountForm.email} onChange={e=>setAccountForm(v=>({...v,email:e.target.value}))} style={input} placeholder="email@exemplo.com"/>
            <label style={label}>Palavra-passe</label><input required minLength={6} maxLength={72} type="password" value={accountForm.password} onChange={e=>setAccountForm(v=>({...v,password:e.target.value}))} style={input}/>
            <label style={label}>Telefone</label><input required type="tel" maxLength={40} value={accountForm.phone} onChange={e=>setAccountForm(v=>({...v,phone:e.target.value}))} style={input} placeholder="+244 ..."/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:16}}><button disabled={accountBusy} type="submit" style={primary}>{accountBusy?'A criar…':'Criar conta'}</button><button type="button" disabled={accountBusy} onClick={()=>{setAccountCreationOpen(false);setAccountResult('');}} style={secondary}>Fechar</button></div>
          </form>
        </section>
      </div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <div><h1 style={{ margin: 0, fontSize: 27 }}>Lojas do Administrador</h1><p style={{ color: colors.muted, margin: '7px 0 0' }}>Gerencie cada loja separadamente.</p></div>
          {data?.store && <span style={{ background: data.hostingActive ? '#E5F4EB' : '#FFF4D6', color: data.hostingActive ? '#17633A' : '#674A00', borderRadius: 999, padding: '8px 13px', fontWeight: 800, fontSize: 12 }}>{data.hostingActive ? '● ATIVA' : '● INATIVA · SEM PLANO'}</span>}
        </div>

        {data?.stores?.length > 0 && <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:14,padding:16,marginBottom:18}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <label style={label}>As minhas lojas ({data.stores.length})</label>
              <select value={selectedStoreId || data.store?.id || ''} onChange={async e=>{const id=e.target.value;setSelectedStoreId(id);setCreatingStore(false);setError('');setNotice('');setLoading(true);try{await loadDashboard(token,id);setNotice('Loja selecionada.')}catch(err){setError(err.message||'Não foi possível carregar esta loja.')}finally{setLoading(false);}}} style={input}>
                {(data.stores||[]).map(item=><option key={item.id} value={item.id}>{item.nome_da_loja} · {(item.provinces||[]).map(p=>p.province).join(', ') || item.province}, {item.country}</option>)}
              </select>
            </div>
            <button type="button" onClick={()=>{setCreatingStore(true);setEditingStore(false);setError('');setNotice('');setTab('loja');setStoreForm({nome:'',descricao:'',telefone:'',countryId:'',categoryId:'',subcategoryId:'',secretCode:''});setPhoto(null);setPhotoPreview('');setSelectedProvinceIds([]);setAreasByProvince({});}} style={primary}>＋ Criar nova loja</button>
          </div>
        </section>}
        {error && <div role="alert" style={{ background: '#FFF0EE', color: '#9C3027', border: '1px solid #F0C8C2', padding: 13, borderRadius: 11, marginBottom: 15 }}>{error}<button onClick={() => setError('')} style={{ float: 'right', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>×</button></div>}
        {notice && <div role="status" style={{ background: '#EAF6EE', color: '#17633A', border: '1px solid #C8E5D1', padding: 13, borderRadius: 11, marginBottom: 15 }}>{notice}</div>}

        {adminStorePaymentFlow ? <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:18,padding:'clamp(18px,4vw,30px)'}}>
          <h2 style={{marginTop:0}}>Plano de hospedagem · {adminStorePaymentFlow.storeName}</h2>
          <p style={{lineHeight:1.6,color:colors.muted}}>Planos carregados da tabela <strong>plans</strong> do Supabase, filtrados pela categoria/subcategoria desta loja. A loja fica inativa até aprovação do comprovativo.</p>
          {adminStorePlanLoading?<p>A carregar planos da base de dados…</p>:adminStorePlanOptions.length?<form onSubmit={submitAdminStorePayment}>
            <div style={{display:'grid',gap:12}}>{adminStorePlanOptions.map(plan=><label key={plan.id} style={{display:'block',border:'1px solid '+(adminStoreSelectedPlanId===plan.id?colors.gold:colors.border),borderRadius:13,padding:15,background:adminStoreSelectedPlanId===plan.id?'#FFF9E8':'#fff',cursor:'pointer'}}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}><input type="radio" name="admin-store-plan" value={plan.id} checked={adminStoreSelectedPlanId===plan.id} onChange={()=>setAdminStoreSelectedPlanId(plan.id)} style={{marginTop:4}}/><div style={{flex:1}}><strong>{plan.name?.trim()||'Plano de Hospedagem'}</strong><div style={{fontSize:19,fontWeight:900,color:colors.green,marginTop:6}}>{Number(plan.price).toLocaleString('pt-AO')} Kz · {plan.duration_days} dias</div>{plan.description&&<p style={{fontSize:13,color:colors.muted,lineHeight:1.55,whiteSpace:'pre-line',margin:'9px 0 0'}}>{plan.description}</p>}</div></div>
            </label>)}</div>
            <label style={label}>Número remetente Express *</label><input required type="tel" value={adminStoreExpressPhone} onChange={e=>setAdminStoreExpressPhone(e.target.value)} placeholder="Número usado para enviar o pagamento" style={input}/>
            <label style={label}>Comprovativo (imagem ou PDF, até 8 MB) *</label><input required type="file" accept="image/*,application/pdf" onChange={e=>setAdminStoreProofFile(e.target.files?.[0]||null)} style={{...input,padding:10}}/>
            {adminStoreProofFile&&<p style={{fontSize:13,color:colors.muted}}>Ficheiro: {adminStoreProofFile.name}</p>}
            <button disabled={adminStorePaymentBusy||adminStorePaymentSubmitted} type="submit" style={{...primary,width:'100%',marginTop:16,opacity:(adminStorePaymentBusy||adminStorePaymentSubmitted)?0.65:1}}>{adminStorePaymentBusy?'A enviar…':adminStorePaymentSubmitted?'Comprovativo enviado':'Enviar comprovativo'}</button>
          </form>:<p style={{padding:14,background:'#FFF4D6',color:'#674A00',borderRadius:10}}>Não existem planos ativos de pagamento nesta subcategoria. Nenhum plano fictício será mostrado.</p>}
          {adminStorePaymentSubmitted&&<div style={{marginTop:16,padding:14,background:'#EAF6EE',color:'#17633A',borderRadius:10}}><strong>Pedido enviado para análise.</strong><p style={{margin:'8px 0 0'}}>A loja será activada após aprovação na Administração Normal.</p><button type="button" onClick={()=>{setAdminStorePaymentFlow(null);setAdminStorePaymentSubmitted(false);setAdminStoreProofFile(null);setAdminStorePlanOptions([]);setNotice('Comprovativo enviado e aguarda aprovação.');}} style={{...secondary,marginTop:12}}>Voltar ao painel</button></div>}
          {!adminStorePaymentSubmitted&&<button type="button" onClick={()=>{setAdminStorePaymentFlow(null);setAdminStorePlanOptions([]);setAdminStoreProofFile(null);}} style={{...secondary,marginTop:16}}>Voltar ao painel</button>}
        </section> : !data ? <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 'clamp(18px,4vw,30px)' }}><h2 style={{ marginTop: 0 }}>Não foi possível confirmar a Loja do Administrador</h2><p style={{ color: colors.muted, lineHeight: 1.6 }}>Por segurança, o formulário de criação não é mostrado enquanto a leitura da loja não for confirmada.</p><button type="button" onClick={async () => { setError(''); setNotice(''); setLoading(true); try { await loadDashboard(token); setDashboardReadFailed(false); } catch (refreshError) { setError(refreshError.message || 'Não foi possível carregar os dados da loja.'); setDashboardReadFailed(true); } finally { setLoading(false); } }} style={primary}>Atualizar dados</button></section> : (creatingStore || !data.store) ? <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 'clamp(18px,4vw,30px)' }}>
          <h2 style={{ marginTop: 0 }}>Criar nova loja do Administrador</h2>
          <p style={{ color: colors.muted, lineHeight: 1.6 }}>O formulário está disponível apenas para o administrador principal autenticado. A loja é criada INATIVA e só fica visível na Vitrine após ativar um plano de Hospedagem.</p>
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
            {storeForm.countryId && <><p style={{ color: colors.muted, fontSize: 13, margin: '12px 0' }}>Escolha uma ou várias províncias. Pode selecionar várias províncias para esta loja.</p>
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

            <h3 style={{ margin: '26px 0 8px' }}>Criar loja · sem plano ativo</h3><p style={{padding:12,borderRadius:10,background:'#FFF4D6',color:'#674A00',fontSize:13,lineHeight:1.6}}>A criação não ativa a Hospedagem. A loja ficará INATIVA / SEM PLANO até contratar e ativar um plano.</p>
            <label style={label}>Código Secreto da Loja do Administrador *</label><input required type="password" autoComplete="off" value={storeForm.secretCode} onChange={e => updateStoreField('secretCode', e.target.value)} placeholder="Introduza o código secreto" style={input} />
            <p style={{ color: colors.muted, fontSize: 12 }}>O código é validado no servidor através de ADMIN_STORE_SECRET_CODE. Não é enviado por e-mail.</p>
            <button disabled={saving} type="submit" style={{ ...primary, width: '100%', marginTop: 18, opacity: saving ? .65 : 1 }}>{saving ? 'A criar loja…' : 'Criar Loja do Administrador'}</button>
          </form>
        </section> : <>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[['loja','A loja'],['localizacoes','Províncias e áreas'],['produtos','Produtos'],['premium','Destaque Premium'],['mensagens','Ver Mensagens']].map(([id,title]) => <button key={id} type="button" onClick={() => setTab(id)} style={{ ...(tab === id ? primary : secondary), padding: '11px 15px' }}>{title}</button>)}
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
                <div><div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#F5D98B'}}>LOJA OFICIAL · INATIVA / SEM PLANO</div><h2 style={{margin:'4px 0',fontSize:24}}>{data.store.nome_da_loja}</h2><p style={{margin:0,fontSize:13}}>{data.store.country} · {data.provinces.length} província(s)</p></div>
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
            {(!data.hostingActive&&data.store?.business_id)&&<button type="button" onClick={()=>openAdminStorePlanFlow({storeId:data.store.id,businessId:data.store.business_id,storeName:data.store.nome_da_loja,categoryId:data.store.category_id||data.business?.category_id,subcategoryId:data.store.subcategory_id||data.business?.subcategory_id})} style={{...primary,marginBottom:12}}>Escolher plano e enviar comprovativo</button>}
            <p style={{ color: colors.muted, fontSize: 13 }}>Esta loja permanece INATIVA até ter um plano de Hospedagem ativo. A presença em províncias e áreas é gerida no separador próprio.</p>
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
              {productPhotoPreviews.length>0 && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(75px,1fr))',gap:8,marginTop:10}}>{productPhotoPreviews.map((url,index)=><img key={url} src={url} alt={'Pré-visualização '+(index+1)} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',borderRadius:9,border:'1px solid '+colors.border}}/> )}</div>}
              {productPhotos.length>0 && <p style={{fontSize:12,color:colors.muted}}>{productPhotos.length} fotografia(s) selecionada(s): {productPhotos.map(f=>f.name).join(', ')}</p>}
              <button disabled={productBusy} type="submit" style={{ ...primary, marginTop: 18 }}>{productBusy ? 'A adicionar…' : 'Adicionar Produto'}</button>
            </form>
            {editingProductId && <form onSubmit={saveEditedProduct} style={{background:'#F4F8F5',border:'1px solid '+colors.border,borderRadius:16,padding:20}}>
              <h3 style={{marginTop:0}}>Editar produto</h3>
              <label style={label}>Nome</label><input required maxLength={120} value={editProductForm.name} onChange={e=>setEditProductForm(current=>({...current,name:e.target.value}))} style={input}/>
              <label style={label}>Descrição</label><textarea rows={3} maxLength={1000} value={editProductForm.description} onChange={e=>setEditProductForm(current=>({...current,description:e.target.value}))} style={{...input,resize:'vertical'}}/>
              <label style={label}>Preço (opcional)</label><input type="number" min="0" step="any" value={editProductForm.price} onChange={e=>setEditProductForm(current=>({...current,price:e.target.value}))} style={input}/>
              <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}><button type="submit" disabled={productEditBusy} style={primary}>{productEditBusy?'A guardar…':'Guardar'}</button><button type="button" disabled={productEditBusy} onClick={()=>setEditingProductId('')} style={secondary}>Cancelar</button></div>
            </form>}
            <section style={{ background: '#fff', border: '1px solid ' + colors.border, borderRadius: 18, padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>Produtos da loja ({data.products?.length || 0})</h2>
              <ProductsView items={data.products || []} mode="normal" editable onEdit={beginEditProduct} onDelete={item => deleteProduct(item.id)} businessName={data.store.nome_da_loja} businessId={data.store.business_id || ''} />
            </section>
          </section>}

          
          {tab === 'premium' && <section style={{display:'grid',gap:18}}>
            <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:18,padding:24}}>
              <h2 style={{marginTop:0}}>Destaque Premium · pagamento e aprovação</h2>
              <p style={{color:colors.muted,lineHeight:1.6}}>Escolhe um plano pago real, as províncias onde o anúncio será exibido, adiciona a mídia e envia o comprovativo. A Administração Normal aprova o pagamento antes da ativação.</p>
              <div style={{display:'grid',gap:10,margin:'16px 0'}}>
                {premiumPlans.map(plan=><button key={plan.id} type="button" onClick={()=>setPremiumSelectedPlanId(plan.id)} style={{border:'1px solid '+(premiumSelectedPlanId===plan.id?colors.gold:colors.border),borderRadius:13,padding:16,background:premiumSelectedPlanId===plan.id?'#FFF8E5':'#fff',color:colors.ink,cursor:'pointer',textAlign:'left'}}>
                  <strong style={{display:'block',fontSize:17}}>{plan.name||'Destaque Premium'} · {Number(plan.duration_days)} dias</strong>
                  <span style={{display:'block',fontSize:19,fontWeight:900,color:colors.green,marginTop:6}}>{Number(plan.price).toLocaleString('pt-AO')} Kz</span>
                  {plan.area&&<small style={{display:'block',color:colors.muted,marginTop:5}}>{plan.area}</small>}
                  {plan.description&&<small style={{display:'block',color:colors.muted,marginTop:5}}>{plan.description}</small>}
                </button>)}
              </div>
              <label style={label}>Províncias de destino *</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:9}}>
                {catalog.provinces.filter(p=>p.country_id===data.store.country_id).map(province=><label key={province.id} style={{display:'flex',alignItems:'center',gap:8,border:'1px solid '+colors.border,borderRadius:10,padding:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={premiumProvinceIds.includes(province.id)} onChange={()=>setPremiumProvinceIds(current=>current.includes(province.id)?current.filter(id=>id!==province.id):[...current,province.id])}/>
                  {province.name}
                </label>)}
              </div>
              <form onSubmit={publishPremium}>
                <label style={label}>Fotografia ou vídeo *</label>
                <input required type="file" accept="image/*,video/*" onChange={e=>{const file=e.target.files?.[0]||null;e.target.value='';if(file&&premiumFileValid(file))setPremiumFile(file);else setPremiumFile(null);}} style={{...input,padding:9}}/>
                {premiumFile&&<p style={{fontSize:12,color:colors.muted}}>{premiumFile.name} · {(premiumFile.size/1024/1024).toFixed(1)} MB</p>}
                <label style={label}>Descrição (opcional)</label>
                <textarea rows={3} maxLength={500} value={premiumDescription} onChange={e=>setPremiumDescription(e.target.value)} placeholder="Escreve uma descrição para esta publicação" style={{...input,resize:'vertical'}}/>
                <label style={label}>Número remetente Express *</label><input required type="tel" value={premiumExpressPhone} onChange={e=>setPremiumExpressPhone(e.target.value)} placeholder="Número que enviou o pagamento" style={input}/>
                <label style={label}>Comprovativo de pagamento (imagem ou PDF, até 8 MB) *</label><input required type="file" accept="image/*,application/pdf" onChange={e=>setPremiumProofFile(e.target.files?.[0]||null)} style={{...input,padding:9}}/>
                {premiumProofFile&&<p style={{fontSize:12,color:colors.muted}}>{premiumProofFile.name}</p>}
                <button disabled={premiumBusy||!premiumFile||!premiumProofFile||!premiumSelectedPlanId||!premiumProvinceIds.length} type="submit" style={{...primary,marginTop:16}}>{premiumBusy?'A enviar…':'Enviar para aprovação · '+(premiumPlans.find(p=>p.id===premiumSelectedPlanId)?.duration_days||'')+' dias'}</button>
              </form>
            </section>
            <section style={{background:'#fff',border:'1px solid '+colors.border,borderRadius:18,padding:24}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <h2 style={{margin:0}}>Publicações da Loja Administrador ({premiumPromotions.length})</h2>
                <button type="button" onClick={loadPremium} disabled={premiumLoading||premiumBusy} style={secondary}>Atualizar</button>
              </div>
              {premiumLoading?<p>A carregar publicações…</p>:!premiumPromotions.length?<p style={{color:colors.muted}}>Ainda não existem Destaques Premium.</p>:<div style={{display:'grid',gap:14,marginTop:16}}>
                {premiumPromotions.map(item=><article key={item.id} style={{border:'1px solid '+colors.border,borderRadius:14,overflow:'hidden',background:'#fff'}}>
                  {item.media_type==='video'?<video src={item.media_url} controls playsInline style={{display:'block',width:'100%',maxHeight:360,background:'#111'}}/>:<img src={item.media_url} alt="Destaque Premium" style={{display:'block',width:'100%',maxHeight:360,objectFit:'contain',background:'#111'}}/>}
                  <div style={{padding:15}}>
                    <strong>Destaque Premium · {item.status==='active'?'Ativo':'Encerrado'}</strong>
                    <p style={{fontSize:12,color:colors.muted}}>Início: {item.starts_at?new Date(item.starts_at).toLocaleString('pt-PT'):'—'} · Termina: {item.expires_at?new Date(item.expires_at).toLocaleString('pt-PT'):'—'}</p>
                    <p style={{whiteSpace:'pre-wrap'}}>{item.description||'Sem descrição.'}</p>
                    {premiumEditing===item.id?<form onSubmit={savePremiumEdit}>
                      <label style={label}>Descrição</label><textarea rows={3} maxLength={500} value={premiumEditDescription} onChange={e=>setPremiumEditDescription(e.target.value)} style={{...input,resize:'vertical'}}/>
                      <label style={label}>Substituir foto/vídeo (opcional)</label><input type="file" accept="image/*,video/*" onChange={e=>{const file=e.target.files?.[0]||null;e.target.value='';if(file&&premiumFileValid(file))setPremiumEditFile(file);else setPremiumEditFile(null);}} style={{...input,padding:9}}/>
                      {premiumEditFile&&<small>{premiumEditFile.name}</small>}
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="submit" disabled={premiumBusy} style={primary}>Guardar edição</button><button type="button" onClick={()=>setPremiumEditing(null)} disabled={premiumBusy} style={secondary}>Cancelar</button></div>
                    </form>:<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" disabled={premiumBusy} onClick={()=>startEditPremium(item)} style={secondary}>Editar</button><button type="button" disabled={premiumBusy} onClick={()=>deletePremium(item)} style={{...secondary,color:'#A02B24',borderColor:'#E8C5C0'}}>Apagar</button></div>}
                  </div>
                </article>)}
              </div>}
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
