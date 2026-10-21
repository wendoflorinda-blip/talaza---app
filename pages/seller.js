import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TalazaMenu from '../components/TalazaMenu';
import ProductsView, { VIEW_MODES } from '../components/ProductsView';
import { supabase } from '../lib/supabaseClient';
import { prepareImage, formatKz } from '../lib/imageTools';

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
  const [showEmail, setShowEmail] = useState(false);
  const [emailVisibilitySaving, setEmailVisibilitySaving] = useState(false);
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

  // ---- galeria (imagens principais + imagens de painel) ----
  const [images, setImages] = useState([]);
  const [galleryError, setGalleryError] = useState('');
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [viewMode, setViewMode] = useState('normal');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // { type: 'menu' | 'price' | 'text', id }
  const [sheetPrice, setSheetPrice] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheetDesc, setSheetDesc] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    loadBusiness();
  }, [router.isReady, country, province]);

  // mensagens (guardado / erro) desaparecem sozinhas
  useEffect(() => {
    if (!business || (!notice && !error)) return undefined;
    const timer = setTimeout(() => {
      setNotice('');
      setError('');
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice, error, business]);

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
    setShowEmail(data.show_email === true);
    setEditName(data.name || '');
    setEditDescription(data.description || '');
    setEditPhone(data.phone || '');
    setEditHours(data.opening_hours || '');
    setEditMunicipality(data.municipality || '');
    setEditNeighborhood(data.neighborhood || '');
    setViewMode(VIEW_MODES.includes(data.panel_view_mode) ? data.panel_view_mode : 'normal');
    await loadImages(data.id);

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

  async function saveEmailVisibility(nextValue) {
    if (subscriptionPending || emailVisibilitySaving) return;
    setEmailVisibilitySaving(true); setError(''); setNotice('');
    try {
      const visibilityUpdates = { show_email: nextValue };
      // Só copia o e-mail de login para o contacto público quando o vendedor ativa explicitamente a opção.
      if (nextValue && !business.email && user?.email) visibilityUpdates.email = user.email;
      const { error: visibilityError } = await supabase.from('businesses').update(visibilityUpdates).eq('id', business.id);
      if (visibilityError) throw visibilityError;
      setShowEmail(nextValue);
      setBusiness((current) => current ? { ...current, ...visibilityUpdates } : current);
      setNotice(nextValue ? 'O e-mail de contacto ficará visível aos clientes.' : 'O e-mail de contacto ficará oculto aos clientes.');
    } catch (err) {
      console.error('Erro ao guardar preferência de e-mail:', err);
      setError('Não foi possível guardar a preferência de e-mail. Confirme se a coluna show_email já foi criada no Supabase.');
    } finally { setEmailVisibilitySaving(false); }
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

  /* =====================================================================
     GALERIA · imagens principais (3 lugares) e imagens de painel
     ===================================================================== */

  async function loadImages(businessId) {
    const { data, error: imagesError } = await supabase
      .from('business_images')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (imagesError) {
      console.error('Erro ao carregar a galeria:', imagesError);
      setImages([]);
      setGalleryError('Erro ao carregar a galeria: ' + (imagesError.message || 'erro desconhecido') + (imagesError.code ? ' [' + imagesError.code + ']' : ''));
      return null;
    }
    setGalleryError('');
    setImages(data || []);
    return data || [];
  }

  // Abre a galeria do telemóvel
  function pickImages(multiple, onFiles) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
    };
    input.click();
  }

  // Executa uma tarefa da galeria com bloqueio, aviso de erro e respeito pela verificação do plano
  async function runGallery(task) {
    if (subscriptionPending) {
      setError('O perfil está em verificação para aprovação. Edite mais tarde, depois da validação.');
      return false;
    }
    setGalleryBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      return true;
    } catch (galleryTaskError) {
      console.error(galleryTaskError);
      setError('Não foi possível guardar as alterações. ' + (galleryTaskError?.message || 'Confirme as permissões no Supabase.'));
      return false;
    } finally {
      setGalleryBusy(false);
    }
  }

  async function uploadGalleryFile(file, square) {
    if (!file.type.startsWith('image/')) throw new Error('Escolha um ficheiro de imagem válido.');
    if (file.size > 15 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 15 MB.');
    const blob = await prepareImage(file, square ? { square: true, size: 600 } : { max: 1200 });
    const path =
      business.id + '/gallery-' + (square ? 'main' : 'panel') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    const { error: uploadError } = await supabase.storage
      .from('business-media')
      .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const url = supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
    if (!url) throw new Error('Não foi possível obter o endereço público da imagem.');
    return { url, path };
  }

  async function removeStored(path) {
    if (!path) return;
    const { error: removeError } = await supabase.storage.from('business-media').remove([path]);
    if (removeError) console.error('Não foi possível apagar o ficheiro antigo:', removeError);
  }

  async function updateRow(id, fields) {
    const { data, error: updateError } = await supabase
      .from('business_images')
      .update(fields)
      .eq('id', id)
      .select('id');
    if (updateError) throw updateError;
    if (!data?.length) throw new Error('Sem permissão para alterar esta imagem.');
  }

  async function saveMainImage(slot, file) {
    await runGallery(async () => {
      const { url, path } = await uploadGalleryFile(file, true);
      const { error: insertError } = await supabase
        .from('business_images')
        .insert({ business_id: business.id, kind: 'main', slot, image_url: url, storage_path: path });
      if (insertError) {
        await removeStored(path);
        throw insertError;
      }
      await loadImages(business.id);
      setNotice('Imagem principal adicionada.');
    });
  }

  async function addPanelImages(files) {
    const batch = files.slice(0, 10);
    await runGallery(async () => {
      let done = 0;
      try {
        for (const file of batch) {
          const { url, path } = await uploadGalleryFile(file, false);
          const { error: insertError } = await supabase
            .from('business_images')
            .insert({ business_id: business.id, kind: 'panel', image_url: url, storage_path: path });
          if (insertError) {
            await removeStored(path);
            throw insertError;
          }
          done += 1;
        }
      } finally {
        if (done > 0) await loadImages(business.id);
      }
      setNotice(
        done + (done === 1 ? ' imagem adicionada.' : ' imagens adicionadas.') +
          (files.length > 10 ? ' Só as primeiras 10 foram adicionadas de uma vez.' : '')
      );
    });
  }

  async function replaceImage(item, file) {
    await runGallery(async () => {
      const { url, path } = await uploadGalleryFile(file, item.kind === 'main');
      try {
        await updateRow(item.id, { image_url: url, storage_path: path });
      } catch (replaceError) {
        await removeStored(path);
        throw replaceError;
      }
      await removeStored(item.storage_path);
      await loadImages(business.id);
      setNotice('Imagem atualizada.');
    });
  }

  async function removeImage(item) {
    if (typeof window !== 'undefined' && !window.confirm('Remover esta imagem?')) return;
    await runGallery(async () => {
      const { data: deleted, error: deleteError } = await supabase
        .from('business_images')
        .delete()
        .eq('id', item.id)
        .select('id');
      if (deleteError) throw deleteError;
      if (!deleted?.length) throw new Error('Sem permissão para remover esta imagem.');
      await removeStored(item.storage_path);
      await loadImages(business.id);
      setNotice('Imagem removida.');
    });
  }

  async function submitPrice(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const raw = sheetPrice.replace(/\s/g, '').replace(',', '.');
    let price = null;
    if (raw !== '') {
      price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError('Indique um preço válido em Kz.');
        return;
      }
    }
    setSheet(null);
    await runGallery(async () => {
      await updateRow(item.id, { price });
      await loadImages(business.id);
      setNotice(price === null ? 'Preço removido.' : 'Preço guardado.');
    });
  }

  async function submitText(event) {
    event.preventDefault();
    const item = images.find((i) => i.id === sheet?.id);
    if (!item) return;
    const name = sheetName.trim() || null;
    const description = sheetDesc.trim() || null;
    setSheet(null);
    await runGallery(async () => {
      await updateRow(item.id, { name, description });
      await loadImages(business.id);
      setNotice('Nome e descrição guardados.');
    });
  }

  async function changeMode(mode) {
    if (!VIEW_MODES.includes(mode)) return;
    setViewMode(mode);
    if (!business || !user || subscriptionPending) return;
    const { error: modeError } = await supabase
      .from('businesses')
      .update({ panel_view_mode: mode })
      .eq('id', business.id)
      .eq('owner_id', user.id);
    if (modeError) {
      console.error(modeError);
      setError('Não foi possível guardar o modo de visualização: ' + (modeError.message || 'erro desconhecido') + (modeError.code ? ' [' + modeError.code + ']' : ''));
    }
  }

  function openPrice(item) {
    setSheetPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setSheet({ type: 'price', id: item.id });
  }

  function openText(item) {
    setSheetName(item.name || '');
    setSheetDesc(item.description || '');
    setSheet({ type: 'text', id: item.id });
  }

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // ---- dados derivados da galeria ----
  const mainImages = [0, 1, 2].map((slot) => images.find((i) => i.kind === 'main' && i.slot === slot) || null);
  const mainCount = mainImages.filter(Boolean).length;
  const panelImages = images.filter((i) => i.kind === 'panel');
  const heroImage = business.cover_url || null;
  const locked = subscriptionPending || galleryBusy || assetUploading;
  const sheetItem = sheet ? images.find((i) => i.id === sheet.id) : null;
  const addressLine = [business.municipality, business.neighborhood].filter(Boolean).join(' · ');

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
        <section style={{ borderRadius: 24, overflow: 'hidden', background: '#075B4E', boxShadow: '0 16px 38px rgba(0,70,60,.14)' }}>
          <div style={{ position: 'relative', minHeight: 260, background: '#0B7563' }}>
            {heroImage ? (
              <img
                src={heroImage}
                alt={business.name ? 'Imagem principal de ' + business.name : 'Imagem principal'}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  event.currentTarget.parentElement?.classList.add('talaza-cover-missing');
                }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.82)', fontWeight: 800, background: 'linear-gradient(135deg,#0B7563,#075B4E)' }}>
                Adicione a imagem principal do negócio
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.04) 15%,rgba(0,0,0,.70) 100%)' }} />
            <div style={{ position: 'absolute', top: 18, left: 18, width: 92, height: 92 }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '3px solid #E6A900', background: '#FFFFFF', display: 'grid', placeItems: 'center', color: '#075B4E', fontSize: 30, fontWeight: 900 }}>
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={'Logo de ' + business.name}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                      const fallback = event.currentTarget.parentElement?.querySelector('[data-logo-fallback]');
                      if (fallback) fallback.style.display = 'grid';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : null}
                <span data-logo-fallback style={{ display: business.logo_url ? 'none' : 'grid', placeItems: 'center', width: '100%', height: '100%' }}>{(business.name || 'T').charAt(0).toUpperCase()}</span>
              </div>
              <button type="button" aria-label="Adicionar ou alterar logo" disabled={assetUploading || subscriptionPending} onClick={() => document.getElementById('talaza-logo-upload')?.click()} style={{ position: 'absolute', right: -5, bottom: -5, width: 32, height: 32, borderRadius: '50%', border: '2px solid #FFFFFF', background: '#E6A900', color: '#075B4E', fontSize: 23, fontWeight: 900, lineHeight: 1, cursor: assetUploading || subscriptionPending ? 'not-allowed' : 'pointer' }}>+</button>
            </div>
            <button type="button" aria-label="Alterar imagem de capa" disabled={locked} onClick={() => document.getElementById('talaza-cover-upload')?.click()} style={{ position: 'absolute', right: 16, top: 16, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.85)', background: '#FFFFFF', color: '#075B4E', fontSize: 12, fontWeight: 800, cursor: locked ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(0,0,0,.15)' }}>Alterar capa</button>
            <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, color: '#FFFFFF' }}>
              <div style={{ color: '#FFD04A', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 5 }}>O SEU NEGÓCIO</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(25px,5vw,36px)', lineHeight: 1.15 }}>{business.name}</h1>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, maxWidth: 680 }}>{business.description || 'Apresente aqui o seu negócio e explique aos clientes o que oferece.'}</p>
            </div>
          </div>
        </section>

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

        {subscriptionPending && (
          <div style={{ marginTop: 18, padding: 16, background: '#FFF5D6', border: '1px solid #EBD58C', borderRadius: 14, color: '#5B4300' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Em verificação para ativação do negócio</strong>
            <span>O comprovativo já foi enviado. Não é possível mudar de plano nem editar o perfil enquanto a equipa Talaza verifica o pagamento e a aprovação do negócio.</span>
            {pendingPlan && <div style={{ marginTop: 8 }}><strong>Plano escolhido:</strong> {pendingPlan.name || pendingPlan.title || pendingPlan.plan_name || pendingPlan.nome || (pendingPlan.duration_days ? pendingPlan.duration_days + ' dias' : 'Plano selecionado')}</div>}
          </div>
        )}

        {/* Pré-visualização da loja */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setCustomerOpen(true)} style={{ padding: '13px 22px', borderRadius: 13, background: '#E6A900', color: '#17342F', fontWeight: 900, border: 0, cursor: 'pointer', minWidth: 150 }}>▦ Pré-visualizar loja</button>
        </div>

        <section style={{ marginTop: 14, padding: 16, border: '1px solid #DDE8E3', borderRadius: 15, background: '#FFFFFF', color: '#17342F' }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>Privacidade do e-mail</strong>
          <p style={{ margin: '0 0 12px', color: '#65756E', fontSize: 13, lineHeight: 1.6 }}>Escolha se pretende que o e-mail de contacto do seu negócio apareça no perfil público. O e-mail usado para entrar na sua conta Talaza continua privado.</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: subscriptionPending || emailVisibilitySaving ? 'not-allowed' : 'pointer', fontSize: 13, lineHeight: 1.5 }}>
            <input type="checkbox" checked={showEmail} disabled={subscriptionPending || emailVisibilitySaving} onChange={(event) => saveEmailVisibility(event.target.checked)} style={{ marginTop: 3, accentColor: '#075B4E' }} />
            <span><strong>{showEmail ? 'Mostrar e-mail aos clientes' : 'Ocultar e-mail aos clientes'}</strong><br />{showEmail ? 'Os visitantes poderão ver o e-mail de contacto.' : 'Os visitantes não verão o e-mail de contacto.'}</span>
          </label>
          {emailVisibilitySaving && <p style={{ margin: '10px 0 0', fontSize: 12 }}>A guardar preferência…</p>}
        </section>

        {/* IMAGENS PRINCIPAIS · 3 lugares · 600x600 */}
        <section id="galeria-principais" className="gal-sec">
          <div className="gal-head">
            <h2>Imagens principais</h2>
            <span className="gal-count">{mainCount}/3</span>
          </div>
          <p className="gal-sub">3 lugares · formato 600×600 px</p>
          {galleryError && <div role="alert" className="gal-alert">{galleryError}</div>}
          <div className="mains">
            {mainImages.map((item, slot) =>
              item ? (
                <article key={item.id} className="mc">
                  <img src={item.image_url} alt={'Imagem principal ' + (slot + 1)} />
                  <span className={'pill' + (item.price ? '' : ' sem')}>{item.price ? formatKz(item.price) : 'Sem preço'}</span>
                  {!subscriptionPending && (
                    <button type="button" className="kb" aria-label="Opções da imagem" disabled={galleryBusy} onClick={() => setSheet({ type: 'menu', id: item.id })}>⋮</button>
                  )}
                  {!subscriptionPending && (
                    <button type="button" className="edit" disabled={galleryBusy} onClick={() => openPrice(item)}>✎ Alterar ou adicionar preço</button>
                  )}
                </article>
              ) : (
                <button
                  key={'vazio-' + slot}
                  type="button"
                  className="mc vazio"
                  disabled={locked}
                  onClick={() => pickImages(false, (files) => saveMainImage(slot, files[0]))}
                >
                  <div>
                    <div className="big">+</div>
                    Adicionar imagem
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginTop: 18, padding: 16, background: '#EAF4F1', borderRadius: 16 }}>
          <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Telefone</strong><div>{business.phone || 'Não definido'}</div></div>
          <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Horário</strong><div>{business.opening_hours || 'Não definido'}</div></div>
          {addressLine && <div style={{ color: '#075B4E', fontSize: 13, lineHeight: 1.7 }}><strong>Endereço</strong><div>{addressLine}</div></div>}
        </section>

        {/* IMAGENS DE PAINEL · 3 modos */}
        <section id="galeria-painel" className="gal-sec">
          <div className="gal-head">
            <h2>Imagens de painel</h2>
            <span className="gal-count">{panelImages.length}</span>
            <button type="button" className="gal-add" disabled={locked} onClick={() => pickImages(true, addPanelImages)}>+ Adicionar</button>
          </div>
          <div className="gal-rot">Escolha como quer ver seus produtos do painel:</div>
          <ProductsView
            items={panelImages}
            mode={viewMode}
            onModeChange={changeMode}
            editable={!subscriptionPending}
            onEdit={(item) => setSheet({ type: 'menu', id: item.id })}
            whatsapp={business.phone}
            businessName={business.name}
          />
        </section>

        <button
          type="button"
          onClick={async () => {
            // Mudar para o espaço de exploração sem sair da conta do vendedor.
            // A província principal do explorador vem de profiles; a loja mantém a sua localização fixa.
            let homeCountry = business.country_id;
            let homeProvince = business.province_id;
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user?.id) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('country_id, province_id')
                  .eq('id', authData.user.id)
                  .maybeSingle();
                homeCountry = profile?.country_id || homeCountry;
                homeProvince = profile?.province_id || homeProvince;
              }
            } catch (exploreError) {
              console.error('Não foi possível carregar a localização principal do explorador:', exploreError);
            }
            router.push({
              pathname: '/explore',
              query: {
                country: business.country_id || homeCountry,
                province: business.province_id || homeProvince,
                homeCountry,
                homeProvince,
              },
            });
          }}
          style={{ display: 'block', width: '100%', marginTop: 14, padding: 13, borderRadius: 12, border: '1.5px solid #075B4E', background: '#FFFFFF', color: '#075B4E', fontWeight: 800, cursor: 'pointer' }}
        >
          ← Explorar Talaza como cliente
        </button>
        <button type="button" onClick={() => { if (!subscriptionPending) router.push({ pathname: '/impulsionar', query: { business: business.id } }); }} disabled={subscriptionPending} style={{ position: 'fixed', right: 0, top: '44%', zIndex: 15, writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '18px 12px', borderRadius: '18px 0 0 18px', background: 'linear-gradient(160deg,#F7CF45,#E6A900 55%,#C98F00)', color: '#17342F', boxShadow: '-6px 8px 22px rgba(201,143,0,.35)', fontWeight: 900, letterSpacing: 1, border: 0, cursor: subscriptionPending ? 'not-allowed' : 'pointer' }} aria-label="Impulsionar negócio">⚡ Impulsionar</button>

      </main>

      {/* Vista do cliente (botão Produtos) */}
      {customerOpen && (
        <div className="full" role="dialog" aria-modal="true" aria-label="Produtos como o cliente vê">
          <div className="full-cab">
            <button type="button" aria-label="Fechar" onClick={() => setCustomerOpen(false)}>←</button>
            <div>
              <b>{business.name}</b>
              <small>Assim o cliente vê os seus produtos</small>
            </div>
          </div>
          <div className="full-body">
            <ProductsView
              items={panelImages}
              mode={viewMode}
              onModeChange={changeMode}
              editable={false}
              whatsapp={business.whatsapp || business.phone}
              businessName={business.name}
            />
          </div>
        </div>
      )}

      {/* Folha de opções / preço / nome e descrição */}
      {sheet && sheetItem && (
        <div className="veu" onClick={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <div className="folha" role="dialog" aria-modal="true">
            {sheet.type === 'menu' && (
              <>
                <h3>{sheetItem.kind === 'main' ? 'Imagem principal ' + ((sheetItem.slot ?? 0) + 1) : (sheetItem.name || 'Imagem de painel')}</h3>
                <button type="button" className="op" onClick={() => openPrice(sheetItem)}>Alterar ou adicionar preço</button>
                {sheetItem.kind === 'panel' && (
                  <button type="button" className="op" onClick={() => openText(sheetItem)}>Editar nome e descrição</button>
                )}
                <button type="button" className="op" onClick={() => { const item = sheetItem; setSheet(null); pickImages(false, (files) => replaceImage(item, files[0])); }}>Trocar imagem</button>
                <button type="button" className="op perigo" onClick={() => { const item = sheetItem; setSheet(null); removeImage(item); }}>Remover</button>
              </>
            )}
            {sheet.type === 'price' && (
              <form onSubmit={submitPrice}>
                <h3>{sheetItem.price ? 'Alterar preço' : 'Adicionar preço'}</h3>
                <label htmlFor="talaza-preco">Preço em Kz</label>
                <input id="talaza-preco" type="number" inputMode="decimal" min="0" step="any" placeholder="Ex.: 15000" value={sheetPrice} onChange={(event) => setSheetPrice(event.target.value)} autoFocus />
                <div className="acoes">
                  <button type="button" className="cancelar" onClick={() => setSheet(null)}>Cancelar</button>
                  <button type="submit" className="guardar">Guardar</button>
                </div>
              </form>
            )}
            {sheet.type === 'text' && (
              <form onSubmit={submitText}>
                <h3>Nome e descrição</h3>
                <label htmlFor="talaza-nome">Nome do produto</label>
                <input id="talaza-nome" maxLength={40} placeholder="Ex.: Cesta romântica" value={sheetName} onChange={(event) => setSheetName(event.target.value)} autoFocus />
                <label htmlFor="talaza-desc">Descrição</label>
                <textarea id="talaza-desc" maxLength={140} placeholder="Ex.: Flores, vinho e chocolates" value={sheetDesc} onChange={(event) => setSheetDesc(event.target.value)} />
                <div className="acoes">
                  <button type="button" className="cancelar" onClick={() => setSheet(null)}>Cancelar</button>
                  <button type="submit" className="guardar">Guardar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Aviso (guardado / erro) */}
      {(notice || error) && (
        <div className={'toast ' + (error ? 'err' : 'ok')} role={error ? 'alert' : 'status'} onClick={() => { setNotice(''); setError(''); }}>
          {error || notice}
        </div>
      )}

      {galleryBusy && <div className="busy" role="status">A guardar…</div>}

      <style jsx>{`
        button{font:inherit}
        .gal-sec{margin-top:18px;background:#fff;border-radius:18px;padding:16px;scroll-margin-top:84px;box-shadow:0 1px 0 rgba(0,0,0,.03)}
        .gal-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
        .gal-head h2{margin:0;font-size:19px;color:#075B4E;flex:1}
        .gal-count{font-weight:700;color:#5A6A64;font-size:14px}
        .gal-add{background:#075B4E;color:#fff;font-weight:700;font-size:13px;padding:8px 12px;border-radius:10px;border:0;cursor:pointer}
        .gal-add:disabled{opacity:.5;cursor:not-allowed}
        .gal-sub{margin:0 0 12px;font-size:12.5px;color:#5A6A64}
        .gal-rot{font-size:14px;font-weight:700;margin:2px 0 8px;color:#075B4E}
        .gal-alert{margin:0 0 10px;padding:11px 13px;background:#FCEBED;color:#A52F3B;border-radius:12px;font-size:13px}

        .mains{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:2px}
        .mains::-webkit-scrollbar{display:none}
        .mc{position:relative;flex:0 0 72%;aspect-ratio:1/1;border-radius:14px;overflow:hidden;scroll-snap-align:center;background:#E8F2EE}
        .mc img{width:100%;height:100%;object-fit:cover;display:block}
        .pill{position:absolute;left:8px;top:8px;background:rgba(15,22,20,.74);color:#fff;font-weight:800;font-size:13px;padding:5px 10px;border-radius:999px}
        .pill.sem{background:rgba(255,255,255,.88);color:#5A6A64;font-weight:600}
        .kb{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(15,22,20,.74);color:#fff;font-size:17px;font-weight:900;line-height:1;display:grid;place-items:center;cursor:pointer}
        .edit{position:absolute;left:8px;right:8px;bottom:8px;background:#fff;border:0;border-radius:10px;padding:10px 8px;font-size:13px;color:#14201C;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}
        .mc.vazio{border:2px dashed #8FBFB1;display:grid;place-items:center;color:#075B4E;font-weight:700;font-size:13px;text-align:center;cursor:pointer}
        .mc.vazio:disabled{opacity:.55;cursor:not-allowed}
        .big{width:46px;height:46px;border-radius:50%;background:#075B4E;color:#fff;display:grid;place-items:center;font-size:28px;margin:0 auto 8px}
        @media (min-width:640px){.mc{flex:1 1 0}}

        .full{position:fixed;inset:0;z-index:70;background:#EEF2F0;overflow-y:auto}
        .full-cab{position:sticky;top:0;z-index:5;background:#075B4E;color:#fff;display:flex;align-items:center;gap:12px;padding:10px 14px}
        .full-cab button{width:36px;height:36px;border-radius:10px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer}
        .full-cab b{display:block;font-size:16px}
        .full-cab small{display:block;opacity:.85;font-size:12px}
        .full-body{max-width:560px;margin:0 auto;padding:12px 14px 40px}

        .veu{position:fixed;inset:0;background:rgba(10,20,17,.55);z-index:90;display:flex;align-items:flex-end;justify-content:center}
        .folha{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}
        .folha h3{margin:0 0 6px;font-size:17px;color:#14201C}
        .op{display:flex;align-items:center;width:100%;text-align:left;padding:14px 4px;font-size:15px;border:0;border-top:1px solid #EDF1EF;background:none;color:#14201C;cursor:pointer}
        .op.perigo{color:#B3261E}
        label{display:block;font-size:12.5px;font-weight:700;color:#5A6A64;margin:12px 0 5px}
        input,textarea{width:100%;box-sizing:border-box;padding:12px;border:2px solid #CFD9D5;border-radius:11px;font:inherit;font-size:15px}
        textarea{min-height:84px;resize:vertical}
        .acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
        .acoes button{padding:13px;border-radius:11px;font-weight:700;border:0;cursor:pointer}
        .cancelar{background:#E9EEEC;color:#14201C}
        .guardar{background:#075B4E;color:#fff}

        .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:130;max-width:90%;padding:11px 15px;border-radius:12px;font-size:13.5px;font-weight:700;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}
        .toast.ok{background:#E8F6F1;color:#075B4E}
        .toast.err{background:#FCEBED;color:#A52F3B}
        .busy{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:130;background:#14201C;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px}
      `}</style>
    </div>
  );
}