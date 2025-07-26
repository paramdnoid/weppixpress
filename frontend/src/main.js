import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Icon } from '@iconify/vue';
import App from './App.vue';
import router from './router'; // <-- Router importieren

import '@tabler/core/js/tabler.js'
import './assets/styles/main.scss'

const app = createApp(App);
app.use(createPinia());
app.use(router); // <-- Router einbinden
app.component('Icon', Icon);
app.mount('#app');