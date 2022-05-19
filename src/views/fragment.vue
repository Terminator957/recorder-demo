<template>
<div class="home">
    <div class="demoMain">
        <div class="mainBox">
            <div class="pd" style="display: flex;">
                <span class="lb" style="margin-right: 10px;">类型 :</span> <span class="types">
                <el-radio v-model="radio" label="1">pcm</el-radio>
                </span>
            </div>
            <div class="pd" style="display: flex;">
                <span class="lb" style="width: 37px;height: 20px;margin-right: 10px;">提示 :</span>
                <span style="width: 90%;text-align: start;"> pcm编码器稳定版，pcm转码超快，pcm为未封装的原始音频数据，pcm数据文件无法直接播放；支持位数8位、16位（填在比特率里面），采样率取值无限制</span>
            </div>
            <div class="pd" style="display: flex;">
                <span class="lb" style="margin-right: 10px;">分片间隔:</span> <el-input v-model="sendInterval" size="mini" style="width: 100px;margin-right: 10px;"></el-input>
                ms，建议>=1000ms
            </div>
            <div class="pd" style="display: flex;">
                <span class="lb" style="margin-right: 10px;">比特率:</span> <el-input v-model="bitRate" size="mini" style="width: 50px;margin-right: 10px;"></el-input>
                kbps，越大音质越好
            </div>
            <div style="display: flex;">
                <span class="lb" style="margin-right: 10px;">采样率:</span>  <el-input v-model="sampleRate" size="mini" style="width: 100px;margin-right: 10px;"></el-input>
                hz，越大细节越丰富
            </div>
        </div>

        <div class="mainBox">
            <div style="height:100px;width:300px;border:1px solid #ccc;box-sizing: border-box;display:inline-block;vertical-align:bottom" class="ctrlProcessWave"></div>
            <div style="height:40px;width:300px;display:inline-block;background:#999;position:relative;vertical-align:bottom;margin-left: 10px;">
                <div class="ctrlProcessX" style="height:40px;background:#0B1;position:absolute;" :style="{width:powerLevel+'%'}"></div>
                <div class="ctrlProcessT" style="line-height:40px; position: relative;">{{ duration+"/"+powerLevel }}</div>
            </div>
        </div>

        <div class="mainBox">
            <div class="pd btns">
                <div>
                    <button @click="recOpen" style="margin-right:10px">打开录音,请求权限</button>
                    <button @click="recClose" style="margin-right:0">关闭录音,释放资源</button>
                </div>

                <button @click="recStart">录制</button>
                <button @click="recStop">停止</button>

                <span style="display: inline-block;">
                    <button @click="recPause">暂停</button>
                    <button @click="recResume">继续</button>
                </span>
                <span style="display: inline-block;">
                    <button @click="recPlayLast" v-if="type !== 'pcm'">播放</button>
                    <button @click="recUploadLast" v-if="type === 'pcm'">语音转文字</button>
                    </span>
            </div>
        </div>

        <div class="mainBox">
        <audio ref="LogAudioPlayer" style="width:100%"></audio>

        <div class="mainLog">
            <div v-for="obj in logs" :key="obj.idx">
                <div :style="{color:obj.color==1?'red':obj.color==2?'green':obj.color}">
                    <!-- <template v-once> 在v-for里存在的bug，参考：https://v2ex.com/t/625317 -->
                    <span v-once>[{{ getTime() }}]</span><span v-html="obj.msg"/>

                    <template v-if="obj.res">
                        {{ intp(obj.res.rec.set.bitRate,3) }}kbps
                        {{ intp(obj.res.rec.set.sampleRate,5) }}hz
                        编码{{ intp(obj.res.blob.size,6) }}b
                        [{{ obj.res.rec.set.type }}]{{ intp(obj.res.duration,6) }}ms

                        <button @click="recdown(obj.idx)">下载</button>
                        <button @click="recplay(obj.idx)">播放</button>

                        <span v-html="obj.playMsg"></span>
                        <span v-if="obj.down">
                            <span style="color:red">{{ obj.down }}</span>

                            没弹下载？试一下链接或复制文本<button @click="recdown64(obj.idx)">生成Base64文本</button>

                            <textarea v-if="obj.down64Val" v-model="obj.down64Val"></textarea>
                        </span>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <div v-if="recOpenDialogShow" style="z-index:99999;width:100%;height:100%;top:0;left:0;position:fixed;background:rgba(0,0,0,0.3);">
        <div style="display:flex;height:100%;align-items:center;">
            <div style="flex:1;"></div>
            <div style="width:240px;background:#fff;padding:15px 20px;border-radius: 10px;">
                <div style="padding-bottom:10px;">录音功能需要麦克风权限，请允许；如果未看到任何请求，请点击忽略~</div>
                <div style="text-align:center;"><a @click="waitDialogClick" style="color:#0B1">忽略</a></div>
            </div>
            <div style="flex:1;"></div>
        </div>
    </div>

    </div>
