import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { inject } from '@vercel/analytics'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// Only report analytics in production builds.
if (import.meta.env.PROD) {
  inject()
}
