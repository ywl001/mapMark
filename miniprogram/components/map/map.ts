import { MapExtent, MapRegion, MapRegionChangeEvent, Marker, MarkerData } from "../../app-types";
import cloudFunctions from "../../utils/cloud-functions";
import db from "../../utils/db";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";

// components/map/map.ts
Component({

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
    markers: [] as any[],
    markIdCount: 1,
    currentExtent: {} as MapExtent,
    currentScale: 0,
    mapContext: {} as WechatMiniprogram.MapContext,
    isMoveMarker: false,
    selectedMarker: {} as Marker
  },

  ready() {
    console.log('map component ready');
    this.setData({
      mapContext: wx.createMapContext('map', this),
    })

    EventBus.on(AppEvent.REFRESH_MARKER, () => {
      this.getMarkData()
      EventBus.emit(AppEvent.REMOVE_MARKER_INFO)
    })

    EventBus.on(AppEvent.SEARCH_MARKER, (e: any) => {
      this.showSearchMarker(e)
    })

    EventBus.on(AppEvent.MOVE_MARKER, () => {
      this.moveMarker()
    })
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onRegionChange(e: MapRegionChangeEvent) {
      console.log('地图区域变化：', e.type, e.detail);
      // 获取地图的上下左右边界（extent）
      if (e.type == 'end') {
        this.setData({
          currentScale: e.detail.scale,
          currentExtent: this.regionToExtent(e.detail.region)
        })
        // eventBus.emit(AppEvent.REFRESH_MARKER)
        this.getMarkData()
      }
    },

    /**长按的监听 */
    onLongpressMap(e: { detail: { x: any; y: any; }; }) {
      //判断是否是长按
      if (!this.data.isLongpress) return;
      //长按时给的是屏幕坐标
      const {
        x,
        y
      } = e.detail

      if (this.data.currentScale < 18) {
        this.screenToLocation(x, y, this.data.mapContext).then((res: any) => {
          this.setData({
            scale: 18,
            latitude: res.latitude,
            longitude: res.longitude
          })
        })
      } else {
        this.screenToLocation(x, y, this.data.mapContext).then((res:any)=>{
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
        console.log("aaa move marker")
        this.setData({
          isMoveMarker: false
        })
        const lat = e.detail.latitude;
        const lng = e.detail.longitude;
        const data = {
          x: lat,
          y: lng
        }
        console.log(this.data.selectedMarker)
        db.updateById('mark', this.data.selectedMarker.source._id, data).then(() => {
          EventBus.emit(AppEvent.REFRESH_MARKER)
        })
      }
    },

    onMarkerTap(e: { markerId: any; }) {
      console.log('mark click', e)
      const markerId = e.markerId;
      const marker = this.data.markers.find((item:any) => item.id === markerId);
      if (marker) {
        this.setData({
          selectedMarker: marker
        })
        console.log(this.data.selectedMarker)
        EventBus.emit(AppEvent.SHOW_MARKER_INFO, marker)
        this.highlightMarker(markerId)
      } else {
        this.data.mapContext.removeMarkers({
          markerIds: [markerId]
        })
      }
    },

    regionToExtent(data: MapRegion) {
      return {
        xmax: data.northeast.latitude, // 地图区域的上边界
        ymax: data.northeast.longitude, // 地图区域的右边界
        xmin: data.southwest.latitude, // 地图区域的下边界
        ymin: data.southwest.longitude // 地图区域的左边界
      }
    },

    getMarkData(mapExtent?: MapExtent) {
      console.log('get mark data');
      const extent = mapExtent ? mapExtent : this.data.currentExtent
      // const wdb = wx.cloud.database()
      const query = {
        x: {
          $gte: extent.xmin,
          $lte: extent.xmax
        }, // 纬度条件
        y: {
          $gte: extent.ymin,
          $lte: extent.ymax
        }// 经度条件
      };

      cloudFunctions.getData('mark', query).then((res:any) => {
        console.log('获取了：',res.length)
        const markers = res
          .map((data: MarkerData): Marker | null => {
            if (data.type === 'policeStation') {
              return this.convertToJwsMarker(data);
            } else if (data.type === 'camera') {
              return this.convertToCameraMarker(data);
            }
            return null;
          })
          .filter((m): m is Marker => m !== null); // 🔥 类型守卫

        this.setData({
          markers
        });
      });
    },

    convertToJwsMarker(data: MarkerData): Marker {
      let icon;
      let icon_selected;

      if (getApp().globalData.userid == data.userid) {
        icon = "../../assets/jws_user.png"
        icon_selected = '../../assets/jws_user2.png'
      } else {
        icon = '../../assets/jws.png'
        icon_selected = '../../assets/jws2.png'
      }
      console.log(getApp().globalData.userid, data.userid)
      return {
        id: this.data.markIdCount++, // 使用 _id 字符串作为 id
        latitude: data.x, // 将 x 转换为纬度
        longitude: data.y, // 将 y 转换为经度
        anchor: {
          x: 0.5,
          y: 0.5
        },
        label: {
          content: data.name, // 显示marker的name
          color: "#000", // 文本颜色
          fontSize: 14, // 字体大小
          anchorX: 10,
          anchorY: -10,

          // bgColor: "#ffffff",  // 背景色
          borderRadius: 10, // 圆角
          // padding: 5,  // 内边距
          textAlign: "right"
        },
        iconPath: icon, // 自定义图标
        width: 20, // 图标宽度
        height: 20, // 图标高度
        source: data,
        iconSelected: icon_selected,
        icon: icon
      };
    },

    convertToCameraMarker(data: MarkerData): Marker {
      let icon = '';
      let icon_selected = '';

      if (data.cameraType == '枪机') {
        icon = "../../assets/qiangji.png"
        icon_selected = '../../assets/qiangji_press.png'
      } else if (data.cameraType == '球机') {
        icon = "../../assets/qiuji.png"
        icon_selected = '../../assets/qiuji_press.png'
      } else if (data.cameraType == '卡口') {
        icon = "../../assets/kakou.png"
        icon_selected = '../../assets/kakou_press.png'
      }
      const id = this.data.markIdCount++;
      return {
        id: id,
        latitude: data.x, // 将 x 转换为纬度
        longitude: data.y, // 将 y 转换为经度
        anchor: {
          x: 0.5,
          y: 0.5
        },
        iconPath: icon, // 自定义图标
        width: 20, // 图标宽度
        height: 20, // 图标高度
        source: data,
        rotate: data.angle,
        iconSelected: icon_selected,
        icon: icon
      };
    },

    convertToLocationMarker(data: { x: number; y: number; }): Marker {
      return {
        id: this.data.markIdCount++, // 使用 _id 字符串作为 id
        latitude: data.x, // 将 x 转换为纬度
        longitude: data.y, // 将 y 转换为经度
        anchor: {
          x: 0.5,
          y: 1
        },
        iconPath: "../../assets/location.png", // 自定义图标
        width: 40, // 图标宽度
        height: 40, // 图标高度
        source: data
      };
    },

    highlightMarker(markid: any) {
      const updatedMarkers = this.data.markers.map((marker: any) => {
        if (marker.id === markid) {
          // 被点击的 marker 设置为高亮图标，label 设置为传入的红色
          return {
            ...marker,
            iconPath: marker.iconSelected,
            // label: {
            //   ...marker.label,
            //   color: "#ff0000" // 设置 label 颜色为传入的颜色
            // }
          };
        }
        // 其他 markers 恢复为默认状态，label 恢复为黑色
        return {
          ...marker,
          iconPath: marker.icon,
          // label: {
          //   ...marker.label,
          //   color: '#000000' // 恢复为黑色
          // }
        };
      });
      // 更新数据
      this.setData({
        markers: updatedMarkers
      });
    },

    showSearchMarker(markData: MarkerData) {
      console.log(markData)
      this.data.mapContext.moveToLocation({
        latitude: markData.x,
        longitude: markData.y,
        success: () => {
          const marker = this.convertToLocationMarker(markData);
          this.data.mapContext.addMarkers({
            markers: [marker],
            success: () => {
              console.log('search ok')
            }
          })
        }
      })
    },

    getLocation() {
      wx.getLocation({}).then(res => {
        console.log(res)
        this.data.mapContext.moveToLocation({
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

    moveMarker() {
      console.log('move marker')
      this.setData({
        isMoveMarker: true
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