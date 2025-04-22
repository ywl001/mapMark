import cloudFunctions from '../../utils/cloud-functions';
import { AppEvent } from '../../utils/event-bus/event-type';
import EventBus from '../../utils/event-bus/EventBus';
import { alertTool } from '../../utils/util';

Component({
  properties: {
    markerData: {} as any
  },

  data: {
    isEdit: true
  },

  ready() {
    console.log('mark info ready', this.properties.markerData)
    this.setData({
      isEdit: this.properties.markerData.userid === getApp().globalData.userid
    })
    console.log(this.data.isEdit)
  },
  methods: {
    onEdit() {
      // 处理编辑按钮点击
      console.log('编辑按钮点击');
      const app = getApp();
      app.globalData.markerData = this.properties.markerData;
      console.log(this.properties.markerData.type)
      if (this.properties.markerData.type == 'camera') {
        wx.navigateTo({
          url: `/pages/camera-form/camera-form`
        });
      } else if (this.properties.markerData.type == 'policeStation') {
        wx.navigateTo({
          url: `/pages/create_jws/create_jws`
        });
      }
    },
    onMove() {
      // 处理移动按钮点击
      console.log('移动按钮点击');
      EventBus.emit(AppEvent.MOVE_MARKER, this.properties.markerData._id);
      wx.showToast({
        title: '请在要移动的位置点击',
        icon: 'none',
        duration: 2000
      });
    },
    async onDelete() {
      // 处理删除按钮点击
      console.log('click btn del');
      const fileId = this.data.markerData.imageUrl;
      const res = await alertTool('删除警告', '确定要删除该记录吗？')
      console.log(res)
      if (res) {
        const res:any = await cloudFunctions.deleteDataById('mark', this.data.markerData._id)
        if (res.success) {
          EventBus.emit(AppEvent.DEL_MARK,this.data.markerData._id)
          if (fileId) {
            await wx.cloud.deleteFile({ fileList: [fileId] });
          }
        }else{
          wx.showToast({
            title: '删除失败',
            icon: 'error',
          });
        }
      }
    },
    // 添加拨打电话的功能
    makePhoneCall() {
      wx.makePhoneCall({
        phoneNumber: this.properties.markerData.attr.tel, // 获取电话号码
        success: function () {
          console.log('拨打电话成功');
        },
        fail: function () {
          console.log('拨打电话失败');
        }
      });
    },
    previewImage() {
      const url = this.data.markerData.imageUrl; // 当前图片 URL
      wx.previewImage({
        current: url, // 当前显示的图片 URL
        urls: [url],  // 只有一张图片时，传递一个数组
      });
    }
  }
});