import { useEffect, useState } from 'react';

/** Imagem de cartão com abertura ampliada partilhada em todas as áreas Talaza. */
export default function ExpandableImage({ src, alt = 'Imagem', frameStyle, imageStyle, buttonLabel = 'Ver imagem completa' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!src) return null;
  return <>
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', ...frameStyle }}>
      <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...imageStyle }} />
      <button type="button" aria-label={buttonLabel} title="Ver completo" onClick={event => { event.stopPropagation(); setOpen(true); }} style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, display: 'grid', placeItems: 'center', width: 36, height: 36, padding: 0, border: '1px solid rgba(255,255,255,.72)', borderRadius: '50%', color: '#FFFFFF', background: 'rgba(0,0,0,.48)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', fontSize: 23, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation' }}>⛶</button>
    </div>
    {open && <div role="dialog" aria-modal="true" aria-label="Imagem completa" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, boxSizing: 'border-box', background: 'rgba(0,0,0,.95)' }}>
      <button type="button" aria-label="Fechar imagem" title="Fechar" onClick={() => setOpen(false)} style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 16, zIndex: 2, width: 44, height: 44, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,.18)', color: '#FFFFFF', fontSize: 32, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation' }}>×</button>
      <img src={src} alt={alt} onClick={event => event.stopPropagation()} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 8 }} />
    </div>}
  </>;
}
