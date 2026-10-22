<template>
  <div class="app-container toolbox-page">
    <header class="toolbox-page__header">
      <div class="toolbox-page__icon" :class="`toolbox-page__icon--${category}`">
        <el-icon :size="24"><component :is="categoryMeta.icon" /></el-icon>
      </div>
      <div class="toolbox-page__heading">
        <div class="toolbox-page__eyebrow">
          <span>{{ categoryMeta.title }}</span>
          <span class="toolbox-page__dot">·</span>
          <span>浏览器本地处理</span>
        </div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="toolbox-page__actions">
        <slot name="actions" />
      </div>
    </header>

    <main class="toolbox-page__body">
      <slot />
    </main>

    <footer class="toolbox-page__footer">
      <el-icon><Lock /></el-icon>
      <span>所有处理均在当前浏览器内完成，文件不会上传；请勿在共享设备上保留敏感内容。</span>
    </footer>
  </div>
</template>

<script setup>
import { toolboxCategories } from '@/data/toolbox/catalog'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'convert' }
})

const emit = defineEmits(['deactivate'])
const categoryMeta = computed(
  () =>
    toolboxCategories.find((item) => item.key === props.category) || {
      title: '工具箱',
      icon: 'Tools'
    }
)

onDeactivated(() => emit('deactivate'))
onBeforeUnmount(() => emit('deactivate'))
</script>

<style>
.toolbox-page {
  max-width: 1180px;
  margin: 0 auto;
}

.toolbox-page__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--el-bg-color) 0%, var(--el-fill-color-lighter) 100%);
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.04);
}

.toolbox-page__icon {
  flex: none;
  width: 50px;
  height: 50px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #409eff, #337ecc);
}

.toolbox-page__icon--convert {
  background: linear-gradient(135deg, #409eff, #337ecc);
}

.toolbox-page__icon--web {
  background: linear-gradient(135deg, #36cfc9, #08979c);
}

.toolbox-page__icon--development {
  background: linear-gradient(135deg, #9254de, #531dab);
}

.toolbox-page__icon--security {
  background: linear-gradient(135deg, #ff7a45, #d4380d);
}

.toolbox-page__icon--files {
  background: linear-gradient(135deg, #73d13d, #389e0d);
}

.toolbox-page__heading {
  flex: 1;
  min-width: 0;
}

.toolbox-page__eyebrow {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary);
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}

.toolbox-page__dot {
  opacity: 0.5;
}

.toolbox-page__heading h1 {
  margin: 0 0 6px;
  font-size: 24px;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.toolbox-page__heading p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.toolbox-page__actions {
  flex: none;
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbox-page__body {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbox-page__footer {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 14px;
}

.toolbox-page__footer code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--el-fill-color);
}

.toolbox-panel {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  padding: 18px;
}

.toolbox-panel + .toolbox-panel {
  margin-top: 0;
}

.toolbox-panel__title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbox-panel__title .el-icon {
  color: var(--el-color-primary);
}

.toolbox-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.toolbox-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.toolbox-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbox-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.toolbox-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.toolbox-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  margin: 6px 0 0;
}

.toolbox-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

.toolbox-code {
  margin: 0;
  padding: 14px;
  max-height: 420px;
  overflow: auto;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-text-color-primary);
}

.toolbox-form .el-form-item {
  margin-bottom: 16px;
}

.toolbox-form .el-form-item:last-child {
  margin-bottom: 0;
}

.toolbox-field-full {
  width: 100%;
}

.toolbox-empty {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 18px;
  text-align: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

.toolbox-preview-frame {
  width: 100%;
  min-height: 320px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: #fff;
}

.toolbox-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.toolbox-check-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.toolbox-color-swatch {
  width: 100%;
  height: 64px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color);
}

.toolbox-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .toolbox-page {
    padding-left: 10px;
    padding-right: 10px;
  }

  .toolbox-page__header {
    padding: 16px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .toolbox-page__icon {
    width: 42px;
    height: 42px;
  }

  .toolbox-page__heading h1 {
    font-size: 20px;
  }

  .toolbox-page__actions {
    width: 100%;
  }

  .toolbox-grid--2 {
    grid-template-columns: 1fr;
  }

  .toolbox-panel {
    padding: 14px;
  }

  .toolbox-preview-frame {
    min-height: 240px;
  }
}
</style>
