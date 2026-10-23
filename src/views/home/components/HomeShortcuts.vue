<template>
  <el-card class="workbench-card shortcuts-card" shadow="never">
    <template #header>
      <div class="card-head">
        <div class="card-title-group">
          <span class="card-icon"><el-icon><Grid /></el-icon></span>
          <div>
            <div class="card-title">快捷入口</div>
            <div class="card-sub">常用页面，一处直达 · 按账号跨设备同步</div>
          </div>
        </div>
        <el-button type="primary" plain icon="Edit" @click="openEditor">编辑</el-button>
      </div>
    </template>

    <div v-if="loading" class="shortcut-skeleton">
      <el-skeleton :rows="2" animated />
    </div>

    <div v-else-if="error" class="shortcut-state">
      <el-icon class="state-icon"><WarningFilled /></el-icon>
      <div class="state-text">{{ error }}</div>
      <el-button type="primary" plain @click="loadShortcuts">重试</el-button>
    </div>

    <div v-else-if="!shortcuts.length" class="shortcut-empty">
      <el-icon class="empty-icon"><Grid /></el-icon>
      <div class="empty-title">还没有快捷入口</div>
      <div class="empty-text">从当前账号有权限的系统页面中添加常用入口，保存后跨设备同步。</div>
      <el-button type="primary" icon="Plus" @click="openEditor">添加入口</el-button>
    </div>

    <div v-else class="shortcut-grid">
      <button
        v-for="item in shortcuts"
        :key="item.menuId"
        type="button"
        class="shortcut-item"
        @click="openShortcut(item)"
      >
        <span class="shortcut-icon"><svg-icon :icon-class="iconOf(item)" /></span>
        <span class="shortcut-title">{{ item.title }}</span>
        <span v-if="item.breadcrumb && item.breadcrumb.length" class="shortcut-crumb">
          {{ item.breadcrumb.join(' / ') }}
        </span>
        <span v-else class="shortcut-crumb">{{ item.path }}</span>
      </button>
    </div>

    <el-drawer
      v-model="editorVisible"
      title="编辑快捷入口"
      :size="drawerSize"
      append-to-body
      destroy-on-close
    >
      <div class="editor">
        <section class="editor-section">
          <div class="section-head">
            <span>已添加（拖动排序）</span>
            <span class="section-count">{{ selected.length }} / {{ SHORTCUT_LIMIT }}</span>
          </div>
          <draggable
            v-if="selected.length"
            v-model="selected"
            item-key="menuId"
            handle=".drag-handle"
            :animation="180"
            class="selected-list"
          >
            <template #item="{ element }">
              <div class="selected-item">
                <el-icon class="drag-handle"><Rank /></el-icon>
                <span class="item-icon"><svg-icon :icon-class="iconOf(element)" /></span>
                <span class="item-title">{{ element.title }}</span>
                <span class="item-path">{{ element.path }}</span>
                <el-button link type="danger" icon="Delete" @click="removeItem(element)">移除</el-button>
              </div>
            </template>
          </draggable>
          <el-empty v-else description="从下方搜索并添加页面" :image-size="54" />
        </section>

        <section class="editor-section">
          <div class="section-head">
            <span>可选入口</span>
            <span v-if="optionsLoading" class="section-count">加载中</span>
          </div>
          <el-input
            v-model="optionKeyword"
            placeholder="搜索页面名称、路径或所属目录"
            clearable
            prefix-icon="Search"
          />
          <div v-if="optionsError" class="options-error">
            <span>{{ optionsError }}</span>
            <el-button link type="primary" @click="loadOptions">重试</el-button>
          </div>
          <div v-else-if="optionsLoading" class="options-loading">
            <el-skeleton :rows="2" animated />
          </div>
          <div v-else-if="availableOptions.length" class="option-list">
            <button
              v-for="item in availableOptions"
              :key="item.menuId"
              type="button"
              class="option-item"
              :disabled="selected.length >= SHORTCUT_LIMIT"
              @click="addItem(item)"
            >
              <span class="option-main">
                <span class="item-icon"><svg-icon :icon-class="iconOf(item)" /></span>
                <span class="item-title">{{ item.title }}</span>
              </span>
              <span class="option-sub">{{ item.breadcrumb && item.breadcrumb.length ? item.breadcrumb.join(' / ') : item.path }}</span>
              <el-icon class="option-plus"><Plus /></el-icon>
            </button>
          </div>
          <el-empty v-else description="没有匹配的可选页面" :image-size="54" />
        </section>

        <div v-if="saveError" class="save-error">{{ saveError }}</div>
      </div>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveShortcuts">保存</el-button>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Grid, Plus, Rank, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import { useRouter } from 'vue-router'