</div>
</template>

<script>
import Recorder from 'recorder-core'
// 需要使用到的音频格式编码引擎的js文件统统加载进来，这些引擎文件会比较大
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'
import 'recorder-core/src/engine/wav'
import 'recorder-core/src/engine/pcm'

// 可选的扩展
import 'recorder-core/src/extensions/buffer_stream.player'
import 'recorder-core/src/extensions/waveview'

import { sendPcm, getResult } from '../api/sendData'

export default {
  name: 'fragment',
  data () {
    return {
      radio: '1',
      Rec: Recorder,
      type: 'pcm',
      bitRate: 16,
      sampleRate: 16000,
      rec: 0,
      stream: 0,
      duration: 0,
      powerLevel: 0,
      recOpenDialogShow: 0,
      logs: [],
      transformResult: '',
      sid: '',
      sendInterval: 1000,
      realTimeSendTryEncBusy: 0,
      realTimeSendTryTime: 0,
      realTimeSendTryNumber: 0,
      transferUploadNumberMax: 0,
      realTimeSendTryChunk: null,
      pcm: [],
      pcmSampleRate: 0
    }
  },
  watch: {
    radio (val) {
      switch (val) {
        case '1':
          this.type = 'mp3'
          this.logs.unshift(
            { msg: '<span style="color:green">mp3编码引擎已加载，可以录音了</span>' }
          )
          break
        case '2':
          this.type = 'wav'
          this.logs.unshift(
            { msg: '<span style="color:green">wav编码引擎已加载，可以录音了</span>' }
          )
          break
        case '3':
          this.type = 'pcm'
          this.logs.unshift(
            { msg: '<span style="color:green">pcm编码引擎已加载，可以录音了</span>' }
          )
          break
      }
    }
  },
  mounted () {
    const support = this.Rec.Support()
    this.logs.unshift(
      { msg: `<span">当前浏览器<span style="color:${support ? 'green">支持录音' : 'red">不支持录音'}</span>` }
    )
  },
  methods: {
    // =====实时处理核心函数==========
    realTimeSendTry (buffers, bufferSampleRate, isClose) {
      var t1 = Date.now()
      if (this.realTimeSendTryTime === 0) {
        this.realTimeSendTryTime = t1
        this.realTimeSendTryEncBusy = 0
        this.realTimeSendTryNumber = 0
        this.transferUploadNumberMax = 0
        this.realTimeSendTryChunk = null
      };
      const intervalTime = t1 - this.realTimeSendTryTime
      if (!isClose && (intervalTime < this.sendInterval)) {
        console.log('达到指定间隔')
        return// 控制缓冲达到指定间隔才进行传输
      };
      this.realTimeSendTryTime = t1
      //   var number = ++this.realTimeSendTryNumber
      if (buffers.length > 0) {
        // 借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
        var chunk = Recorder.SampleData(buffers, bufferSampleRate, this.sampleRate, this.realTimeSendTryChunk, { frameType: isClose ? '' : this.type })

        // 清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
        for (var i = this.realTimeSendTryChunk ? this.realTimeSendTryChunk.index : 0; i < chunk.index; i++) {
          buffers[i] = null
        };
        this.realTimeSendTryChunk = chunk// 此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件

        this.pcm = chunk.data
        this.pcmSampleRate = chunk.sampleRate
      };

      // 没有新数据，或结束时的数据量太小，不能进行mock转码
      if ((chunk.data.length === 0 || isClose) && chunk.data.length < 2000) {
        //   TransferUpload(number, null, 0, null, isClose)
        return
      };

      // 实时编码队列阻塞处理
      if (!isClose) {
        if (this.realTimeSendTryEncBusy >= 2) {
          this.reclog('编码队列阻塞，已丢弃一帧', 1)
          return
        };
      };
      this.realTimeSendTryEncBusy++

      // 通过mock方法实时转码成mp3、wav；pcm格式可以不经过此操作，直接发送chunk.data
      var encStartTime = Date.now()
      var recMock = Recorder({
        type: this.type,
        sampleRate: this.sampleRate, // 采样率
        bitRate: this.bitRate // 比特率
      })
      recMock.mock(chunk.data, chunk.sampleRate)
      recMock.stop(function (blob, duration) {
        this.realTimeSendTryEncBusy && (this.realTimeSendTryEncBusy--)
        blob.encTime = Date.now() - encStartTime

        // 转码好就推入传输
        // TransferUpload(number, blob, duration, recMock, isClose)
      }, function (msg) {
        this.realTimeSendTryEncBusy && (this.realTimeSendTryEncBusy--)

        // 转码错误？没想到什么时候会产生错误！
        this.reclog('不应该出现的错误:' + msg, 1)
      })
    },

    recOpen () {
      var This = this
      var rec = this.rec = Recorder({
        type: This.type,
        bitRate: This.bitRate,
        sampleRate: This.sampleRate,
        onProcess: function (buffers, powerLevel, duration, sampleRate) {
          This.duration = duration
          This.powerLevel = powerLevel
          This.realTimeSendTry(buffers, sampleRate, false)
          This.wave.input(buffers[buffers.length - 1], powerLevel, sampleRate)
        }
      })

      This.dialogInt = setTimeout(function () { // 定时8秒后打开弹窗，用于监测浏览器没有发起权限请求的情况
        This.showDialog()
      }, 8000)

      rec.open(function () {
        This.dialogCancel()
        rec.start()// 开始录音
        This.reclog('已打开:' + This.type + ' ' + This.sampleRate + 'hz ' + This.bitRate + 'kbps', 2)

        This.wave = Recorder.WaveView({ elem: '.ctrlProcessWave' })
      }, function (msg, isUserNotAllow) {
        This.dialogCancel()
        This.reclog((isUserNotAllow ? 'UserNotAllow，' : '') + '打开失败：' + msg, 1)
      })

      This.waitDialogClickFn = function () {
        This.dialogCancel()
        This.reclog('打开失败：权限请求被忽略，用户主动点击的弹窗', 1)
      }
    },
    recClose () {
      const rec = this.rec
      this.rec = null
      if (rec) {
        rec.close()
        this.reclog('已关闭')
      } else {
        this.reclog('未打开录音', 1)
      };
    },
    recStart () {
      if (!this.rec || !Recorder.IsOpen()) {
        this.reclog('未打开录音', 1)
        return
      }
      this.sid = this.$uuid.v1()
      this.rec.start()

      var set = this.rec.set
      this.reclog('录制中：' + set.type + ' ' + set.sampleRate + 'hz ' + set.bitRate + 'kbps')
    },
    recPause () {
      if (this.rec && Recorder.IsOpen()) {
        this.rec.pause()
      } else {
        this.reclog('未打开录音', 1)
      };
    },
    recResume () {
      if (this.rec && Recorder.IsOpen()) {
        this.rec.resume()
      } else {
        this.reclog('未打开录音', 1)
      };
    },
    recStop () {
      var This = this
      var rec = This.rec
      if (!(this.rec && Recorder.IsOpen())) {
        This.reclog('未打开录音', 1)
        return
      }
      rec.close()
      This.realTimeSendTry([], 0, false)
    //   rec.stop(function (blob, duration) {
    //     This.reclog('已录制:', 1, {
    //       blob: blob,
    //       duration: duration,
    //       rec: rec
    //     })
    //     // console.log(blob, duration, rec)
    //   }, function (s) {
    //     This.reclog('录音失败：' + s, 1)
    //   })
    },
    recPlayLast () {
      if (!this.recLogLast) {
        this.reclog('请先录音，然后停止后再播放', 1)
        return
      };
      this.recplay(this.recLogLast.idx)
    },
    recUploadLast () {
      if (!this.recLogLast) {
        this.reclog('请先录音，然后停止后再上传', 1)
        return
      };
      var This = this
      var blob = This.recLogLast.res.blob
      var reader = new FileReader()
      reader.onloadend = function () {
        const postData = reader.result.split(',')[1]
        const data = new FormData()
        data.append('fileInfo', postData)
        data.append('sid', This.sid)

        sendPcm(data).then((res) => {
          if (res.result === 'success') {
            This.showResult()
          } else {
            This.reclog('上传出错')
          }
        }).catch(() => {})
      }
      reader.readAsDataURL(blob)
      This.reclog('正在进行语音转文字，请稍后...', '#f60')
    },
    async showResult () {
      await getResult({ sid: this.sid }).then(res => {
        if (res.endFlag === '1') {
          if (res.transResult === '' || res.transResult === null) {
            this.reclog('请录制清晰的语音！', 1)
            return
          }
          this.reclog(`语音转文字结果：${res.transResult ? res.transResult : ''}`, 2)
          return
        }
        setTimeout(() => {
          return this.showResult()
        }, 500)
      }).catch(err => {
        console.log(err)
      })
    },
    showDialog () {
    // 我们可以选择性的弹一个对话框：为了防止移动端浏览器存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调
      if (!/mobile/i.test(navigator.userAgent)) {
        return// 只在移动端开启没有权限请求的检测
      };
      this.recOpenDialogShow = 1
    },
    dialogCancel () {
      clearTimeout(this.dialogInt)
      this.recOpenDialogShow = 0
    },
    waitDialogClickFn () {
      this.dialogCancel()
      this.reclog('打开失败：权限请求被忽略，用户主动点击的弹窗', 1)
    },
    waitDialogClick () {
      this.dialogCancel()
      this.waitDialogClickFn()
    },
    recplay (idx) {
      var This = this
      var o = this.logs[this.logs.length - idx - 1]
      o.play = (o.play || 0) + 1

      var audio = this.$refs.LogAudioPlayer
      audio.controls = true
      if (!(audio.ended || audio.paused)) {
        audio.pause()
      };
      audio.onerror = function (e) {
        This.logs.unshift({
          msg: '<span style="color:red">播放失败[' + audio.error.code + ']' + audio.error.message + '</span>'
        })
      }
      // eslint-disable-next-line no-undef
      audio.src = (window.URL || webkitURL).createObjectURL(o.res.blob)
      audio.play()

      if (This.radio === '3') {
        This.logs.unshift({ msg: '<span style="color:orange">正在转码成wav...</span>' })
        // const wavData = o.res.blob
        // eslint-disable-next-line no-undef
        // audio.src = (window.URL || webkitURL).createObjectURL(wavData)
        // audio.play()
        This.logs.unshift({ msg: '<span style="color:green">已转码成wav播放</span>' })
        // wav(wavData, function (blob) {
        //   end(blob)
        //   logmsg('已转码成wav播放')
        // }, function (msg) {
        //   logmsg('<span style="color:red">转码成wav失败：' + msg + '</span>')
        // })
      }
    },
    recdown: function (idx) {
    // eslint-disable-next-line no-unused-vars
      var This = this
      var o = this.logs[this.logs.length - idx - 1]
      o.down = (o.down || 0) + 1
      o = o.res
      var name = this.$uuid.v1()
      var downA = document.createElement('A')
      // eslint-disable-next-line no-undef
      downA.href = (window.URL || webkitURL).createObjectURL(o.blob)
      downA.download = name
      downA.click()
    },
    recdown64: function (idx) {
    // eslint-disable-next-line no-unused-vars
      var This = this
      var o = this.logs[this.logs.length - idx - 1]
      var reader = new FileReader()
      reader.onloadend = function () {
        o.down64Val = reader.result
      }
      reader.readAsDataURL(o.res.blob)
    },
    reclog (msg, color, res) {
      var obj = {
        idx: this.logs.length,
        msg: msg,
        color: color,
        res: res,

        playMsg: '',
        down: 0,
        down64Val: ''
      }
      if (res && res.blob) {
        this.recLogLast = obj
      };
      this.logs.splice(0, 0, obj)
    },
    getTime () {
      var now = new Date()
      var t = ('0' + now.getHours()).substr(-2) +
            ':' + ('0' + now.getMinutes()).substr(-2) +
            ':' + ('0' + now.getSeconds()).substr(-2)
      return t
    },
    intp (s, len) {
      s = s == null ? '-' : s + ''
      if (s.length >= len) return s
      return ('_______' + s).substr(-len)
    }
  }
}
</script>
<style scoped>
body {
  word-wrap: break-word;
  background: #f5f5f5 center top no-repeat;
  background-size: auto 680px;
}

