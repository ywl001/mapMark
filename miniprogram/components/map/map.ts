import {
  MapExtent,
  MapRegion,
  MapRegionChangeEvent,
  Marker,
  MarkerData,
} from "../../app-types";
import cloudFunctions from "../../utils/cloud-functions";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";

// components/map/map.ts
Component({
  options: {
    pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
  },

  properties: {},

  data: {
    _markersMap: {} as Record<string, Marker>,
    _currentMarkersMap: {} as Record<number, Marker>,
    _searchMarkersMap: {} as Record<number, Marker>,
    _markIdCount: 1,
    _highLighMarkerId: 0,
    _extent: {} as MapExtent,
    _mapContext: {} as WechatMiniprogram.MapContext,
    _isMoveMarker: false,
    _moveMarkerId: "",
    _isUser: false,

    currentScale: 0,
    isLongpress: true,
    longitude: 112.461265,
    latitude: 34.815658,
    scale: 16,
    isSatellite:false,
  },

  ready() {
    const mapContext = wx.createMapContext("map", this);

    this.setData({ _mapContext: mapContext });

    const ex = wx.getStorageSync("mapExtent");
    if (ex) {
      this.setData({
        scale: ex.scale,
        longitude: ex.longitude,
        latitude: ex.latitude,
      });
    }

    EventBus.on(AppEvent.MOVE_MARKER, (e) => this.moveMarker(e));
    EventBus.on(AppEvent.REFRESH_MARKER, () => this.refreshMarkers());
    EventBus.on(AppEvent.SEARCH_MARKER, (e) => this.showSearchMarkers(e));
    EventBus.on(AppEvent.CLEAR_SEARCH_MARKER, () => this.clearSearchMarker());
    EventBus.on(AppEvent.DEL_MARK, (id: string) => this.deleteMarker(id));

    EventBus.on(AppEvent.CHANGE_MAP_LAYER, () => {this.setData({isSatellite:!this.data.isSatellite})});
  },

  methods: {
    /** 地图区域变化时触发 */
    onRegionChange(e: MapRegionChangeEvent) {
      if (e.type === "end") {
        wx.setStorageSync("mapExtent", {
          latitude: e.detail.centerLocation.latitude,
          longitude: e.detail.centerLocation.longitude,
          scale: e.detail.scale,
        });

        this.setData({
          currentScale: e.detail.scale,
        });

        this.refreshMarkers(e.detail.region);
      }
    },

    /** 刷新地图上的 marker，完整流程 */
    async refreshMarkers(region?: MapRegion) {
      if (region) this.data._extent = this.regionToExtent(region);
      await this.fetchMarkers();
      const markersInExtent = this.getMarkersInExtent(this.data._extent);
      this.removeMarksOutOfExtent();
      this.addNewMarkersInExtent(markersInExtent);
      console.log("refresh current marker:", this.data._currentMarkersMap);
    },

    /** 根据 region 转换为 extent */
    regionToExtent(data: MapRegion): MapExtent {
      return {
        xmax: data.northeast.latitude,
        ymax: data.northeast.longitude,
        xmin: data.southwest.latitude,
        ymin: data.southwest.longitude,
      };
    },

    /** 获取云端数据，并更新 markersMap */
    async fetchMarkers() {
      const existingIds = Object.keys(this.data._markersMap);
      // console.log('排除数组：', existingIds)
      const query = {
        x: { $gte: this.data._extent.xmin, $lte: this.data._extent.xmax },
        y: { $gte: this.data._extent.ymin, $lte: this.data._extent.ymax },
        _id: { $nin: existingIds },
        level: { $lte: this.data.currentScale },
      };

      const res: any[] = (await cloudFunctions.getData("mark", query)) as any[];
      console.log("返回了", res);
      const r = res.filter((v) => !this.data._markersMap.hasOwnProperty(v._id));
      // console.log(r)
      const markers = r
        .map((data: MarkerData) => this.convertToMarker(data))
        .filter((m): m is Marker => m !== null);

      markers.forEach((marker) => (this.data._markersMap[marker._id] = marker));
    },

    /** 获取当前视野范围内的 marker */
    getMarkersInExtent(extent: MapExtent): Marker[] {
      const markers: Marker[] = [];

      for (const key in this.data._markersMap) {
        const marker = this.data._markersMap[key];
        if (
          marker.latitude >= extent.xmin &&
          marker.latitude <= extent.xmax &&
          marker.longitude >= extent.ymin &&
          marker.longitude <= extent.ymax &&
          marker.level <= this.data.currentScale
        ) {
          markers.push(marker);
        }
      }
      return markers;
    },

    /** 移除超出 extent 范围的 marker */
    removeMarksOutOfExtent() {
      const markers: Marker[] = [];

      for (const key in this.data._currentMarkersMap) {
        const marker = this.data._currentMarkersMap[key];
        const inExtent =
          marker.latitude >= this.data._extent.xmin &&
          marker.latitude <= this.data._extent.xmax &&
          marker.longitude >= this.data._extent.ymin &&
          marker.longitude <= this.data._extent.ymax;

        //不在地图范围或者显示级别大于当前地图级别
        if (!inExtent || marker.level > this.data.currentScale)
          markers.push(marker);
      }

      markers.forEach((m) => {
        if (m.id == this.data._highLighMarkerId) {
          console.log("移除高亮id");
          this.data._highLighMarkerId = 0;
          m.iconPath = m.icon;
          EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
        }
        delete this.data._currentMarkersMap[m.id];
      });

      const ids = markers.map((m) => m.id);
      this.data._mapContext.removeMarkers({ markerIds: ids });
    },

    clearHighlight(id: number) {
      const m = this.data._currentMarkersMap[id];
      m.iconPath = m.icon;
      this.data._highLighMarkerId = 0;
      EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
    },

    /** 添加新进入 extent 范围内的 marker */
    addNewMarkersInExtent(markersInExtent: Marker[]) {
      const ids = Object.keys(this.data._currentMarkersMap).map(Number);
      const newMarkers = markersInExtent.filter(
        (marker) => !ids.includes(marker.id)
      );
      newMarkers.forEach(
        (marker) => (this.data._currentMarkersMap[marker.id] = marker)
      );
      this.data._mapContext.addMarkers({ markers: newMarkers });
    },

    /** 长按地图触发添加 marker */
    onLongpressMap(e: { detail: { x: number; y: number } }) {
      if (!this.data.isLongpress) return;

      const { x, y } = e.detail;

      const handleLocation = (res: any) => {
        if (this.data.currentScale < 18) {
          this.setData({
            scale: 18,
            latitude: res.latitude,
            longitude: res.longitude,
          });
        } else {
          const app = getApp();
          app.globalData.markerData = { x: res.latitude, y: res.longitude };
          const type: string = getApp().type;
          console.log(type);
          wx.navigateTo({
            url:
              type === "policeStation"
                ? "/pages/create_jws/create_jws"
                : "/pages/camera-form/camera-form",
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
      if (this.data._isMoveMarker) {
        this.setData({ _isMoveMarker: false });

        const { latitude: lat, longitude: lng } = e.detail;
        const data = { x: lat, y: lng };

        // db.updateById('mark', this.data._moveMarkerId, data).then(() => {
        //   EventBus.emit(AppEvent.DEL_MARK, this.data._moveMarkerId);
        // });
        cloudFunctions
          .updateDataById("mark", this.data._moveMarkerId, data)
          .then((res: any) => {
            if (res.success) {
              EventBus.emit(AppEvent.DEL_MARK, this.data._moveMarkerId);
            } else {
              wx.showToast({
                title: "更新失败",
              });
            }
          });
      } else {
        // EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
      }
    },

    /** 点击 marker 事件 */
    onMarkerTap(e: { markerId: number }) {
      const markerId = e.markerId;
      this.highlightMarker(markerId);

      console.log("after highlight markerMap", this.data._markersMap);
      console.log(
        "after highlight currentmarkerMap",
        this.data._currentMarkersMap
      );
      const marker = this.data._currentMarkersMap[markerId];
      if (marker) EventBus.emit(AppEvent.SHOW_MARKER_INFO, marker);
    },

    /** 高亮 marker */
    highlightMarker(id: number) {
      if (this.data._highLighMarkerId) {
        const oldMarker =
          this.data._currentMarkersMap[this.data._highLighMarkerId];
        if (oldMarker) {
          oldMarker.iconPath = oldMarker.icon;
          this.data._mapContext.removeMarkers({ markerIds: [oldMarker.id] });
          this.data._mapContext.addMarkers({ markers: [oldMarker] });
        }
      }

      this.data._highLighMarkerId = id;
      const newMarker = this.data._currentMarkersMap[id];
      if (newMarker) {
        newMarker.iconPath = newMarker.iconSelected as string;
        this.data._mapContext.removeMarkers({ markerIds: [newMarker.id] });
        this.data._mapContext.addMarkers({ markers: [newMarker] });
        this.data._mapContext.moveToLocation({
          latitude: newMarker.latitude,
          longitude: newMarker.longitude,
        });
      }
    },

    /** 获取当前位置并移动地图中心 */
    onLocationClick() {
      wx.getLocation({}).then((res) => {
        this.data._mapContext.moveToLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          fail: () => {
            wx.showToast({ title: "定位失败" });
          },
        });
      });
    },

    /** 标记为待移动 marker 状态 */
    moveMarker(e: string) {
      this.setData({
        _isMoveMarker: true,
        _moveMarkerId: e,
      });
    },

    /** 将屏幕坐标转换为地图经纬度 */
    screenToLocation(x: number, y: number, mapContext: any) {
      return new Promise((resolve, reject) => {
        mapContext.fromScreenLocation({
          x,
          y,
          success: (res: any) => resolve(res),
          fail: (err: any) => {
            // 获取经纬度失败
            reject(err);
          },
        });
      });
    },

    deleteMarker(id: string) {
      //获取markerMap中marker的id
      const mid = this.data._markersMap[id].id;
      //延迟执行，让页面加载完
      setTimeout(() => {
        if (mid) {
          this.data._mapContext.removeMarkers({
            markerIds: [mid],
            success: () => {
              console.log("del success");
            },
            fail: () => {
              console.log("del fail");
            },
          });
          delete this.data._currentMarkersMap[mid];
        }
        delete this.data._markersMap[id];
        this.refreshMarkers();
        EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
        wx.showToast({ title: "成功", icon: "success" });
      }, 100);
    },

    /** 展示搜索结果 marker */
    showSearchMarkers(markDatas: MarkerData[]) {
      if (markDatas.length === 1) {
        const m = markDatas[0];
        const marker = this.convertToLocationMarker(m);
        this.data._searchMarkersMap[marker.id] = marker;
        this.data._mapContext.addMarkers({ markers: [marker] });
        // this.data._mapContext.moveToLocation({ latitude: m.x, longitude: m.y });

        this.setData({
          latitude: m.x,
          longitude: m.y,
          scale: m.level,
        })
      } else {
        const markers = markDatas.map((m) => this.convertToLocationMarker(m));
        const points = markDatas.map((m) => ({
          latitude: m.x,
          longitude: m.y,
        }));
        markers.forEach((m) => (this.data._searchMarkersMap[m.id] = m));
        this.data._mapContext.addMarkers({ markers });
        this.data._mapContext.includePoints({ points });
      }
    },

    /** 清除搜索产生的 marker */
    clearSearchMarker() {
      const ids = Object.keys(this.data._searchMarkersMap);
      this.data._mapContext.removeMarkers({ markerIds: ids });
      this.data._searchMarkersMap = {};
    },

    /** MarkerData 转 Marker，自动根据类型转换 */
    convertToMarker(data: MarkerData): Marker | null {
      if (data.type === "policeStation") return this.convertToJwsMarker(data);
      if (data.type === "camera") return this.convertToCameraMarker(data);
      return null;
    },

    /** 转换为警务室 marker */
    convertToJwsMarker(data: MarkerData): Marker {
      const isUser = data.userid === getApp().globalData.userid;
      const icon = isUser
        ? "../../assets/jws_user.png"
        : "../../assets/jws.png";
      const iconSelected = isUser
        ? "../../assets/jws_user2.png"
        : "../../assets/jws2.png";
      return {
        id: this.data._markIdCount++,
        _id: data._id,
        latitude: data.x,
        longitude: data.y,
        anchor: { x: 0.5, y: 0.5 },
        label: {
          content: data.name,
          color: "#000",
          fontSize: 14,
          anchorX: 10,
          anchorY: -10,
          borderRadius: 10,
          textAlign: "right",
        },
        iconPath: icon,
        width: 20,
        height: 20,
        source: data,
        iconSelected,
        icon,
        level: data.level,
      };
    },

    /** 转换为摄像头 marker */
    convertToCameraMarker(data: MarkerData): Marker {
      const isUser = data.userid === getApp().globalData.userid;
      let icon = "",
        iconSelected = "";
      switch (data.cameraType) {
        case "枪机":
          icon = isUser
            ? "../../assets/qiangji_user.png"
            : "../../assets/qiangji.png";
          iconSelected = "../../assets/qiangji_press.png";
          break;
        case "球机":
          icon = isUser
            ? "../../assets/qiuji_user.png"
            : "../../assets/qiuji.png";
          iconSelected = "../../assets/qiuji_press.png";
          break;
        case "卡口":
          icon = isUser
            ? "../../assets/kakou_user.png"
            : "../../assets/kakou.png";
          iconSelected = "../../assets/kakou_press.png";
          break;
        case "社会监控":
          icon = isUser
            ? "../../assets/shehui_user.png"
            : "../../assets/shehui.png";
          iconSelected = "../../assets/shehui_press.png";
          break;
      }
      return {
        id: this.data._markIdCount++,
        _id: data._id,
        latitude: data.x,
        longitude: data.y,
        anchor: { x: 0.5, y: 0.5 },
        rotate: data.angle,
        iconPath: icon,
        width: 20,
        height: 20,
        source: data,
        iconSelected,
        icon,
        level: data.level,
      };
    },

    /** 转换为搜索结果 marker */
    convertToLocationMarker(data: MarkerData): Marker {
      return {
        id: this.data._markIdCount++,
        _id: data._id,
        latitude: data.x,
        longitude: data.y,
        anchor: { x: 0.5, y: 1 },
        iconPath: "../../assets/location.png",
        width: 40,
        height: 40,
        source: data,
        level: data.level,
      };
    },
  },
});
