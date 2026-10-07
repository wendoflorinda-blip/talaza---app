import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#0F6E5C',
  brandDark: '#083F35',
  brandDeep: '#062F29',
  brandSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  ink: '#17211F',
  inkSoft: '#596560',
  inkFaint: '#89948F',
  white: '#FFFFFF',
  line: '#E5E9E7',
  canvas: '#F8F7F3',
};

function MenuIcon({ type, color = 'currentColor' }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const icons = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="10.5" x2="12" y2="16" />
        <circle cx="12" cy="7.5" r=".7" fill={color} stroke="none" />
      </>
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.7" />
      </>
    ),

    seller: (
      <>
        <path d="M4 20h16" />
        <path d="M6 20V9l6-5 6 5v11" />
        <path d="M9 20v-5h6v5" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </>
    ),

    support: (
      <>
        <path d="M4 12a8 8 0 0 1 16 0" />
        <path d="M4 12v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z" />
        <path d="M20 12v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
        <path d="M15 20h-3" />
      </>
    ),

    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),

    arrow: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),

    back: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </>
    ),

    close: (
      <>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {icons[type]}
    </svg>
  );
}

export default function TalazaMenu({
  country,
  province,
  countryName,
  provinceName,
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('menu');

  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!open) return;

    loadUser();
  }, [open]);

  useEffect(() => {
    if (!open || screen !== 'provinces') return;

    loadProvinces();
  }, [open, screen, country, province]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setUserName('');
      return;
    }

    setUserId(user.id);

    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    setUserName(
      data?.name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        ''
    );
  }

  async function loadProvinces() {
    if (!country || !province) return;

    setLoadingProvinces(true);

    const { data, error } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('country_id', country)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar províncias:', error);
      setProvinces([]);
      setLoadingProvinces(false);
      return;
    }

    const otherProvinces = (data || []).filter(
      (item) => String(item.id) !== String(province)
    );

    setProvinces(otherProvinces);
    setLoadingProvinces(false);
  }

  function closeMenu() {
    setOpen(false);
    setScreen('menu');
  }

  function goHome() {
    closeMenu();

    router.push({
      pathname: '/explore',
      query: {
        country,
        province,
      },
    });
  }

  function chooseProvince(nextProvince) {
    closeMenu();

    router.push({
      pathname: '/explore',
      query: {
        country,
        province: nextProvince,
      },
    });
  }

  function goSellerProfile() {
    closeMenu();

    router.push('/seller');
  }

  async function logout() {
    await supabase.auth.signOut();

    closeMenu();

    router.push({
      pathname: '/login',
      query: {
        redirect: `/explore?country=${country}&province=${province}`,
      },
    });
  }

  async function sendSupportMessage() {
    const message = supportMessage.trim();

    if (!message) {
      return;
    }

    if (!userId) {
      router.push({
        pathname: '/login',
        query: {
          redirect: `/explore?country=${country}&province=${province}`,
        },
      });
      return;
    }

    setSendingSupport(true);
    setSupportSent(false);

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: null,
        message_type: 'support',
        content: message,
        is_read: false,
      });

    if (error) {
      console.error(
        'Erro ao enviar mensagem para o suporte Talaza:',
        error
      );

      setSendingSupport(false);
      return;
    }

    setSupportMessage('');
    setSupportSent(true);
    setSendingSupport(false);
  }

  function renderHeader(title, subtitle) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <button
          type="button"
          onClick={() => setScreen('menu')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            border: `1px solid ${COLORS.line}`,
            background: COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: COLORS.ink,
          }}
          aria-label="Voltar"
        >
          <MenuIcon type="back" />
        </button>

        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: COLORS.ink,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                marginTop: 3,
                fontSize: 11.5,
                color: COLORS.inkFaint,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setScreen('menu');
        }}
        aria-label="Abrir menu"
        style={{
          width: 40,
          height: 40,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          background: COLORS.white,
          color: COLORS.brandDark,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          boxShadow: '0 5px 16px rgba(15,70,60,.06)',
        }}
      >
        <span
          style={{
            display: 'block',
            lineHeight: 1,
            transform: 'translateY(-1px)',
          }}
        >
          ☰
        </span>
      </button>

      {open && (
        <>
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4,25,21,.42)',
              zIndex: 9998,
              backdropFilter: 'blur(2px)',
            }}
          />

          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(340px, 88vw)',
              background: COLORS.white,
              zIndex: 9999,
              boxShadow: '-16px 0 45px rgba(4,35,29,.18)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* CABEÇALHO DO MENU */}
            <div
              style={{
                padding: '26px 22px 24px',
                background: `linear-gradient(145deg, ${COLORS.brandDark}, ${COLORS.brand})`,
                color: COLORS.white,
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.18)',
                  background: 'rgba(255,255,255,.08)',
                  color: COLORS.white,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MenuIcon type="close" color="#FFFFFF" />
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  paddingRight: 42,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 15,
                    background: 'rgba(255,255,255,.12)',
                    border: '1px solid rgba(255,255,255,.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.gold,
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  T
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    Talaza
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,.72)',
                    }}
                  >
                    {userName
                      ? `Olá, ${userName}`
                      : 'Tudo o que você procura, num só lugar'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 11px',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,.09)',
                  border: '1px solid rgba(255,255,255,.12)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,.88)',
                }}
              >
                <MenuIcon type="location" color={COLORS.gold} />
                {countryName || 'País'} · {provinceName || 'Província'}
              </div>
            </div>

            <div style={{ padding: 18 }}>
              {screen === 'menu' && (
                <>
                  <button
                    type="button"
                    onClick={goHome}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: COLORS.brandSoft,
                      color: COLORS.brandDark,
                      borderRadius: 14,
                      padding: '13px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    <MenuIcon type="home" color={COLORS.brand} />
                    <span style={{ flex: 1 }}>Home</span>
                    <MenuIcon
                      type="arrow"
                      color={COLORS.brand}
                    />
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: COLORS.line,
                      margin: '16px 4px',
                    }}
                  />

                  <MenuButton
                    icon="info"
                    title="Informações"
                    subtitle="Saiba mais sobre o Talaza"
                    onClick={() => setScreen('information')}
                  />

                  <MenuButton
                    icon="location"
                    title="Províncias"
                    subtitle="Mudar a região da sua vitrine"
                    onClick={() => setScreen('provinces')}
                  />

                  <MenuButton
                    icon="seller"
                    title="Voltar ao perfil de vendedor"
                    subtitle="Aceder à sua área de vendedor"
                    onClick={goSellerProfile}
                  />

                  <div
                    style={{
                      height: 1,
                      background: COLORS.line,
                      margin: '16px 4px',
                    }}
                  />

                  <MenuButton
                    icon="support"
                    title="Suporte Talaza"
                    subtitle="Queixas, opiniões e sugestões"
                    onClick={() => {
                      setSupportSent(false);
                      setScreen('support');
                    }}
                  />

                  <MenuButton
                    icon="logout"
                    title="Terminar sessão"
                    subtitle="Sair da sua conta Talaza"
                    onClick={logout}
                    danger
                  />
                </>
              )}

              {screen === 'information' && (
                <>
                  {renderHeader(
                    'Informações',
                    'Tudo o que precisa saber sobre o Talaza'
                  )}

                  <div
                    style={{
                      borderRadius: 18,
                      padding: 18,
                      background: COLORS.canvas,
                      border: `1px solid ${COLORS.line}`,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: COLORS.goldSoft,
                        color: COLORS.gold,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                      }}
                    >
                      <MenuIcon
                        type="info"
                        color={COLORS.goldDark || COLORS.gold}
                      />
                    </div>

                    <h3
                      style={{
                        margin: '0 0 8px',
                        fontSize: 16,
                        color: COLORS.ink,
                      }}
                    >
                      Bem-vindo ao Talaza
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        lineHeight: 1.65,
                        color: COLORS.inkSoft,
                      }}
                    >
                      Aqui vamos disponibilizar as principais
                      informações que os utilizadores precisam
                      saber sobre o Talaza, a utilização da
                      plataforma, segurança, anúncios, pagamentos,
                      oportunidades e outras áreas importantes.
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 15,
                      borderRadius: 15,
                      background: COLORS.brandSoft,
                      color: COLORS.brandDark,
                      fontSize: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    Esta área ficará completa à medida que
                    adicionarmos as informações oficiais do Talaza.
                  </div>
                </>
              )}

              {screen === 'provinces' && (
                <>
                  {renderHeader(
                    'Escolher província',
                    'A sua província atual não aparece na lista'
                  )}

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: COLORS.brandSoft,
                      color: COLORS.brandDark,
                      fontSize: 12,
                      lineHeight: 1.5,
                      marginBottom: 13,
                    }}
                  >
                    Está a visualizar:{' '}
                    <strong>{provinceName}</strong>
                  </div>

                  {loadingProvinces && (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        color: COLORS.inkFaint,
                        fontSize: 12.5,
                      }}
                    >
                      A carregar províncias…
                    </div>
                  )}

                  {!loadingProvinces &&
                    provinces.length === 0 && (
                      <div
                        style={{
                          padding: 20,
                          borderRadius: 15,
                          background: COLORS.canvas,
                          border: `1px solid ${COLORS.line}`,
                          color: COLORS.inkSoft,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          textAlign: 'center',
                        }}
                      >
                        Não existem outras províncias
                        disponíveis neste país.
                      </div>
                    )}

                  {!loadingProvinces &&
                    provinces.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          chooseProvince(item.id)
                        }
                        style={{
                          width: '100%',
                          border: `1px solid ${COLORS.line}`,
                          background: COLORS.white,
                          borderRadius: 14,
                          padding: '13px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                          cursor: 'pointer',
                          marginBottom: 8,
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: COLORS.brandSoft,
                            color: COLORS.brand,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <MenuIcon
                            type="location"
                            color={COLORS.brand}
                          />
                        </div>

                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 750,
                            color: COLORS.ink,
                          }}
                        >
                          {item.name}
                        </span>

                        <MenuIcon
                          type="arrow"
                          color={COLORS.inkFaint}
                        />
                      </button>
                    ))}
                </>
              )}

              {screen === 'support' && (
                <>
                  {renderHeader(
                    'Suporte Talaza',
                    'Estamos aqui para ouvir você'
                  )}

                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: COLORS.goldSoft,
                      color: COLORS.goldDark,
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      marginBottom: 16,
                    }}
                  >
                    Tem uma queixa, encontrou um problema,
                    tem uma opinião ou quer deixar uma sugestão?
                    Escreva abaixo. A sua mensagem será enviada
                    para a equipa de administração do Talaza.
                  </div>

                  <textarea
                    value={supportMessage}
                    onChange={(e) =>
                      setSupportMessage(e.target.value)
                    }
                    placeholder="Escreva aqui a sua mensagem…"
                    rows={7}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 15,
                      padding: 14,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: COLORS.ink,
                      background: COLORS.white,
                      outline: 'none',
                    }}
                  />

                  <button
                    type="button"
                    disabled={
                      sendingSupport ||
                      !supportMessage.trim()
                    }
                    onClick={sendSupportMessage}
                    style={{
                      width: '100%',
                      marginTop: 11,
                      border: 'none',
                      borderRadius: 14,
                      padding: '13px 16px',
                      background:
                        sendingSupport ||
                        !supportMessage.trim()
                          ? '#D9DEDC'
                          : `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brandDark})`,
                      color: COLORS.white,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor:
                        sendingSupport ||
                        !supportMessage.trim()
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {sendingSupport
                      ? 'A enviar…'
                      : 'Enviar mensagem'}
                  </button>

                  {supportSent && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 13,
                        background: COLORS.brandSoft,
                        color: COLORS.brandDark,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Mensagem enviada com sucesso. Obrigado
                      por ajudar a melhorar o Talaza.
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function MenuButton({
  icon,
  title,
  subtitle,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: '12px 7px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 13,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: danger ? '#FFF1F0' : '#F4F7F5',
          color: danger ? '#C0392B' : '#0F6E5C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MenuIcon
          type={icon}
          color={danger ? '#C0392B' : '#0F6E5C'}
        />
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: danger ? '#A52A22' : '#17211F',
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 10.8,
            color: '#89948F',
          }}
        >
          {subtitle}
        </div>
      </div>

      <MenuIcon type="arrow" color="#A3ADA9" />
    </button>
  );
}
