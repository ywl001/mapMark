import { Marker } from "../../app-types";

export enum AppEvent {
  REFRESH_MARKER = 'refreshMarker',
  REMOVE_MARKER_INFO = 'removeMarkerInfo',
  SEARCH_MARKER = 'searchMarker',
  SHOW_MARKER_INFO = 'showMarkerInfo',
  ADD_MARKER_COMPLETE = 'addMarkerComplete',
  MOVE_MARKER = 'moveMarker'
}

export interface EventPayloadMap {
  [AppEvent.SHOW_MARKER_INFO]:Marker,
  [AppEvent.REFRESH_MARKER]:void,
  [AppEvent.REMOVE_MARKER_INFO]:void,
  [AppEvent.MOVE_MARKER]:string
}