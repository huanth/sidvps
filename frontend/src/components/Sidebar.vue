<template>
  <aside class="sidebar">
    <div class="sidebar-logo">SidVPS Admin ✨</div>
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item">
        <i class="fa-solid fa-house"></i> Overview
      </router-link>
      <router-link to="/management" class="nav-item">
        <i class="fa-solid fa-server"></i> Services
      </router-link>
      <router-link to="/apps" class="nav-item">
        <i class="fa-solid fa-cubes"></i> App Stack
      </router-link>
      <router-link to="/files" class="nav-item">
        <i class="fa-solid fa-folder-open"></i> File Manager
      </router-link>
      <router-link to="/domains" class="nav-item">
        <i class="fa-solid fa-globe"></i> Domains
      </router-link>
      <router-link to="/terminal" class="nav-item">
        <i class="fa-solid fa-terminal"></i> Terminal
      </router-link>
      <router-link to="/settings" class="nav-item">
        <i class="fa-solid fa-gear"></i> Settings
      </router-link>
    </nav>
    <div class="sidebar-footer">
      <button @click="toggleTheme" class="btn-theme-toggle">
        <i :class="isLightMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i> 
        {{ isLightMode ? 'Dark Mode' : 'Light Mode' }}
      </button>
      <button @click="logout" class="btn-logout-sidebar">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLightMode = ref(false)

onMounted(() => {
  const theme = localStorage.getItem('sidvps-theme')
  if (theme === 'light') {
    isLightMode.value = true
    document.documentElement.setAttribute('data-theme', 'light')
  }
})

const toggleTheme = () => {
  isLightMode.value = !isLightMode.value
  if (isLightMode.value) {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('sidvps-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('sidvps-theme', 'dark')
  }
}

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
    width: 260px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 30px 0;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
}
.sidebar-logo {
    padding: 0 30px;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 50px;
    background: linear-gradient(to right, var(--accent-1), var(--accent-2));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.sidebar-nav { flex: 1; }
.nav-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px 30px;
    color: var(--text-mutted);
    text-decoration: none;
    transition: 0.3s;
    font-size: 15px;
}
.nav-item i { width: 20px; font-size: 18px; }
.nav-item:hover, .router-link-active {
    color: var(--text-primary);
    background: var(--nav-hover-bg);
    border-right: 3px solid var(--accent-1);
}

.sidebar-footer { padding: 30px; display: flex; flex-direction: column; gap: 15px; }

.btn-theme-toggle {
    background: none; border: none; color: var(--text-primary);
    cursor: pointer; display: flex; align-items: center; gap: 10px;
    font-size: 14px; opacity: 0.8; transition: 0.3s;
}
.btn-theme-toggle:hover { opacity: 1; color: var(--accent-1); }

.btn-logout-sidebar {
    background: none; border: none; color: #ff4d4d;
    cursor: pointer; display: flex; align-items: center; gap: 10px;
    font-size: 14px; opacity: 0.8; transition: 0.3s;
}
.btn-logout-sidebar:hover { opacity: 1; }
</style>
