import { getCurrentInstance, inject, provide, type InjectionKey, type Ref } from 'vue'

/** A template ref on the root element; `undefined` before mount, `null` after unmount. */
type GanttRootRef = Ref<HTMLElement | null | undefined>

/**
 * PATCH (viur): instance-scoped element lookups.
 *
 * Several components looked up sibling elements with `document.querySelector('.timeline')`,
 * `'.timeline-body'`, `'.task-list-body'` or `'.gantt-panel-right'`. Those selectors are not
 * instance-specific, and `document.querySelector` always returns the *first* match in the
 * document. With two GanttChart instances on the page the second instance therefore operated on
 * the first one's elements: scrolling the lower task list wrote scrollTop onto the upper one, and
 * pixel math in the lower instance measured the upper timeline.
 *
 * GanttChart provides its root element, and the helper below resolves selectors within that root.
 * Without a surrounding instance it falls back to `document`, so standalone components keep
 * working.
 *
 * Deliberately still document-wide: the loading overlay appended to `document.body` and the
 * fullscreen container, because both live outside any instance root by design.
 */

export const GANTT_ROOT_KEY = Symbol('gantt-root') as InjectionKey<GanttRootRef>

/**
 * Publishes the root element of this GanttChart instance as the lookup scope for descendants.
 * Call from GanttChart's `setup()` only.
 * @param root - template ref of the `.gantt-root` element
 */
export function provideGanttRoot(root: GanttRootRef): void {
  provide(GANTT_ROOT_KEY, root)
}

/**
 * Selector helpers scoped to the surrounding GanttChart instance.
 * Use from a `setup()` or from a composable called by one.
 * @returns query helpers that search inside the instance root, or in `document` without one
 */
export function useGanttQuery() {
  const root = getCurrentInstance() ? inject(GANTT_ROOT_KEY, null) : null
  const scope = (): ParentNode => root?.value ?? document
  return {
    /**
     * First match inside this instance.
     * @param selector - CSS selector
     */
    query<T extends Element = HTMLElement>(selector: string): T | null {
      return scope().querySelector<T>(selector)
    },
    /**
     * All matches inside this instance.
     * @param selector - CSS selector
     */
    queryAll<T extends Element = HTMLElement>(selector: string): NodeListOf<T> {
      return scope().querySelectorAll<T>(selector)
    },
  }
}
