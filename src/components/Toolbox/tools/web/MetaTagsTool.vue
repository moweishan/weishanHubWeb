<template>
  <ToolPage
    title="Meta 标签生成"
    description="生成 title、description、Open Graph、Twitter Card 与 canonical 等常用标签。输出是纯文本，不会写入页面 head，也不会执行脚本。"
    category="web"
  >
    <div class="toolbox-panel">
      <el-form label-position="top" class="toolbox-form">
        <h3 class="toolbox-panel__title"><el-icon><Document /></el-icon>基础信息</h3>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="页面标题">
              <el-input v-model="form.title" clearable placeholder="weishanHub 工具箱" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Canonical URL">
              <el-input v-model="form.canonical" clearable placeholder="https://example.com/toolbox" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="页面摘要，建议 120-160 字符" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="关键词">
              <el-input v-model="form.keywords" placeholder="工具,转换,开发" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="作者">
              <el-input v-model="form.author" placeholder="weishan" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="Robots">
              <el-select v-model="form.robots" clearable class="toolbox-field-full">
                <el-option label="index,follow" value="index,follow" />
                <el-option label="noindex,nofollow" value="noindex,nofollow" />
                <el-option label="noindex,follow" value="noindex,follow" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">Open Graph</el-divider>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="og:title">
              <el-input v-model="form.ogTitle" placeholder="留空则使用页面标题" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="og:type">
              <el-select v-model="form.ogType" class="toolbox-field-full">
                <el-option label="website" value="website" />
                <el-option label="article" value="article" />
                <el-option label="product" value="product" />
                <el-option label="profile" value="profile" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="og:description">
          <el-input v-model="form.ogDescription" type="textarea" :rows="2" placeholder="留空则使用页面描述" />
        </el-form-item>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="12">
            <el-form-item label="og:url">
              <el-input v-model="form.ogUrl" placeholder="https://example.com/page" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="og:image">
              <el-input v-model="form.ogImage" placeholder="https://example.com/cover.png" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="og:site_name">
          <el-input v-model="form.siteName" placeholder="weishanHub" />
        </el-form-item>

        <el-divider content-position="left">Twitter Card</el-divider>
        <el-row :gutter="14">
          <el-col :xs="24" :sm="8">
            <el-form-item label="twitter:card">
              <el-select v-model="form.twitterCard" class="toolbox-field-full">
                <el-option label="summary" value="summary" />
                <el-option label="summary_large_image" value="summary_large_image" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="twitter:image">
              <el-input v-model="form.twitterImage" placeholder="https://example.com/cover.png" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="theme-color">
              <el-input v-model="form.themeColor" placeholder="#409EFF" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="toolbox-actions">
          <el-button type="primary" icon="MagicStick" @click="generate">生成标签</el-button>
          <el-button icon="DocumentAdd" @click="loadSample">载入示例</el-button>
          <el-button icon="Delete" @click="clearAll">清空</el-button>
        </div>
      </el-form>
    </div>

    <ToolResult
      label="Meta 标签"
      :text="result"
      :rows="rows"
      :error="error"
      :warning="warning"
      filename="meta-tags.html"
      mime="text/html;charset=utf-8"
      clearable
      @clear="result = ''"
    />
  </ToolPage>
</template>

<script setup>
import ToolPage from '@/components/Toolbox/ToolPage.vue'
import ToolResult from '@/components/Toolbox/ToolResult.vue'
import { generateMetaTags } from '@/utils/toolbox/web'

const form = reactive({
  title: 'weishanHub 工具箱',
  description: '浏览器本地运行的开发者工具箱，覆盖转换、Web、开发与安全常用功能。',
  keywords: '工具箱,转换,开发,安全',
  author: 'weishan',
  robots: 'index,follow',
  canonical: 'https://example.com/toolbox',
  ogTitle: '',
  ogDescription: '',
  ogType: 'website',
  ogUrl: 'https://example.com/toolbox',
  ogImage: '',
  siteName: 'weishanHub',
  twitterCard: 'summary',
  twitterImage: '',
  themeColor: '#409EFF'
})

const result = ref('')
const rows = ref([])
const error = ref('')
const warning = 'canonical、og:url、og:image 与 twitter:image 必须是 http(s) 绝对地址；生成结果只用于复制。'

function generate() {
  error.value = ''
  result.value = ''
  rows.value = []
  try {
    result.value = generateMetaTags(form)
    rows.value = [
      { label: '标题长度', value: `${form.title.length} 字符` },
      { label: '描述长度', value: `${form.description.length} 字符` },
      { label: '标签数量', value: `${result.value.split('\n').filter(Boolean).length} 行` }
    ]
  } catch (err) {
    error.value = err.message
  }
}

function loadSample() {
  Object.assign(form, {
    title: 'weishanHub 工具箱',
    description: '浏览器本地运行的开发者工具箱，覆盖转换、Web、开发与安全常用功能。',
    keywords: '工具箱,转换,开发,安全',
    author: 'weishan',
    robots: 'index,follow',
    canonical: 'https://example.com/toolbox',
    ogTitle: '',
    ogDescription: '',
    ogType: 'website',
    ogUrl: 'https://example.com/toolbox',
    ogImage: '',
    siteName: 'weishanHub',
    twitterCard: 'summary',
    twitterImage: '',
    themeColor: '#409EFF'
  })
  result.value = ''
  rows.value = []
  error.value = ''
}

function clearAll() {
  Object.keys(form).forEach((key) => {
    form[key] = ''
  })
  form.ogType = 'website'
  form.twitterCard = 'summary'
  result.value = ''
  rows.value = []
  error.value = ''
}
</script>
