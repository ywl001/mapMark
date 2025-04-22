// services/markersService.ts

import { MapExtent, MapRegion, Marker, MarkerData } from "../../app-types";
import cloudFunctions from "../../utils/cloud-functions";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";

/**
 * 地图 marker 管理服务类
 */
export class MarkersService {
  // markerMap中的_id是key，和数据库中的_id一致，用来排除已经查询过的
  // value 是marker，marker的id是number
  private _markersMap: Map<string, Marker> = new Map(); // 所有 marker（key: _id）
  private _currentMarkersMap: Map<number, Marker> = new Map(); // 当前地图上的 marker（key: id）
  private _searchMarkersMap: Map<number, Marker> = new Map(); // 搜索产生的 marker
  private _markIdCount = 1;
  private userid = getApp().globalData.userid;
  private mapContext!: WechatMiniprogram.MapContext;
  private extent!: MapExtent;
  private highLighMarkerId = 0;

  constructor() {
    EventBus.on(AppEvent.REFRESH_MARKER, () => this.refreshMarkers());
    EventBus.on(AppEvent.SEARCH_MARKER, e => this.showSearchMarkers(e));
    EventBus.on(AppEvent.CLEAR_SEARCH_MARKER, () => this.clearSearchMarker());
    EventBus.on(AppEvent.DEL_MARK, (id: string) => this.deleteMarker(id));
  }

  /** 设置地图上下文 */
  setMapContext(mapContext: WechatMiniprogram.MapContext) {
    this.mapContext = mapContext;
  }

  /** 刷新地图上的 marker，完整流程 */
  async refreshMarkers(region?: MapRegion) {
    if (region) this.extent = this.regionToExtent(region);
    await this.fetchMarkers();
    const markersInExtent = this.getMarkersInExtent(this.extent);
    this.removeMarksOutOfExtent();
    this.addNewMarkersInExtent(markersInExtent);
    console.log('refresh markerMap', this._markersMap)
    console.log('refresh currentmarkerMap', this._currentMarkersMap)
  }

  /** 获取当前视野范围内的 marker */
  getMarkersInExtent(extent: MapExtent): Marker[] {
    const markers: Marker[] = [];
    this._markersMap.forEach(marker => {
      if (
        marker.latitude >= extent.xmin && marker.latitude <= extent.xmax &&
        marker.longitude >= extent.ymin && marker.longitude <= extent.ymax
      ) {
        markers.push(marker);
      }
    });
    return markers;
  }

  /** 点击 marker 事件处理 */
  tapMarker(markId: number) {
    this.highlightMarker(markId);

    console.log('after highlight markerMap', this._markersMap)
    console.log('after highlight currentmarkerMap', this._currentMarkersMap)
    const marker = this._currentMarkersMap.get(markId);
    if (marker) EventBus.emit(AppEvent.SHOW_MARKER_INFO, marker);
  }

  /** 高亮 marker */
  private highlightMarker(id: number) {
    if (this.highLighMarkerId) {
      const oldMarker = this._currentMarkersMap.get(this.highLighMarkerId);
      if (oldMarker) {
        oldMarker.iconPath = oldMarker.icon;
        this.mapContext.removeMarkers({ markerIds: [oldMarker.id] });
        this.mapContext.addMarkers({ markers: [oldMarker] });
      }
    }

    this.highLighMarkerId = id;
    const newMarker = this._currentMarkersMap.get(id);
    if (newMarker) {
      newMarker.iconPath = newMarker.iconSelected as string;
      this.mapContext.removeMarkers({ markerIds: [newMarker.id] });
      this.mapContext.addMarkers({ markers: [newMarker] });
      this.mapContext.moveToLocation({ latitude: newMarker.latitude, longitude: newMarker.longitude });
    }
  }

  /** 根据 region 转换为 extent */
  private regionToExtent(data: MapRegion): MapExtent {
    return {
      xmax: data.northeast.latitude,
      ymax: data.northeast.longitude,
      xmin: data.southwest.latitude,
      ymin: data.southwest.longitude,
    };
  }

  /** 获取云端数据，并更新 markersMap */
  private async fetchMarkers() {
    const existingIds = Array.from(this._markersMap.keys());
    console.log(existingIds)
    const query = {
      x: { $gte: this.extent.xmin, $lte: this.extent.xmax },
      y: { $gte: this.extent.ymin, $lte: this.extent.ymax },
      _id: { $nin: existingIds },
    };

    const res: any[] = await cloudFunctions.getData('mark', query) as any[];
    const markers = res
      .map((data: MarkerData) => this.convertToMarker(data))
      .filter((m): m is Marker => m !== null);

    markers.forEach(marker => this._markersMap.set(marker._id, marker));
  }

