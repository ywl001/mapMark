export interface MarkerData {
  _id: string
  name?: string
  type?: string
  x: number
  y: number
  imageUrl?: string
  userid?: string
  owner?: string
  angle?: number
  tel?: string
  cameraType?: string
  level: number
}

export interface MapRegion {
  northeast: {
    latitude: number,
    longitude: number
  },
  southwest: {
    latitude: number,
    longitude: number
  }
}

export interface MapExtent {
  xmax: number
  xmin: number
  ymax: number
  ymin: number
}

export interface MapRegionChangeEvent {
  detail: { region: MapRegion, scale: number, centerLocation: { latitude: number, longitude: number } }
  type: 'begin' | 'end'
}

export interface Marker {
  /** 标记点 id，点击事件中会返回 */
  id: number;

  // 数据库中的_id
  _id: string;

  /** 聚合簇的 id，用于点聚合 */
  clusterId?: number;

  /** 是否参与点聚合，默认 false */
  joinCluster?: boolean;

  /** 纬度，范围 -90 ~ 90 */
  latitude: number;

  /** 经度，范围 -180 ~ 180 */
  longitude: number;

  /** 标注点名称，点击时显示（若无 callout） */
  title?: string;

  /** 显示层级 */
  zIndex?: number;

  /** 显示的图标路径（支持本地、网络、代码包路径） */
  iconPath: string;

  /** 旋转角度，默认 0，范围 0 ~ 360 */
  rotate?: number;

  /** 透明度，默认 1，范围 0 ~ 1 */
  alpha?: number;

  /** 图标宽度（默认图片原宽度） */
  width?: number | string;

  /** 图标高度（默认图片原高度） */
  height?: number | string;

  /** 气泡窗口 callout（支持换行符） */
  callout?: Record<string, any>; // 可以单独定义 Callout 类型

  /** 自定义气泡窗口 */
  customCallout?: Record<string, any>;

  /** 标签内容（支持换行符） */
  label?: Record<string, any>;

  /** 锚点，相对于图标 {x, y}，范围 [0, 1]，默认底边中点 */
  anchor?: {
    x: number;
    y: number;
  };

  /** 无障碍描述 */
  ariaLabel?: string;

  /** 碰撞关系：标注物之间如何交互 */
  collisionRelation?: string;

  /** 碰撞类型 */
  collision?: string;

  //自己添加的属性
  source?: any,
  iconSelected?: string,
  icon?: any

  level:number
}
