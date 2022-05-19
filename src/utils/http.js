import axios from 'axios'

const service = axios.create({
  baseURL: 'http://192.168.100.99:8080',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(config => {
  // get请求映射params参数
  if (config.method === 'get' && config.params) {
    let url = config.url + '?'

    for (const propName of Object.keys(config.params)) {
      const value = config.params[propName]
      var part = encodeURIComponent(propName) + '='
      if (value !== null && typeof (value) !== 'undefined') {
        if (typeof value === 'object') {
          for (const key of Object.keys(value)) {
            if (value[key] !== null && typeof (value[key]) !== 'undefined') {
              const params = propName + '[' + key + ']'
              const subPart = encodeURIComponent(params) + '='
              url += subPart + encodeURIComponent(value[key]) + '&'
            }
          }
        } else {
          url += part + encodeURIComponent(value) + '&'
        }
      }
    }
    url = url.slice(0, -1)
    config.params = {}
    config.url = url
  }
  // url携带参数处理
  if (config.method === 'post' && config.url.indexOf('?') > -1) {
    const url = config.url.split('?')[0]
    const data = config.url.split('?')[1]
    const params = data.split('&')
    const _obj = {}
    for (var i = 0; i < params.length; i++) {
      const key = params[i].split('=')[0]
      const value = params[i].split('=')[1]
      _obj[key] = value
    }
    config.data = _obj
    config.url = url
    return config
  }
  return config
}, error => {
  console.log(error)
  Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(res => {
  // 未设置状态码则默认成功状态
  const code = res.status || 200
  if (code === 200) {
    const { data } = res
    return data
  } else {
    console.log('响应出错')
  }
}
,
error => {
  console.log('err' + error)
  let { message } = error
  if (message === 'Network Error') {
    message = '后端接口连接异常'
  } else if (message.includes('timeout')) {
    message = '系统接口请求超时'
  } else if (message.includes('Request failed with status code')) {
    message = '系统接口' + message.substr(message.length - 3) + '异常'
  }
  return Promise.reject(error)
}
)

export default service
