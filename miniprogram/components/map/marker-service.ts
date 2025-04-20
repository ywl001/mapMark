// services/markersService.ts

import { MapExtent, MapRegion, Marker, MarkerData } from "../../app-types";
import cloudFunctions from "../../utils/cloud-functions";
import { AppEvent } from "../../utils/event-bus/event-type";
import EventBus from "../../utils/event-bus/EventBus";


export class MarkersService {

  private markersMap: Map<string, Marker> = new Map(); // 所有 marker（key: _id）

  /**和显示在地图上的marker同步，id是marker.id */
  private currentMarkersMap: Map<number, Marker> = new Map(); // 当前地图上的 marker（key: id）


  private searchMarkersMap: Map<number, Marker> = new Map(); // 搜索产生的 marker
  private markIdCount = 1;
  private userid = getApp().globalData.userid;

  private mapContext!: WechatMiniprogram.MapContext;

  private extent!: MapExtent;

  private highLighMarkerId = 0

  constructor() {
    EventBus.on(AppEvent.REFRESH_MARKER, () => {
      this.refreshMarkers()
    })

    EventBus.on(AppEvent.SEARCH_MARKER, (e) => {
      this.showSearchMarkers(e)
    })

    EventBus.on(AppEvent.CLEAR_SEARCH_MARKER, () => {
      this.clearSearchMarker()
    })

    /**当修改、移动、删除marker时，将map中的数据清除，从服务器重新获取后存入 */
    EventBus.on(AppEvent.DEL_MARK, (id:string) => {
      this.markersMap.delete(id)
      //从总map中删除
      const mid = this.markersMap.get(id)?.id
      if(mid){
        //从对照地图的map中删除
        this.mapContext.removeMarkers({markerIds:[mid]})
        //从地图中删除
        this.currentMarkersMap.delete(mid)
      }
      //刷新marker
      this.refreshMarkers();

      EventBus.emit(AppEvent.REMOVE_MARKER_INFO);
      wx.showToast({
        title: '成功',
        icon: 'success',
      });
    })
  }

  setMapContext(mapContext: WechatMiniprogram.MapContext) {
    this.mapContext = mapContext;
  }

  /** 刷新地图上的 marker，完整流程 */
  async refreshMarkers(region?: MapRegion) {
    // 第一步：从数据库获取 extent 内新数据并存入 markersMap
    if (region) {
      this.extent = this.regionToExtent(region);
    }
    await this.fetchMarkers();

    // 第二步：从 markersMap 中筛选当前范围内的 marker
    const markersInExtent = this.getMarkersInExtent(this.extent);

    //移除范围外的marker
    this.removeMarksOutOfExtent();

    //加入范围内的新增marker
    this.addNewMarkersInExtent(markersInExtent)
  }

  async fetchMarkers() {
    const existingIds = Object.keys(this.markersMap);
    const query = {
      x: { $gte: this.extent.xmin, $lte: this.extent.xmax },
      y: { $gte: this.extent.ymin, $lte: this.extent.ymax },
      _id: { $nin: existingIds }
    };

    const res: any[] = await cloudFunctions.getData('mark', query) as any[];
    const markers = res
      .map((data: MarkerData) => this.convertToMarker(data))
      .filter((m): m is Marker => m !== null);

    markers.forEach((marker) => {
      this.markersMap.set(marker._id, marker)
    });
  }

  getMarkersInExtent(extent: MapExtent): Marker[] {
    const markers: Marker[] = [];

    this.markersMap.forEach(marker => {
      if (
        marker.latitude >= extent.xmin &&
        marker.latitude <= extent.xmax &&
        marker.longitude >= extent.ymin &&
        marker.longitude <= extent.ymax
      ) {
        // if (marker.id === this.highLighMarkerId) {
        //   marker.zIndex = 9;
        //   marker.iconPath = marker.iconSelected!;
        // } else {
        //   marker.iconPath = marker.icon;
        // }
        markers.push(marker);
      }
    });

    return markers;
  }

  /**删除范围外的marker，同步currentMarkerMap */
  private removeMarksOutOfExtent() {
    let ids: number[] = []
    this.currentMarkersMap.forEach((marker, id) => {
      const inExtent =
        marker.latitude >= this.extent.xmin &&
        marker.latitude <= this.extent.xmax &&
        marker.longitude >= this.extent.ymin &&
        marker.longitude <= this.extent.ymax;
      if (!inExtent) {
        ids.push(marker.id);
      }
    });

    ids.forEach(id => this.currentMarkersMap.delete(id));
    this.mapContext.removeMarkers({ markerIds: ids })
  }

