import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Setup from './views/Setup.vue'
import Dashboard from './views/Dashboard.vue'
import Settings from './views/Settings.vue'
import Management from './views/Management.vue'
import Apps from './views/Apps.vue'
import Terminal from './views/Terminal.vue'

const routes = [
  { path: '/login', component: Login, name: 'login' },
  { path: '/setup', component: Setup, name: 'setup' },
  { path: '/', component: Dashboard, name: 'dashboard' },
  { path: '/settings', component: Settings, name: 'settings' },
  { path: '/management', component: Management, name: 'management' },
  { path: '/apps', component: Apps, name: 'apps' },
  { path: '/terminal', component: Terminal, name: 'terminal' }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes
})

export default router
