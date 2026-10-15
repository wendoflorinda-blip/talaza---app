import '../styles/globals.css';
import MessageDock from '../components/MessageDock';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <MessageDock />
    </>
  );
}
