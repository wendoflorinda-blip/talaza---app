import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const MEDIA_BUCKET = 'message-media';

export default function Mensagens() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) setLoading(false);
    }

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setAuthChecked(true);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    const { data, error: queryError } = await supabase
      .from('messages')
      .select(
        'id, created_at, sender_id, receiver_id, content, message_type, is_read'
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Não foi possível carregar as conversas.');
      return;
    }

    const latestByContact = new Map();

    for (const message of data || []) {
      const contactId =
        message.sender_id === user.id
          ? message.receiver_id
          : message.sender_id;

      if (!contactId || contactId === user.id) continue;

      if (!latestByContact.has(contactId)) {
        latestByContact.set(contactId, {
          id: contactId,
          lastMessage: message.content || (
            message.message_type === 'image'
              ? 'Imagem'
              : message.message_type === 'audio'
                ? 'Mensagem de áudio'
                : 'Mensagem'
          ),
          createdAt: message.created_at,
          unread: 0,
        });
      }

      if (
        message.receiver_id === user.id &&
        message.is_read === false
      ) {
        latestByContact.get(contactId).unread += 1;
      }
    }

    const list = Array.from(latestByContact.values());
    setConversations(list);

    const queryReceiver =
      typeof router.query.receiver_id === 'string'
        ? router.query.receiver_id
        : '';

    if (queryReceiver && queryReceiver !== user.id) {
      setSelectedId(queryReceiver);
    } else if (list.length && !selectedId) {
      setSelectedId(list[0].id);
    }

    setLoading(false);
  }, [user, router.query.receiver_id, selectedId]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, loadConversations]);

  const loadMessages = useCallback(async () => {
    if (!user || !selectedId) {
      setMessages([]);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (queryError) {
      setError('Não foi possível abrir esta conversa.');
      return;
    }

    const rows = data || [];
    const mediaRows = await Promise.all(
      rows.map(async (message) => {
        if (!message.media_url) return message;

        const { data: signedData } = await supabase.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(message.media_url, 3600);

        return {
          ...message,
          displayMediaUrl: signedData?.signedUrl || '',
        };
      })
    );

    setMessages(mediaRows);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', selectedId)
      .eq('is_read', false);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    loadConversations();
  }, [user, selectedId, loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mensagens-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadMessages();
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMessages, loadConversations]);

  async function uploadMedia(blob, filename, type) {
    const extension = filename.split('.').pop() || 'bin';
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, blob, {
        contentType: blob.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        'Não foi possível carregar o ficheiro. Verifica o bucket e as suas políticas.'
      );
    }

    return {
      path,
      filename,
      type,
    };
  }

  async function sendMessage(event) {
    event.preventDefault();
    setError('');

    if (!user) return;
    if (!selectedId) {
      setError('Abre uma conversa a partir do perfil da pessoa.');
      return;
    }

    if (!text.trim() && !file) return;

    setSending(true);

    try {
      let media = null;
      let messageType = 'text';

      if (file) {
        messageType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'file';

        media = await uploadMedia(file, file.name, messageType);
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedId,
          content: text.trim() || null,
          message_type: messageType,
          media_url: media?.path || null,
          media_name: media?.filename || null,
          is_read: false,
        });

      if (insertError) throw insertError;

      setText('');
      setFile(null);

      const input = document.getElementById('message-file');
      if (input) input.value = '';

      await loadMessages();
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Este navegador não permite gravar áudio. Experimenta outro navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        const audioFile = new File(
          [blob],
          `audio-${Date.now()}.webm`,
          { type: blob.type }
        );

        setFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError('Permite o acesso ao microfone para gravar áudio.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  if (!authChecked) {
    return <main style={ui.page}>A preparar as mensagens...</main>;
  }

  if (!user) {
    return (
      <main style={ui.page}>
        <section style={ui.accountCard}>
          <div style={ui.accountIcon}>✉</div>
          <h1 style={ui.heading}>As tuas mensagens</h1>
          <p style={ui.muted}>
            Cria uma conta Talaza ou entra na tua conta para conversar,
            enviar imagens e gravar mensagens de áudio.
          </p>
          <Link
            href="/signup?next=%2Fmensagens"
            style={ui.primaryButton}
          >
            Criar conta ou entrar
          </Link>
          <p style={ui.small}>
            As conversas ficam disponíveis depois de iniciares sessão.
          </p>
        </section>
      </main>
    );
  }

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  return (
    <main style={ui.page}>
      <div style={ui.layout}>
        <aside style={ui.sidebar}>
          <header style={ui.sidebarHeader}>
            <Link href="/explore" style={ui.brand}>
              <span style={ui.logo}>T</span>
              Talaza
            </Link>
            <h1 style={ui.heading}>Mensagens</h1>
            <p style={ui.muted}>As tuas conversas num só lugar.</p>
          </header>

          {loading && <p style={ui.small}>A carregar conversas...</p>}

          {!loading && conversations.length === 0 && (
            <div style={ui.emptyList}>
              <span style={ui.emptyIcon}>✉</span>
              <strong>Ainda não tens conversas</strong>
              <p style={ui.small}>
                Abre um perfil e escolhe a opção de enviar mensagem para começar.
              </p>
            </div>
          )}

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              style={{
                ...ui.conversation,
                ...(selectedId === conversation.id ? ui.selected : {}),
              }}
            >
              <span style={ui.avatar}>T</span>
              <span style={ui.conversationText}>
                <strong>Conversa Talaza</strong>
                <small>{conversation.lastMessage}</small>
              </span>
              {conversation.unread > 0 && (
                <span style={ui.badge}>{conversation.unread}</span>
              )}
            </button>
          ))}
        </aside>

        <section style={ui.chat}>
          {!selectedId ? (
            <div style={ui.welcome}>
              <div style={ui.accountIcon}>✉</div>
              <h2>Escolhe uma conversa</h2>
              <p style={ui.muted}>
                Quando abrires um perfil e enviares uma mensagem,
                a conversa aparecerá aqui.
              </p>
            </div>
          ) : (
            <>
              <header style={ui.chatHeader}>
                <span style={ui.avatar}>T</span>
                <div>
                  <strong>Conversa Talaza</strong>
                  <small style={ui.small}>Mensagens privadas</small>
                </div>
              </header>

              <div style={ui.messageList}>
                {messages.map((message) => {
                  const mine = message.sender_id === user.id;

                  return (
                    <div
                      key={message.id}
                      style={{
                        ...ui.messageRow,
                        justifyContent: mine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          ...ui.bubble,
                          ...(mine ? ui.myBubble : ui.theirBubble),
                        }}
                      >
                        {message.content && <p>{message.content}</p>}

                        {message.message_type === 'image' &&
                          message.displayMediaUrl && (
                            <a
                              href={message.displayMediaUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={message.displayMediaUrl}
                                alt="Imagem enviada"
                                style={ui.image}
                              />
                            </a>
                          )}

                        {message.message_type === 'audio' &&
                          message.displayMediaUrl && (
                            <audio
                              controls
                              src={message.displayMediaUrl}
                              style={{ maxWidth: '100%' }}
                            />
                          )}

                        {message.message_type === 'file' && (
                          <span>📎 {message.media_name || 'Ficheiro'}</span>
                        )}

                        <small style={ui.time}>
                          {new Date(message.created_at).toLocaleTimeString(
                            'pt-PT',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </small>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {error && <div style={ui.error}>{error}</div>}

              <form onSubmit={sendMessage} style={ui.composer}>
                <label htmlFor="message-file" style={ui.attachButton} title="Anexar imagem">
                  ＋
                </label>
                <input
                  id="message-file"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                />

                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Escreve uma mensagem..."
                  style={ui.textInput}
                  aria-label="Escrever mensagem"
                />

                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  style={{
                    ...ui.audioButton,
                    background: recording ? '#B93845' : '#F1ECFA',
                    color: recording ? '#FFFFFF' : '#7252B8',
                  }}
                  title={recording ? 'Parar gravação' : 'Gravar áudio'}
                >
                  {recording ? '■' : '🎙'}
                </button>

                <button
                  type="submit"
                  disabled={sending || (!text.trim() && !file)}
                  style={ui.sendButton}
                  aria-label="Enviar mensagem"
                >
                  {sending ? '…' : '➤'}
                </button>

                {file && (
                  <span style={ui.fileLabel}>
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      style={ui.removeFile}
                      aria-label="Remover anexo"
                    >
                      ×
                    </button>
                  </span>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const ui = {
  page: {
    minHeight: '100vh',
    background: '#F8F6F3',
    color: '#17211F',
    padding: 16,
    boxSizing: 'border-box',
  },
  layout: {
    maxWidth: 1200,
    minHeight: 'calc(100vh - 32px)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(230px, 310px) minmax(0, 1fr)',
    border: '1px solid #E5E9E7',
    borderRadius: 18,
    overflow: 'hidden',
    background: '#FFFFFF',
  },
  sidebar: {
    borderRight: '1px solid #E5E9E7',
    background: '#FFFFFF',
    padding: 18,
    minWidth: 0,
  },
  sidebarHeader: { marginBottom: 22 },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    color: '#083F35',
    textDecoration: 'none',
    fontWeight: 900,
  },
  logo: {
    width: 33,
    height: 33,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 10,
    background: '#083F35',
    color: '#DDA10A',
  },
  heading: { color: '#083F35', fontSize: 24, margin: '20px 0 5px' },
  muted: { color: '#596560', fontSize: 13, lineHeight: 1.6 },
  small: { display: 'block', color: '#89948F', fontSize: 11, lineHeight: 1.5 },
  conversation: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    padding: 11,
    marginBottom: 6,
    border: '1px solid transparent',
    borderRadius: 12,
    background: '#FFFFFF',
    cursor: 'pointer',
  },
  selected: { background: '#E8F3F0', borderColor: '#CFE3DC' },
  avatar: {
    flex: '0 0 40px',
    width: 40,
    height: 40,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 14,
    background: '#F1ECFA',
    color: '#7252B8',
    fontWeight: 900,
  },
  conversationText: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: '#17211F',
    fontSize: 12,
  },
  badge: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 22,
    height: 22,
    padding: '0 5px',
    borderRadius: 20,
    background: '#B93845',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
  },
  emptyList: { textAlign: 'center', padding: '25px 8px' },
  emptyIcon: { display: 'block', color: '#7252B8', fontSize: 30, marginBottom: 12 },
  chat: { minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 600 },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: 16,
    borderBottom: '1px solid #E5E9E7',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: 18,
    background: '#F8F6F3',
  },
  messageRow: { display: 'flex', marginBottom: 12 },
  bubble: {
    maxWidth: '80%',
    padding: '10px 12px',
    borderRadius: 14,
    fontSize: 13,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
  },
  myBubble: {
    background: '#E8F3F0',
    color: '#083F35',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    background: '#FFFFFF',
    color: '#17211F',
    border: '1px solid #E5E9E7',
    borderBottomLeftRadius: 4,
  },
  time: { display: 'block', textAlign: 'right', color: '#89948F', fontSize: 9, marginTop: 5 },
  image: { display: 'block', maxWidth: 240, maxHeight: 280, borderRadius: 9 },
  composer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderTop: '1px solid #E5E9E7',
    background: '#FFFFFF',
  },
  attachButton: {
    display: 'grid',
    placeItems: 'center',
    width: 38,
    height: 38,
    borderRadius: 12,
    background: '#FBF1D7',
    color: '#7252B8',
    fontSize: 25,
    cursor: 'pointer',
  },
  textInput: {
    flex: 1,
    minWidth: 90,
    border: '1px solid #E5E9E7',
    borderRadius: 22,
    padding: '12px 15px',
    outlineColor: '#7252B8',
    font: 'inherit',
  },
  audioButton: {
    width: 40,
    height: 40,
    border: 0,
    borderRadius: 13,
    cursor: 'pointer',
    fontSize: 17,
  },
  sendButton: {
    width: 40,
    height: 40,
    border: 0,
    borderRadius: 13,
    background: '#0F6E5C',
    color: '#FFFFFF',
    fontSize: 19,
    cursor: 'pointer',
  },
  fileLabel: {
    flexBasis: '100%',
    fontSize: 11,
    color: '#7252B8',
    overflowWrap: 'anywhere',
  },
  removeFile: {
    marginLeft: 8,
    border: 0,
    background: 'transparent',
    color: '#B93845',
    cursor: 'pointer',
  },
  error: { padding: 10, background: '#FBEAEC', color: '#B93845', fontSize: 12 },
  welcome: {
    margin: 'auto',
    padding: 25,
    maxWidth: 360,
    textAlign: 'center',
  },
  accountCard: {
    maxWidth: 440,
    margin: '10vh auto',
    padding: 30,
    textAlign: 'center',
    borderRadius: 20,
    border: '1px solid #E5E9E7',
    background: '#FFFFFF',
  },
  accountIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 58,
    height: 58,
    margin: '0 auto',
    borderRadius: 18,
    background: '#F1ECFA',
    color: '#7252B8',
    fontSize: 29,
  },
  primaryButton: {
    display: 'inline-block',
    margin: '15px 0',
    padding: '13px 18px',
    borderRadius: 12,
    background: '#0F6E5C',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: 13,
  },
};
