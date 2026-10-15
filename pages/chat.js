import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabaseClient';

/*
  Tabela messages (Supabase) — colunas usadas:
    id, sender_id, receiver_id, content, is_read, created_at
  + novas (ver supabase/mensagens.sql):
    message_type ('text' | 'image' | 'audio'), media_path, media_mime, media_duration
  Se a sua coluna de texto não se chama "content", altere aqui em baixo.
*/
const BUCKET = 'message-media';
const MAX_AUDIO_SECONDS = 300;

/* ---------- Utilitários ---------- */
const pad = (n) => String(n).padStart(2, '0');

function formatTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

function isSameDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function dayLabel(iso) {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(iso, now)) return 'Hoje';
  if (isSameDay(iso, yesterday)) return 'Ontem';

  return new Date(iso).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function previewOf(message) {
  if (!message) return '';
  if (message.message_type === 'image') {
    return message.content ? `📷 ${message.content}` : '📷 Foto';
  }
  if (message.message_type === 'audio') {
    return `🎤 Áudio ${formatDuration(message.media_duration || 0)}`;
  }
  return message.content || '';
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';

  const options = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function extFromMime(mime) {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

// Reduz a foto antes de enviar (poupa espaço e dados móveis).
async function compressImage(file, maxSide = 1600, quality = 0.82) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');

    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );

    return blob || file;
  } catch (err) {
    return file;
  }
}

// URLs assinadas (o bucket é privado) com cache de 50 minutos.
const urlCache = new Map();

