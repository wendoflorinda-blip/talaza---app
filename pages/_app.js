import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MessageDock from '../components/MessageDock';

const DOCK_ROUTES = [
  '/explore',
  '/category',
  '/subcategory',
  '/eventos',
  '/perfil',
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

  const showDockOnPage = showDock && router.pathname !== '/mensagens';

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('TALAZA: não foi possível registar o modo offline.', error);
        }
      });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
      return () => window.removeEventListener('load', registerServiceWorker);
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#075B4E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Talaza" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/talaza-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/talaza-192.png" />
      </Head>
      <Component {...pageProps} />
      {showDockOnPage && <MessageDock />}
    </>
  );
}
