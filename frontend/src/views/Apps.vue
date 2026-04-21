<template>
  <div class="admin-container">
    <Sidebar />

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <h1>App Stack Installer</h1>
        <p>Deploy core infrastructure components with one-click automation.</p>
      </header>

      <div class="apps-grid">
        <div v-for="app in availableApps" :key="app.id" class="app-card">
          <div class="app-visual">
            <div class="app-icon" :class="app.id">
              <i :class="app.icon"></i>
            </div>
            <div class="app-meta">
              <h3>{{ app.name }}</h3>
              <p>{{ app.description }}</p>
            </div>
          </div>

          <div class="app-config">
            <div class="config-row">
              <span>Version</span>
              <span class="version-tag">OS Default (Stable)</span>
            </div>
            <div class="pro-selector disabled">
              <span>Custom Version</span>
              <span class="pro-badge"><i class="fa-solid fa-crown"></i> PRO Only</span>
            </div>
          </div>

          <div class="app-footer">
            <button 
                @click="installApp(app.id)" 
                class="btn-install" 
                :disabled="installingId === app.id"
            >
              <span v-if="installingId === app.id">
                <i class="fa-solid fa-spinner fa-spin"></i> Triggering...
              </span>
              <span v-else>Install Now</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="statusMsg" class="installer-toast" :class="statusType">
        <i class="fa-solid" :class="statusType === 'success' ? 'fa-check' : 'fa-info-circle'"></i>
        {{ statusMsg }}
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const installingId = ref(null)
const statusMsg = ref('')
const statusType = ref('success')

const availableApps = [
  { id: 'nginx', name: 'Nginx', icon: 'fa-solid fa-globe', description: 'High-performance HTTP server and reverse proxy.' },
  { id: 'apache', name: 'Apache2', icon: 'fa-solid fa-feather', description: 'Flexible and widely used web server engine.' },
  { id: 'mysql', name: 'MySQL', icon: 'fa-solid fa-database', description: 'Reliable relational database management system.' }
]

const installApp = async (id) => {
    installingId.value = id
    statusMsg.value = `Submitting installation request for ${id}...`
    statusType.value = 'success'

    try {
        const res = await fetch('/api/system/apps-install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: id })
        })
        const data = await res.json()
        if (data.success) {
            statusMsg.value = `${id} installation initiated! Switching to Terminal to monitor...`
            setTimeout(() => {
                router.push('/terminal')
            }, 2000)
        } else {
            statusMsg.value = data.error
            statusType.value = 'error'
        }
    } catch (e) {
        statusMsg.value = 'Connection failed. Check server status.'
        statusType.value = 'error'
    } finally {
        setTimeout(() => { installingId.value = null; statusMsg.value = ''; }, 5000)
    }
}


</script>

<style scoped>
.admin-container { display: flex; min-height: 100vh; background: #050a12; color: #fff; }


/* Apps Page */
.main-content { flex: 1; padding: 50px; }
.content-header { margin-bottom: 50px; }
.content-header h1 { font-size: 32px; font-weight: 600; margin-bottom: 10px; }
.content-header p { color: #666; }

.apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 30px;
}

.app-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: 0.3s;
}
.app-card:hover { transform: translateY(-5px); border-color: #4facfe; }

.app-visual { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 30px; }
.app-icon {
    width: 60px; height: 60px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; background: rgba(255,255,255,0.05);
}
.app-icon.nginx { color: #009639; }
.app-icon.apache { color: #d11606; }
.app-icon.mysql { color: #f29111; }

.app-meta h3 { font-size: 20px; margin-bottom: 5px; }
.app-meta p { color: #555; font-size: 14px; line-height: 1.4; }

.app-config {
    background: rgba(0,0,0,0.2);
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 30px;
}
.config-row { display: flex; justify-content: space-between; font-size: 13px; color: #888; margin-bottom: 10px; }
.version-tag { color: #00f2fe; font-weight: 600; }

.pro-selector { display: flex; justify-content: space-between; font-size: 13px; color: #444; }
.pro-badge { font-size: 11px; background: rgba(255, 215, 0, 0.1); color: #ffd700; padding: 2px 8px; border-radius: 4px; }

.btn-install {
    width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.3s;
    font-weight: 600;
}
.btn-install:hover:not(:disabled) { background: #fff; color: #000; }
.btn-install:disabled { opacity: 0.5; cursor: not-allowed; }

.installer-toast {
    position: fixed; bottom: 30px; right: 30px;
    padding: 15px 30px; border-radius: 10px;
    background: #00f2fe; color: #000; font-weight: 600;
    box-shadow: 0 10px 30px rgba(0, 242, 254, 0.3);
    display: flex; align-items: center; gap: 15px;
}
.installer-toast.error { background: #ff4d4d; color: #fff; }
</style>
