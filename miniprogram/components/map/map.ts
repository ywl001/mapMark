import { MapExtent, MapRegionChangeEvent, Marker } from "../../app-types";
import db from "../../utils/db";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";
import markerService from "./marker-service";



// components/map/map.ts
Component({

  options: {
    pureDataPattern: /^_/ // 所有 _ 开头的字段被视为纯数据字段
  },

  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {
    isLongpress: true,
    longitude: 112.461265,
    latitude: 34.815658,
    scale: 12,
    _currentScale: 0,
    _mapContext: {} as WechatMiniprogram.MapContext,
    isMoveMarker: false,
    moveMarkerId: '',
  },

  ready() {
    console.log('map component ready');

    this.setData({
      _mapContext: wx.createMapContext('map', this),
    })

    markerService.setMapContext(wx.createMapContext('map', this));

    //从本地取出存储的上次mapExtent
    const ex = wx.getStorageSync('mapExtent')
    if (ex) {
      this.setData({
        scale: ex.scale,
        longitude: ex.longitude,
        latitude: ex.latitude
      })
    }

    EventBus.on(AppEvent.MOVE_MARKER, (e) => {
      this.moveMarker(e)
    })
   


  },

  /**
   * 组件的方法列表
   */
  methods: {
    onRegionChange(e: MapRegionChangeEvent) {
      console.log('地图区域变化：', e.type, e.detail);
      //保存当前地图范围，下次启动从本地获取
      // 获取地图的上下左右边界（extent）
      if (e.type == 'end') {
        wx.setStorageSync('mapExtent', {
          latitude: e.detail.centerLocation.latitude,
          longitude: e.detail.centerLocation.longitude,
          scale: e.detail.scale
        })
        markerService.refreshMarkers(e.detail.region)
      }
    },


    /**长按的监听 */
    onLongpressMap(e: { detail: { x: any; y: any; }; }) {
      //判断是否是长按
      if (!this.data.isLongpress) return;
      //长按时给的是屏幕坐标
      const { x, y } = e.detail

      if (this.data._currentScale < 18) {
        this.screenToLocation(x, y, this.data._mapContext).then((res: any) => {
          this.setData({
            scale: 18,
            latitude: res.latitude,
            longitude: res.longitude
          })
        })
      } else {
        this.screenToLocation(x, y, this.data._mapContext).then((res: any) => {
          const app = getApp();
          app.globalData.markerData = {
            x: res.latitude,
            y: res.longitude
          };
          const type: string = getApp().type;
          wx.navigateTo({
            url: type === 'policeStation' ? '/pages/create_jws/create_jws' : '/pages/camera-form/camera-form'
          });
        })
      }
    },

    /**对touchStart的监听，处理当缩放手势时触发longpress事件 */
    onMapTouchStart(e: { touches: string | any[]; }) {
      // console.log(e)
      this.data.isLongpress = true;
      if (e.touches.length > 1) {
        this.data.isLongpress = false;
      }
    },

    onTapMap(e: { detail: { latitude: any; longitude: any; }; }) {
      console.log('map click', e)
      if (this.data.isMoveMarker) {
        console.log("move marker")
        this.setData({
          isMoveMarker: false
        })
        const lat = e.detail.latitude;
        const lng = e.detail.longitude;
        const data = {
          x: lat,
          y: lng
        }
        db.updateById('mark', this.data.moveMarkerId, data).then(() => {
          // EventBus.emit(AppEvent.REFRESH_MARKER)
          EventBus.emit(AppEvent.DEL_MARK, this.data.moveMarkerId)
        })
      } else {
        //取消高亮marker
        console.log('click map blank')

        EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
      }
    },

    onMarkerTap(e: { markerId: number }) {
      markerService.tapMarker(e.markerId)
    },

    getLocation() {
      wx.getLocation({}).then(res => {
        console.log(res)
        this.data._mapContext.moveToLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          fail: () => {
            wx.showToast({
              title: '定位失败',
            })
          }
        })
      })
    },

    moveMarker(e: string) {
      console.log('move marker')
      this.setData({
        isMoveMarker: true,
        moveMarkerId: e
      })
    },

    screenToLocation(x: any, y: any, mapContext: { fromScreenLocation?: any; }) {
      return new Promise((resolve, reject) => {
        mapContext.fromScreenLocation({
          x: x, // 长按事件中的屏幕坐标 x
          y: y, // 长按事件中的屏幕坐标 y
          success: (res: unknown) => {
            resolve(res)
          },
          fail: (err: any) => {
            console.log('获取经纬度失败', err);
            reject(err)
          }
        })
      })
    },
  }
})