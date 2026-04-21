<template>
  <div class="admin-container">
    <Sidebar />

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
      
      <!-- Process Management Section -->
      <div class="processes-section">
        <header class="section-header">
          <h2>Top Processes</h2>
          <button @click="fetchProcesses" class="btn-refresh"><i class="fa-solid fa-rotate-right"></i></button>
        </header>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>User</th>
                <th>CPU %</th>
                <th>Mem %</th>
                <th>Command</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proc in processes" :key="proc.pid">
                <td>{{ proc.pid }}</td>
                <td>{{ proc.user }}</td>
                <td><span :class="{'high-cpu': proc.cpu > 50}">{{ proc.cpu }}%</span></td>
                <td>{{ proc.mem }}%</td>
                <td class="cmd-cell" :title="proc.command">{{ proc.command }}</td>
                <td>
                  <button @click="killProcess(proc.pid, proc.command)" class="btn-kill" title="Kill Process">
                    <i class="fa-solid fa-skull"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="processes.length === 0">
                <td colspan="6" class="text-center">Loading processes...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-if="message" class="toast" :class="messageType">
        {{ message }}
      </div>
    </main>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const services = ref([])
const processes = ref([])
const message = ref('')
const messageType = ref('success')

const fetchServices = async () => {
    try {
        const res = await fetch('/api/system/services')
        if (res.status === 401) return router.push('/login')
        services.value = await res.json()
    } catch (e) { console.error(e) }
}

const fetchProcesses = async () => {
    try {
        const res = await fetch('/api/system/processes')
        if (res.status === 401) return router.push('/login')
        processes.value = await res.json()
    } catch (e) { console.error(e) }
}

onMounted(() => {
    fetchServices()
    fetchProcesses()
})

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



const killProcess = async (pid, command) => {
    if(!confirm(`Are you sure you want to kill process ${pid} (${command})?`)) return;
    message.value = `Killing process ${pid}...`
    messageType.value = 'info'
    try {
        const res = await fetch('/api/system/process-kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid })
        })
        const data = await res.json()
        if (data.success) {
            message.value = data.message
            messageType.value = 'success'
            fetchProcesses()
        } else {
            message.value = data.error
            messageType.value = 'error'
        }
    } catch (e) {
        message.value = 'Kill failed.'
        messageType.value = 'error'
    }
    setTimeout(() => { message.value = '' }, 3000)
}
</script>

<style scoped>
.admin-container {
    display: flex;
    min-height: 100vh;
    background: #050a12;
    color: #fff;
}


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

/* Processes Section */
.processes-section { margin-top: 50px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h2 { font-size: 24px; font-weight: 600; }
.btn-refresh { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; padding: 8px 15px; cursor: pointer; transition: 0.3s; }
.btn-refresh:hover { background: rgba(255,255,255,0.1); color: #00f2fe; }

.table-container { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 15px; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 15px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.data-table th { color: #888; font-weight: 500; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
.data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
.cmd-cell { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; color: #aaa; }
.high-cpu { color: #ff4d4d; font-weight: bold; }
.btn-kill { background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.2); color: #ff4d4d; border-radius: 6px; padding: 6px 12px; cursor: pointer; transition: 0.3s; }
.btn-kill:hover { background: #ff4d4d; color: #fff; }
.text-center { text-align: center; color: #666; }

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
