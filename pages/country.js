import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const COUNTRY_DISPLAY = {
  angola: ['🇦🇴', '+244'], brasil: ['🇧🇷', '+55'], brazil: ['🇧🇷', '+55'],
  portugal: ['🇵🇹', '+351'], moçambique: ['🇲🇿', '+258'], mozambique: ['🇲🇿', '+258'],
  'cabo verde': ['🇨🇻', '+238'], 'guiné-bissau': ['🇬🇼', '+245'], 'são tomé e príncipe': ['🇸🇹', '+239'],
  'estados unidos': ['🇺🇸', '+1'], 'united states': ['🇺🇸', '+1'], canadá: ['🇨🇦', '+1'], canada: ['🇨🇦', '+1'],
  'reino unido': ['🇬🇧', '+44'], 'united kingdom': ['🇬🇧', '+44'], frança: ['🇫🇷', '+33'], france: ['🇫🇷', '+33'],
  espanha: ['🇪🇸', '+34'], spain: ['🇪🇸', '+34'], alemanha: ['🇩🇪', '+49'], germany: ['🇩🇪', '+49'],
  namíbia: ['🇳🇦', '+264'], namibia: ['🇳🇦', '+264'], 'áfrica do sul': ['🇿🇦', '+27'], 'south africa': ['🇿🇦', '+27'],
  zâmbia: ['🇿🇲', '+260'], zambia: ['🇿🇲', '+260'], zimbábue: ['🇿🇼', '+263'], zimbabwe: ['🇿🇼', '+263'],
  congo: ['🇨🇬', '+242'], 'república democrática do congo': ['🇨🇩', '+243'], nigeria: ['🇳🇬', '+234'], nigéria: ['🇳🇬', '+234'],
  quênia: ['🇰🇪', '+254'], kenya: ['🇰🇪', '+254'], tanzânia: ['🇹🇿', '+255'], tanzania: ['🇹🇿', '+255'],
  senegal: ['🇸🇳', '+221'], ghana: ['🇬🇭', '+233'], índia: ['🇮🇳', '+91'], india: ['🇮🇳', '+91'],
  china: ['🇨🇳', '+86'], japão: ['🇯🇵', '+81'], japan: ['🇯🇵', '+81'], austrália: ['🇦🇺', '+61'], australia: ['🇦🇺', '+61']
};
function countryInfo(name) {
  const key = String(name || '').trim().toLocaleLowerCase('pt-AO');
  const entry = COUNTRY_DISPLAY[key];
  return entry ? { flag: entry[0], dial: entry[1] } : { flag: '🌍', dial: '' };
}

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  gold: '#DDA10A',
};

