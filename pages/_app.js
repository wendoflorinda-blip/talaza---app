
import '../styles/globals.css';
import { useRouter } from 'next/router';
import MessageDock from '../components/MessageDock';

// O dock só aparece a partir da Vitrine.
// A página inicial de seleção do país não está incluída.
const DOCK_ROUTES = [
  '/explore',
  '/category',
  '/subcategory',
  '/businesses',
  '/mensagens',
];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  const isVitrineArea = DOCK_ROUTES.some((route) => {
    return (
      router.pathname === route ||
      router.pathname.startsWith(`${route}/`)
    );
  });

  // Uma página pode substituir o comportamento padrão:
  // showMessageDock = true ou showMessageDock = false.
  const showDock =
    typeof Component.showMessageDock === 'boolean'
      ? Component.showMessageDock
      : isVitrineArea;

  return (
    <>
      <Component {...pageProps} />

      {showDock && <MessageDock />}
    </>
  );
}
