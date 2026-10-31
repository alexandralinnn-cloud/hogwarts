import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { FIREBASE_CONFIG, OWNER_UID } from './config';
import { LocalStore } from './store/local';
import type { Store } from './store/types';
import './styles.css';

async function makeStore(): Promise<Store> {
  const onDevMachine = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const forceLocal = onDevMachine && new URLSearchParams(location.search).has('local');
  if (FIREBASE_CONFIG && !forceLocal) {
    const { FirebaseStore } = await import('./store/firebase');
    return new FirebaseStore(FIREBASE_CONFIG, OWNER_UID);
  }
  // Editable test mode exists only on the development computer; everyone else sees read-only examples.
  return new LocalStore(onDevMachine ? 'local' : 'demo');
}

registerSW({ immediate: true });

makeStore().then((store) => render(<App store={store} />, document.getElementById('app')!));
