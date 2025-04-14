// // event-bus.ts
type Callback<T = void> = (payload: T) => void;

export class EventBus<EventPayloadMap extends Record<string, any> = {}> {
  private listeners: Map<string, Set<Callback>> = new Map();

  on<K extends string>(
    event: K,
    callback: Callback<K extends keyof EventPayloadMap ? EventPayloadMap[K] : void>
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Callback);
  }

  off<K extends string>(
    event: K,
    callback: Callback<K extends keyof EventPayloadMap ? EventPayloadMap[K] : void>
  ) {
    this.listeners.get(event)?.delete(callback as Callback);
  }

  emit<K extends string>(
    event: K,
    payload?: K extends keyof EventPayloadMap ? EventPayloadMap[K] : void
  ) {
    this.listeners.get(event)?.forEach((cb) => {
      (cb as Callback<any>)(payload);
    });
  }

  offAll(event: string) {
    this.listeners.delete(event);
  }

  clear() {
    this.listeners.clear();
  }
}
export default new EventBus()
