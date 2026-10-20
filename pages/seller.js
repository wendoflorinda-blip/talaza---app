import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TalazaMenu from '../components/TalazaMenu';
import { supabase } from '../lib/supabaseClient';

/* =====================================================================
   FERRAMENTAS DE IMAGEM (preço em Kz e redução de imagens)
   ===================================================================== */
// 15000 -> "15.000 Kz"
function formatKz(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
}

// Reduz a imagem no telemóvel antes de enviar (poupa dados e armazenamento).
//  - square: true  -> corta ao centro em quadrado (imagens principais 600x600)
//  - square: false -> mantém a proporção, lado maior até "max" px (imagens de painel)
// Devolve um Blob JPEG.
function prepareImage(file, { square = false, size = 600, max = 1200, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let sx = 0;
      let sy = 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      let tw;
      let th;

      if (square) {
        const s = Math.min(sw, sh);
        sx = (sw - s) / 2;
        sy = (sh - s) / 2;
        sw = s;
        sh = s;
        tw = size;
        th = size;
      } else {
        const k = Math.min(1, max / Math.max(sw, sh));
        tw = Math.round(sw * k);
        th = Math.round(sh * k);
      }

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.'))),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem escolhida.'));
    };

    img.src = objectUrl;
  });
}

/* =====================================================================
   PRODUTOS DO PAINEL · 3 modos: vertical (9:16), deslize (1:1) e normal (grade)
   ===================================================================== */
const VIEW_MODES = ['vertical', 'deslize', 'normal'];

const MODES = [
  { id: 'vertical', title: 'Ver produtos', hint: 'Opção 1 · vertical 9:16' },
  { id: 'deslize', title: 'Deslize', hint: 'Opção 2 · quadrado 1:1' },
  { id: 'normal', title: 'Normal', hint: 'Opção 3 · grade' }
];

