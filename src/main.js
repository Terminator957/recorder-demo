import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 按需引入element
import '@/element/index'
import UUID from 'vue-uuid'

Vue.config.productionTip = false
Vue.use(UUID)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
