import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  brand: '#0F6E5C',
  brandDark: '#083F35',
  brandSoft: '#E8F3F0',
  gold: '#DDA10A',
  goldSoft: '#FBF1D7',
  purple: '#7252B8',
  purpleSoft: '#F1ECFA',
  ink: '#17211F',
  inkSoft: '#596560',
  inkFaint: '#89948F',
  canvas: '#F8F6F3',
  surface: '#FFFFFF',
  line: '#E5E9E7',
};

function Icon({ type, color = COLORS.ink, size = 19 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    home: (
      <>
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9 21v-6h6v6" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="10.5" x2="12" y2="16" />
        <circle cx="12" cy="7.2" r=".7" fill={color} stroke="none" />
      </>
    ),

    pin: (
      <>
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),

    seller: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),

    support: (
      <>
        <path d="M12 19c-4 0-7-3-7-7a7 7 0 0 1 14 0" />
        <rect x="3" y="12" width="4" height="6" rx="1.5" />
        <rect x="17" y="12" width="4" height="6" rx="1.5" />
      </>
    ),

    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),

    close: (
      <>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </>
    ),

    arrowLeft: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </>
    ),

    arrowRight: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
  };

  return <svg {...common}>{paths[type]}</svg>;
}

function MenuItem({
  icon,
  color,
  bg,
  label,
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
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 10px',
          borderRadius: 14,
          transition: 'background .15s ease',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 12,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            type={icon}
            color={color}
            size={18}
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            color: danger ? '#B14D4D' : COLORS.ink,
            fontSize: 13,
            fontWeight: 750,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: danger ? '#B14D4D' : COLORS.inkFaint,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ›
        </div>
      </div>
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: COLORS.line,
        margin: '8px 4px',
      }}
    />
  );
}

