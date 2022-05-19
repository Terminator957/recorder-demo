<template>
  <div id="app">
    <h1>语音转文字demo</h1>
    <h4>当前语音转文字仅支持pcm格式音频</h4>
    <el-tabs v-model="activeName" style="max-width: 700px;margin: 0 auto;">
      <el-tab-pane label="整段转文字" name="first">
        <Home></Home>
      </el-tab-pane>
      <el-tab-pane label="语音分片转文字" name="second">
        <Fragment></Fragment>
      </el-tab-pane>
    </el-tabs>
    <!-- <router-view/> -->
  </div>
</template>

<script>
import Home from './views/Home.vue'
import Fragment from './views/fragment.vue'
export default {
  data () {
    return {
      activeName: 'first'
    }
  },
  components: { Home, Fragment }
}
</script>
<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
