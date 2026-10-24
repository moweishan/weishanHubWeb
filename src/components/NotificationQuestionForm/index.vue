<template>
  <section v-if="question" class="question-form">
    <h2>任务需要你的选择</h2>
    <el-alert :title="statusText" :type="question.state === 'APPLIED' ? 'success' : 'info'" :closable="false" show-icon />
    <el-form v-if="question.state === 'WAITING'" label-position="top" @submit.prevent="submit">
      <el-form-item v-for="(item, index) in question.questions" :key="item.id" :label="item.question">
        <div class="question-options">
          <p v-if="item.header" class="question-header">{{ item.header }}</p>
          <div v-if="item.detail" class="question-detail">{{ detailText(item.detail) }}</div>
          <el-checkbox-group v-if="item.multiSelect" v-model="draft[index].selected" :disabled="busy">
            <el-checkbox v-for="option in item.options || []" :key="option.label" :value="option.label">
              {{ option.label }}<span v-if="option.description" class="option-description">{{ option.description }}</span>
            </el-checkbox>
          </el-checkbox-group>
          <el-radio-group v-else v-model="draft[index].single" :disabled="busy" @change="draft[index].custom = ''">
            <el-radio v-for="option in item.options || []" :key="option.label" :value="option.label">
              {{ option.label }}<span v-if="option.description" class="option-description">{{ option.description }}</span>
            </el-radio>
          </el-radio-group>
          <el-input v-model="draft[index].custom" type="textarea" :rows="2" maxlength="10000" :disabled="busy"
            placeholder="也可以输入自己的答案；全部留空表示跳过此题" @input="!item.multiSelect && (draft[index].single = '')" />
          <el-button v-if="draft[index].single || draft[index].selected.length" text :disabled="busy" @click="clear(index)">清除选择</el-button>
        </div>
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="busy">提交答案</el-button>
      <p class="question-hint">提交后不可修改。系统不识别回答者身份，首份提交会被保存；任务取消或本地先完成时，以原生调用最终结果为准。</p>
    </el-form>
    <div v-else-if="question.answer" class="saved-answers">
      <div v-for="item in question.questions" :key="item.id">
        <strong>{{ item.question }}</strong>
        <p>{{ answerText(item.id) }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNotificationQuestion, submitNotificationAnswer } from '@/api/notification/public'
const props = defineProps({ token: { type: String, required: true } })
const emit = defineEmits(['access-error'])
const question = ref(null)
const draft = ref([])
const busy = ref(false)
let active = true
let timer
let generation = 0
const statusText = computed(() => ({ WAITING: '等待回答；不会超时自动选择', ANSWERED: '答案已提交，等待 DeepSeek 应用',
  APPLIED: question.value?.source === 'LOCAL' ? '已完成，采用本地原生窗口回答' : 'DeepSeek 已应用远程答案',
  CANCELLED: '原问题已取消' })[question.value?.state] || '状态未知')
const detailText = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2)
function clear(index) { draft.value[index].single = ''; draft.value[index].selected = [] }
function answerText(id) {
  const row = question.value.answer?.answers?.find(item => item.id === id)
  return row ? [...(row.selected || []), ...(row.custom ? [row.custom] : [])].join('；') || '已跳过' : '-'
}
function apply(data) {
  if (data?.state === 'WAITING' && question.value && question.value.state !== 'WAITING') return
  question.value = data || null
  if (data && draft.value.length === 0) draft.value = data.questions.map(() => ({ selected: [], single: '', custom: '' }))
}
function accessError(error) {
  if ([401, 403, 404].includes(error?.code)) {
    question.value = null
    emit('access-error', error)
    return true
  }
  return false
}
async function refresh() {
  const current = generation
  try {
    const response = await getNotificationQuestion(props.token)
    if (!active || current !== generation) return
    apply(response.data)
  } catch (error) {
    if (!active || current !== generation || accessError(error)) return
    if (!question.value) ElMessage.error('交互问题加载失败，请刷新重试')
  }
  if (active && current === generation && ['WAITING', 'ANSWERED'].includes(question.value?.state)) timer = setTimeout(refresh, 3000)
}
async function submit() {
  const current = generation
  try { await ElMessageBox.confirm('提交后无法修改，确定发送本批答案？', '提交选择', { type: 'warning' }) } catch { return }
  if (!active || current !== generation || question.value?.state !== 'WAITING') return
  busy.value = true
  const answers = question.value.questions.map((item, index) => {
    const row = draft.value[index]
    return { id: item.id, selected: item.multiSelect ? [...row.selected] : row.single ? [row.single] : [],
      ...(row.custom.trim() ? { custom: row.custom.trim() } : {}) }
  })
  try {
    const response = await submitNotificationAnswer(props.token, { answers })
    if (active && current === generation) { apply(response.data); ElMessage.success('答案已提交') }
  } catch (error) {
    if (active && current === generation && !accessError(error)) {
      ElMessage.error(error?.msg || '提交失败，请刷新确认状态后重试')
      clearTimeout(timer)
      await refresh()
    }
  } finally { busy.value = false }
}
watch(() => props.token, () => { generation++; clearTimeout(timer); question.value = null; draft.value = []; refresh() })
onMounted(refresh)
onBeforeUnmount(() => { active = false; generation++; clearTimeout(timer) })
</script>

<style scoped>
.question-form { margin-top: 28px; padding-top: 20px; border-top: 1px solid #ebeef5; }
.question-form h2 { font-size: 20px; }
.question-form :deep(.el-form) { margin-top: 20px; }
.question-options { width: 100%; }
.question-options :deep(.el-radio-group), .question-options :deep(.el-checkbox-group) { display: flex; flex-direction: column; align-items: flex-start; width: 100%; margin-bottom: 12px; }
.question-options :deep(.el-radio), .question-options :deep(.el-checkbox) { height: auto; white-space: normal; margin: 6px 0; }
.question-options :deep(.el-radio__label), .question-options :deep(.el-checkbox__label) { white-space: normal; line-height: 1.6; overflow-wrap: anywhere; }
.option-description { display: block; color: #909399; font-size: 13px; }
.question-header, .question-hint { color: #909399; font-size: 13px; }
.question-detail { white-space: pre-wrap; overflow-wrap: anywhere; margin-bottom: 12px; }
.saved-answers { padding-top: 18px; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
