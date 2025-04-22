// pages/create_jws.js

import { MarkerData } from "../../app-types";
import cloudFunctions from "../../utils/cloud-functions";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";
import resizeAndCompressImage from "../../utils/photo-utils";
import StorageKey from "../../utils/storageKey";
import { getChangeData } from "../../utils/util";


Page({
  data: {
    markerData: {} as MarkerData,
    isEdit: false,
    //修改时的原始数据
    originalData:{},
    isSubmitDisabled:false
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    const o = getApp().globalData.markerData;
    if(o){
      this.setData({
        markerData: o,
        isEdit: o._id ? true : false,
        originalData:JSON.parse(JSON.stringify(o))
      })
      getApp().globalData.markerData = null
    }
    if(!this.data.isEdit){
      const m = wx.getStorageSync(StorageKey.OWNER)
      if(m){
        this.setData({"markerData.owner":m})
      }

      const tel = wx.getStorageSync(StorageKey.TEL)
      if(tel){
        this.setData({"markerData.tel":tel})
      }

      const s = wx.getStorageSync(StorageKey.STATION)
      if(s){
        this.setData({"markerData.station":s})
      }
    }
    
    console.log(this.data)
  },

  // // 选择或拍摄照片
  // choosePhoto() {
  //   this.setData({
  //     isSubmitDisabled:true
  //   })
   
  //   wx.chooseMedia({
  //     count: 1, // 只选择一张
  //     mediaType: ['image'],
  //     success: res => {
  //       const filePath = res.tempFiles[0].tempFilePath;
  //       this.uploadPhoto(filePath); // 上传照片
  //     },
  //     fail: ()=>{
  //       console.log('choose media fail')
  //       this.setData({
  //         isSubmitDisabled:false
  //       })
  //     }
  //   });
  // },

  choosePhoto(): void {
    this.setData({
      isSubmitDisabled: true
    });

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res: WechatMiniprogram.ChooseMediaSuccessCallbackResult) => {
        const filePath: string = res.tempFiles[0].tempFilePath;
        // 延迟处理，确保拍照文件稳定
        setTimeout(() => {
          const targetSize: number = 1000; // 可动态调整，例如 800 或 1200
          resizeAndCompressImage(filePath, targetSize, (compressedFilePath: string | null) => {
            if (compressedFilePath) {
              this.uploadPhoto(compressedFilePath);
            } else {
              this.setData({
                isSubmitDisabled: false
              });
            }
          });
        }, 500);
      },
      fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
        console.log('choose media fail', err);
        this.setData({
          isSubmitDisabled: false
        });
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 上传照片到云存储
  uploadPhoto: function (filePath: any) {
    wx.showLoading({
      title: '正在上传。。。',
    })
    const cloudPath = 'marker_images/' + Date.now() + '.jpg'; // 云端路径
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        this.setData({
          'markerData.imageUrl': res.fileID // 设置上传后的文件路径
        });
      },
      fail: () => {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      },
      complete:()=>{
        this.setData({
          isSubmitDisabled:false
        })
        wx.hideLoading()
      }
    });
  },

  // 处理警务室输入
  onPoliceRoomInput: function (e: { detail: { value: any; }; }) {
    this.setData({
      "markerData.name": e.detail.value
    });
  },

  onPoliceStationInput(e: { detail: { value: any; }; }){
    this.setData({
      "markerData.station": e.detail.value
    });
    wx.setStorageSync(StorageKey.STATION, e.detail.value)
  },

  // 处理民警姓名输入
  onPoliceNameInput: function (e: { detail: { value: any; }; }) {
    this.setData({
      'markerData.owner': e.detail.value
    });
    wx.setStorageSync(StorageKey.OWNER, e.detail.value)
  },

  // 处理民警电话输入
  onPolicePhoneInput: function (e: { detail: { value: any; }; }) {
    this.setData({
      'markerData.tel': e.detail.value
    });
    wx.setStorageSync(StorageKey.TEL, e.detail.value)
  },

  // 提交表单
  onSubmit: function () {
    console.log(this.data)
    if(!this.validateInput()) return;
    if(this.data.isEdit){
      const data = getChangeData(this.data.originalData,this.data.markerData)
      console.log(data)
      const id = this.data.markerData._id;
      cloudFunctions.updateDataById('mark',id,data).then((res: any)=>{
        console.log("edit marker complete", res);
        EventBus.emit(AppEvent.REFRESH_MARKER);
        wx.navigateBack()
      })
    }else{
      const userid = getApp().globalData.userid
      this.data.markerData.userid = userid;
      this.data.markerData.type = 'policeStation';
      this.data.markerData.level = 12;
      cloudFunctions.addData('mark', this.data.markerData).then((res: any) => {
        console.log("add marker complete", res);
        EventBus.emit(AppEvent.REFRESH_MARKER);
        wx.navigateBack()
      })
    }
  },

  validateInput(){
    if(!this.data.markerData?.name || this.data.markerData.name == ''){
      wx.showToast({
        title: '警务室名称必须填写',
      })
      return false;
    }
    return true;
  },

  // 取消操作
  onCancel: function () {
    wx.navigateBack()
  }
})