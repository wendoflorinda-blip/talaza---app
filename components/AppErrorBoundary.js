import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Regista apenas o erro técnico na consola do navegador; não envia dados pessoais.
    console.error('Erro inesperado na interface TALAZA:', error, info?.componentStack || '');
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F8F6F3', color: '#17211F', fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ width: '100%', maxWidth: 480, padding: 24, border: '1px solid #E5E9E7', borderRadius: 18, background: '#FFFFFF', textAlign: 'center', boxSizing: 'border-box' }}>
          <h1 style={{ marginTop: 0, color: '#083F35' }}>A página encontrou um problema</h1>
          <p style={{ lineHeight: 1.6, color: '#596560' }}>A tua conta e os dados guardados não foram apagados. Podes tentar carregar novamente a página.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, padding: '12px 18px', background: '#0F6E5C', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}>Tentar novamente</button>
        </section>
      </main>
    );
  }
}
