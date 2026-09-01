import { computed, type ComputedRef } from 'vue'
import type { Task } from '@/models/classes/Task'

export interface TaskRowLayouts {
  cumulativeHeights: number[]
  totalHeight: number
  taskHeights: Map<string | number, number>
}

/** Same row height as the gantt-row-height default in GanttChart. */
export const ZEILENHOEHE = 51

/**
 * Since v1.12.x TaskList and Timeline read the row positions from the taskRowLayouts inject,
 * which only GanttChart provides. Without that inject the default with cumulativeHeights [0]
 * applies: the virtual viewport is empty and a component mounted on its own renders no rows
 * at all.
 *
 * This factory rebuilds the inject for tests that mount a component without GanttChart: the
 * same height for every row, ordered the way the tree is flattened.
 */
export function makeTaskRowLayouts(
  tasks: Task[],
  zeilenhoehe = ZEILENHOEHE
): ComputedRef<TaskRowLayouts> {
  return computed(() => {
    const cumulativeHeights = [0]
    const taskHeights = new Map<string | number, number>()
    let summe = 0

    const flachlegen = (liste: Task[]) => {
      for (const task of liste) {
        summe += zeilenhoehe
        cumulativeHeights.push(summe)
        taskHeights.set(task.id, zeilenhoehe)
        if (!task.collapsed && task.children?.length) flachlegen(task.children)
      }
    }
    flachlegen(tasks)

    return { cumulativeHeights, totalHeight: summe, taskHeights }
  })
}

/** Ready-made global.provide for mount(). */
export function taskRowLayoutsProvide(tasks: Task[], zeilenhoehe = ZEILENHOEHE) {
  return { taskRowLayouts: makeTaskRowLayouts(tasks, zeilenhoehe) }
}