  /** 移除超出 extent 范围的 marker */
  private removeMarksOutOfExtent() {
    const ids: number[] = [];
    this._currentMarkersMap.forEach(marker => {
      const inExtent =
        marker.latitude >= this.extent.xmin && marker.latitude <= this.extent.xmax &&
        marker.longitude >= this.extent.ymin && marker.longitude <= this.extent.ymax;
      if (!inExtent) ids.push(marker.id);
    });
    ids.forEach(id => this._currentMarkersMap.delete(id));
    this.mapContext.removeMarkers({ markerIds: ids });
  }

  /** 添加新进入 extent 范围内的 marker */
  private addNewMarkersInExtent(markersInExtent: Marker[]) {
    const currentIds = new Set(this._currentMarkersMap.keys());
    const newMarkers = markersInExtent.filter(marker => !currentIds.has(marker.id));
    newMarkers.forEach(marker => this._currentMarkersMap.set(marker.id, marker));
    this.mapContext.addMarkers({ markers: newMarkers });
  }

  /** 删除 marker 并刷新地图 */
  private deleteMarker(id: string) {
    //获取markerMap中marker的id
    const mid = this._markersMap.get(id)?.id;
    console.log('dang qing marker de id', mid)
    if (mid) {
      this.mapContext.removeMarkers({
        markerIds: [mid],
        success: () => {
          console.log('del success')
        },
        fail: () => {
          console.log('del fail')
        }
      });
      this._currentMarkersMap.delete(mid);
    }
    this._markersMap.delete(id);
    this.refreshMarkers();
    // EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
    // wx.showToast({ title: '成功', icon: 'success' });
  }

  /** 展示搜索结果 marker */
  showSearchMarkers(markDatas: MarkerData[]) {
    if (markDatas.length === 1) {
      const m = markDatas[0];
      const marker = this.convertToLocationMarker(m);
      this._searchMarkersMap.set(marker.id, marker);
      this.mapContext.addMarkers({ markers: [marker] });
      this.mapContext.moveToLocation({ latitude: m.x, longitude: m.y });
    } else {
      const markers = markDatas.map(m => this.convertToLocationMarker(m));
      const points = markDatas.map(m => ({ latitude: m.x, longitude: m.y }));
      markers.forEach(m => this._searchMarkersMap.set(m.id, m));
      this.mapContext.addMarkers({ markers });
      this.mapContext.includePoints({ points });
    }
  }

  /** 清除搜索产生的 marker */
  clearSearchMarker() {
    const ids = Array.from(this._searchMarkersMap.keys());
    this.mapContext.removeMarkers({ markerIds: ids });
    this._searchMarkersMap.clear();
  }

  /** MarkerData 转 Marker，自动根据类型转换 */
  private convertToMarker(data: MarkerData): Marker | null {
    if (data.type === 'policeStation') return this.convertToJwsMarker(data);
    if (data.type === 'camera') return this.convertToCameraMarker(data);
    return null;
  }

  /** 转换为警务室 marker */
  private convertToJwsMarker(data: MarkerData): Marker {
    const isUser = data.userid === this.userid;
    const icon = isUser ? '../../assets/jws_user.png' : '../../assets/jws.png';
    const iconSelected = isUser ? '../../assets/jws_user2.png' : '../../assets/jws2.png';
    return {
      id: this._markIdCount++,
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
    };
  }

  /** 转换为摄像头 marker */
  private convertToCameraMarker(data: MarkerData): Marker {
    let icon = '', iconSelected = '';
    switch (data.cameraType) {
      case '枪机':
        icon = '../../assets/qiangji.png';
        iconSelected = '../../assets/qiangji_press.png';
        break;
      case '球机':
        icon = '../../assets/qiuji.png';
        iconSelected = '../../assets/qiuji_press.png';
        break;
      case '卡口':
        icon = '../../assets/kakou.png';
        iconSelected = '../../assets/kakou_press.png';
        break;
      case '社会监控':
        icon = '../../assets/shehui.png';
        iconSelected = '../../assets/shehui_press.png';
        break;
    }
    return {
      id: this._markIdCount++,
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
    };
  }

  /** 转换为搜索结果 marker */
  convertToLocationMarker(data: MarkerData): Marker {
    return {
      id: this._markIdCount++,
      _id: data._id,
      latitude: data.x,
      longitude: data.y,
      anchor: { x: 0.5, y: 1 },
      iconPath: "../../assets/location.png",
      width: 40,
      height: 40,
      source: data,
    };
  }
}

export default new MarkersService();
