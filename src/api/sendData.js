import service from '@/utils/http'

/**
 * 上传语音
 */
export function sendPcm (data) {
  return service.post('/ifly/sendv2', data)
}

/**
 * 查询语音转文字结果
 */
export function getResult (params) {
  return service({
    method: 'get',
    url: '/ifly/query',
    params: params
  })
}
