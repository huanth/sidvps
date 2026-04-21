<template>
  <div class="admin-container">
    <Sidebar />

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <div class="header-left">
          <h1>System Overview</h1>
          <p>Real-time server health and resource monitoring.</p>
        </div>
        <div class="header-right" v-if="user">
          <span class="user-pill"><i class="fa-solid fa-user-shield"></i> {{ user.username }}</span>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid" v-if="stats">
        <div class="stats-card">
          <div class="stats-header">
            <span>CPU Usage</span>
            <i class="fa-solid fa-microchip"></i>
          </div>
          <div class="stats-main">
            <div class="percentage">{{ stats.cpu }}%</div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill cpu" :style="{ width: stats.cpu + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-header">
            <span>Memory (RAM)</span>
            <i class="fa-solid fa-memory"></i>
          </div>
          <div class="stats-main">
            <div class="percentage">{{ Math.round((stats.ram.used / stats.ram.total) * 100) }}%</div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ram" :style="{ width: (stats.ram.used / stats.ram.total) * 100 + '%' }"></div>
            </div>
            <div class="stats-subtext">{{ stats.ram.used }} MB / {{ stats.ram.total }} MB</div>
          </div>
        </div>

        <div class="stats-card">
          <div class="stats-header">
            <span>Disk Space</span>
            <i class="fa-solid fa-hard-drive"></i>
          </div>
          <div class="stats-main">
            <div class="percentage">{{ Math.round((stats.disk.used / stats.disk.total) * 100) }}%</div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill disk" :style="{ width: (stats.disk.used / stats.disk.total) * 100 + '%' }"></div>
            </div>
            <div class="stats-subtext">{{ (stats.disk.used / 1024).toFixed(1) }} GB / {{ (stats.disk.total / 1024).toFixed(1) }} GB</div>
          </div>
        </div>
      </div>

      <!-- Detail Cards -->
      <div class="detail-grid" v-if="sysInfo">
        <div class="info-card">
          <h3>Server Information</h3>
          <div class="info-row">
            <span class="label">Public IP</span>
            <span class="value">{{ sysInfo.ip }}</span>
          </div>
          <div class="info-row">
            <span class="label">System Uptime</span>
            <span class="value">{{ sysInfo.uptime }}</span>
          </div>
          <div class="info-row">
            <span class="label">Manager Version</span>
            <span class="value">{{ sysInfo.version }}</span>
          </div>
        </div>

        <div class="info-card quick-actions">
          <h3>Quick Controls</h3>
          <div class="actions-list">
            <button @click="router.push('/management')" class="btn-action">
              <i class="fa-solid fa-bolt"></i> Manage Services
            </button>
            <button @click="router.push('/settings')" class="btn-action">
              <i class="fa-solid fa-arrows-rotate"></i> Check Updates
            </button>
          </div>
        </div>
      </div>

      <div v-else class="loading-full">
        <div class="spinner"></div>
        <p>Initializing system diagnostics...</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)
const stats = ref(null)
const sysInfo = ref(null)
let refreshInterval = null

const fetchData = async () => {
  try {
    const statsRes = await fetch('/api/system/stats')
    if (statsRes.status === 401) return router.push('/login')
    stats.value = await statsRes.json()

    if (!sysInfo.value) {
      const infoRes = await fetch('/api/system/info')
      sysInfo.value = await infoRes.json()
    }
  } catch (e) { console.error('Refresh throttled or failed') }
}

onMounted(async () => {
  try {
    const meRes = await fetch('/api/auth/me')
    if (!meRes.ok) throw new Error()
    const meData = await meRes.json()
    user.value = meData.user

    await fetchData()
    refreshInterval = setInterval(fetchData, 5000)
  } catch (e) {
    router.push('/login')
  }
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})


</script>

<style scoped>
/* Layout */
.admin-container {
    display: flex;
    min-height: 100vh;
    background: #050a12;
    color: #fff;
    font-family: 'Outfit', sans-serif;
}


/* Main Content */
.main-content { flex: 1; padding: 50px; }
.content-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
.header-left h1 { font-size: 32px; font-weight: 600; margin-bottom: 10px; }
.header-left p { color: #555; }
.user-pill {
    background: rgba(255,255,255,0.05);
    padding: 8px 16px; border-radius: 50px;
    font-size: 14px; border: 1px solid rgba(255,255,255,0.1);
}

/* Stats Cards */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin-bottom: 40px;
}
.stats-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 25px;
}
.stats-header {
    display: flex; justify-content: space-between;
    color: #666; font-size: 13px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 20px;
}
.stats-header i { font-size: 18px; color: #4facfe; }

.percentage { font-size: 32px; font-weight: 700; margin-bottom: 15px; }
.progress-bar-bg {
    height: 8px; background: rgba(255,255,255,0.05);
    border-radius: 10px; overflow: hidden; margin-bottom: 10px;
}
.progress-bar-fill { height: 100%; transition: width 0.5s ease; border-radius: 10px; }
.progress-bar-fill.cpu { background: linear-gradient(to right, #4facfe, #00f2fe); }
.progress-bar-fill.ram { background: linear-gradient(to right, #f093fb, #f5576c); }
.progress-bar-fill.disk { background: linear-gradient(to right, #f6d365, #fda085); }

.stats-subtext { font-size: 12px; color: #555; }

/* Detail Grid */
.detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; }
.info-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px; padding: 25px;
}
.info-card h3 { font-size: 18px; margin-bottom: 25px; color: #aaa; }
.info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.info-row:last-child { border: none; }
.label { color: #666; font-size: 14px; }
.value { color: #fff; font-weight: 500; }

.actions-list { display: flex; flex-direction: column; gap: 15px; }
.btn-action {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
    color: #fff; padding: 15px; border-radius: 12px;
    text-align: left; cursor: pointer; transition: 0.3s;
    font-size: 14px; display: flex; align-items: center; gap: 12px;
}
.btn-action:hover { background: #4facfe; color: #000; border-color: #4facfe; }

.loading-full { text-align: center; padding: 100px 0; }
.spinner {
    width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.05);
    border-top-color: #4facfe; border-radius: 50%;
    animation: spin 1s infinite linear; margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
