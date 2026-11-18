import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function EventoDetalhe() {
  const router = useRouter();
  const [eventItem, setEventItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!router.isReady || !router.query.id) return;
    let cancelled = false;
    async function loadEvent() {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('events')
        .select('id,title,description,event_type,image_url,video_url,location,starts_at,expires_at,status,payment_status,admin_approved')
        .eq('id', String(router.query.id))
        .eq('status', 'published')
        .eq('payment_status', 'paid')
        .eq('admin_approved', true)
        .not('expires_at', 'is', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (cancelled) return;
      if (queryError) setError(queryError.message || 'Não foi possível carregar o evento.');
      else if (!data) setError('Este evento não está disponível ou já terminou.');
      else setEventItem(data);
      setLoading(false);
    }
    loadEvent();
    return () => { cancelled = true; };
  }, [router.isReady, router.query.id]);

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7F6', color: '#12332D', padding: 18, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/eventos" style={{ display: 'inline-block', marginBottom: 18, color: '#075B4E', fontWeight: 800, textDecoration: 'none' }}>← Voltar aos Eventos</Link>
        {loading ? <p>A carregar evento…</p> : error ? <div role="alert" style={{ padding: 16, borderRadius: 12, background: '#FFF0EE', color: '#9C3027' }}>{error}</div> : eventItem && <>
          <article style={{ background: '#FFFFFF', borderRadius: 18, overflow: 'hidden', boxShadow: '0 5px 20px rgba(0,0,0,.06)' }}>
            {(eventItem.video_url || eventItem.image_url) && <div style={{ position: 'relative', width: '100%', height: 200, aspectRatio: '16 / 9', overflow: 'hidden', background: '#10221D' }}>
              {eventItem.video_url
                ? <video src={eventItem.video_url} poster={eventItem.image_url || undefined} playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <img src={eventItem.image_url} alt={eventItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              <button type="button" onClick={() => setExpanded(true)} style={{ position: 'absolute', right: 10, bottom: 10, border: '1px solid rgba(255,255,255,.75)', borderRadius: 999, padding: '8px 12px', background: 'rgba(8,35,27,.82)', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}>⛶ Ver completo</button>
            </div>}
            <div style={{ padding: 20 }}>
              <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: '#E4F2F2', color: '#126E75', fontSize: 12, fontWeight: 800 }}>{eventItem.event_type || 'Geral'}</span>
              <h1 style={{ margin: '12px 0 8px' }}>{eventItem.title}</h1>
              {eventItem.location && <p>📍 {eventItem.location}</p>}
              {eventItem.starts_at && <p>📅 {new Date(eventItem.starts_at).toLocaleString('pt-AO', { dateStyle: 'full', timeStyle: 'short' })}</p>}
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{eventItem.description}</p>
            </div>
          </article>
          {expanded && <div role="dialog" aria-modal="true" aria-label="Multimédia completa do evento" onClick={() => setExpanded(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'rgba(0,0,0,.94)', boxSizing: 'border-box' }}>
            <button type="button" aria-label="Fechar" onClick={() => setExpanded(false)} style={{ position: 'absolute', top: 14, right: 16, zIndex: 2, width: 44, height: 44, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,.16)', color: '#FFFFFF', fontSize: 32, cursor: 'pointer' }}>×</button>
            <div onClick={event => event.stopPropagation()} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {eventItem.video_url
                ? <video src={eventItem.video_url} poster={eventItem.image_url || undefined} controls autoPlay playsInline style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 90px)', width: 'auto', height: 'auto', objectFit: 'contain', background: '#000000', borderRadius: 10 }} />
                : <img src={eventItem.image_url} alt={eventItem.title} style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 90px)', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 10 }} />}
              <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}>{eventItem.title}</span>
            </div>
          </div>}
        </>}
      </div>
    </main>
  );
}
