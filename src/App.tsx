import { useEffect } from 'react';
import Game from './Game';
import { OfflineGate } from './components/OfflineGate';
import { useOnline } from './hooks/useOnline';

export default function App() {
  const online = useOnline();

  /* Block the native cut / copy / paste action menu on long-press. */
  useEffect(() => {
    const block = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      e.preventDefault();
    };
    const blockSelect = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', blockSelect);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', blockSelect);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
    };
  }, []);

  return (
    <>
      <Game />
      {!online && <OfflineGate />}
    </>
  );
}
