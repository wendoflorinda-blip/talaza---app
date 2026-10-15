import '../styles/globals.css';
import { useRouter } from 'next/router';
import MessageDock from '../components/MessageDock';

// Rotas da vitrine onde a barra inferior (Notificações + Mensagens) aparece.
// Na entrada do projeto (início, país, província, login, cadastro) ela NÃO aparece.
// Se criar novas páginas da vitrine, acrescente a rota aqui.
const DOCK_ROUTES = ['/explore', '/category', '/subcategory', '/businesses'];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  const inVitrine = DOCK_ROUTES.some(
    (route) =>
      router.pathname === route ||
      router.pathname.startsWith(`${route}/`)
  );

  // Uma página pode forçar a barra (ou escondê-la) com:
  //   MinhaPagina.showMessageDock = true;   // ou false
  const showDock = Component.showMessageDock ?? inVitrine;

  return (
    <>
      <Component {...pageProps} />
      {showDock && <MessageDock />}
    </>
  );
}
