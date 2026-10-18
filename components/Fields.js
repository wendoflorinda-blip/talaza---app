import { useState } from 'react';

const C = { green: '#0F6E5C', ink: '#17211F', muted: '#596560', white: '#FFFFFF', line: '#E5E9E7', red: '#B93845', soft: '#E8F4F0' };

export const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 13px',
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: C.white,
  color: C.ink,
  fontSize: 15,
  outlineColor: C.green,
};

export function Card({ children }) {
  return <section style={{ padding: 22, border: `1px solid ${C.line}`, borderRadius: 20, background: C.white, boxShadow: '0 18px 50px rgba(0,70,60,.06)' }}>{children}</section>;
}

export function Field({ id, label, required, children }) {
  return <div style={{ marginTop: 18 }}>
    <label htmlFor={id} style={{ display: 'block', marginBottom: 7, color: C.ink, fontSize: 13, fontWeight: 800 }}>{label}{required ? ' *' : ''}</label>
    {children}
  </div>;
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return <div role="alert" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#FCEBED', color: C.red, fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{children}</div>;
}

export function PrimaryButton({ children, type = 'button', loading = false, disabled = false }) {
  return <button type={type} disabled={disabled || loading} style={{ width: '100%', marginTop: 20, padding: 15, border: 0, borderRadius: 12, background: C.green, color: C.white, fontWeight: 900, fontSize: 15, cursor: disabled || loading ? 'wait' : 'pointer', opacity: disabled || loading ? 0.7 : 1 }}>{children}</button>;
}

export function PasswordField({ id, value, onChange, placeholder = 'Palavra-passe' }) {
  const [visible, setVisible] = useState(false);
  return <div style={{ position: 'relative' }}>
    <input id={id} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingRight: 82 }} />
    <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: C.green, fontWeight: 800, cursor: 'pointer' }}>{visible ? 'Ocultar' : 'Mostrar'}</button>
  </div>;
}

export function ImagePicker({ id, preview, onFile, caption = 'Adicionar imagem', icon = '📷', shape = 'circle' }) {
  const isRect = shape === 'rect';
  return <div style={{ marginTop: 18 }}>
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: isRect ? 150 : 125, padding: 14, border: `1px dashed ${C.line}`, borderRadius: isRect ? 16 : 18, cursor: 'pointer', background: '#FAFCFB', textAlign: 'center' }}>
      {preview ? <img src={preview} alt="Pré-visualização" style={{ width: isRect ? '100%' : 82, height: isRect ? 130 : 82, objectFit: 'cover', borderRadius: isRect ? 12 : '50%' }} /> : <span style={{ fontSize: 30 }}>{icon}</span>}
      <span style={{ color: C.muted, fontSize: 13 }}>{caption}</span>
    </label>
    <input id={id} type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); }} style={{ display: 'none' }} />
  </div>;
}

export function CountrySelect({ id = 'country', countries = [], value = '', onChange }) {
  return <select id={id} value={value} onChange={e => onChange?.(e.target.value)} style={inputStyle}>
    <option value="">Escolher país</option>
    {(Array.isArray(countries) ? countries : []).map(country => <option key={country.id} value={country.id}>{country.name}</option>)}
  </select>;
}

export function PhoneField({ id, countryName, value = '', onChange, placeholder = '923 456 789' }) {
  const prefixes = { angola: '+244', brazil: '+55', brasil: '+55', portugal: '+351', mozambique: '+258', 'moçambique': '+258' };
  const prefix = prefixes[String(countryName || '').trim().toLowerCase()] || '';
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {prefix && <span style={{ flex: 'none', padding: '14px 10px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#F7F9F8', color: C.ink, fontWeight: 700 }}>{prefix}</span>}
    <input id={id} type="tel" inputMode="tel" autoComplete="tel" value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={inputStyle} />
  </div>;
}

export function Progress({ current = 1, total = 1, label = '' }) {
  const percent = Math.max(0, Math.min(100, (Number(current) / Math.max(1, Number(total))) * 100));
  return <div style={{ margin: '18px 0', padding: 16, borderRadius: 14, background: C.white, border: `1px solid ${C.line}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 9, color: C.muted, fontSize: 13 }}><strong style={{ color: C.ink }}>Etapa {current} de {total}</strong><span>{label}</span></div>
    <div style={{ height: 6, borderRadius: 999, background: '#E9EFEC', overflow: 'hidden' }}><div style={{ height: '100%', width: `${percent}%`, background: C.green, borderRadius: 999 }} /></div>
  </div>;
}
