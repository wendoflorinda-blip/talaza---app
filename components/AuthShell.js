import Link from 'next/link';

const C = { green: '#0F6E5C', dark: '#083F35', gold: '#DDA10A', ink: '#17211F', muted: '#596560', canvas: '#F8F6F3', white: '#FFFFFF', line: '#E5E9E7' };

export default function AuthShell({ children, backHref = '/login' }) {
  return (
    <main style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '24px 16px 48px', background: C.canvas, color: C.ink, fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <Link href={backHref} style={{ display: 'inline-block', color: C.green, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>← Voltar</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '28px 0 24px', color: C.green, fontWeight: 900, letterSpacing: '0.16em' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: C.dark, color: C.gold, fontSize: 24, letterSpacing: 0 }}>T</span>
          <span>TALAZA</span>
        </div>
        {children}
        <p style={{ marginTop: 24, color: C.muted, fontSize: 12, textAlign: 'center' }}>Talaza · Tudo o que você procura, num só lugar.</p>
      </div>
    </main>
  );
}
