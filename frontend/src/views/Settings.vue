<template>
  <div class="container">
    <div class="header">
      <div class="logo">Settings & Updates</div>
      <router-link to="/" class="btn-back">
        <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
      </router-link>
    </div>

    <div class="glass-card">
      <div class="info-group">
        <div class="info-label">Current Version</div>
        <div class="info-value">{{ currentVersion || 'v1.0.0' }}</div>
      </div>

      <div class="info-group">
        <div class="info-label">Update Status</div>
        <div class="status-badge" :class="{ 'up-to-date': isUpToDate }">
          {{ isUpToDate ? 'System is up to date' : 'Update available!' }}
        </div>
      </div>

      <div class="action-zone">
        <p v-if="updateMessage" :class="{ 'msg-success': updateSuccess, 'msg-error': !updateSuccess }">
          {{ updateMessage }}
        </p>
        
        <button 
          @click="handleUpdate" 
          class="btn-update" 
          :disabled="isUpdating"
        >
          <span v-if="isUpdating">
            <i class="fa-solid fa-spinner fa-spin"></i> Updating System...
          </span>
          <span v-else>
            <i class="fa-solid fa-cloud-arrow-down"></i> Update to Latest Version
          </span>
        </button>
      </div>

      <div class="warning-box">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span><b>Important:</b> The update process will rebuild the frontend and pull new backend code. The dashboard will be unresponsive for 1-2 minutes.</span>
      </div>
    </div>

    <div class="footer">
      &copy; 2026 SidVPS Manager. Version lifecycle system.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentVersion = ref('')
const isUpToDate = ref(true)
const isUpdating = ref(false)
const updateMessage = ref('')
const updateSuccess = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/system/info')
    if (res.status === 401) return router.push('/login')
    const data = await res.json()
    currentVersion.value = data.version
    // For demo, we assume v1.0.0 is latest. Real logic would compare with data.latest_version
  } catch (e) {
    console.error('Failed to load system info')
  }
})

const handleUpdate = async () => {
  if (!confirm('Are you sure you want to update? The system will rebuild and restart.')) return
  
  isUpdating.value = true
  updateMessage.value = 'Update process started... Please do not refresh.'
  
  try {
    const res = await fetch('/api/system/update', { method: 'POST' })
    const data = await res.json()
    
    if (data.success) {
      updateSuccess.value = true
      updateMessage.value = 'Update successfully applied! System will restart in 5 seconds.'
      // Optionally wait and refresh
    } else {
      updateSuccess.value = false
      updateMessage.value = 'Update failed: ' + data.error
    }
  } catch (e) {
    updateSuccess.value = false
    updateMessage.value = 'Connection lost during update. The system might be rebuilding or restarting.'
  } finally {
    isUpdating.value = false
  }
}
</script>

<style scoped>
.container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.logo { font-size: 24px; font-weight: 600; color: #fff; }
.btn-back { color: #aaa; text-decoration: none; font-size: 14px; transition: 0.3s; }
.btn-back:hover { color: #fff; }

.glass-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 40px;
    backdrop-filter: blur(10px);
}

.info-group { margin-bottom: 30px; }
.info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.info-value { font-size: 32px; font-weight: 700; color: #fff; }

.status-badge { display: inline-block; padding: 5px 15px; border-radius: 50px; font-size: 12px; background: rgba(255, 255, 0, 0.1); color: #ffff00; border: 1px solid rgba(255, 255, 0, 0.2); }
.status-badge.up-to-date { background: rgba(0, 255, 0, 0.1); color: #00ff00; border: 1px solid rgba(0, 255, 0, 0.2); }

.action-zone { margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); }
.btn-update { 
    width: 100%; padding: 18px; border-radius: 12px; border: none;
    background: linear-gradient(45deg, #4facfe, #00f2fe);
    color: #000; font-weight: 600; font-size: 16px; cursor: pointer; transition: 0.3s;
}
.btn-update:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 242, 254, 0.4); }
.btn-update:disabled { opacity: 0.5; cursor: not-allowed; }

.msg-success { color: #00ff00; margin-bottom: 15px; font-size: 14px; }
.msg-error { color: #ff4d4d; margin-bottom: 15px; font-size: 14px; }

.warning-box {
    margin-top: 30px; padding: 15px; background: rgba(255, 77, 77, 0.05);
    border: 1px dashed rgba(255, 77, 77, 0.3); border-radius: 12px;
    display: flex; gap: 15px; align-items: center; color: #ff7777; font-size: 13px;
}
.warning-box i { font-size: 18px; }

.footer { text-align: center; margin-top: 40px; color: #555; font-size: 12px; }
</style>
