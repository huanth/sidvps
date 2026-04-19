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
        <router-link to="/files" class="nav-item active">
          <i class="fa-solid fa-folder-open"></i> File Manager
        </router-link>
        <router-link to="/domains" class="nav-item">
          <i class="fa-solid fa-globe"></i> Domains
        </router-link>
        <router-link to="/terminal" class="nav-item">
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
    <main class="main-content fm-page">
      <header class="fm-header">
        <div class="breadcrumb">
          <span @click="navigateTo('/')">root</span>
          <span v-for="(part, idx) in pathParts" :key="idx" @click="navigateToPart(idx)">
            <i class="fa-solid fa-chevron-right"></i> {{ part }}
          </span>
        </div>
        <div class="fm-actions">
            <button @click="openMkdir" class="btn-fm"><i class="fa-solid fa-folder-plus"></i> New Folder</button>
            <label class="btn-fm upload-label">
                <i class="fa-solid fa-cloud-arrow-up"></i> Upload
                <input type="file" @change="handleUpload" hidden>
            </label>
        </div>
      </header>

      <div class="fm-layout">
        <!-- Explorer Pane -->
        <div class="explorer-pane">
          <div v-if="loadingFiles" class="pane-loading">Scanning system...</div>
          <div v-else class="file-list">
            <div v-if="currentPath !== '/'" class="file-item row-up" @click="goUp">
              <i class="fa-solid fa-level-up-alt"></i>
              <span>..</span>
            </div>
            <div 
              v-for="file in files" 
              :key="file.path" 
              class="file-item" 
              :class="{ active: selectedItem?.path === file.path }"
              @click="selectItem(file)"
              @dblclick="handleDblClick(file)"
            >
              <i v-if="file.isDirectory" class="fa-solid fa-folder folder-icon"></i>
              <i v-else class="fa-solid fa-file-code file-icon"></i>
              <span class="file-name">{{ file.name }}</span>
              <div class="item-actions">
                  <i class="fa-solid fa-pen-to-square" @click.stop="openRename(file)"></i>
                  <i class="fa-solid fa-trash" @click.stop="deleteItem(file)"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor Pane -->
        <div class="editor-pane">
          <div v-if="editingFile" class="editor-container">
            <div class="editor-header">
              <span class="editing-name">{{ editingFile.name }}</span>
              <div class="editor-controls">
                  <button @click="saveFile" class="btn-save" :disabled="saving">
                    <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
                    <i v-else class="fa-solid fa-floppy-disk"></i> Save Changes
                  </button>
                  <button @click="editingFile = null" class="btn-close-editor"><i class="fa-solid fa-xmark"></i></button>
              </div>
            </div>
            <!-- Monaco Editor -->
            <div class="monaco-wrapper">
                <VueMonacoEditor
                    v-model:value="fileContent"
                    theme="vs-dark"
                    :language="getLanguage(editingFile.name)"
                    :options="editorOptions"
                    @mount="handleEditorMount"
                />
            </div>
          </div>
          <div v-else class="editor-placeholder">
            <i class="fa-solid fa-code"></i>
            <h3>No File Selected</h3>
            <p>Select a file from the explorer to start editing with Monaco Pro.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

const router = useRouter()
const currentPath = ref('/root')
const files = ref([])
const loadingFiles = ref(false)
const selectedItem = ref(null)
const editingFile = ref(null)
const fileContent = ref('')
const saving = ref(false)

const pathParts = computed(() => {
    return currentPath.value.split('/').filter(p => p)
})

const editorOptions = {
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'Fira Code', monospace",
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    roundedSelection: true,
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true
}

const fetchFiles = async () => {
    loadingFiles.value = true
    try {
        const res = await fetch(`/api/files/list?path=${encodeURIComponent(currentPath.value)}`)
        if (res.status === 401) return router.push('/login')
        const data = await res.json()
        files.value = data.sort((a,b) => b.isDirectory - a.isDirectory || a.name.localeCompare(b.name))
    } catch (e) { console.error(e) }
    finally { loadingFiles.value = false }
}

onMounted(fetchFiles)

const navigateTo = (path) => {
    currentPath.value = path
    fetchFiles()
    editingFile.value = null
}

const navigateToPart = (idx) => {
    const target = '/' + pathParts.value.slice(0, idx + 1).join('/')
    navigateTo(target)
}

const goUp = () => {
    const parts = currentPath.value.split('/')
    parts.pop()
    navigateTo(parts.join('/') || '/')
}

