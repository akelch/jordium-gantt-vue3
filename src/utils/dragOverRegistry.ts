/**
 * dragOverRegistry - 任务行拖拽悬停事件委托注册表
 *
 * 解决性能问题：原来每个可见 TaskRow 各自注册一个 window 'task-row-drag-over' 监听器，
 * 拖拽时 CustomEvent 广播需逐一触发所有监听器（O(n) 开销）。
 *
 * 改进后：改为单一全局监听器 + Map 直接查找（O(1)），
 * 监听器数量从 N 个（可见行数）降为 1 个。
 *
 * PATCH (viur): the registry is keyed by the event bus instead of being one global map. Task ids
 * are running numbers per GanttChart instance, so two instances would otherwise overwrite each
 * other's handlers under the same id. Callers pass the bus of their instance (see utils/ganttBus);
 * one delegating listener per bus is kept, so the O(1) lookup is unchanged.
 */

type DragOverCallback = (mouseEvent: MouseEvent) => void

interface BusRegistration {
  handlers: Map<number | string, DragOverCallback>
  listener: (e: Event) => void
}

// WeakMap: a bus belongs to a GanttChart instance and must not be kept alive by this module.
const _byBus = new WeakMap<EventTarget, BusRegistration>()

/**
 * 注册任务行的拖拽悬停回调。
 * 第一次注册时自动绑定该 bus 上的委托监听器。
 * @param bus - event bus of the surrounding GanttChart instance
 * @param taskId - id of the task row
 * @param handler - callback for the drag-over event
 */
export function registerDragOver(
  bus: EventTarget,
  taskId: number | string,
  handler: DragOverCallback
): void {
  let registration = _byBus.get(bus)
  if (!registration) {
    const handlers = new Map<number | string, DragOverCallback>()
    const listener = (e: Event) => {
      const { taskId: id, event: mouseEvent } = (e as CustomEvent).detail
      const cb = handlers.get(id)
      if (cb) cb(mouseEvent)
    }
    registration = { handlers, listener }
    _byBus.set(bus, registration)
    bus.addEventListener('task-row-drag-over', listener)
  }
  registration.handlers.set(taskId, handler)
}

/**
 * 注销任务行的拖拽悬停回调。
 * 最后一个注销时自动解绑该 bus 上的委托监听器。
 * @param bus - event bus of the surrounding GanttChart instance
 * @param taskId - id of the task row
 */
export function unregisterDragOver(bus: EventTarget, taskId: number | string): void {
  const registration = _byBus.get(bus)
  if (!registration) return
  registration.handlers.delete(taskId)
  if (registration.handlers.size === 0) {
    bus.removeEventListener('task-row-drag-over', registration.listener)
    _byBus.delete(bus)
  }
}
