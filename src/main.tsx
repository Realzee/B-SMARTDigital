import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { isNativeRuntime } from './utils/nativeRuntime';
import './index.css';

if (
  typeof window !== 'undefined' &&
  !isNativeRuntime() &&
  (window.location.protocol === 'https:' || window.location.protocol === 'http:')
) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('bsmart-pwa-offline-ready'));
    },
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('bsmart-pwa-update-ready'));
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
