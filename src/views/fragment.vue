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
                ms,这个值可以设置很大，但不能设置很低，毕竟转码和传输还是要花费一定时间的，设备性能低下可能还处理不过来。
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
            <div style="height:100px;width:300px;border:1px solid #ccc;box-sizing: border-box;display:inline-block;vertical-align:bottom" class="processWave"></div>
            <div style="height:40px;width:300px;display:inline-block;background:#999;position:relative;vertical-align:bottom;margin-left: 10px;">
                <div class="ctrlProcessX" style="height:40px;background:#0B1;position:absolute;" :style="{width:powerLevel+'%'}"></div>
                <div class="ctrlProcessT" style="line-height:40px; position: relative;">{{ duration+"/"+powerLevel }}</div>
            </div>
        </div>

        <div class="mainBox">
            <div class="pd btns">
                <div>
                    <button @click="recOpen" style="margin-right:10px">打开录音,开始录制</button>
                    <button @click="recClose" style="margin-right:0">关闭录音,释放资源</button>
                </div>

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

import { getResult } from '../api/sendData'

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
        return// 控制缓冲达到指定间隔才进行传输
      };
      this.realTimeSendTryTime = t1
      var number = ++this.realTimeSendTryNumber

      if (buffers.length > 0) {
        // 借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
        var chunk = Recorder.SampleData(buffers, bufferSampleRate, this.sampleRate, this.realTimeSendTryChunk, { frameType: isClose ? '' : this.type })

        // 清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
        for (var i = this.realTimeSendTryChunk ? this.realTimeSendTryChunk.index : 0; i < chunk.index; i++) {
          buffers[i] = null
        };

        // 此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件
        this.realTimeSendTryChunk = chunk
        this.pcm = new Blob(chunk.data, { type: 'audio/pcm' })
        this.pcmSampleRate = chunk.sampleRate

        // this.recUploadLast()
        this.transferUpload(number, this.pcm, false)

        const logMsg = 'No.' + (number < 100 ? ('000' + number).substr(-3) : number)
        this.reclog(logMsg)
      };

      // 没有新数据，或结束时的数据量太小，不能进行mock转码
      if (this.pcm.length === 0 || (isClose && this.pcm.length < 2000)) {
        this.transferUpload(number, null, 0, null, isClose)
        return
      };

      // 实时编码队列阻塞处理
      if (!isClose) {
        if (this.realTimeSendTryEncBusy >= 2) {
          console.log('编码队列阻塞，已丢弃一帧')
          return
        };
      };
      this.realTimeSendTryEncBusy++

      // 通过mock方法实时转码成mp3、wav；16位pcm格式可以不经过此操作，直接发送new Blob([pcm],"audio/pcm") 要8位的就必须转码
      if (this.bitRate === 8) {
        var encStartTime = Date.now()
        var recMock = Recorder({
          type: 'pcm',
          sampleRate: this.sampleRate, // 采样率
          bitRate: this.bitRate // 比特率
        })
        recMock.mock(this.pcm, this.pcmSampleRate)
        recMock.stop(function (blob, duration) {
          this.realTimeSendTryEncBusy && (this.realTimeSendTryEncBusy--)
          blob.encTime = Date.now() - encStartTime

          // 转码好就推入传输
          this.transferUpload(number, blob, isClose)
        }, function (msg) {
          this.realTimeSendTryEncBusy && (this.realTimeSendTryEncBusy--)

          // 转码错误？没想到什么时候会产生错误！
          this.reclog('不应该出现的错误:' + msg, 1)
        })
      }
    },

    recOpen () {
      var This = this
      if (This.rec) {
        This.rec.close()
      };

      var rec = this.rec = Recorder({
        type: This.type,
        bitRate: This.bitRate,
        sampleRate: This.sampleRate,
        onProcess: function (buffers, powerLevel, duration, sampleRate) {
          // 录音实时回调，大约1秒调用12次本回调，buffers为开始到现在的所有录音pcm数据块(16位小端LE)
          // 可实时绘制波形（extensions目录内的waveview.js、wavesurfer.view.js、frequency.histogram.view.js插件功能）
          // 可实时上传（发送）数据，配合Recorder.SampleData方法，将buffers中的新数据连续的转换成pcm上传，或使用mock方法将新数据连续的转码成其他格式上传，可以参考文档里面的：Demo片段列表 -> 实时转码并上传-通用版；基于本功能可以做到：实时转发数据、实时保存数据、实时语音识别（ASR）等
          This.duration = duration
          This.powerLevel = powerLevel
          // 推入实时处理，因为是unknown格式，buffers和rec.buffers是完全相同的（此时采样率为浏览器采集音频的原始采样率），只需清理buffers就能释放内存，其他格式不一定有此特性。
          This.realTimeSendTry(buffers, sampleRate, false)

          // const pcmData = buffers[buffers.length - 1]
          // console.log(pcmData, 222)

          This.wave.input([], powerLevel, sampleRate)
        }
      })

      This.dialogInt = setTimeout(function () { // 定时8秒后打开弹窗，用于监测浏览器没有发起权限请求的情况
        This.showDialog()
      }, 8000)

      rec.open(function () {
        This.dialogCancel()
        rec.start()

        // 每次开始录音重制环境
        This.realTimeSendTryTime = 0
        This.reclog('已打开:' + This.type + ' ' + This.sampleRate + 'hz ' + This.bitRate + 'kbps', 2)

        This.wave = Recorder.WaveView({ elem: '.processWave' })
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
        // 最后完成录音时不能调用stop，因为数据已经被清掉了
        rec.close()
        // 最后一次发送
        this.realTimeSendTry(0, [], true)
      } else {
        this.reclog('未打开录音', 1)
      };
    },
    //= ====数据传输函数==========
    transferUpload (number, blobOrNull, isClose) {
      this.transferUploadNumberMax = Math.max(this.transferUploadNumberMax, number)
      if (blobOrNull) {
        var blob = blobOrNull

        this.blobToBase64(blob).then(res => {
          console.log('base64', res.split(',')[1])
        })
      };

      if (isClose) {
        this.reclog('No.' + (number < 100 ? ('000' + number).substr(-3) : number) + ':已停止传输')
      };
    },
    blobToBase64 (blob) {
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = (e) => {
          resolve(e.target.result)
        }
        // readAsDataURL
        fileReader.readAsDataURL(blob)
        fileReader.onerror = () => {
          reject(new Error('blobToBase64 error'))
        }
      })
    },

    recUploadLast () {
      // if (!this.pcm) {
      //   this.reclog('请先录音，然后停止后再上传', 1)
      //   return
      // };
      var This = this
      var blob = This.pcm
      var reader = new FileReader()
      reader.onloadend = function () {
        const postData = reader.result.split(',')[1]
        const data = new FormData()
        data.append('fileInfo', postData)
        data.append('sid', This.sid)
        console.log(...data, postData)
        // sendPcm(data).then((res) => {
        //   if (res.result === 'success') {
        //     This.showResult()
        //   } else {
        //     This.reclog('上传出错')
        //   }
        // }).catch(() => {})
      }
      reader.readAsDataURL(blob)
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
