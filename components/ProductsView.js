import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { formatKz } from '../lib/imageTools';
import { supabase } from '../lib/supabaseClient';
import MediaOptions from './MediaOptions';

export const VIEW_MODES = ['vertical', 'deslize', 'normal'];

const MODES = [
  { id: 'vertical', title: 'Ver produtos', hint: 'Opção 1 · vertical 9:16' },
  { id: 'deslize', title: 'Deslize', hint: 'Opção 2 · quadrado 1:1' },
  { id: 'normal', title: 'Normal', hint: 'Opção 3 · grade' }
];

export default function ProductsView({ items = [], mode = 'normal', onModeChange, editable = false, onEdit, onDelete, businessName = '', businessId = '', sellerId = '', showNextCard = true }) {
  const [open, setOpen] = useState(null);
  const viewerVideoRef = useRef(null);
  const viewerHistoryRef = useRef(false);
  function openViewer(item) {
    if (isVideo(item)) {
      try {
        window.history.pushState({ ...(window.history.state || {}), talazaVideoViewer: true }, '', window.location.href);
        viewerHistoryRef.current = true;
      } catch (_) {}
    }
    setOpen(item.id);
  }
  function closeViewer() {
    if (viewerHistoryRef.current && window.history.state?.talazaVideoViewer) {
      viewerHistoryRef.current = false;
      window.history.back();
      setOpen(null);
      return;
    }
    viewerHistoryRef.current = false;
    setOpen(null);
  }
  const [mediaFilter, setMediaFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const router = useRouter();
  const current = VIEW_MODES.includes(mode) ? mode : 'normal';
  const visibleItems = useMemo(() => items.filter((item) => mediaFilter === 'all' || (mediaFilter === 'video' ? (item?.media_type === 'video' || Boolean(item?.video_url)) : !(item?.media_type === 'video' || Boolean(item?.video_url)))), [items, mediaFilter]);
  const openItem = open ? visibleItems.find((item) => item.id === open) : null;
  useEffect(() => {
    if (!openItem || !isVideo(openItem) || !viewerVideoRef.current) return;
    const video = viewerVideoRef.current;
    video.muted = true;
    video.currentTime = 0;
    const startPlayback = () => video.play().catch(() => {});
    if (video.readyState >= 2) startPlayback();
    else video.addEventListener('canplay', startPlayback, { once: true });
    return () => { video.pause(); video.removeEventListener('canplay', startPlayback); video.removeAttribute('src'); video.load(); };
  }, [openItem?.id]);
  useEffect(() => {
    if (!openItem) return;
    const onKeyDown = (event) => { if (event.key === 'Escape') closeViewer(); };
    const onPopState = () => {
      if (viewerHistoryRef.current) {
        viewerHistoryRef.current = false;
        setOpen(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
    };
  }, [openItem?.id]);
  const isVideo = (item) => item?.media_type === 'video' || Boolean(item?.video_url); 
  const mediaUrl = (item) => isVideo(item) ? (item.video_url || item.image_url || '') : (item.image_url || '');
  const Media = ({ item, alt = 'Produto', className = '' }) => isVideo(item)
    ? <video
        key={item.id}
        className={className}
        src={mediaUrl(item)}
        muted
        playsInline
        preload="none"
        aria-label={alt}
        onClick={() => openViewer(item)}
        style={{display:'block',width:'100%',height:'100%',minHeight:180,background:'#080808',objectFit:'contain',cursor:'pointer'}}
        onError={(event) => { event.currentTarget.style.display = 'none'; const fallback = event.currentTarget.nextElementSibling; if (fallback) fallback.style.display = 'grid'; }}
      />
    : <img className={className} src={mediaUrl(item)} alt={alt} loading="lazy" />;
  async function downloadOpenMedia() {
    if (!openItem || downloading) return;
    setDownloading(true); setDownloadError('');
    try {
      const storagePath = openItem.storage_path || '';
      const sourceUrl = mediaUrl(openItem) || '';
      let downloadUrl = sourceUrl;
      let bucket = 'business-media';
      let path = storagePath;

      if (!path && sourceUrl.includes('/storage/v1/object/')) {
        try {
          const parsed = new URL(sourceUrl);
          const marker = '/storage/v1/object/';
          const markerIndex = parsed.pathname.indexOf(marker);
          if (markerIndex >= 0) {
            const remainder = parsed.pathname.slice(markerIndex + marker.length);
            const segments = remainder.split('/');
            const visibility = segments.shift();
            if (['public', 'sign', 'authenticated'].includes(visibility) && segments.length >= 2) {
              bucket = segments.shift();
              path = decodeURIComponent(segments.join('/'));
            }
          }
        } catch (_) {}
      }

      if (path) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 120, { download: (openItem.name || (isVideo(openItem) ? 'video-talaza' : 'imagem-talaza')) });
        if (!error && data?.signedUrl) downloadUrl = data.signedUrl;
      }

      if (!downloadUrl) throw new Error('O ficheiro está indisponível.');
      const baseName = String(openItem.name || (isVideo(openItem) ? 'video' : 'imagem'))
        .replace(/[^a-z0-9-_ ]/gi, '').trim() || (isVideo(openItem) ? 'video' : 'imagem');
      const extension = isVideo(openItem) ? 'mp4' : 'jpg';
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = baseName.toLowerCase().endsWith('.' + extension) ? baseName : baseName + '.' + extension;
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao transferir mídia:', error);
      setDownloadError('Não foi possível transferir este ficheiro. Tente novamente.');
    } finally { setDownloading(false); }
  }

  return (
    <div className="pv">
      <div className="mediaFilters" role="group" aria-label="Filtrar conteúdo por tipo">{[{id:'all',label:'Todos'},{id:'image',label:'Imagens'},{id:'video',label:'Vídeos'}].map((item) => <button type="button" key={item.id} className={'filter' + (mediaFilter === item.id ? ' selected' : '')} aria-pressed={mediaFilter === item.id} onClick={() => { setMediaFilter(item.id); setOpen(null); }}>{item.label}</button>)}</div>
      {onModeChange && <div className="modes" role="group" aria-label="Como quer ver os produtos do painel">
        {MODES.map((item) => <button key={item.id} type="button" className={'mode' + (current === item.id ? ' on' : '')} aria-pressed={current === item.id} onClick={() => onModeChange(item.id)}>
          <b>{item.title}</b><small>{item.hint}</small><span className="ck" aria-hidden="true">✓</span>
        </button>)}
      </div>}
      {!items.length && <div className="empty">Ainda não há imagens ou vídeos no painel.</div>}
      {items.length > 0 && !visibleItems.length && <div className="empty">Ainda não há {mediaFilter === 'video' ? 'vídeos' : 'imagens'} neste perfil.</div>}
      {visibleItems.length > 0 && current === 'vertical' && <div className="vert">
        {visibleItems.map((item) => <article key={item.id}>
          {!isVideo(item) && <div className="row"><span className="price">{item.price !== null && item.price !== undefined && item.price !== '' ? formatKz(item.price) : ''}</span>{editable && <button type="button" className="more" onClick={() => onEdit?.(item)} aria-label="Opções do produto">⋮</button>}</div>}
          {isVideo(item) ? <div className="videoCard"><div className="videoWrap"><div className="im r916"><Media item={item} alt={item.name || 'Vídeo'} /></div><span className="playHint" aria-hidden="true">▶</span></div>{editable && <button type="button" className="cardMore" onClick={() => onEdit?.(item)} aria-label="Opções do vídeo">⋮</button>}</div> : <MediaOptions url={mediaUrl(item)} fileName={item.name} storagePath={item.storage_path} className="mediaOptionsFill"><button type="button" className="im r916" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><Media item={item} alt={item.name || 'Produto'} /></button></MediaOptions>}
          {isVideo(item) ? <div className="videoMeta"><b>{item.name || ''}</b>{item.description && <span>{item.description}</span>}{item.price !== null && item.price !== undefined && item.price !== '' && <strong>{formatKz(item.price)}</strong>}</div> : <><div className="cap"><span className="dash">–</span><span><b>{item.name || ''}</b>{item.description ? ' · ' + item.description : ''}</span></div>{editable && <div className="sellerActions"><button type="button" onClick={() => onEdit?.(item)}>Editar preço e descrição</button><button type="button" className="delete" onClick={() => onDelete?.(item)}>Eliminar</button></div>}</>}
        </article>)}
      </div>}
      {visibleItems.length > 0 && current === 'deslize' && <>
        <div className="hint">Desliza e vê outro negócio ›</div>
        <div className="slide">{visibleItems.map((item) => <article key={item.id}>
          {!isVideo(item) && <div className="row"><span className="price">{item.price !== null && item.price !== undefined && item.price !== '' ? formatKz(item.price) : ''}</span>{editable && <button type="button" className="more" onClick={() => onEdit?.(item)} aria-label="Opções do produto">⋮</button>}</div>}
          {isVideo(item) ? <div className="videoCard"><div className="videoWrap"><div className="im r11"><Media item={item} alt={item.name || 'Vídeo'} /></div><span className="playHint" aria-hidden="true">▶</span></div>{editable && <button type="button" className="cardMore" onClick={() => onEdit?.(item)} aria-label="Opções do vídeo">⋮</button>}</div> : <MediaOptions url={mediaUrl(item)} fileName={item.name} storagePath={item.storage_path} className="mediaOptionsFill"><button type="button" className="im r11" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><Media item={item} alt={item.name || 'Produto'} /></button></MediaOptions>}
          {isVideo(item) ? <div className="videoMeta"><b>{item.name || ''}</b>{item.description && <span>{item.description}</span>}{item.price !== null && item.price !== undefined && item.price !== '' && <strong>{formatKz(item.price)}</strong>}</div> : <><div className="cap"><span className="dash">–</span><span>{item.name && <b>{item.name}</b>}{item.description ? ' · ' + item.description : ''}</span></div>{editable && <div className="sellerActions"><button type="button" onClick={() => onEdit?.(item)}>Editar preço e descrição</button><button type="button" className="delete" onClick={() => onDelete?.(item)}>Eliminar</button></div>}</>}
        </article>)}{showNextCard && <div className="next">Próximo negócio<small>Continue a deslizar</small></div>}</div>
      </>}
      {visibleItems.length > 0 && current === 'normal' && <div className="grid">{visibleItems.map((item) => <div className="cell" key={item.id}>
        {isVideo(item) ? <div className="videoCard gridVideo"><div className="open"><Media item={item} alt={item.name || 'Vídeo'} /></div><span className="playHint" aria-hidden="true">▶</span>{editable && <button type="button" className="cardMore" onClick={() => onEdit?.(item)} aria-label="Opções do vídeo">⋮</button>}</div> : <MediaOptions url={mediaUrl(item)} fileName={item.name} storagePath={item.storage_path} className="mediaOptionsFill"><button type="button" className="open" onClick={() => setOpen(item.id)} aria-label={'Ampliar ' + (item.name || 'imagem')}><Media item={item} alt={item.name || 'Produto'} /></button></MediaOptions>}
        {isVideo(item) ? <div className="videoMeta gridMeta"><b>{item.name || ''}</b>{item.description && <span>{item.description}</span>}{item.price !== null && item.price !== undefined && item.price !== '' && <strong>{formatKz(item.price)}</strong>}</div> : <>{item.price !== null && item.price !== undefined && item.price !== '' && <span className="tag">{formatKz(item.price)}</span>}{editable && <div className="sellerActions gridActions"><button type="button" onClick={() => onEdit?.(item)}>Editar preço e descrição</button><button type="button" className="delete" onClick={() => onDelete?.(item)}>Eliminar</button></div>}</>}
      </div>)}</div>}
      {openItem && <div className={'veu'+(isVideo(openItem)?' videoViewer':'')} onClick={(event) => { if (event.target === event.currentTarget) closeViewer(); }}>
        <div className={isVideo(openItem)?'videoSheet':'sheet'} role="dialog" aria-modal="true" aria-label={openItem.name || 'Produto'}>
          {isVideo(openItem) ? <>
            <video ref={viewerVideoRef} className="viewerVideo" src={mediaUrl(openItem)} autoPlay loop muted playsInline controls preload="metadata" onClick={(event)=>{const v=event.currentTarget;if(v.paused)v.play().catch(()=>{});}} />
            <button type="button" className="viewerClose" onClick={closeViewer} aria-label="Fechar vídeo">×</button>
            <div className="viewerCaption">{openItem.name&&<b>{openItem.name}</b>}{openItem.description&&<p>{openItem.description}</p>}<strong>{businessName}</strong>{openItem.price!==null&&openItem.price!==undefined&&openItem.price!==''&&<span>{formatKz(openItem.price)}</span>}</div>
            {downloadError&&<p role="alert" className="downloadError viewerError">{downloadError}</p>}
          </> : <>
            <MediaOptions url={mediaUrl(openItem)} fileName={openItem.name} storagePath={openItem.storage_path} className="modalMediaOptions"><Media item={openItem} className="big" alt={openItem.name || 'Produto'} /></MediaOptions>
            {openItem.price !== null && openItem.price !== undefined && openItem.price !== '' && <div className="bigprice">{formatKz(openItem.price)}</div>}
            {openItem.name && <h3>{openItem.name}</h3>}
            {openItem.description && <p>{openItem.description}</p>}
            <div className="acts"><button type="button" className="download" onClick={downloadOpenMedia} disabled={downloading}>{downloading ? 'A preparar ficheiro…' : 'Transferir imagem'}</button><button type="button" className="close" onClick={closeViewer}>Fechar</button>{sellerId ? <button type="button" className="internalMessage" onClick={() => router.push({ pathname: '/mensagens', query: { to: sellerId, source: 'Vitrine', sourceId: businessId } })}><span className="messageIcon" aria-hidden="true">▣</span><span>Enviar mensagem</span><span className="messageArrow" aria-hidden="true">›</span></button> : <span className="unavailableMessage">Mensagem interna indisponível</span>}</div>
            {downloadError && <p role="alert" className="downloadError">{downloadError}</p>}
          </>}
        </div>
      </div>}
      <style jsx>{`
        .pv button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}.pv :global(.mediaOptionsFill){width:100%;height:100%}.pv :global(.modalMediaOptions){width:100%;margin-bottom:10px}.pv :global(.modalMediaOptions .big){margin-bottom:0}
  .videoCard{position:relative;width:100%;min-width:0}.playHint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;display:grid;place-items:center;padding-left:3px;background:rgba(0,0,0,.62);border:1.5px solid rgba(255,255,255,.9);color:#fff;font-size:19px;pointer-events:none;box-shadow:0 2px 12px #0006}.videoCard .videoWrap{width:100%}.cardMore{position:absolute;right:9px;top:9px;z-index:8;width:34px;height:34px;border-radius:50%!important;background:rgba(15,24,20,.84)!important;border:1px solid #fff!important;color:#fff!important;font-size:23px!important;line-height:1;display:grid;place-items:center;box-shadow:0 2px 8px #0005}.videoMeta{display:flex;flex-direction:column;gap:4px;margin-top:7px;color:#111;font-size:13px;line-height:1.4}.videoMeta b{font-weight:800;color:#111}.videoMeta span{font-weight:400;color:#111;white-space:pre-wrap}.videoMeta strong{font-size:14px;font-weight:850;color:#087044;margin-top:2px}.gridMeta{padding:0 4px 7px}.cell:has(.gridVideo){height:auto;aspect-ratio:auto;overflow:hidden;border-radius:8px}.gridVideo .open{aspect-ratio:1/1}.gridVideo .open video{object-fit:cover}
  .sellerActions{display:flex;gap:7px;padding:8px 0 4px}.sellerActions button{flex:1;min-height:36px;border:1px solid #0a5b45;border-radius:9px;background:#fff;color:#075b4e;font-size:12px;font-weight:800;padding:7px}.sellerActions button.delete{border-color:#c83c35;color:#b42318}.gridActions{grid-column:1/-1;padding:0 4px 8px}
      .mediaFilters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}.filter{padding:10px 7px!important;border:1px solid #D9E3DF!important;border-radius:10px!important;background:#fff!important;color:#36564B!important;font-weight:800!important;font-size:12px!important}.filter.selected{background:#0F6E5C!important;border-color:#0F6E5C!important;color:#fff!important}
        .modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
        .mode{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;padding:11px 9px!important;border-radius:13px;border:2px solid #DBE4E0!important;background:#F8FAF9!important;min-height:80px;color:#075B4E}
        .mode b{font-size:13px;line-height:1.1}.mode small{color:#5A6A64;font-size:10.5px;line-height:1.2}
        .mode .ck{display:none;position:absolute;right:5px;top:5px}.mode.on{border-color:#075B4E!important;background:#EAF4F1!important;color:#075B4E}.mode.on .ck{display:block}
        .empty{padding:28px 14px;text-align:center;color:#5A6A64;font-size:14px;border:2px dashed #DBE4E0;border-radius:14px}
        .row{display:flex;align-items:center;justify-content:space-between;min-height:30px;margin-bottom:5px}.price{font-weight:800;color:#075B4E;font-size:14px}
        .more{width:30px;height:30px;border-radius:50%!important;background:#E7EEEB!important;font-size:18px;display:grid;place-items:center}.more.abs{position:absolute;right:3px;top:3px;background:#fff!important}
        .videoWrap{position:relative;min-width:0}.viewVideo{display:block!important;width:100%;margin-top:6px!important;padding:9px 8px!important;background:#0F6E5C!important;color:#fff!important;border-radius:9px!important;font-size:11px!important;font-weight:800!important}.gridVideo{height:100%}.gridVideo .viewVideo{position:absolute;left:4px;right:4px;bottom:4px;width:calc(100% - 8px);margin:0!important;padding:6px 3px!important;font-size:9px!important}.im{display:block;width:100%;border-radius:14px!important;overflow:hidden;background:#E8F2EE!important}.im img{width:100%;height:100%;object-fit:cover;display:block}.im video{width:100%;height:100%;min-height:180px;object-fit:contain;display:block;background:#080808}.sheet video{width:100%;}.r916{aspect-ratio:9/16;width:100%;min-height:220px}.r11{aspect-ratio:1/1;width:100%;min-height:180px}
        .cap{display:flex;gap:8px;margin-top:7px;font-size:13px;line-height:1.4;color:#14201C}.dash{color:#075B4E;font-weight:800}.vert{display:grid;gap:20px}.vert article{width:min(82vw,320px);max-width:100%;margin-inline:auto}
        .hint{font-size:13px;font-weight:700;color:#075B4E;margin-bottom:8px}.slide{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}.slide article{flex:0 0 min(78vw,340px);max-width:340px;scroll-snap-align:center}.slide .next{flex:0 0 150px;scroll-snap-align:center}.next{aspect-ratio:1/1;border-radius:14px;background:linear-gradient(135deg,#075B4E,#075B4E);color:#fff;display:grid;place-items:center;text-align:center;font-weight:700;padding:16px}.next small{display:block;font-weight:400;opacity:.85;margin-top:4px}
        .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.cell{position:relative;aspect-ratio:1/1;border-radius:7px;overflow:visible;background:#E8F2EE}.cell .open{border-radius:7px;overflow:hidden}.cell .gridVideo .open{border-radius:7px;overflow:hidden}.open{display:block;width:100%;height:100%}.open img,.open video{width:100%;height:100%;object-fit:cover;display:block}.tag{position:absolute;left:4px;bottom:4px;background:rgba(15,22,20,.74);color:#fff;font-weight:800;font-size:10px;padding:2px 6px;border-radius:999px}
        .veu{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100dvh!important;min-height:100vh!important;margin:0!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background:rgba(0,0,0,.98)!important}.videoViewer{background:#000!important;align-items:center!important;justify-content:center!important}.videoSheet{position:relative;width:100vw;height:100dvh;max-width:none;background:#000;overflow:hidden}.viewerVideo{width:100%;height:100%;object-fit:contain;background:#000;display:block} .viewerClose,.viewerMore{position:absolute;z-index:2147483001;top:calc(12px + env(safe-area-inset-top));width:42px;height:42px;border-radius:50%!important;background:#111b!important;color:#fff!important;font-size:28px!important;display:grid;place-items:center}.viewerClose{left:14px}.viewerMore{right:14px}.viewerCaption{position:absolute;left:0;right:0;bottom:0;padding:70px 18px calc(22px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(0,0,0,.88));color:#fff;display:flex;flex-direction:column;gap:7px;pointer-events:none}.viewerCaption b{font-size:19px}.viewerCaption p{margin:0;color:#eee;font-size:14px;line-height:1.4;white-space:pre-wrap}.viewerCaption strong{font-size:13px;color:#f0d36c}.viewerCaption span{font-size:15px;font-weight:800}.viewerError{position:absolute;bottom:12px;z-index:4}.sheet{background:#fff;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));max-height:92vh;overflow-y:auto}.sheet .big{width:100%;max-height:52vh;object-fit:contain;background:#E8F2EE;border-radius:14px;display:block;margin:0 0 10px;height:auto}.sheet video.big{width:100%;}.bigprice{font-weight:800;color:#075B4E;font-size:18px}.sheet h3{margin:2px 0;font-size:17px;color:#14201C}.sheet p{margin:2px 0 12px;font-size:13px;color:#5A6A64;line-height:1.5;white-space:pre-wrap}.acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}.acts .close,.acts .wa,.acts .download{padding:13px;border-radius:11px;font-weight:700;text-align:center;text-decoration:none}.acts .download{background:#DCEFE8;color:#075B4E;text-decoration:none;text-align:center;font-weight:800;border-radius:11px}.acts .close{background:#E9EEEC;color:#14201C}.acts .internalMessage{grid-column:1/-1;background:linear-gradient(180deg,#292929 0%,#000 100%)!important;color:#fff!important;border:1.5px solid #FFD700!important;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:50px;padding:0 17px!important;border-radius:9999px!important;font-size:14px;font-weight:800;box-shadow:0 2px 10px rgba(0,0,0,.3);box-sizing:border-box}.messageIcon{font-size:17px;line-height:1}.messageArrow{font-size:20px;line-height:1}.acts .download:disabled{opacity:.65;cursor:wait}.downloadError{grid-column:1/-1;color:#A12626!important;font-size:12px!important;margin:0!important}.acts .unavailableMessage{background:#EDF1EF;color:#7A8983;display:grid;place-items:center;padding:13px;border-radius:11px;font-size:12px;text-align:center}
      `}</style>
    </div>
  );
}
