import { useState } from 'react';

const C = { green: '#0F6E5C', ink: '#17211F', muted: '#596560', white: '#FFFFFF', line: '#E5E9E7', red: '#B93845' };

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
    <input id={id} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 82px 14px 13px', border: `1px solid ${C.line}`, borderRadius: 12, background: C.white, fontSize: 15, outlineColor: C.green }} />
    <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: C.green, fontWeight: 800, cursor: 'pointer' }}>{visible ? 'Ocultar' : 'Mostrar'}</button>
  </div>;
}
