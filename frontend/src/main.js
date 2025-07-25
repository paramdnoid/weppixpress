import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { Icon } from '@iconify/vue'

import '@tabler/core/js/tabler.js'
import './assets/styles/main.scss'

const app = createApp(App)

app.config.globalProperties.$appName = 'WeppiXpress'
app.config.globalProperties.$appVersion = import.meta.env.VITE_APP_VERSION

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.component('Icon', Icon)

// Optional: global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Global Error:', err)
}

app.mount('#app')