pre {
  white-space: pre-wrap;
}

a {
  text-decoration: none;
  color: #06c;
}

a:hover {
  color: #f00;
}

.home {
  max-width: 700px;
  margin: 0 auto;
  padding-bottom: 80px
}

.mainBox {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  background: #fff;
  --border: 1px solid #f60;
  box-shadow: 2px 2px 3px #aaa;
}

.btns button {
  display: inline-block;
  cursor: pointer;
  border: none;
  border-radius: 3px;
  background: #f60;
  color: #fff;
  padding: 0 15px;
  margin: 3px 20px 3px 0;
  line-height: 36px;
  height: 36px;
  overflow: hidden;
  vertical-align: middle;
}

.btns button:active {
  background: #f00;
}

.recwaveChoice {
  cursor: pointer;
  display: inline-block;
  vertical-align: bottom;
  border-right: 1px solid #ccc;
  background: #ddd;
  line-height: 28px;
  font-size: 12px;
  color: #666;
  padding: 0 5px;
}

.recwaveChoice:first-child {
  border-radius: 99px 0 0 99px;
}

.recwaveChoice:last-child {
  border-radius: 0 99px 99px 0;
  border-right: none;
}

.recwaveChoice.slc,
.recwaveChoice:hover {
  background: #f60;
  color: #fff;
}

.lb {
  display: inline-block;
  vertical-align: middle;
  background: #00940e;
  color: #fff;
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 99px;
}

.pd {
  padding: 0 0 6px 0;
}
</style>
