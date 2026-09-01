import { computed, type ComputedRef } from 'vue'
import type { Task } from '@/models/classes/Task'

export interface TaskRowLayouts {
  cumulativeHeights: number[]
  totalHeight: number
  taskHeights: Map<string | number, number>
}

/** Gleiche Zeilenhoehe wie der gantt-row-height-Default in GanttChart. */
export const ZEILENHOEHE = 51

/**
 * Seit v1.12.x lesen TaskList und Timeline die Zeilenpositionen aus dem
 * taskRowLayouts-Inject, das sonst nur GanttChart bereitstellt. Ohne dieses Inject
 * greift der Default mit cumulativeHeights [0] - der virtuelle Sichtbereich ist dann
 * leer und eine allein gemountete Komponente rendert keine einzige Zeile.
 *
 * Diese Fabrik baut das Inject fuer Tests nach, die eine Komponente ohne GanttChart
 * mounten: gleiche Hoehe fuer jede Zeile, Reihenfolge wie beim Flachlegen des Baums.
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

/** Fertiges global.provide fuer mount(). */
export function taskRowLayoutsProvide(tasks: Task[], zeilenhoehe = ZEILENHOEHE) {
  return { taskRowLayouts: makeTaskRowLayouts(tasks, zeilenhoehe) }
}
