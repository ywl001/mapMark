import { Marker } from "../../app-types"
import { AppEvent } from "../../utils/event-bus/event-type"
import EventBus from "../../utils/event-bus/EventBus"

Page({
  data: {
    currentMarkerData: {},  // NOTE: 当前选中的标记点数据
    showPicker: true       // NOTE: 是否显示功能选择器
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.initUserInfo()       // NOTE: 初始化用户信息
    this.setupEventListeners() // NOTE: 设置事件监听
  },

  /** 
   * 获取用户OpenID并存储到全局
   */
  initUserInfo() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      complete: (res: any) => {
        // NOTE: 将openid存储到globalData供全局使用
        getApp().globalData.userid = res.result.openid
      }
    })
  },

  /**
   * 初始化事件总线监听
   */
  setupEventListeners() {
    // NOTE: 监听显示标记点信息事件
    EventBus.on(AppEvent.SHOW_MARKER_INFO, (e) => { this.onShowMarkerInfo(e) })
    // NOTE: 监听移除标记点信息事件
    EventBus.on(AppEvent.REMOVE_MARKER_INFO, () => { this.hideMarkInfo() })
  },

  /**
   * 功能选择器回调
   * @param {Object} e - 事件对象
   * @param {string} e.detail.type - 选择的类型 camera/policeStation 
   */
  onPickerSelect(e: any) {
    const { type } = e.detail
    this.setData({ showPicker: false }) // NOTE: 选择后隐藏弹窗
    getApp().type = type // NOTE: 存储选择类型到全局
  },

  /**
   * 显示标记点信息
   * @param {Object} data - 标记点数据 
   */
  onShowMarkerInfo(data: Marker) {
    if (!data) return
    this.setData({ currentMarkerData: data.source })
  },

  /**
   * 点击地图空白处时清除当前标记点
   */
  hideMarkInfo() {
    console.log(this.data.currentMarkerData)
    this.setData({ currentMarkerData: {} })
  }
})