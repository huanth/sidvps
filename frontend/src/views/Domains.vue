<template>
  <div class="admin-container">
    <Sidebar />

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <div class="header-info">
          <h1>Domain Management</h1>
          <p>Configure virtual hosts and activate automated SSL certificates.</p>
        </div>
        <button @click="showAddModal = true" class="btn-primary">
          <i class="fa-solid fa-plus"></i> Add New Domain
        </button>
      </header>

      <div class="domains-list">
        <div v-if="loading" class="loading-state">Loading domains...</div>
        <div v-else-if="domains.length === 0" class="empty-state">
            <i class="fa-solid fa-cloud"></i>
            <h3>No domains configured yet</h3>
            <p>Add your first domain to start serving websites.</p>
        </div>
        <div v-else class="domain-table-wrapper">
          <table class="domain-table">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Web Root</th>
                <th>SSL Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in domains" :key="d.domain">
                <td class="domain-name">{{ d.domain }}</td>
                <td class="domain-root"><code>{{ d.root }}</code></td>
                <td>
                  <span class="ssl-badge" :class="{ active: d.ssl }">
                    <i :class="d.ssl ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'"></i>
                    {{ d.ssl ? 'Secure (HTTPS)' : 'Insecure' }}
                  </span>
                </td>
                <td class="date-cell">{{ new Date(d.created_at).toLocaleDateString() }}</td>
                <td>
                  <div class="action-buttons">
                    <button v-if="!d.ssl" @click="enableSSL(d.domain)" class="btn-ssl" :disabled="processingSSL === d.domain">
                        <i v-if="processingSSL === d.domain" class="fa-solid fa-spinner fa-spin"></i>
                        <template v-else><i class="fa-solid fa-shield-halved"></i> Get SSL</template>
                    </button>
                    <button class="btn-delete-row"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Domain Modal -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-card">
          <h3>Register New Domain</h3>
          <div class="form-group">
            <label>Domain Name</label>
            <input v-model="newDomain.domain" placeholder="e.g. example.com" type="text">
          </div>
          <div class="form-group">
            <label>Web Root Directory</label>
            <input v-model="newDomain.root" placeholder="e.g. /var/www/example" type="text">
          </div>
          <div class="modal-footer">
            <button @click="showAddModal = false" class="btn-cancel">Cancel</button>
            <button @click="addDomain" class="btn-submit" :disabled="submitting">
                <span v-if="submitting"><i class="fa-solid fa-spinner fa-spin"></i> Creating...</span>
                <span v-else>Confirm & Deploy</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="toast" class="toast" :class="toastType">
        {{ toast }}
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const domains = ref([])
const loading = ref(true)
const showAddModal = ref(false)
const submitting = ref(false)
const processingSSL = ref(null)
const toast = ref('')
const toastType = ref('success')

const newDomain = ref({ domain: '', root: '/var/www/' })

const fetchDomains = async () => {
    loading.value = true
    try {
        const res = await fetch('/api/domains/list')
        if (res.status === 401) return router.push('/login')
        domains.value = await res.json()
    } catch (e) {
        showToast('Failed to load domains', 'error')
    } finally {
        loading.value = false
    }
}

onMounted(fetchDomains)

const addDomain = async () => {
    if (!newDomain.value.domain || !newDomain.value.root) return
    submitting.value = true
    try {
        const res = await fetch('/api/domains/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDomain.value)
        })
        const data = await res.json()
        if (data.success) {
            showToast(data.message)
            showAddModal.value = false
            fetchDomains()
            newDomain.value = { domain: '', root: '/var/www/' }
        }
    } catch (e) {
        showToast('Error adding domain', 'error')
    } finally {
        submitting.value = false
    }
}

