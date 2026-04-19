<template>
  <div class="admin-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">SidVPS Admin</div>
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
        <router-link to="/settings" class="nav-item active">
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
        <h1>Settings & Updates</h1>
        <p>Manage application lifecycle and system configurations.</p>
      </header>

      <div class="glass-layout">
        <section class="settings-section">
          <h3>System Version</h3>
          <div class="version-info">
            <div class="v-card">
              <span class="v-label">Current Version</span>
              <span class="v-value">{{ currentVersion || 'v1.0.0' }}</span>
            </div>
            <div class="v-card">
              <span class="v-label">Latest Stable</span>
              <span class="v-value">
                {{ latestVersion }}
                <span v-if="isUpdateAvailable" class="new-badge">NEW</span>
              </span>
            </div>
          </div>

          <div class="update-panel">
            <div v-if="updateMessage" :class="['update-msg', updateSuccess ? 'success' : 'error']">
              <i class="fa-solid" :class="updateSuccess ? 'fa-check-circle' : 'fa-circle-exclamation'"></i>
              {{ updateMessage }}
            </div>

            <button 
              @click="handleUpdate" 
              class="btn-primary-update" 
              :disabled="isUpdating"
            >
              <span v-if="isUpdating">
                <i class="fa-solid fa-spinner fa-spin"></i> Processing Updates...
              </span>
              <span v-else>
                <i class="fa-solid fa-cloud-arrow-down"></i> Force System Update
              </span>
            </button>
            <p class="update-tip">Trigger a `git pull` from the main repository and rebuild the environment.</p>
          </div>
        </section>

        <section class="settings-section">
          <h3>Danger Zone</h3>
          <div class="danger-box">
              <div class="danger-info">
                  <h4>Clear Session Cache</h4>
                  <p>Logout all users and clear backend sessions. Use this if the UI is acting weird.</p>
              </div>
              <button @click="logout" class="btn-danger-outline">Execute Logout</button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentVersion = ref('')
const latestVersion = ref('v1.1.0')
const isUpdateAvailable = ref(false)
const isUpdating = ref(false)
const updateMessage = ref('')
const updateSuccess = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/system/info')
    if (res.status === 401) return router.push('/login')
    const data = await res.json()
    currentVersion.value = data.version
    
    // Check for real updates
    const updateRes = await fetch('/api/system/check-updates')
    const updateData = await updateRes.json()
    if (updateData.available) {
        latestVersion.value = updateData.latest
        isUpdateAvailable.value = true
    } else {
        latestVersion.value = data.version
    }
  } catch (e) {
    console.error('Failed to load system info')
  }
})

const handleUpdate = async () => {
  if (!confirm('Warning: This will pull the latest code and rebuild the project. The dashboard will be offline for ~1-2 minutes. Continue?')) return
  
  isUpdating.value = true
  updateMessage.value = 'Rebuilding environment... Please wait.'
  updateSuccess.value = true
  
  try {
    const res = await fetch('/api/system/update', { method: 'POST' })
    const data = await res.json()
    
    if (data.success) {
      updateMessage.value = 'Update applied. The manager is restarting. Please refresh in 30 seconds.'
    } else {
      updateSuccess.value = false
      updateMessage.value = 'Error: ' + data.error
    }
  } catch (e) {
    updateSuccess.value = false
    updateMessage.value = 'The system is likely restarting. Try refreshing manually soon.'
  } finally {
    isUpdating.value = false
  }
}

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
</script>

<style scoped>
.admin-container { display: flex; min-height: 100vh; background: #050a12; color: #fff; font-family: 'Outfit', sans-serif; }

/* Sidebar */
.sidebar {
    width: 260px; background: rgba(255, 255, 255, 0.02); border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex; flex-direction: column; padding: 30px 0; backdrop-filter: blur(20px);
}
.sidebar-logo {
    padding: 0 30px; font-size: 22px; font-weight: 700; margin-bottom: 50px;
    background: linear-gradient(to right, #00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.sidebar-nav { flex: 1; }
.nav-item {
    display: flex; align-items: center; gap: 15px; padding: 15px 30px; color: #888;
    text-decoration: none; transition: 0.3s; font-size: 15px;
}
.nav-item i { width: 20px; font-size: 18px; }
.nav-item:hover, .nav-item.active {
    color: #fff; background: rgba(255, 255, 255, 0.05); border-right: 3px solid #00f2fe;
}
.sidebar-footer { padding: 30px; }
.btn-logout-sidebar {
    background: none; border: none; color: #ff4d4d;
    cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; opacity: 0.7; transition: 0.3s;
}

/* Main Content */
.main-content { flex: 1; padding: 50px; }
.content-header { margin-bottom: 50px; }
.content-header h1 { font-size: 32px; font-weight: 600; margin-bottom: 10px; }
.content-header p { color: #555; }

.glass-layout { max-width: 800px; }
.settings-section {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 24px; padding: 35px; margin-bottom: 30px;
}
.settings-section h3 { font-size: 14px; text-transform: uppercase; color: #4facfe; letter-spacing: 1px; margin-bottom: 30px; }

.version-info { display: flex; gap: 20px; margin-bottom: 40px; }
.v-card {
    flex: 1; background: rgba(255,255,255,0.02); padding: 20px;
    border-radius: 15px; border: 1px solid rgba(255,255,255,0.03);
}
.v-label { display: block; font-size: 12px; color: #555; margin-bottom: 8px; }
.v-value { font-size: 24px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 10px; }
.new-badge {
    background: linear-gradient(45deg, #00f2fe, #4facfe);
    color: #000;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.4);
}

.update-panel { border-top: 1px solid rgba(255,255,255,0.05); pt: 30px; }
.btn-primary-update {
    width: 100%; padding: 18px; border-radius: 12px; border: none;
    background: linear-gradient(45deg, #4facfe, #00f2fe);
    color: #000; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.3s;
}
.btn-primary-update:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 242, 254, 0.4); }
.btn-primary-update:disabled { opacity: 0.5; cursor: not-allowed; }

.update-tip { font-size: 13px; color: #555; margin-top: 12px; text-align: center; }
.update-msg {
    padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 10px;
}
.update-msg.success { background: rgba(0, 255, 0, 0.1); color: #00ff00; border: 1px solid rgba(0, 255, 0, 0.2); }
.update-msg.error { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; border: 1px solid rgba(255, 77, 77, 0.2); }

.danger-box {
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(255, 77, 77, 0.05); padding: 20px; border-radius: 15px;
    border: 1px dashed rgba(255, 77, 77, 0.3);
}
.danger-info h4 { font-size: 16px; color: #ff7777; margin-bottom: 5px; }
.danger-info p { font-size: 13px; color: #995555; margin: 0; }
.btn-danger-outline {
    background: none; border: 1px solid #ff4d4d; color: #ff4d4d;
    padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: 0.3s;
}
.btn-danger-outline:hover { background: #ff4d4d; color: #fff; }
</style>