export default function Country() {
  const router = useRouter();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unavailableCountry, setUnavailableCountry] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    async function loadCountries() {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('countries')
        .select('id, name')
        .order('name', { ascending: true });

      if (!active) return;

      if (queryError) {
        setError('Não foi possível carregar os países. Tente novamente.');
        setCountries([]);
        setLoading(false);
        return;
      }

      // Mostramos todos os países cadastrados, mas só permitimos entrar em Angola.
      setCountries(data || []);
      setLoading(false);
    }

    loadCountries();

    return () => {
      active = false;
    };
  }, [router.isReady]);

  function chooseCountry(country) {
    setUnavailableCountry('');
    const name = String(country.name || '').trim().toLocaleLowerCase('pt-AO');
    if (name !== 'angola') {
      setUnavailableCountry(country.name);
      return;
    }
    router.push({
      pathname: '/province',
      query: { country: country.id },
    });
  }

  return (
    <>
      <Head>
        <title>Escolher país | Talaza</title>
      </Head>

      <main className="page">
        <button className="back" onClick={() => router.push('/')}>
          ← Voltar
        </button>

        <div className="content">
          <div className="step">PASSO 1 DE 2</div>
          <h1>Em que país procura?</h1>
          <p className="intro">
            Escolha o país para ver os negócios e serviços disponíveis na sua
            região.
          </p>

          {loading && <p className="status">A carregar países…</p>}

          {!loading && error && (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => router.replace(router.asPath)}>
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && countries.length === 0 && (
            <p className="status">
              Angola ainda não está configurada na tabela de países. Confirme
              se existe um registo com o nome Angola.
            </p>
          )}

          <div className="countries">
            {countries.map((country) => {
              const info = countryInfo(country.name);
              const isAngola = String(country.name || '').trim().toLocaleLowerCase('pt-AO') === 'angola';
              return (
                <button
                  key={country.id}
                  className={`country ${isAngola ? 'countryAvailable' : 'countryUnavailable'}`}
                  onClick={() => chooseCountry(country)}
                  aria-label={isAngola ? `Entrar em ${country.name}` : `${country.name}, país indisponível`}
                >
                  <span className="flag">{info.flag}</span>
                  <span className="country-details">
                    <span className="country-name">{country.name}</span>
                    <span className="dial">{info.dial ? `Indicativo ${info.dial}` : 'Indicativo a configurar'}</span>
                  </span>
                  <span className="country-status">{isAngola ? 'Disponível' : 'Em breve'}</span>
                </button>
              );
            })}
          </div>

          {unavailableCountry && (
            <div className="unavailableNotice" role="alert">
              <strong>País indisponível para a sua localização</strong>
              <p>A Talaza ainda não está disponível em {unavailableCountry}. Por enquanto, só é possível entrar na área de Angola. Quando esse país for ativado, terá acesso apenas aos negócios da sua própria região.</p>
              <button onClick={() => setUnavailableCountry('')}>Entendi</button>
            </div>
          )}

          <p className="note">
            A seleção de país é isolada por região. Outros países serão liberados apenas quando a Talaza estiver preparada para operar neles.
          </p>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 25px 7%;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .back {
          border: 0;
          background: transparent;
          color: ${C.green};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .content {
          width: 100%;
          max-width: 620px;
          margin: 70px auto;
        }

        .step {
          color: ${C.green};
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 14px 0;
          color: ${C.dark};
          font-size: clamp(30px, 5vw, 42px);
          letter-spacing: -1px;
        }

        .intro {
          margin: 0 0 28px;
          color: ${C.muted};
          line-height: 1.7;
        }

        .countries {
          display: grid;
          gap: 12px;
        }

        .country {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px;
          border: 1px solid ${C.line};
          border-radius: 16px;
          background: ${C.white};
          text-align: left;
          cursor: pointer;
          transition: border-color .18s, transform .18s, box-shadow .18s;
        }
        .country:hover { border-color: ${C.green}; transform: translateY(-1px); box-shadow: 0 8px 22px rgba(8,63,53,.07); }
        .countryUnavailable { opacity: .86; }
        .country-details { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 5px; }
        .dial { color: ${C.muted}; font-size: 12px; }
        .country-status { color: ${C.green}; font-size: 11px; font-weight: 800; background: #EAF4F1; padding: 6px 8px; border-radius: 999px; white-space: nowrap; }
        .countryUnavailable .country-status { color: #765A9C; background: #F1ECFA; }
        .unavailableNotice { margin-top: 16px; padding: 16px; border: 1px solid #DCCBF0; border-radius: 14px; background: #F7F2FC; color: #4B2B70; line-height: 1.6; }
        .unavailableNotice p { margin: 7px 0 12px; font-size: 13px; }
        .unavailableNotice button { border: 0; border-radius: 9px; background: #5B2A86; color: white; padding: 9px 13px; font-weight: 800; cursor: pointer; }

        .flag {
          font-size: 30px;
        }

        .country-name {
          color: ${C.dark};
          font-size: 16px;
          font-weight: 800;
        }

        .arrow {
          color: ${C.green};
          font-size: 22px;
        }

        .status,
        .note {
          color: ${C.muted};
          line-height: 1.6;
          font-size: 14px;
        }

        .note {
          margin-top: 22px;
        }

        .error {
          padding: 15px;
          border: 1px solid #E8B9BE;
          border-radius: 12px;
          color: #9C2936;
          background: #FFF5F5;
        }

        .error button {
          border: 0;
          background: transparent;
          color: #9C2936;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px;
          }

          .content {
            margin: 55px auto;
          }
        }
      `}</style>
    </>
  );
}
