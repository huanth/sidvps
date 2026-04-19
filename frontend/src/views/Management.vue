<template>
  <div class="admin-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">SidVPS Admin</div>
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item">
          <i class="fa-solid fa-house"></i> Overview
        </router-link>
        <router-link to="/management" class="nav-item active">
          <i class="fa-solid fa-server"></i> Services
        </router-link>
        <router-link to="/settings" class="nav-item">
          <i class="fa-solid fa-gear"></i> Settings
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <button @click="logout" class="btn-logout-sidebar">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <h1>Service Management</h1>
        <p>Control system-level services and infrastructure.</p>
      </header>

      <div class="services-grid">
        <div v-for="svc in services" :key="svc.name" class="service-card">
          <div class="service-info">
            <div class="svc-icon" :class="svc.name">
              <i v-if="svc.name === 'nginx'" class="fa-solid fa-globe"></i>
              <i v-else-if="svc.name === 'mysql'" class="fa-solid fa-database"></i>
              <i v-else-if="svc.name === 'php-fpm'" class="fa-solid fa-code"></i>
              <i v-else class="fa-solid fa-microchip"></i>
            </div>
            <div class="svc-details">
              <h3>{{ svc.name.toUpperCase() }}</h3>
              <span class="status-indicator" :class="svc.status === 'active' ? 'active' : 'inactive'">
                {{ svc.status === 'active' ? 'Running' : 'Stopped' }}
              </span>
            </div>
          </div>
          
          <div class="svc-actions">
            <button v-if="svc.status !== 'active'" @click="handleAction(svc.name, 'start')" class="btn-svc start">
              <i class="fa-solid fa-play"></i> Start
            </button>
            <button v-if="svc.status === 'active'" @click="handleAction(svc.name, 'stop')" class="btn-svc stop">
              <i class="fa-solid fa-stop"></i> Stop
            </button>
            <button @click="handleAction(svc.name, 'restart')" class="btn-svc restart">
              <i class="fa-solid fa-rotate"></i> Restart
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="message" class="toast" :class="messageType">
        {{ message }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const services = ref([])
const message = ref('')
const messageType = ref('success')

const fetchServices = async () => {
    try {
        const res = await fetch('/api/system/services')
        if (res.status === 401) return router.push('/login')
        services.value = await res.json()
    } catch (e) { console.error(e) }
}

onMounted(fetchServices)

const handleAction = async (service, action) => {
    message.value = `Executing ${action} on ${service}...`
    messageType.value = 'info'
    try {
        const res = await fetch('/api/system/service-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service, action })
        })
        const data = await res.json()
        if (data.success) {
            message.value = data.message
            messageType.value = 'success'
            setTimeout(fetchServices, 1000)
        } else {
            message.value = data.error
            messageType.value = 'error'
        }
    } catch (e) {
        message.value = 'Execution failed.'
        messageType.value = 'error'
    }
    setTimeout(() => { message.value = '' }, 3000)
}

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
</script>

<style scoped>
.admin-container {
    display: flex;
    min-height: 100vh;
    background: #050a12;
    color: #fff;
}

/* Sidebar */
.sidebar {
    width: 260px;
    background: rgba(255, 255, 255, 0.02);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 30px 0;
    backdrop-filter: blur(20px);
}
.sidebar-logo {
    padding: 0 30px;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 50px;
    background: linear-gradient(to right, #00f2fe, #4facfe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.sidebar-nav { flex: 1; }
.nav-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px 30px;
    color: #888;
    text-decoration: none;
    transition: 0.3s;
    font-size: 15px;
}
.nav-item i { width: 20px; font-size: 18px; }
.nav-item:hover, .nav-item.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
    border-right: 3px solid #00f2fe;
}

.sidebar-footer { padding: 30px; }
.btn-logout-sidebar {
    background: none; border: none; color: #ff4d4d;
    cursor: pointer; display: flex; align-items: center; gap: 10px;
    font-size: 14px; opacity: 0.7; transition: 0.3s;
}
.btn-logout-sidebar:hover { opacity: 1; }

/* Main Content */
.main-content { flex: 1; padding: 50px; }
.content-header { margin-bottom: 40px; }
.content-header h1 { font-size: 32px; font-weight: 600; margin-bottom: 10px; }
.content-header p { color: #666; }

.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 25px;
}

.service-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 25px;
    transition: 0.3s;
}
.service-card:hover { transform: translateY(-5px); border-color: #4facfe; }

.service-info { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
.svc-icon {
    width: 60px; height: 60px; border-radius: 15px;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; background: rgba(255,255,255,0.05);
}
.svc-icon.nginx { color: #009639; background: rgba(0, 150, 57, 0.1); }
.svc-icon.mysql { color: #f29111; background: rgba(242, 145, 17, 0.1); }
.svc-icon.php-fpm { color: #777bb3; background: rgba(119, 123, 179, 0.1); }

.svc-details h3 { font-size: 18px; margin-bottom: 5px; }
.status-indicator { font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
.status-indicator.active { color: #00ff00; background: rgba(0, 255, 0, 0.1); }
.status-indicator.inactive { color: #ff4d4d; background: rgba(255, 77, 77, 0.1); }

.svc-actions { display: flex; gap: 10px; }
.btn-svc {
    flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.3s;
    font-size: 13px; font-weight: 500;
}
.btn-svc:hover { background: rgba(255,255,255,0.1); }
.btn-svc.start:hover { border-color: #00ff00; color: #00ff00; }
.btn-svc.stop:hover { border-color: #ff4d4d; color: #ff4d4d; }
.btn-svc.restart:hover { border-color: #4facfe; color: #4facfe; }

/* Toast */
.toast {
    position: fixed; bottom: 30px; right: 30px;
    padding: 15px 30px; border-radius: 10px;
    backdrop-filter: blur(10px); font-size: 14px;
    border: 1px solid rgba(255,255,255,0.1);
    animation: slideIn 0.3s ease-out;
}
.toast.success { background: rgba(0, 255, 0, 0.2); color: #00ff00; border-color: #00ff00; }
.toast.error { background: rgba(255, 0, 0, 0.2); color: #ff4d4d; border-color: #ff4d4d; }
.toast.info { background: rgba(79, 172, 254, 0.2); color: #4facfe; border-color: #4facfe; }

@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
</style>
