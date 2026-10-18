import { C, countryInfo } from '../lib/talaza';

export default function Unavailable({ country, onBack }) {
  const { flag } = countryInfo(country);

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 26, padding: '40px 24px', marginTop: 22, textAlign: 'center', boxShadow: '0 18px 50px rgba(0,70,60,.08)' }}>
      <div aria-hidden="true" style={{ width: 92, height: 92, borderRadius: '50%', background: C.gold, boxShadow: `0 0 0 10px ${C.goldSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, margin: '0 auto 28px' }}>🌍</div>
      <h1 style={{ margin: '0 0 12px', color: C.ink, fontSize: 28 }}>País indisponível</h1>
      <p style={{ margin: 0, color: C.muted, fontSize: 16, lineHeight: 1.6 }}>
        Este país ainda não está disponível no Talaza. Volte e escolha um país suportado.
      </p>
      {country && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, padding: '9px 16px', borderRadius: 999, background: C.soft, color: C.green, fontWeight: 800, fontSize: 14 }}><span aria-hidden="true">{flag}</span>{String(country).trim()}</div>}
      <button type="button" onClick={typeof onBack === 'function' ? onBack : () => { if (typeof window !== 'undefined') window.location.href = '/country'; }} style={{ display: 'block', width: '100%', marginTop: 28, padding: 16, border: 'none', borderRadius: 14, background: C.green, color: '#FFFFFF', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
        Voltar e corrigir
      </button>
    </div>
  );
}
