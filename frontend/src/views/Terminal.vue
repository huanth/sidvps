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
        <router-link to="/terminal" class="nav-item active">
          <i class="fa-solid fa-terminal"></i> Terminal
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
    <main class="main-content terminal-page">
      <header class="content-header">
        <h1>Cloud Terminal</h1>
        <p>Interactive shell session starting at <code class="root-badge">/root</code></p>
      </header>

      <div class="terminal-wrapper">
        <div id="terminal-container" ref="terminalElement"></div>
      </div>
      
      <div class="terminal-hints">
        <span><i class="fa-solid fa-circle-info"></i> Tip: Use Ctrl+C/Ctrl+V for keyboard operations. Session is isolated.</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

const router = useRouter()
const terminalElement = ref(null)
let term = null
let socket = null
let fitAddon = null

onMounted(() => {
    // 1. Initialize Xterm
    term = new Terminal({
        theme: {
            background: '#0a0f1d',
            foreground: '#00f2fe',
            cursor: '#4facfe',
            selection: 'rgba(255, 255, 255, 0.1)'
        },
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: 14,
        cursorBlink: true
    })

    fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalElement.value)
    fitAddon.fit()

    // 2. Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    socket = new WebSocket(`${protocol}://${window.location.host}/api/terminal`)

    socket.onopen = () => {
        term.write('\r\n\x1b[32m[SidVPS] Cloud Terminal Connected. Loading shell...\x1b[0m\r\n')
    }

    socket.onmessage = (ev) => {
        term.write(ev.data)
    }

    term.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(data)
        }
    })

    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    if (socket) socket.close()
    if (term) term.dispose()
    window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
    if (fitAddon) fitAddon.fit()
}

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
</script>

<style scoped>
.admin-container { display: flex; min-height: 100vh; background: #050a12; color: #fff; }

/* Sidebar (Generic Sync) */
.sidebar { width: 260px; background: rgba(255, 255, 255, 0.02); border-right: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; padding: 30px 0; }
.sidebar-logo { padding: 0 30px; font-size: 22px; font-weight: 700; margin-bottom: 50px; background: linear-gradient(to right, #00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.sidebar-nav { flex: 1; }
.nav-item { display: flex; align-items: center; gap: 15px; padding: 15px 30px; color: #888; text-decoration: none; transition: 0.3s; font-size: 15px; }
.nav-item:hover, .nav-item.active { color: #fff; background: rgba(255, 255, 255, 0.05); border-right: 3px solid #00f2fe; }
.sidebar-footer { padding: 30px; }
.btn-logout-sidebar { background: none; border: none; color: #ff4d4d; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; opacity: 0.7; }

/* Terminal Page */
.main-content { flex: 1; padding: 50px; display: flex; flex-direction: column; }
.content-header { margin-bottom: 30px; }
.root-badge { background: rgba(0, 242, 254, 0.1); color: #00f2fe; padding: 2px 8px; border-radius: 4px; font-style: normal; }

.terminal-wrapper {
    flex: 1;
    background: #0a0f1d;
    border-radius: 15px;
    padding: 20px;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

#terminal-container { height: 100%; width: 100%; }

.terminal-hints {
    margin-top: 20px;
    font-size: 13px;
    color: #555;
    display: flex;
    align-items: center;
    gap: 10px;
}
</style>
