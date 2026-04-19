import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Setup from './views/Setup.vue'
import Dashboard from './views/Dashboard.vue'

const routes = [
  { path: '/login', component: Login, name: 'login' },
  { path: '/setup', component: Setup, name: 'setup' },
  { path: '/', component: Dashboard, name: 'dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