  private addNewMarkersInExtent(markersInExtent: Marker[]) {

    const currentIds = new Set(this.currentMarkersMap.keys());

    // 添加新 marker（在 extent 内但未添加到地图）
    let newMarkers = []
    for (const marker of markersInExtent) {
      if (!currentIds.has(marker.id)) {
        newMarkers.push(marker);
      }
    }
    newMarkers.forEach(marker => this.currentMarkersMap.set(marker.id, marker));
    this.mapContext.addMarkers({ markers: newMarkers });
  }


  tapMarker(markId: number) {
    this.highlightMarker(markId)
    const marker = this.currentMarkersMap.get(markId)
    console.log(marker)
    if (marker)
      EventBus.emit(AppEvent.SHOW_MARKER_INFO, marker)
  }

  private highlightMarker(id: number) {
    // 如果之前有高亮的 marker，先删除它
    if (this.highLighMarkerId) {
      console.log('remove old highlight', this.highLighMarkerId)
      const oldMarker = this.currentMarkersMap.get(this.highLighMarkerId);
      if (oldMarker) {
        // 更新图标等信息
        oldMarker.iconPath = oldMarker.icon; // 恢复原来的图标
        this.mapContext.removeMarkers({ markerIds: [oldMarker.id] }); // 从地图中删除旧的高亮 marker
        this.mapContext.addMarkers({ markers: [oldMarker] }); // 从地图中删除旧的高亮 marker
        console.log('update old hightlight marker')
      }
    }

    // 更新高亮 marker 的 id
    this.highLighMarkerId = id;

    // 获取新的高亮 marker
    const newMarker = this.currentMarkersMap.get(id);
    if (newMarker) {
      // 更改高亮 marker 的图标
      newMarker.iconPath = newMarker.iconSelected as string; // 使用选中的图标

      // 将新的高亮 marker 加入地图
      console.log('update new highlight marker')
      this.mapContext.removeMarkers({ markerIds: [newMarker.id] });
      this.mapContext.addMarkers({ markers: [newMarker] });
      this.mapContext.moveToLocation({ latitude: newMarker.latitude, longitude: newMarker.longitude })
    }

  }

  showSearchMarkers(markDatas: MarkerData[]) {
    if (markDatas.length == 1) {
      const m = markDatas[0]
      const marker = this.convertToLocationMarker(m);
      this.searchMarkersMap.set(marker.id, marker);
      this.mapContext.addMarkers({ markers: [marker] })
      this.mapContext.moveToLocation({ latitude: m.x, longitude: m.y })
    } else {
      const points = markDatas.map(m => ({ latitude: m.x, longitude: m.y }))
      const markers = markDatas.map(m => this.convertToLocationMarker(m))
      markers.forEach(m => {
        console.log(m.id)
        this.searchMarkersMap.set(m.id, m)
      })
      this.mapContext.addMarkers({ markers })
      this.mapContext.includePoints({ points })
    }
  }

  clearSearchMarker() {
    this.mapContext.removeMarkers({ markerIds: Array.from(this.searchMarkersMap.keys()) })
  }

  convertToLocationMarker(data: MarkerData): Marker {
    return {
      id: this.markIdCount++,
      _id: data._id,
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
  }

  private convertToMarker(data: MarkerData): Marker | null {
    if (data.type === 'policeStation') {
      return this.convertToJwsMarker(data);
    } else if (data.type === 'camera') {
      return this.convertToCameraMarker(data);
    }
    return null;
  }

  private convertToJwsMarker(data: MarkerData): Marker {
    const isUser = data.userid === this.userid;
    const icon = isUser ? '../../assets/jws_user.png' : '../../assets/jws.png';
    const iconSelected = isUser ? '../../assets/jws_user2.png' : '../../assets/jws2.png';

    return {
      id: this.markIdCount++,
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
        textAlign: "right"
      },
      iconPath: icon,
      width: 20,
      height: 20,
      source: data,
      iconSelected,
      icon
    };
  }

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
      id: this.markIdCount++,
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
      icon
    };
  }

  private regionToExtent(data: MapRegion) {
    return {
      xmax: data.northeast.latitude, // 地图区域的上边界
      ymax: data.northeast.longitude, // 地图区域的右边界
      xmin: data.southwest.latitude, // 地图区域的下边界
      ymin: data.southwest.longitude // 地图区域的左边界
    }
  }
}

export default new MarkersService();