const enableSSL = async (domain) => {
    processingSSL.value = domain
    showToast(`Requesting SSL for ${domain}... This may take a minute.`, 'info')
    try {
        const res = await fetch('/api/domains/ssl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        })
        const data = await res.json()
        if (data.success) {
            showToast(`SSL successfully activated for ${domain}`, 'success')
            fetchDomains()
        } else {
            showToast(data.error || 'SSL challenge failed', 'error')
        }
    } catch (e) {
        showToast('SSL process failed', 'error')
    } finally {
        processingSSL.value = null
    }
}

const showToast = (msg, type = 'success') => {
    toast.value = msg
    toastType.value = type
    setTimeout(() => { toast.value = '' }, 4000)
}


</script>

<style scoped>
.admin-container { display: flex; min-height: 100vh; background: #050a12; color: #fff; font-family: 'Outfit', sans-serif; }

/* Sidebar Sync */
.sidebar { width: 260px; background: rgba(255, 255, 255, 0.02); border-right: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; padding: 30px 0; }
.sidebar-logo { padding: 0 30px; font-size: 22px; font-weight: 700; margin-bottom: 50px; background: linear-gradient(to right, #00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.sidebar-nav { flex: 1; }
.nav-item { display: flex; align-items: center; gap: 15px; padding: 15px 30px; color: #888; text-decoration: none; transition: 0.3s; font-size: 15px; }
.nav-item:hover, .nav-item.active { color: #fff; background: rgba(255, 255, 255, 0.05); border-right: 3px solid #00f2fe; }

/* Domain Page */
.main-content { flex: 1; padding: 50px; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
.header-info h1 { font-size: 32px; margin-bottom: 10px; }
.header-info p { color: #555; }

.btn-primary { background: #00f2fe; color: #000; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 10px; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0, 242, 254, 0.3); }

.loading-state, .empty-state { text-align: center; padding: 100px 0; color: #555; }
.empty-state i { font-size: 60px; margin-bottom: 20px; }
.empty-state h3 { color: #fff; margin-bottom: 10px; }

.domain-table-wrapper { background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.domain-table { width: 100%; border-collapse: collapse; text-align: left; }
.domain-table th { padding: 20px; font-size: 13px; text-transform: uppercase; color: #555; border-bottom: 1px solid rgba(255,255,255,0.05); }
.domain-table td { padding: 20px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }

.domain-name { font-weight: 600; color: #00f2fe; }
.domain-root code { background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; color: #aaa; }

.ssl-badge { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 50px; width: fit-content; background: rgba(255,255,255,0.05); color: #888; }
.ssl-badge.active { background: rgba(0, 255, 127, 0.1); color: #00ff7f; }

.action-buttons { display: flex; gap: 10px; }
.btn-ssl { background: rgba(0, 242, 254, 0.1); color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.2); padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.3s; font-size: 13px; }
.btn-ssl:hover:not(:disabled) { background: #00f2fe; color: #000; }

.btn-delete-row { background: none; border: none; color: #555; cursor: pointer; font-size: 16px; transition: 0.3s; }
.btn-delete-row:hover { color: #ff4d4d; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-card { background: #0a0f1d; width: 450px; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); }
.modal-card h3 { font-size: 24px; margin-bottom: 30px; }

.form-group { margin-bottom: 25px; }
.form-group label { display: block; margin-bottom: 10px; font-size: 14px; color: #888; }
.form-group input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 15px; border-radius: 12px; font-size: 15px; }

.modal-footer { display: flex; gap: 15px; margin-top: 40px; }
.btn-cancel { flex: 1; background: none; border: 1px solid rgba(255,255,255,0.1); color: #aaa; padding: 15px; border-radius: 12px; cursor: pointer; }
.btn-submit { flex: 1; background: #00f2fe; color: #000; border: none; padding: 15px; border-radius: 12px; font-weight: 700; cursor: pointer; }

/* Toast */
.toast { position: fixed; bottom: 30px; right: 30px; padding: 15px 30px; border-radius: 12px; backdrop-filter: blur(10px); font-size: 14px; border: 1px solid rgba(255,255,255,0.1); animation: slideIn 0.3s ease-out; }
.toast.success { background: rgba(0, 255, 127, 0.2); color: #00ff7f; }
.toast.error { background: rgba(255, 77, 77, 0.2); color: #ff4d4d; }
.toast.info { background: rgba(0, 242, 254, 0.2); color: #00f2fe; }

@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
</style>
