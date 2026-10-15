
import '../styles/globals.css';
import { useRouter } from 'next/router';
import MessageDock from '../components/MessageDock';

const DOCK_ROUTES = [
  '/explore',
  '/category',
  '/subcategory',
  '/businesses',
  '/mensagens',
];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  const isVitrineArea = DOCK_ROUTES.some(
    (route) =>
      router.pathname === route ||
      router.pathname.startsWith(`${route}/`)
  );

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