import {
  getHomeShortcutOptions,
  getHomeShortcuts,
  saveHomeShortcuts
} from '@/api/home'
import useAppStore from '@/store/modules/app'
import {
  SHORTCUT_LIMIT,
  filterShortcutOptions,
  shortcutRoute
} from '../workbench'

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const error = ref('')
const shortcuts = ref([])
const options = ref([])
const optionsLoading = ref(false)
const optionsError = ref('')
const editorVisible = ref(false)
const selected = ref([])
const optionKeyword = ref('')
const saving = ref(false)
const saveError = ref('')

const drawerSize = computed(() => (appStore.device === 'mobile' ? '92%' : '520px'))
const selectedIds = computed(() => new Set(selected.value.map(item => item.menuId)))
const availableOptions = computed(() => {
  const rest = options.value.filter(item => !selectedIds.value.has(item.menuId))
  return filterShortcutOptions(rest, optionKeyword.value)
})

onMounted(() => {
  loadShortcuts()
  loadOptions()
})

async function loadShortcuts() {
  loading.value = true
  error.value = ''
  try {
    const res = await getHomeShortcuts()
    shortcuts.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    shortcuts.value = []
    error.value = '快捷入口加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const res = await getHomeShortcutOptions()
    options.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    options.value = []
    optionsError.value = '可选页面加载失败，请重试。'
  } finally {
    optionsLoading.value = false
  }
}

async function openEditor() {
  optionKeyword.value = ''
  saveError.value = ''
  if (!options.value.length && !optionsLoading.value) {
    await loadOptions()
  }
  const optionMap = new Map(options.value.map(item => [item.menuId, item]))
  selected.value = shortcuts.value
    .slice(0, SHORTCUT_LIMIT)
    .map(item => optionMap.get(item.menuId) || { ...item })
  editorVisible.value = true
}

function addItem(item) {
  if (selected.value.length >= SHORTCUT_LIMIT) {
    ElMessage.warning(`快捷入口最多 ${SHORTCUT_LIMIT} 个`)
    return
  }
  if (selectedIds.value.has(item.menuId)) {
    return
  }
  selected.value.push(item)
}

function removeItem(item) {
  selected.value = selected.value.filter(entry => entry.menuId !== item.menuId)
}

async function saveShortcuts() {
  saving.value = true
  saveError.value = ''
  try {
    await saveHomeShortcuts(selected.value.map(item => item.menuId))
    ElMessage.success('快捷入口已保存')
    editorVisible.value = false
    await loadShortcuts()
  } catch (e) {
    saveError.value = '保存失败，请确认菜单权限后重试。'
  } finally {
    saving.value = false
  }
}

function openShortcut(item) {
  const target = shortcutRoute(item)
  if (target) {
    router.push(target)
  }
}

function iconOf(item) {
  const icon = item && item.icon ? item.icon : ''
  return icon && icon !== '#' ? icon : 'link'
}
</script>

<style scoped>
.shortcuts-card {
  background: var(--el-bg-color-overlay);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  font-size: 18px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-height: 94px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.shortcut-item:hover {
  transform: translateY(-2px);
  border-color: var(--el-color-primary-light-5);
  box-shadow: var(--el-box-shadow-light);
}

.shortcut-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-bottom: 4px;
  border-radius: 9px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-size: 18px;
}

.shortcut-title {
  font-size: 14px;
  font-weight: 600;
}

.shortcut-crumb {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.shortcut-skeleton {
  padding: 6px 0;
}

.shortcut-state,
.shortcut-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 4px 8px;
}

.shortcut-empty {
  align-items: center;
  text-align: center;
  padding: 28px 10px;
}

.empty-icon {
  font-size: 40px;
  color: var(--el-text-color-placeholder);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-text {
  max-width: 460px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.state-icon {
  font-size: 26px;
  color: var(--el-color-warning);
}

.state-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-height: 100%;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 9px;
  background: var(--el-fill-color-lighter);
}

.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
}

.item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-size: 15px;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.item-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.option-list {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.option-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 10px;
  align-items: center;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.option-item:last-child {
  border-bottom: 0;
}

.option-item:hover:not(:disabled) {
  background: var(--el-fill-color-light);
}

.option-item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.option-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.option-sub {
  grid-column: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 34px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.option-plus {
  grid-column: 2;
  grid-row: 1 / span 2;
  color: var(--el-color-primary);
}

.options-error,
.save-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.options-loading {
  padding: 6px 0;
}

@media (max-width: 640px) {
  .shortcut-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .selected-item {
    flex-wrap: wrap;
  }

  .item-path {
    flex-basis: 100%;
    padding-left: 46px;
  }

  .card-head {
    align-items: flex-start;
  }
}
</style>
