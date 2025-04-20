import { MapRegionChangeEvent } from "../../app-types";
import db from "../../utils/db";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";
import markerService from "./marker-service";

// components/map/map.ts
Component({

  options: {
    pureDataPattern: /^_/ // 所有 _ 开头的字段被视为纯数据字段
  },

  properties: {},

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
    const mapContext = wx.createMapContext('map', this);

    this.setData({ _mapContext: mapContext });
    markerService.setMapContext(mapContext);

    const ex = wx.getStorageSync('mapExtent');
    if (ex) {
      this.setData({
        scale: ex.scale,
        longitude: ex.longitude,
        latitude: ex.latitude
      });
    }

    EventBus.on(AppEvent.MOVE_MARKER, (e) => this.moveMarker(e));
  },

  methods: {

    /** 地图区域变化时触发 */
    onRegionChange(e: MapRegionChangeEvent) {
      if (e.type === 'end') {
        wx.setStorageSync('mapExtent', {
          latitude: e.detail.centerLocation.latitude,
          longitude: e.detail.centerLocation.longitude,
          scale: e.detail.scale
        });

        markerService.refreshMarkers(e.detail.region);
      }
    },

    /** 长按地图触发添加 marker */
    onLongpressMap(e: { detail: { x: number; y: number } }) {
      if (!this.data.isLongpress) return;

      const { x, y } = e.detail;

      const handleLocation = (res: any) => {
        if (this.data._currentScale < 18) {
          this.setData({
            scale: 18,
            latitude: res.latitude,
            longitude: res.longitude
          });
        } else {
          const app = getApp();
          app.globalData.markerData = { x: res.latitude, y: res.longitude };

          const type: string = getApp().type;
          wx.navigateTo({
            url: type === 'policeStation'
              ? '/pages/create_jws/create_jws'
              : '/pages/camera-form/camera-form'
          });
        }
      };

      this.screenToLocation(x, y, this.data._mapContext).then(handleLocation);
    },

    /** 触摸地图时判断是否是缩放操作（双指）来取消长按添加 */
    onMapTouchStart(e: { touches: any[] }) {
      this.data.isLongpress = e.touches.length <= 1;
    },

    /** 点击地图事件 */
    onTapMap(e: { detail: { latitude: number; longitude: number } }) {
      if (this.data.isMoveMarker) {
        this.setData({ isMoveMarker: false });

        const { latitude: lat, longitude: lng } = e.detail;
        const data = { x: lat, y: lng };

        db.updateById('mark', this.data.moveMarkerId, data).then(() => {
          EventBus.emit(AppEvent.DEL_MARK, this.data.moveMarkerId);
        });
      } else {
        EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
      }
    },

    /** 点击 marker 事件 */
    onMarkerTap(e: { markerId: number }) {
      markerService.tapMarker(e.markerId);
    },

    /** 获取当前位置并移动地图中心 */
    getLocation() {
      wx.getLocation({}).then(res => {
        this.data._mapContext.moveToLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          fail: () => {
            wx.showToast({ title: '定位失败' });
          }
        });
      });
    },

    /** 标记为待移动 marker 状态 */
    moveMarker(e: string) {
      this.setData({
        isMoveMarker: true,
        moveMarkerId: e
      });
    },

    /** 将屏幕坐标转换为地图经纬度 */
    screenToLocation(x: number, y: number, mapContext: WechatMiniprogram.MapContext) {
      return new Promise((resolve, reject) => {
        mapContext.fromScreenLocation({
          x,
          y,
          success: (res) => resolve(res),
          fail: (err) => {
            // 获取经纬度失败
            reject(err);
          }
        });
      });
    }

  }
});
