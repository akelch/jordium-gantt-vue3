import { getCurrentInstance, inject, provide, type InjectionKey } from 'vue'

/**
 * PATCH (viur): per-instance event bus.
 *
 * TaskList, Timeline, TaskBar, MilestonePoint and the ResourceUsage view coordinate through
 * CustomEvents (vertical scroll sync, hover, auto-scroll, recalculation, context menu and more).
 * Those events were dispatched on `window` and carried no instance identity. With a single
 * GanttChart on the page that goes unnoticed; with two instances every instance also receives the
 * other one's events: scrolling one task list scrolls the other one, and a click in one triggers
 * auto-scroll and recalculation in the other.
 *
 * GanttChart therefore creates one `EventTarget` per instance and provides it; all internal
 * senders and receivers use that target instead of `window`. The fallback is `window` so that
 * components mounted on their own (Timeline, TaskList, CalendarView as standalone) keep working.
 *
 * Deliberately not routed through this bus: `locale-changed`, because the language is
 * application-wide and is meant to reach every instance. Native window events (resize, keydown,
 * mouse*) stay on `window` as well.
 */
export const GANTT_BUS_KEY = Symbol('gantt-bus') as InjectionKey<EventTarget>

/**
 * Creates the bus for this GanttChart instance and provides it to the descendants.
 * Call from GanttChart's `setup()` only.
 * @returns {EventTarget} the target this instance dispatches on and listens to
 */
export function provideGanttBus(): EventTarget {
  const bus = new EventTarget()
  provide(GANTT_BUS_KEY, bus)
  return bus
}

/**
 * Returns the bus of the surrounding GanttChart instance, or `window` when there is none.
 * Use from a `setup()` or from a composable called by one.
 * @returns {EventTarget} the instance bus, or `window` as fallback
 */
export function useGanttBus(): EventTarget {
  // `inject` returns undefined instead of the default when there is no active instance (a
  // composable called directly, e.g. from a unit test), so the instance is checked first.
  return (getCurrentInstance() ? inject(GANTT_BUS_KEY, window) : window) ?? window
}
