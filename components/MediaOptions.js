import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function resolveStorageLocation(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2].split('?')[0]) };
  } catch (_) { return null; }
}

export default function MediaOptions({ url, isVideo = false, fileName = '', storagePath = '', children, className = '' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function getMediaElement(button) {
    return button?.closest('[data-talaza-media]')?.querySelector('video') || null;
  }

  async function transfer(event) {
    event.stopPropagation();
    if (busy || !url) return;
    setBusy(true); setError('');
    try {
      let blob = null;
      const location = storagePath ? { bucket: 'business-media', path: storagePath } : resolveStorageLocation(url);
      if (location?.bucket && location?.path) {
        const { data, error: storageError } = await supabase.storage.from(location.bucket).download(location.path);
        if (!storageError && data) blob = data;
      }
      if (!blob) {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
        if (!response.ok) throw new Error('O servidor não autorizou a transferência.');
        blob = await response.blob();
      }
      if (!blob?.size) throw new Error('O ficheiro está vazio ou indisponível.');
      const objectUrl = URL.createObjectURL(blob);
      const type = blob.type || '';
      const extension = isVideo
        ? (type.includes('webm') ? 'webm' : type.includes('quicktime') ? 'mov' : 'mp4')
        : (type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg');
      const safeName = String(fileName || (isVideo ? 'video-talaza' : 'imagem-talaza')).replace(/[^a-z0-9-_ ]/gi, '').trim() || 'talaza-media';
      const anchor = document.createElement('a');
      anchor.href = objectUrl; anchor.download = safeName + '.' + extension; anchor.rel = 'noopener';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 45000);
      setOpen(false);
    } catch (err) {
      console.error('Erro ao transferir mídia Talaza:', err);
      setError('Não foi possível transferir. Tente novamente.');
    } finally { setBusy(false); }
  }

  function setSpeed(event, rate) {
    event.stopPropagation();
    const video = getMediaElement(event.currentTarget);
    if (video) video.playbackRate = rate;
  }

  async function pictureInPicture(event) {
    event.stopPropagation();
    const video = getMediaElement(event.currentTarget);
    try {
      if (video && document.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        setOpen(false);
      } else setError('O ecrã no ecrã não é suportado neste navegador.');
    } catch (err) {
      console.warn('Picture-in-picture indisponível:', err);
      setError('Não foi possível abrir o ecrã no ecrã.');
    }
  }

  return (
    <div className={'talazaMediaOptions ' + className} data-talaza-media>
      {children}
      <div className="talazaMediaMenu">
        <button type="button" className="talazaMediaDots" aria-label="Opções da publicação" aria-expanded={open} onClick={(event) => { event.stopPropagation(); setOpen(value => !value); }}>⋮</button>
        {open && <div className="talazaMediaPopover" role="menu" onClick={(event) => event.stopPropagation()}>
          {isVideo && <>
            <span className="talazaMediaLabel">Velocidade</span>
            <div className="talazaMediaSpeeds">
              {[0.5, 1, 1.5, 2].map(rate => <button type="button" key={rate} role="menuitem" onClick={(event) => setSpeed(event, rate)}>{rate}×</button>)}
            </div>
            <button type="button" role="menuitem" onClick={pictureInPicture}>▣ Ecrã no ecrã</button>
          </>}
          <button type="button" role="menuitem" disabled={busy} onClick={transfer}>{busy ? 'A preparar…' : '↓ Transferir ' + (isVideo ? 'vídeo' : 'imagem')}</button>
          {error && <span className="talazaMediaError" role="alert">{error}</span>}
        </div>}
      </div>
      <style jsx>{`
        .talazaMediaOptions{position:relative;min-width:0}
        .talazaMediaMenu{position:absolute;right:9px;top:9px;z-index:25}
        .talazaMediaDots{width:34px;height:34px;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:rgba(15,24,20,.78);color:#fff;font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.22)}
        .talazaMediaPopover{position:absolute;right:0;top:40px;width:190px;padding:8px;border-radius:12px;background:#fff;color:#17211f;box-shadow:0 8px 28px rgba(0,0,0,.24);display:grid;gap:5px}
        .talazaMediaPopover button{border:0;border-radius:8px;background:#F1F5F3;color:#173C32;text-align:left;padding:10px;font-size:12px;font-weight:750;cursor:pointer}
        .talazaMediaPopover button:disabled{opacity:.6}
        .talazaMediaLabel{font-size:10px;font-weight:800;color:#64736d;padding:3px 4px 0}
        .talazaMediaSpeeds{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
        .talazaMediaSpeeds button{text-align:center;padding:8px 2px}
        .talazaMediaError{font-size:10px;line-height:1.35;color:#A12626;padding:4px}
      `}</style>
    </div>
  );
}
