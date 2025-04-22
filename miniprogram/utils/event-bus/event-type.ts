import { Marker } from "../../app-types";


export enum AppEvent {
  REFRESH_MARKER = 'refreshMarker',
  REMOVE_MARKER_INFO = 'removeMarkerInfo',
  SEARCH_MARKER = 'searchMarker',
  SHOW_MARKER_INFO = 'showMarkerInfo',
  ADD_MARKER_COMPLETE = 'addMarkerComplete',
  MOVE_MARKER = 'moveMarker',
  DEL_MARK = "DEL_MARK",
  CLEAR_SEARCH_MARKER = 'CLEAR_SEARCH_MARKER',
  CHANGE_MAP_LAYER = "CHANGE_MAP_LAYER"
}

export interface EventPayloadMap {
  [AppEvent.SHOW_MARKER_INFO]:Marker,
  [AppEvent.REFRESH_MARKER]:void,
  [AppEvent.REMOVE_MARKER_INFO]:void,
  [AppEvent.MOVE_MARKER]:string,
  [AppEvent.SEARCH_MARKER]:any[],
  [AppEvent.ADD_MARKER_COMPLETE]:void,
  [AppEvent.DEL_MARK]:string,
  [AppEvent.CLEAR_SEARCH_MARKER]:void
  [AppEvent.CHANGE_MAP_LAYER]:void
}