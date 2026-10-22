import request from '@/utils/request'

// 查询压力测试任务列表
export function listStressTask(query) {
  return request({
    url: '/tool/stress/task/list',
    method: 'get',
    params: query
  })
}

// 创建并立即开始压力测试任务
export function addStressTask(data) {
  return request({
    url: '/tool/stress/task',
    method: 'post',
    data: data
  })
}

// 停止运行中的任务
export function stopStressTask(taskId) {
  return request({
    url: '/tool/stress/task/' + taskId + '/stop',
    method: 'put'
  })
}

// 分页查询任务请求结果
export function listStressTaskResult(taskId, query) {
  return request({
    url: '/tool/stress/task/' + taskId + '/result/list',
    method: 'get',
    params: query
  })
}

// 删除历史任务
export function delStressTask(taskId) {
  return request({
    url: '/tool/stress/task/' + taskId,
    method: 'delete'
  })
}
