import '../styles/globals.css';
import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('TALAZA: não foi possível registar o modo offline.', error);
        }
      });
    };

    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

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

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#075B4E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TALAZA" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/talaza-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/talaza-icon.svg" />
      </Head>
      <Component {...pageProps} />
      {showDockOnPage && <MessageDock />}
    </>
  );
}
