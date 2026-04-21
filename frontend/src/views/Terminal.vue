<template>
  <div class="admin-container">
    <Sidebar />

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
import Sidebar from '../components/Sidebar.vue'
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


</script>

<style scoped>
.admin-container { display: flex; min-height: 100vh; background: #050a12; color: #fff; }


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