const selectItem = (item) => {
    selectedItem.value = item
}

const handleDblClick = async (item) => {
    if (item.isDirectory) {
        navigateTo(item.path)
    } else {
        await openFile(item)
    }
}

const openFile = async (item) => {
    try {
        const res = await fetch(`/api/files/read?path=${encodeURIComponent(item.path)}`)
        const data = await res.json()
        editingFile.value = item
        fileContent.value = data.content
    } catch (e) { alert('Cannot read file binary or protected file.') }
}

const saveFile = async () => {
    if (!editingFile.value) return
    saving.value = true
    try {
        await fetch('/api/files/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: editingFile.value.path, content: fileContent.value })
        })
        alert('File saved successfully!')
    } catch (e) { alert('Save failed.') }
    finally { saving.value = false }
}

const handleUpload = async (ev) => {
    const file = ev.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
        await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath.value)}`, {
            method: 'POST',
            body: formData
        })
        fetchFiles()
    } catch (e) { alert('Upload failed.') }
}

const deleteItem = async (item) => {
    if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return
    try {
        await fetch('/api/files/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: item.path })
        })
        fetchFiles()
    } catch (e) { alert('Delete failed.') }
}

const openMkdir = async () => {
    const name = prompt('New directory name:')
    if (!name) return
    try {
        await fetch('/api/files/mkdir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: `${currentPath.value}/${name}` })
        })
        fetchFiles()
    } catch (e) { alert('Mkdir failed.') }
}

const openRename = async (item) => {
    const name = prompt('New name:', item.name)
    if (!name) return
    const newPath = currentPath.value === '/' ? `/${name}` : `${currentPath.value}/${name}`
    try {
        await fetch('/api/files/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: item.path, newPath })
        })
        fetchFiles()
    } catch (e) { alert('Rename failed.') }
}

const getLanguage = (filename) => {
    const ext = filename.split('.').pop()
    const map = {
        js: 'javascript', ts: 'typescript', html: 'html', css: 'css',
        json: 'json', md: 'markdown', py: 'python', sh: 'shell',
        php: 'php', sql: 'sql', yaml: 'yaml', yml: 'yaml'
    }
    return map[ext] || 'plaintext'
}

const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
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

/* FM Page Layout */
.fm-page { flex: 1; display: flex; flex-direction: column; height: 100vh; padding: 30px; gap: 20px; }

.fm-header { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 15px 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
.breadcrumb { display: flex; gap: 10px; font-size: 14px; color: #888; align-items: center; }
.breadcrumb span { cursor: pointer; transition: 0.3s; }
.breadcrumb span:hover { color: #00f2fe; }

.fm-actions { display: flex; gap: 10px; }
.btn-fm { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
.btn-fm:hover { background: #fff; color: #000; }

.fm-layout { flex: 1; display: flex; gap: 20px; min-height: 0; }

/* Explorer Pane */
.explorer-pane { width: 350px; background: rgba(255,255,255,0.02); border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); overflow-y: auto; }
.file-list { padding: 10px; }
.file-item { display: flex; align-items: center; gap: 12px; padding: 10px 15px; border-radius: 8px; cursor: pointer; transition: 0.2s; position: relative; margin-bottom: 2px; }
.file-item:hover { background: rgba(255,255,255,0.05); }
.file-item.active { background: rgba(0, 242, 254, 0.1); color: #00f2fe; }

.folder-icon { color: #f6d365; }
.file-icon { color: #4facfe; }
.file-name { font-size: 14px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.item-actions { visibility: hidden; display: flex; gap: 10px; font-size: 13px; color: #666; }
.file-item:hover .item-actions { visibility: visible; }
.item-actions i:hover { color: #fff; }

/* Editor Pane */
.editor-pane { flex: 1; background: #0a0f1d; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; overflow: hidden; }
.editor-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #333; gap: 10px; }
.editor-placeholder i { font-size: 60px; }

.editor-container { flex: 1; display: flex; flex-direction: column; }
.editor-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.editing-name { font-size: 14px; font-weight: 500; font-family: 'Fira Code', monospace; }
.editor-controls { display: flex; gap: 15px; align-items: center; }

.btn-save { background: #00f2fe; color: #000; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.btn-save:disabled { opacity: 0.5; }
.btn-close-editor { background: none; border: none; color: #555; cursor: pointer; font-size: 18px; }

.monaco-wrapper { flex: 1; position: relative; }
</style>
