<template>
  <div class="glass-container">
    <div class="glass-card">
      <h2 class="title">Khởi Tạo Admin</h2>
      <p class="sub-text">Hệ thống phân mảnh khởi tạo lần đầu. Vui lòng thiết lập tài khoản quản trị.</p>
      
      <div v-if="errorMsg" class="alert-error">{{ errorMsg }}</div>
      
      <form @submit.prevent="handleSetup">
        <div class="input-group">
          <input type="text" v-model="username" placeholder="Nhập Username" required autocomplete="off">
        </div>
        <div class="input-group">
          <input type="password" v-model="password" placeholder="Nhập Password" required>
        </div>
        <button type="submit" class="btn-primary">Bắt Đầu Sử Dụng</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')

const handleSetup = async () => {
  errorMsg.value = ''
  try {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username.value, pass: password.value })
    })
    
    const data = await res.json()
    if (data.success) {
      router.push('/login')
    } else {
      errorMsg.value = data.error || 'Khởi tạo thất bại'
    }
  } catch (e) {
    errorMsg.value = 'Lỗi kết nối đến máy chủ.'
  }
}
</script>