function ModeIcon({ id }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (id === 'vertical') return (<svg {...common}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>);
  if (id === 'deslize') return (<svg {...common}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M18 9l3 3-3 3" /></svg>);
  return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
}

function whatsappLink(whatsapp, text) {
  let digits = String(whatsapp || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) digits = '244' + digits; // número angolano sem indicativo
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

function ProductsView({
  items = [],
  mode = 'normal',
  onModeChange,          // se não for passado, os botões de modo não aparecem
  editable = false,      // mostra o ⋮ em cada imagem
  onEdit,                // (item) => void
  whatsapp = '',
  businessName = '',
  showNextCard = true    // cartão "Próximo negócio" no fim do modo deslize
}) {
  const [open, setOpen] = useState(null);
  const current = VIEW_MODES.includes(mode) ? mode : 'normal';

  function priceTag(item) {
    return item.price !== null && item.price !== undefined && item.price !== ''
      ? <span className="price">{formatKz(item.price)}</span>
      : <span className="price none">Sem preço</span>;
  }

  function moreButton(item) {
    if (!editable) return null;
    return (
      <button type="button" className="more" aria-label={'Opções de ' + (item.name || 'imagem')} onClick={() => onEdit && onEdit(item)}>⋮</button>
    );
  }

  function caption(item) {
    return (
      <div className="cap">
        <span className="dash">–</span>
        <span><b>{item.name || 'Sem nome'}</b>{item.description ? ' · ' + item.description : ''}</span>
      </div>
    );
  }

  const openItem = open ? items.find((i) => i.id === open) : null;
  const wa = openItem
    ? whatsappLink(
        whatsapp,
        'Olá, tenho interesse em ' + (openItem.name || 'este produto') +
          (openItem.price ? ' (' + formatKz(openItem.price) + ')' : '') +
          (businessName ? ' da ' + businessName : '') + '.'
      )
    : null;

  return (
    <div className="pv">
      {onModeChange && (
        <div className="modes" role="group" aria-label="Como quer ver os produtos do painel">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={'mode' + (current === m.id ? ' on' : '')}
              aria-pressed={current === m.id}
              onClick={() => onModeChange(m.id)}
            >
              <ModeIcon id={m.id} />
              <b>{m.title}</b>
              <small>{m.hint}</small>
              <span className="ck" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      )}

      {!items.length && (
        <div className="empty">Ainda não há imagens de painel.</div>
      )}

      {/* Opção 1 · vertical 9:16 */}
      {items.length > 0 && current === 'vertical' && (
        <div className="vert">
          {items.map((item) => (
            <article key={item.id}>
              <div className="row">{priceTag(item)}{moreButton(item)}</div>
              <button type="button" className="im r916" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}>
                <img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" />
              </button>
              {caption(item)}
            </article>
          ))}
        </div>
      )}

      {/* Opção 2 · deslize 1:1 */}
      {items.length > 0 && current === 'deslize' && (
        <>
          <div className="hint">Desliza e vê outro negócio ›</div>
          <div className="slide">
            {items.map((item) => (
              <article key={item.id}>
                <div className="row">{priceTag(item)}{moreButton(item)}</div>
                <button type="button" className="im r11" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}>
                  <img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" />
                </button>
                {caption(item)}
              </article>
            ))}
            {showNextCard && (
              <div className="next"><div>Próximo negócio<small>Continue a deslizar</small></div></div>
            )}
          </div>
        </>
      )}

      {/* Opção 3 · normal (grade) */}
      {items.length > 0 && current === 'normal' && (
        <div className="grid">
          {items.map((item) => (
            <div className="cell" key={item.id}>
              <button type="button" className="open" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}>
                <img src={item.image_url} alt={item.name || 'Produto'} loading="lazy" />
              </button>
              {item.price ? <span className="tag">{formatKz(item.price)}</span> : null}
              {editable && (
                <button type="button" className="more abs" aria-label={'Opções de ' + (item.name || 'imagem')} onClick={() => onEdit && onEdit(item)}>⋮</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Imagem ampliada */}
      {openItem && (
        <div className="veu" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={openItem.name || 'Produto'}>
            <img className="big" src={openItem.image_url} alt={openItem.name || 'Produto'} />
            <div className="bigprice">{openItem.price ? formatKz(openItem.price) : 'Sem preço'}</div>
            <h3>{openItem.name || 'Sem nome'}</h3>
            <p>{openItem.description || 'Sem descrição'}</p>
            <div className="acts">
              <button type="button" className="close" onClick={() => setOpen(null)}>Fechar</button>
              {wa && <a className="wa" href={wa} target="_blank" rel="noopener noreferrer">Pedir no WhatsApp</a>}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pv button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
        .pv button:focus-visible,.pv a:focus-visible{outline:3px solid #E6A900;outline-offset:2px}
        .modes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
        .mode{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:11px 10px!important;border-radius:13px;border:2px solid #DBE4E0!important;background:#F8FAF9!important;min-height:92px;color:#075B4E}
        .mode b{font-size:14px;line-height:1.1;color:#14201C}
        .mode small{color:#5A6A64;font-size:11.5px;line-height:1.2}
        .mode .ck{position:absolute;right:7px;top:7px;width:20px;height:20px;border-radius:50%;background:#7A3FD1;color:#fff;display:none;place-items:center;font-size:12px;font-weight:800}
        .mode.on{border-color:#7A3FD1!important;background:#F0E9FB!important;color:#7A3FD1}
        .mode.on b{color:#7A3FD1}
        .mode.on .ck{display:grid}
        .empty{padding:28px 14px;text-align:center;color:#5A6A64;font-size:14px;border:2px dashed #DBE4E0;border-radius:14px}

        .row{display:flex;align-items:center;justify-content:space-between;min-height:32px;margin-bottom:5px}
        .price{font-weight:800;color:#075B4E;font-size:15px}
        .price.none{color:#5A6A64;font-weight:500;font-size:13.5px}
        .more{width:30px;height:30px;border-radius:50%!important;background:#E7EEEB!important;color:#5A6A64;font-size:17px;font-weight:900;line-height:1;display:grid;place-items:center}
        .more.abs{position:absolute;right:3px;top:3px;width:24px;height:24px;font-size:15px;background:rgba(255,255,255,.88)!important}
        .im{position:relative;display:block;width:100%;border-radius:14px!important;overflow:hidden;background:#E8F2EE!important}
        .im img{width:100%;height:100%;object-fit:cover;display:block}
        .r916{aspect-ratio:9/16}
        .r11{aspect-ratio:1/1}
        .cap{display:flex;gap:8px;margin-top:7px;font-size:13.5px;line-height:1.4;color:#14201C}
        .dash{color:#7A3FD1;font-weight:800}

        .vert{display:grid;gap:20px}
        .hint{font-size:13px;font-weight:700;color:#7A3FD1;margin-bottom:8px}
        .slide{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}
        .slide::-webkit-scrollbar{display:none}
        .slide article{flex:0 0 84%;scroll-snap-align:center}
        .next{flex:0 0 84%;scroll-snap-align:center;aspect-ratio:1/1;border-radius:14px;background:linear-gradient(135deg,#3F1A6E,#7A3FD1);color:#fff;display:grid;place-items:center;text-align:center;font-weight:700;padding:20px;margin-top:37px}
        .next small{display:block;font-weight:400;opacity:.85;margin-top:4px}

        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
        .cell{position:relative;aspect-ratio:1/1;border-radius:7px;overflow:hidden;background:#E8F2EE}
        .open{display:block;width:100%;height:100%}
        .open img{width:100%;height:100%;object-fit:cover;display:block}
        .tag{position:absolute;left:4px;bottom:4px;background:rgba(15,22,20,.74);color:#fff;font-weight:800;font-size:10px;padding:2px 6px;border-radius:999px;pointer-events:none}

        .veu{position:fixed;inset:0;background:rgba(10,20,17,.55);z-index:120;display:flex;align-items:flex-end;justify-content:center}
        .sheet{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}
        .big{width:100%;max-height:52vh;object-fit:contain;background:#E8F2EE;border-radius:14px;display:block;margin:0 0 10px}
        .bigprice{font-weight:800;color:#075B4E;font-size:18px}
        .sheet h3{margin:2px 0;font-size:17px;color:#14201C}
        .sheet p{margin:2px 0 12px;font-size:13px;color:#5A6A64;line-height:1.5;white-space:pre-wrap}
        .acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .acts .close{padding:13px;border-radius:11px!important;font-weight:700;background:#E9EEEC!important}
        .acts .wa{padding:13px;border-radius:11px;font-weight:700;text-align:center;text-decoration:none;background:#1FA855;color:#fff}
        .acts .close:only-child{grid-column:1 / -1}
      `}</style>
    </div>
  );
}

/* =====================================================================
   PAINEL DO VENDEDOR
   ===================================================================== */

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
    setEditName(data.name || '');
    setEditDescription(data.description || '');
    setEditPhone(data.phone || '');
    setEditWhatsapp(data.whatsapp || '');
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
      setGalleryError('Não foi possível carregar as imagens. Confirme que o SQL da galeria foi executado no Supabase.');
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

  // A primeira imagem principal também fica em businesses.cover_url,
  // para o resto do site continuar a mostrar a capa do negócio.
  async function syncCover(list) {
    const mains = (list || []).filter((i) => i.kind === 'main').sort((a, b) => a.slot - b.slot);
    const coverUrl = mains[0]?.image_url || null;
    if ((business?.cover_url || null) === coverUrl) return;
    const { error: coverError } = await supabase
      .from('businesses')
      .update({ cover_url: coverUrl })
      .eq('id', business.id)
      .eq('owner_id', user.id);
    if (coverError) {
      console.error('Não foi possível atualizar a capa:', coverError);
      return;
    }
    setBusiness((previous) => ({ ...previous, cover_url: coverUrl }));
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
      const list = await loadImages(business.id);
      await syncCover(list);
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
      const list = await loadImages(business.id);
      if (item.kind === 'main') await syncCover(list);
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
      const list = await loadImages(business.id);
      if (item.kind === 'main') await syncCover(list);
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
      setError('Não foi possível guardar o modo de visualização. Confirme que o SQL da galeria foi executado.');
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

  function addFromHero() {
    if (subscriptionPending || galleryBusy) return;
    const free = [0, 1, 2].find((slot) => !images.some((i) => i.kind === 'main' && i.slot === slot));
    if (free === undefined) {
      setNotice('Já tem 3 imagens principais. Para mudar uma, use a secção Imagens principais.');
      scrollToId('galeria-principais');
      return;
    }
    pickImages(false, (files) => saveMainImage(free, files[0]));
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
  const heroImage = mainImages.find(Boolean)?.image_url || business.cover_url;
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
            <button type="button" aria-label="Adicionar imagem principal" disabled={locked} onClick={addFromHero} style={{ position: 'absolute', right: 16, top: 16, width: 38, height: 38, borderRadius: '50%', border: '2px solid #FFFFFF', background: '#FFFFFF', color: '#075B4E', fontSize: 26, fontWeight: 900, lineHeight: 1, cursor: locked ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(0,0,0,.2)' }}>+</button>
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