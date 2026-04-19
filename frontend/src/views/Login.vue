<template>
  <div class="glass-container">
    <div class="glass-card">
      <h2 class="title">Đăng Nhập</h2>
      <p class="sub-text">Chào mừng trở lại bảng điều khiển SidVPS.</p>
      
      <div v-if="errorMsg" class="alert-error">{{ errorMsg }}</div>
      
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <input type="text" v-model="username" placeholder="Username" required autocomplete="off">
        </div>
        <div class="input-group">
          <input type="password" v-model="password" placeholder="Password" required>
        </div>
        <button type="submit" class="btn-primary">Đăng Nhập</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')

onMounted(async () => {
    try {
        const res = await fetch('/api/auth/check-setup')
        const data = await res.json()
        if (data.needsSetup) {
            router.push('/setup')
        }
    } catch(e) {
        console.error('API Error', e)
    }
})

const handleLogin = async () => {
  errorMsg.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username.value, pass: password.value })
    })
    
    const data = await res.json()
    if (data.success) {
      router.push('/')
    } else {
      errorMsg.value = data.error || 'Đăng nhập thất bại'
    }
  } catch (e) {
    errorMsg.value = 'Lỗi kết nối đến máy chủ.'
  }
}
</script>
