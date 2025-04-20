import { MarkerData } from "../../app-types";
import db from "../../utils/db";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";
import StorageKey from "../../utils/storageKey";
import { getChangeData } from "../../utils/util";


Page({
  stopTouchMove() {
    return false;
  },
  stopTouch() {
    return false;
  },
  data: {
    markerData: {
      cameraType: '枪机',
      level: 12
    } as MarkerData,
    cameraTypes: ['枪机', '球机', '卡口','社会监控'],  // 你可以在这里定义监控类型
    selectedType: 0,  // 默认选择第一个类型
    showAnglePicker: false, // 是否显示照射方向选择器
    isEdit: false,
    originalData: {},
    isSubmitDisabled: false
  },

  /**
    * 生命周期函数--监听页面加载
    */
  onLoad() {
    const o = getApp().globalData.markerData;
    console.log(o)
    if (o) {
      this.setData({
        markerData: Object.assign(this.data.markerData, o),
        isEdit: o._id ? true : false,
        originalData: JSON.parse(JSON.stringify(o))
      })

      if (!this.data.isEdit) {
        const m = wx.getStorageSync(StorageKey.OWNER)
        if (m) {
          this.setData({ "markerData.owner": m })
        }
      }
      getApp().globalData.markerData = null
    }
    console.log(this.data)
  },

  // 显示监控类型选择框
  showTypePicker() {
    wx.showActionSheet({
      itemList: this.data.cameraTypes,
      success: (res) => {
        console.log(this.data.cameraTypes[res.tapIndex])
        this.setData({
          'markerData.cameraType': this.data.cameraTypes[res.tapIndex]
        })
      }
    })
  },

  onPhoneInput(e: { detail: { value: any; }; }) {
    this.setData({
      'markerData.tel': e.detail.value
    })
  },
  onOwnerInput(e: { detail: { value: any; }; }) {

    console.log('owner', e.detail.value)
    this.setData({
      'markerData.owner': e.detail.value
    })
    wx.setStorageSync(StorageKey.OWNER, e.detail.value)
  },
  onNameInput(e: { detail: { value: any; }; }) {
    this.setData({
      'markerData.name': e.detail.value
    })
  },

  // 滑动条值改变时
  onSliderChange(e: { detail: { value: any; }; }) {
    const { value } = e.detail;
    this.setData({
      'markerData.level': value, // 更新显示级别
    });
  },

  // 照射方向输入框点击事件
  onAngleInput() {
    this.setData({
      showAnglePicker: true
    })
  },

  // 角度选择器返回角度值
  onAngleChanged(e: { detail: { angle: any; }; }) {
    this.setData({
      'markerData.angle': e.detail.angle
    });
    this.closeAnglePicker();
  },

  // 关闭角度选择器
  closeAnglePicker() {
    this.setData({
      showAnglePicker: false
    });
  },

  choosePhoto() {
    this.setData({
      isSubmitDisabled: true
    })

    wx.chooseMedia({
      count: 1, // 只选择一张
      mediaType: ['image'],
      success: res => {
        const filePath = res.tempFiles[0].tempFilePath;
        this.uploadPhoto(filePath); // 上传照片
      },
      fail: () => {
        console.log('choose media fail')
        this.setData({
          isSubmitDisabled: true
        })
      }
    });
  },

  // 上传照片到云存储
  uploadPhoto(filePath: any) {
    wx.showLoading({
      title: '正在上传。。。',
    })
    const cloudPath = 'marker_images/' + Date.now() + '.jpg'; // 云端路径
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        console.log(res.fileID)
        this.setData({
          'markerData.imageUrl': res.fileID,// 设置上传后的文件路径
          isSubmitDisabled: false
        });
      },
      fail: () => {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isSubmitDisabled: false
        })
        wx.hideLoading()
      }
    });
  },

  // 确认按钮
  // onConfirm() {
  //   // console.log('表单数据:', this.data.form);
  //   // console.log('显示级别:', this.data.level);
  //   console.log('表单数据:', this.data.markerData);
  // },

  onConfirm() {
    console.log(this.data)
    // if(!this.validateInput()) return;
    if (this.data.isEdit) {
      const data = getChangeData(this.data.originalData, this.data.markerData)
      console.log(data)
      const id = this.data.markerData._id;
      db.updateById('mark', id, data).then((res: any) => {
        console.log("edit marker complete", res);
        EventBus.emit(AppEvent.DEL_MARK,id)
        wx.navigateBack()
      })
    } else {
      const userid = getApp().globalData.userid
      this.data.markerData.userid = userid;
      this.data.markerData.type = 'camera';
      db.add('mark', this.data.markerData).then((res: any) => {
        console.log("add camera complete", res);
        EventBus.emit(AppEvent.REFRESH_MARKER);
        wx.navigateBack()
      })
    }
  },

  // 取消按钮
  onCancel() {
    console.log('取消选择');
    wx.navigateBack()
  },

  validateInput() {
    if (!this.data.markerData?.name || this.data.markerData.name == '') {
      wx.showToast({
        title: '监控名称必须填写',
      })
      return false;
    }
    return true;
  },
});
