import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/** Arranca la aplicación. Lo llama el cargador (main.tsx), con el código del APK o con el del sitio en vivo. */
export function start() {
  createRoot(document.getElementById('root')!).render(<App />);
  // La app dibujó sin fallar: se borra la marca de "intento en vivo" para no caer al respaldo en el próximo arranque.
  setTimeout(() => {
    try {
      localStorage.removeItem('essimple_live_attempt');
    } catch {
      // ignorar
    }
  }, 2500);
}