function useSignedUrl(path) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!path) return undefined;

    const cached = urlCache.get(path);

    if (cached && Date.now() - cached.at < 50 * 60 * 1000) {
      setUrl(cached.url);
      return undefined;
    }

    let active = true;

    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) {
          urlCache.set(path, { url: data.signedUrl, at: Date.now() });
          setUrl(data.signedUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

async function fetchNames(ids) {
  const names = {};

  if (!ids.length) return names;

  const profiles = await supabase.from('profiles').select('*').in('id', ids);

  (profiles.data || []).forEach((profile) => {
    const name =
      profile.full_name || profile.name || profile.nome || profile.display_name;
    if (name) names[profile.id] = name;
  });

  // Se a pessoa tem um negócio, mostra o nome do negócio.
  const businesses = await supabase
    .from('businesses')
    .select('owner_id, name')
    .in('owner_id', ids);

  (businesses.data || []).forEach((business) => {
    if (business.name) names[business.owner_id] = business.name;
  });

  return names;
}

/* ---------- Partes da mensagem ---------- */
function ChatImage({ path, onOpen, onLoad }) {
  const url = useSignedUrl(path);

  if (!url) return <div className="msd-img-ph" />;

  return (
    <img
      className="msd-img"
      src={url}
      alt="Imagem enviada"
      onClick={() => onOpen(url)}
      onLoad={onLoad}
    />
  );
}

function AudioBubble({ path, duration }) {
  const url = useSignedUrl(path);
  const audioRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function seek(event) {
    const audio = audioRef.current;
    const total = duration || audio?.duration;

    if (!audio || !total || !Number.isFinite(total)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

    audio.currentTime = ratio * total;
  }

  return (
    <div className="msd-audio">
      <button
        type="button"
        className="msd-audio-btn"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="msd-audio-track" onClick={seek} role="presentation">
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <span className="msd-audio-time">
        {formatDuration(playing || current > 0 ? current : duration || 0)}
      </span>

      <audio
        ref={audioRef}
        src={url || undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const total = duration || audio.duration;

          setCurrent(audio.currentTime);
          setProgress(
            total && Number.isFinite(total)
              ? Math.min(1, audio.currentTime / total)
              : 0
          );
        }}
      />
    </div>
  );
}

/* ---------- Painel ---------- */
export default function ChatPanel({ user, initialPartner, onClose }) {
  const me = user.id;

  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const textRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const recRef = useRef({});

  const [partner, setPartner] = useState(initialPartner || null);
  const partnerRef = useRef(partner);
  partnerRef.current = partner;

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { blob, preview }
  const [recording, setRecording] = useState(null); // { seconds }
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState('');

  /* ---------- Conversas (lista) ---------- */
  const loadConversations = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      .order('created_at', { ascending: false })
      .limit(400);

    if (listError) {
      console.error(listError);
      setLoadingList(false);
      return;
    }

    const map = new Map();

    (data || []).forEach((message) => {
      const other =
        message.sender_id === me ? message.receiver_id : message.sender_id;

      if (!map.has(other)) {
        map.set(other, { partnerId: other, last: message, unread: 0 });
      }

      if (message.receiver_id === me && !message.is_read) {
        map.get(other).unread += 1;
      }
    });

    const names = await fetchNames([...map.keys()]);

    setConversations(
      [...map.values()].map((item) => ({
        ...item,
        name: names[item.partnerId] || 'Utilizador',
      }))
    );
    setLoadingList(false);
  }, [me]);

  const markRead = useCallback(
    async (partnerId) => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', me)
        .eq('sender_id', partnerId)
        .eq('is_read', false);

      loadConversations();
    },
    [me, loadConversations]
  );

  /* ---------- Conversa (mensagens) ---------- */
  const loadThread = useCallback(
    async (partnerId) => {
      setLoadingThread(true);
      setError('');

      const { data, error: threadError } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${me},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${me})`
        )
        .order('created_at', { ascending: true })
        .limit(300);

      if (threadError) {
        console.error(threadError);
        setError('Não foi possível carregar a conversa.');
        setMessages([]);
      } else {
        setMessages(data || []);
      }

      setLoadingThread(false);
      markRead(partnerId);
    },
    [me, markRead]
  );

  /* ---------- Tempo real ---------- */
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel(`chat-panel-${me}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${me}`,
        },
        (payload) => {
          const incoming = payload.new;

          if (
            partnerRef.current &&
            incoming.sender_id === partnerRef.current.id
          ) {
            setMessages((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
            );
            markRead(incoming.sender_id);
          } else {
            loadConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${me}`,
        },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, loadConversations, markRead]);

  useEffect(() => {
    if (partner?.id) loadThread(partner.id);
  }, [partner?.id, loadThread]);

  // Quando a conversa é aberta por um botão e só temos o id, procura o nome.
  useEffect(() => {
    if (!partner?.id || partner.name) return;

    let active = true;

    fetchNames([partner.id]).then((names) => {
      if (active && names[partner.id]) {
        setPartner((current) =>
          current ? { ...current, name: names[partner.id] } : current
        );
      }
    });

    return () => {
      active = false;
    };
  }, [partner?.id, partner?.name]);

  /* ---------- Teclado do telemóvel: mantém a caixa visível ---------- */
  useEffect(() => {
    const viewport = window.visualViewport;
    const el = panelRef.current;

    if (!viewport || !el) return undefined;

    function apply() {
      if (window.innerWidth >= 640) {
        el.style.height = '';
        el.style.top = '';
        return;
      }

      el.style.height = `${viewport.height}px`;
      el.style.top = `${viewport.offsetTop}px`;
    }

    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);

    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    };
  }, []);

  const scrollDown = useCallback(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages, partner?.id, scrollDown]);

  // Limpeza ao fechar: para o microfone e liberta a pré-visualização.
  useEffect(() => {
    return () => {
      const rec = recRef.current;
      rec.cancel = true;
      clearInterval(rec.timer);

      if (rec.recorder && rec.recorder.state !== 'inactive') {
        rec.recorder.stop();
      }

      rec.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  /* ---------- Enviar ---------- */
  async function uploadMedia(blob, ext, mime) {
    const path = `${me}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: mime, cacheControl: '3600' });

    if (uploadError) throw uploadError;

    return path;
  }

  async function insertMessage(fields) {
    const current = partnerRef.current;

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: me,
        receiver_id: current.id,
        is_read: false,
        message_type: 'text',
        content: '',
        ...fields,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data]
    );
    loadConversations();

    return data;
  }

  async function handleSend(event) {
    if (event) event.preventDefault();
    if (sending || !partner) return;

    const content = text.trim();
    if (!image && !content) return;

    setSending(true);
    setError('');

    try {
      if (image) {
        const path = await uploadMedia(image.blob, 'jpg', 'image/jpeg');

        await insertMessage({
          message_type: 'image',
          content,
          media_path: path,
          media_mime: 'image/jpeg',
        });

        clearImage();
      } else {
        await insertMessage({ content });
      }

      setText('');
      if (textRef.current) textRef.current.style.height = 'auto';
    } catch (err) {
      console.error(err);
      setError('Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    // No computador, Enter envia e Shift+Enter muda de linha.
    // No telemóvel, Enter muda de linha (como no WhatsApp).
    const isDesktop = window.matchMedia('(hover: hover)').matches;

    if (event.key === 'Enter' && !event.shiftKey && isDesktop) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleTextChange(event) {
    setText(event.target.value);

    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  /* ---------- Imagem ---------- */
  function clearImage() {
    setImage((old) => {
      if (old) URL.revokeObjectURL(old.preview);
      return null;
    });
  }

  async function handlePickImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Escolha um ficheiro de imagem.');
      return;
    }

    setError('');

    const blob = await compressImage(file);

    setImage((old) => {
      if (old) URL.revokeObjectURL(old.preview);
      return { blob, preview: URL.createObjectURL(blob) };
    });
  }

  /* ---------- Áudio ---------- */
  async function sendAudio(blob, seconds, mime) {
    if (!partnerRef.current) return;

    setSending(true);
    setError('');

    try {
      const baseMime = mime.split(';')[0] || 'audio/webm';
      const path = await uploadMedia(blob, extFromMime(baseMime), baseMime);

      await insertMessage({
        message_type: 'audio',
        media_path: path,
        media_mime: baseMime,
        media_duration: seconds,
      });
    } catch (err) {
      console.error(err);
      setError('Não foi possível enviar o áudio. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (sending || recording) return;

    setError('');

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError('Este navegador não suporta gravação de áudio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      const rec = recRef.current;

      rec.stream = stream;
      rec.recorder = recorder;
      rec.chunks = [];
      rec.cancel = false;
      rec.startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) rec.chunks.push(event.data);
      };

      recorder.onstop = () => {
        clearInterval(rec.timer);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(null);

        if (rec.cancel) return;

        const seconds = Math.max(
          1,
          Math.round((Date.now() - rec.startedAt) / 1000)
        );
        const type = recorder.mimeType || mime || 'audio/webm';

        sendAudio(new Blob(rec.chunks, { type }), seconds, type);
      };

      recorder.start();
      setRecording({ seconds: 0 });

      rec.timer = setInterval(() => {
        const elapsed = Math.round((Date.now() - rec.startedAt) / 1000);

        setRecording({ seconds: elapsed });

        if (elapsed >= MAX_AUDIO_SECONDS) stopRecording(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Permita o acesso ao microfone para gravar áudio.'
          : 'Não foi possível iniciar a gravação.'
      );
    }
  }

  function stopRecording(cancel) {
    const rec = recRef.current;
    rec.cancel = cancel;

    if (rec.recorder && rec.recorder.state !== 'inactive') {
      rec.recorder.stop();
    }
  }

  /* ---------- Navegação interna ---------- */
  function openThread(item) {
    setMessages([]);
    setPartner({ id: item.partnerId, name: item.name });
  }

  function backToList() {
    setPartner(null);
    setMessages([]);
    setText('');
    clearImage();
    setError('');
    loadConversations();
  }

  const hasContent = Boolean(text.trim()) || Boolean(image);

  return (
    <section
      ref={panelRef}
      className="msd-panel"
      role="dialog"
      aria-label={partner ? `Conversa com ${partner.name || 'utilizador'}` : 'Mensagens'}
    >
      {/* ---------- Cabeçalho ---------- */}
      <header className="msd-head">
        {partner ? (
          <>
            <button
              type="button"
              className="msd-hbtn"
              onClick={backToList}
              aria-label="Voltar às conversas"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>

            <span className="msd-avatar msd-avatar--sm">
              {initials(partner.name)}
            </span>

            <h2>{partner.name || 'Conversa'}</h2>
          </>
        ) : (
          <h2>Mensagens</h2>
        )}

        <button
          type="button"
          className="msd-hbtn"
          onClick={onClose}
          aria-label="Fechar mensagens"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {/* ---------- Lista de conversas ---------- */}
      {!partner && (
        <div className="msd-scroll">
          {loadingList && <div className="msd-empty">A carregar…</div>}

          {!loadingList && conversations.length === 0 && (
            <div className="msd-empty">
              <b>Ainda não tem conversas</b>
              Abra o perfil de um negócio e toque em “Enviar mensagem” para
              começar.
            </div>
          )}

          {conversations.map((item) => (
            <button
              type="button"
              key={item.partnerId}
              className={`msd-conv${item.unread ? ' unread' : ''}`}
              onClick={() => openThread(item)}
            >
              <span className="msd-avatar">{initials(item.name)}</span>

              <span className="msd-conv-main">
                <b>{item.name}</b>
                <span>
                  {item.last.sender_id === me ? 'Você: ' : ''}
                  {previewOf(item.last)}
                </span>
              </span>

              <span className="msd-conv-meta">
                {formatTime(item.last.created_at)}
                {item.unread > 0 && (
                  <span className="msd-count">
                    {item.unread > 99 ? '99+' : item.unread}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ---------- Conversa ---------- */}
      {partner && (
        <>
          <div className="msd-chat" ref={bodyRef}>
            {loadingThread && <div className="msd-empty">A carregar…</div>}

            {!loadingThread && messages.length === 0 && !error && (
              <div className="msd-empty">
                <b>Diga olá 👋</b>
                Escreva a sua primeira mensagem abaixo.
              </div>
            )}

            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay =
                !previous ||
                !isSameDay(previous.created_at, message.created_at);
              const mine = message.sender_id === me;

              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <div className="msd-day">
                      <span>{dayLabel(message.created_at)}</span>
                    </div>
                  )}

                  <div className={`msd-bub ${mine ? 'out' : 'in'}`}>
                    {message.message_type === 'image' && message.media_path && (
                      <ChatImage
                        path={message.media_path}
                        onOpen={setViewer}
                        onLoad={scrollDown}
                      />
                    )}

                    {message.message_type === 'audio' && message.media_path && (
                      <AudioBubble
                        path={message.media_path}
                        duration={message.media_duration}
                      />
                    )}

                    {message.content ? (
                      <p className="msd-txt">{message.content}</p>
                    ) : null}

                    <span className="msd-meta">
                      {formatTime(message.created_at)}
                      {mine && (
                        <span
                          className={`msd-tick${message.is_read ? ' read' : ''}`}
                          aria-label={message.is_read ? 'Lida' : 'Enviada'}
                        >
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>

          {/* ---------- Caixa de mensagem ---------- */}
          <form className="msd-composer" onSubmit={handleSend}>
            {image && (
              <div className="msd-preview">
                <img src={image.preview} alt="Pré-visualização" />
                <span>Escreva uma legenda (opcional) e envie.</span>
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remover imagem"
                >
                  ×
                </button>
              </div>
            )}

            {error && <div className="msd-err">{error}</div>}

            {recording ? (
              <div className="msd-input-row">
                <button
                  type="button"
                  className="msd-ib msd-ib--trash"
                  onClick={() => stopRecording(true)}
                  aria-label="Cancelar gravação"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>

                <div className="msd-rec">
                  <span className="msd-rec-dot" />
                  <b>{formatDuration(recording.seconds)}</b>
                  <span>A gravar…</span>
                </div>

                <button
                  type="button"
                  className="msd-round"
                  onClick={() => stopRecording(false)}
                  aria-label="Enviar áudio"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="msd-input-row">
                <div className="msd-pill">
                  <button
                    type="button"
                    className="msd-ib"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Anexar imagem da galeria"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.8-7.8" />
                    </svg>
                  </button>

                  <textarea
                    ref={textRef}
                    rows={1}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Mensagem"
                    aria-label="Escrever mensagem"
                  />

                  <button
                    type="button"
                    className="msd-ib"
                    onClick={() => cameraRef.current?.click()}
                    aria-label="Tirar foto"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  </button>
                </div>

                {hasContent ? (
                  <button
                    type="submit"
                    className="msd-round"
                    disabled={sending}
                    aria-label="Enviar mensagem"
                  >
                    {sending ? (
                      <span className="msd-spin" />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="msd-round"
                    onClick={startRecording}
                    disabled={sending}
                    aria-label="Gravar áudio"
                  >
                    {sending ? (
                      <span className="msd-spin" />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0014 0M12 18v3" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePickImage}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handlePickImage}
            />
          </form>
        </>
      )}

      {/* ---------- Imagem em ecrã inteiro ---------- */}
      {viewer && (
        <div
          className="msd-viewer"
          onClick={() => setViewer('')}
          role="button"
          tabIndex={0}
          aria-label="Fechar imagem"
          onKeyDown={(event) => event.key === 'Escape' && setViewer('')}
        >
          <img src={viewer} alt="Imagem ampliada" />
        </div>
      )}

      <style jsx global>{`
        .msd-avatar--sm {
          width: 38px;
          height: 38px;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.16);
          color: #f7f5f0;
        }

        /* ---------- Lista ---------- */
        .msd-conv {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: 0;
          border-bottom: 1px solid #e3ebe8;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .msd-conv:active {
          background: #ebe6da;
        }
        .msd-conv-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .msd-conv-main b {
          font-size: 16px;
        }
        .msd-conv-main span {
          font-size: 14px;
          color: #5e716c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .msd-conv.unread .msd-conv-main span {
          color: #17342f;
          font-weight: 600;
        }
        .msd-conv-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          font-size: 12.5px;
          color: #5e716c;
        }
        .msd-count {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 99px;
          display: grid;
          place-items: center;
          background: #e5384f;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }

        /* ---------- Conversa ---------- */
        .msd-chat {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 12px 8px;
          background-color: #efeae0;
          background-image: radial-gradient(
            rgba(7, 91, 78, 0.07) 1px,
            transparent 1px
          );
          background-size: 22px 22px;
        }
        .msd-day {
          align-self: center;
          margin: 10px 0 6px;
        }
        .msd-day span {
          padding: 5px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.92);
          color: #5e716c;
          font-size: 12.5px;
          font-weight: 600;
          box-shadow: 0 1px 1px rgba(7, 60, 50, 0.08);
        }
        .msd-bub {
          position: relative;
          max-width: 82%;
          padding: 7px 10px 6px;
          border-radius: 14px;
          box-shadow: 0 1px 1px rgba(7, 60, 50, 0.1);
          word-wrap: break-word;
          overflow-wrap: anywhere;
        }
        .msd-bub.in {
          align-self: flex-start;
          background: #ffffff;
          border-top-left-radius: 4px;
        }
        .msd-bub.out {
          align-self: flex-end;
          background: #075b4e;
          color: #ffffff;
          border-top-right-radius: 4px;
        }
        .msd-txt {
          margin: 0;
          font-size: 15.5px;
          line-height: 1.4;
          white-space: pre-wrap;
        }
        .msd-meta {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          font-size: 11px;
          opacity: 0.7;
        }
        .msd-tick {
          letter-spacing: -2px;
          font-size: 12px;
        }
        .msd-tick.read {
          color: #f6cd52;
          opacity: 1;
        }
        .msd-img {
          display: block;
          width: 100%;
          max-width: 260px;
          max-height: 320px;
          margin-bottom: 4px;
          border-radius: 10px;
          object-fit: cover;
          cursor: zoom-in;
        }
        .msd-img-ph {
          width: 220px;
          height: 160px;
          margin-bottom: 4px;
          border-radius: 10px;
          background: rgba(120, 140, 135, 0.2);
        }

        /* ---------- Áudio ---------- */
        .msd-audio {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
          padding: 4px 0;
        }
        .msd-audio-btn {
          flex: none;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #075b4e;
          color: #fff;
          cursor: pointer;
        }
        .msd-bub.out .msd-audio-btn {
          background: #f7f5f0;
          color: #075b4e;
        }
        .msd-audio-btn:disabled {
          opacity: 0.5;
        }
        .msd-audio-track {
          flex: 1;
          height: 18px;
          display: flex;
          align-items: center;
          cursor: pointer;
          background: linear-gradient(
              currentColor,
              currentColor
            )
            center / 100% 3px no-repeat;
          opacity: 1;
          color: rgba(120, 140, 135, 0.4);
        }
        .msd-bub.out .msd-audio-track {
          color: rgba(255, 255, 255, 0.35);
        }
        .msd-audio-track span {
          display: block;
          height: 3px;
          border-radius: 3px;
          background: #e6a900;
        }
        .msd-audio-time {
          flex: none;
          min-width: 34px;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          opacity: 0.8;
        }

        /* ---------- Caixa de mensagem ---------- */
        .msd-composer {
          flex: none;
          padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
          background: #efeae0;
        }
        @media (min-width: 640px) {
          .msd-composer {
            padding-bottom: 8px;
          }
        }
        .msd-input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .msd-pill {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: flex-end;
          gap: 2px;
          padding: 4px 6px;
          border-radius: 26px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(7, 60, 50, 0.12);
        }
        .msd-pill textarea {
          flex: 1;
          min-width: 0;
          max-height: 120px;
          padding: 10px 4px;
          border: 0;
          outline: none;
          resize: none;
          background: transparent;
          color: #17342f;
          font: inherit;
          font-size: 16px;
          line-height: 1.3;
        }
        .msd-ib {
          flex: none;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #5e716c;
          cursor: pointer;
        }
        .msd-ib--trash {
          color: #b93845;
        }
        .msd-round {
          flex: none;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #075b4e;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 10px -4px rgba(7, 91, 78, 0.7);
        }
        .msd-round:disabled {
          opacity: 0.7;
        }
        .msd-rec {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 16px;
          border-radius: 26px;
          background: #ffffff;
          color: #5e716c;
          font-size: 14px;
        }
        .msd-rec b {
          color: #17342f;
          font-variant-numeric: tabular-nums;
        }
        .msd-rec-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #e5384f;
          animation: msd-pulse 1s ease-in-out infinite;
        }
        .msd-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          padding: 8px;
          border-radius: 16px;
          background: #ffffff;
          color: #5e716c;
          font-size: 13px;
        }
        .msd-preview img {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          object-fit: cover;
        }
        .msd-preview span {
          flex: 1;
        }
        .msd-preview button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: #efeae0;
          color: #17342f;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }
        .msd-err {
          margin-bottom: 8px;
          padding: 9px 12px;
          border-radius: 12px;
          background: #fff1f0;
          color: #9b2c2c;
          font-size: 13.5px;
        }
        .msd-spin {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: msd-rotate 0.7s linear infinite;
        }

        /* ---------- Imagem ampliada ---------- */
        .msd-viewer {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: grid;
          place-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.92);
          cursor: zoom-out;
        }
        .msd-viewer img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        @keyframes msd-pulse {
          50% {
            opacity: 0.25;
          }
        }
        @keyframes msd-rotate {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .msd-rec-dot,
          .msd-spin {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