function SubScreen({
  title,
  onBack,
  children,
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          style={{
            width: 36,
            height: 36,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 11,
            background: COLORS.surface,
            color: COLORS.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon
            type="arrowLeft"
            color={COLORS.ink}
            size={17}
          />
        </button>

        <h2
          style={{
            margin: 0,
            color: COLORS.brandDark,
            fontSize: 18,
            fontWeight: 850,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 15,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          color: COLORS.brandDark,
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 5,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: COLORS.inkSoft,
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TalazaMenu({
  country,
  province,
  countryName = '',
  provinceName = '',
  sellerPanelRoute = '',
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('menu');
  const [provinces, setProvinces] = useState([]);
  const [userName, setUserName] = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [message, setMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);

  useEffect(() => {
    if (!open) return;

    loadUser();
    loadProvinces();
  }, [open, country, province]);

  async function loadUser() {
    try {
      const { data } = await supabase.auth.getUser();

      const user = data?.user;

      if (!user) {
        setUserName('');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      setUserName(
        profile?.name ||
          user.email ||
          'Utilizador'
      );
    } catch (error) {
      console.error(
        'Erro ao carregar utilizador:',
        error
      );

      setUserName('');
    }
  }

  async function loadProvinces() {
    if (!country) {
      setProvinces([]);
      return;
    }

    setLoadingProvinces(true);

    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('country_id', country)
        .order('name', {
          ascending: true,
        });

      if (error) {
        console.error(
          'Erro ao carregar províncias:',
          error
        );

        setProvinces([]);
        return;
      }

      const filtered =
        (data || []).filter(
          (item) =>
            String(item.id) !==
            String(province)
        );

      setProvinces(filtered);
    } catch (error) {
      console.error(
        'Erro ao carregar províncias:',
        error
      );

      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  }

  function closeMenu() {
    setOpen(false);
    setScreen('menu');
    setMessage('');
    setSupportSent(false);
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

  function chooseProvince(item) {
    closeMenu();

    router.push({
      pathname: '/explore',
      query: {
        country: country,
        province: item.id,
      },
    });
  }

  function openSellerPanel() {
    closeMenu();

    if (sellerPanelRoute) {
      router.push(sellerPanelRoute);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push('/login');
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        'Erro ao terminar sessão:',
        error
      );
    }

    closeMenu();

    router.push({
      pathname: '/explore',
      query: {
        country,
        province,
      },
    });
  }

  function submitSupport() {
    const text = message.trim();

    if (!text) return;

    /*
     * O suporte ainda não é ligado à tabela messages
     * porque a estrutura de suporte/admin ainda não
     * foi definida.
     *
     * Por enquanto apenas confirmamos a ação na interface.
     */
    setSupportSent(true);
    setMessage('');
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu Talaza"
        onClick={() => {
          setOpen(true);
          setScreen('menu');
        }}
        style={{
          width: 40,
          height: 40,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 12,
          background: COLORS.surface,
          color: COLORS.brandDark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          boxShadow:
            '0 4px 12px rgba(8,63,53,.05)',
        }}
      >
        <span
          style={{
            width: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              width: 16,
              height: 1.8,
              background: 'currentColor',
              borderRadius: 9,
            }}
          />

          <span
            style={{
              width: 16,
              height: 1.8,
              background: 'currentColor',
              borderRadius: 9,
            }}
          />

          <span
            style={{
              width: 11,
              height: 1.8,
              background: 'currentColor',
              borderRadius: 9,
            }}
          />
        </span>
      </button>

      {open && (
        <>
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background:
                'rgba(5, 22, 18, .38)',
              backdropFilter: 'blur(2px)',
            }}
          />

          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              width: 'min(390px, 92vw)',
              background: COLORS.canvas,
              boxShadow:
                '-12px 0 40px rgba(0,0,0,.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: COLORS.brandDark,
                color: '#FFFFFF',
                padding: '18px 16px 15px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: COLORS.gold,
                      color: COLORS.brandDark,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 19,
                      flexShrink: 0,
                    }}
                  >
                    T
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                      }}
                    >
                      Talaza
                    </div>

                    <div
                      style={{
                        fontSize: 10.5,
                        opacity: 0.72,
                        marginTop: 2,
                      }}
                    >
                      {userName ||
                        'Tudo num só lugar'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Fechar menu"
                  style={{
                    width: 34,
                    height: 34,
                    border:
                      '1px solid rgba(255,255,255,.18)',
                    borderRadius: 10,
                    background:
                      'rgba(255,255,255,.08)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    type="close"
                    color="#FFFFFF"
                    size={17}
                  />
                </button>
              </div>

              {(countryName ||
                provinceName) && (
                <div
                  style={{
                    marginTop: 15,
                    fontSize: 11,
                    color:
                      'rgba(255,255,255,.78)',
                  }}
                >
                  {countryName}

                  {countryName &&
                  provinceName
                    ? ' · '
                    : ''}

                  {provinceName}
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 14,
                background: COLORS.canvas,
              }}
            >
              {screen === 'menu' && (
                <>
                  <MenuItem
                    icon="home"
                    color={COLORS.brand}
                    bg={COLORS.brandSoft}
                    label="Home"
                    onClick={goHome}
                  />

                  <MenuItem
                    icon="info"
                    color={COLORS.brand}
                    bg={COLORS.brandSoft}
                    label="Informações"
                    onClick={() =>
                      setScreen('info')
                    }
                  />

                  <MenuItem
                    icon="pin"
                    color={COLORS.gold}
                    bg={COLORS.goldSoft}
                    label="Províncias"
                    onClick={() =>
                      setScreen('provinces')
                    }
                  />

                  <Divider />

                  <MenuItem
                    icon="seller"
                    color={COLORS.purple}
                    bg={COLORS.purpleSoft}
                    label="Voltar ao painel de vendedor"
                    onClick={
                      openSellerPanel
                    }
                  />

                  <Divider />

                  <MenuItem
                    icon="support"
                    color={COLORS.brand}
                    bg={COLORS.brandSoft}
                    label="Suporte Talaza"
                    onClick={() =>
                      setScreen('support')
                    }
                  />

                  <MenuItem
                    icon="logout"
                    color="#B14D4D"
                    bg="#FBEAEA"
                    label="Terminar sessão"
                    danger
                    onClick={logout}
                  />
                </>
              )}

              {screen === 'info' && (
                <SubScreen
                  title="Informações"
                  onBack={() =>
                    setScreen('menu')
                  }
                >
                  <InfoBlock title="Sobre a Talaza">
                    A Talaza reúne negócios,
                    produtos, serviços,
                    oportunidades, comunidade
                    e outros conteúdos
                    organizados por localização.
                  </InfoBlock>

                  <InfoBlock title="Privacidade">
                    Os dados apresentados na
                    plataforma devem ser utilizados
                    de acordo com as regras e
                    políticas da Talaza.
                  </InfoBlock>
                </SubScreen>
              )}

              {screen === 'provinces' && (
                <SubScreen
                  title="Escolher província"
                  onBack={() =>
                    setScreen('menu')
                  }
                >
                  <div
                    style={{
                      marginBottom: 12,
                      color: COLORS.inkSoft,
                      fontSize: 11.5,
                      lineHeight: 1.5,
                    }}
                  >
                    A província atual não aparece
                    nesta lista.
                  </div>

                  {loadingProvinces && (
                    <div
                      style={{
                        background:
                          COLORS.surface,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 13,
                        padding: 14,
                        color:
                          COLORS.inkSoft,
                        fontSize: 12,
                      }}
                    >
                      A carregar províncias…
                    </div>
                  )}

                  {!loadingProvinces &&
                    provinces.length === 0 && (
                      <div
                        style={{
                          background:
                            COLORS.surface,
                          border: `1px solid ${COLORS.line}`,
                          borderRadius: 13,
                          padding: 14,
                          color:
                            COLORS.inkSoft,
                          fontSize: 12,
                        }}
                      >
                        Não existem outras
                        províncias disponíveis.
                      </div>
                    )}

                  {!loadingProvinces &&
                    provinces.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          chooseProvince(item)
                        }
                        style={{
                          width: '100%',
                          border: `1px solid ${COLORS.line}`,
                          background:
                            COLORS.surface,
                          borderRadius: 13,
                          padding:
                            '13px 14px',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'space-between',
                          color: COLORS.ink,
                          cursor: 'pointer',
                          fontWeight: 750,
                          fontSize: 12.5,
                          textAlign: 'left',
                        }}
                      >
                        <span>
                          {item.name}
                        </span>

                        <span
                          style={{
                            color:
                              COLORS.purple,
                            fontSize: 18,
                          }}
                        >
                          ›
                        </span>
                      </button>
                    ))}
                </SubScreen>
              )}

              {screen === 'support' && (
                <SubScreen
                  title="Suporte Talaza"
                  onBack={() =>
                    setScreen('menu')
                  }
                >
                  <InfoBlock title="Precisa de ajuda?">
                    Envie a sua dúvida,
                    sugestão, reclamação ou
                    opinião para a equipa Talaza.
                  </InfoBlock>

                  <textarea
                    value={message}
                    onChange={(event) => {
                      setMessage(
                        event.target.value
                      );
                      setSupportSent(false);
                    }}
                    placeholder="Escreva a sua mensagem…"
                    rows={6}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 13,
                      padding: 12,
                      outline: 'none',
                      background:
                        COLORS.surface,
                      color: COLORS.ink,
                      fontSize: 12.5,
                      fontFamily:
                        'inherit',
                    }}
                  />

                  <button
                    type="button"
                    onClick={submitSupport}
                    disabled={
                      !message.trim()
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 13,
                      marginTop: 10,
                      padding: '13px 14px',
                      background:
                        message.trim()
                          ? COLORS.brand
                          : '#BFC9C5',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 12.5,
                      cursor:
                        message.trim()
                          ? 'pointer'
                          : 'not-allowed',
                    }}
                  >
                    Enviar mensagem
                  </button>

                  {supportSent && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 12,
                        background:
                          COLORS.brandSoft,
                        color:
                          COLORS.brandDark,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      A sua mensagem foi
                      preparada. A ligação
                      definitiva ao suporte/admin
                      será feita quando a estrutura
                      de suporte estiver definida.
                    </div>
                  )}
                </SubScreen>
              )}
            </div>

            <div
              style={{
                padding:
                  '12px 16px 15px',
                borderTop:
                  `1px solid ${COLORS.line}`,
                background:
                  COLORS.surface,
              }}
            >
              <div
                style={{
                  color: COLORS.inkFaint,
                  fontSize: 10.5,
                  textAlign: 'center',
                }}
              >
                Talaza — Tudo num só lugar.
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
