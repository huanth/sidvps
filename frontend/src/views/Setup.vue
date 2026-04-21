<template>
  <div class="glass-container">
    <div class="glass-card">
      <h2 class="title">Admin Setup</h2>
      <p class="sub-text">Initial system setup. Please create an administrator account.</p>
      
      <div v-if="errorMsg" class="alert-error">{{ errorMsg }}</div>
      
      <form @submit.prevent="handleSetup">
        <div class="input-group">
          <input type="text" v-model="username" placeholder="Enter Username" required autocomplete="off">
        </div>
        <div class="input-group">
          <input type="password" v-model="password" placeholder="Enter Password" required>
        </div>
        <div class="input-group">
          <input type="email" v-model="email" placeholder="Enter Admin Email (For Alerts/License)" required>
        </div>
        <div class="input-group">
          <input type="text" v-model="serverIp" placeholder="Fetching Server IP..." disabled class="read-only-ip">
        </div>
        <button type="submit" class="btn-primary" :disabled="!serverIp">Start Using Now</button>
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
const email = ref('')
const serverIp = ref('')
const errorMsg = ref('')

onMounted(async () => {
    try {
        const res = await fetch('/api/system/ip')
        const data = await res.json()
        serverIp.value = data.ip || 'Unknown'
    } catch(e) { serverIp.value = 'Unknown' }
})

const handleSetup = async () => {
  errorMsg.value = ''
  try {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username.value, pass: password.value, email: email.value, ip: serverIp.value })
    })
    
    const data = await res.json()
    if (data.success) {
      router.push('/login')
    } else {
      errorMsg.value = data.error || 'Setup failed'
    }
  } catch (e) {
    errorMsg.value = 'Connection error to server.'
  }
}
</script>
