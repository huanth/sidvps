import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Setup from './views/Setup.vue'
import Dashboard from './views/Dashboard.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/login', component: Login, name: 'login' },
  { path: '/setup', component: Setup, name: 'setup' },
  { path: '/', component: Dashboard, name: 'dashboard' },
  { path: '/settings', component: Settings, name: 'settings' }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes
})

export default router
