<template>
  <div class="container" v-if="user">
    <div class="header">
      <div class="logo">SidVPS Dashboard</div>
      <div class="user-info">
        <span class="user-name">Welcome, <b>{{ user.username }}</b> (Admin)</span>
        <button @click="logout" class="btn-logout">Sign Out</button>
      </div>
    </div>
    
    <div class="grid" v-if="sysInfo">
      <div class="card">
        <div class="card-title">Server IP Address</div>
        <div class="card-value">{{ sysInfo.ip }}</div>
      </div>
      <div class="card">
        <div class="card-title">System Uptime</div>
        <div class="card-value">{{ sysInfo.uptime }}</div>
      </div>
    </div>
    <div v-else class="loading-state">
      Fetching data from Backend API...
    </div>
    
    <div class="footer">
      &copy; 2026 SidVPS Manager. Vue SPA Interface.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)
const sysInfo = ref(null)

onMounted(async () => {
  try {
    // 1. Kiểm tra đăng nhập
    const meRes = await fetch('/api/auth/me')
    if (!meRes.ok) throw new Error('Not logged in')
    const meData = await meRes.json()
    user.value = meData.user

    // 2. Tải System info
    const sysRes = await fetch('/api/system/status')
    if (sysRes.ok) {
      sysInfo.value = await sysRes.json()
    }
  } catch (e) {
    router.push('/login')
  }
})

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
</script>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.logo { font-size: 28px; font-weight: 600; background: -webkit-linear-gradient(#00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1px; }
.user-info { display: flex; align-items: center; gap: 20px; }
@media (max-width: 600px) {
    .header { flex-direction: column; gap: 20px; text-align: center; }
    .user-info { flex-direction: column; }
}
.user-name { font-weight: 300; color: #ccc; }
.user-name b { color: #fff; font-weight: 600; }
.btn-logout { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.3s ease; border: 1px solid rgba(255, 77, 77, 0.3); cursor:pointer; }
.btn-logout:hover { background: #ff4d4d; color: #fff; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255, 77, 77, 0.3); }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 30px;
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease, border-color 0.3s ease;
    position: relative;
    overflow: hidden;
}
.card:hover { transform: translateY(-5px); border-color: rgba(0, 242, 254, 0.3); }
.card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #4facfe, #00f2fe); }

.card-title { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
.card-value { font-size: 28px; font-weight: 600; color: #fff; }

.loading-state { text-align: center; padding: 50px; color: #aaa; font-style: italic; }
.footer { text-align: center; margin-top: 60px; color: #555; font-size: 13px; }
</style>
