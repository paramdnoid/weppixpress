import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Icon } from '@iconify/vue';
import App from './App.vue';
import router from './router';
import modalPlugin from './plugins/modal';

// Suppress iconify fetch logs in development
if ((import.meta as any).env?.DEV) {
  // Disable iconify console logging
  (window as any).__ICONIFY_LOG__ = false;
}

import '@tabler/core/js/tabler.js'
import './assets/styles/main.scss'

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(modalPlugin);
app.component('Icon', Icon);
app.mount('#app');