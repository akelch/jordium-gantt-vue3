import { describe, it, expect } from 'vitest'
import { defineComponent, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useTaskListLayout } from '@/components/TaskList/composables/taskList/useTaskListLayout'
import type { Task } from '@/models/classes/Task'
import { createTask, createParentTask } from '../../fixtures/tasks'

// Erwartungswerte sind absichtlich fest eingetragen und NICHT aus VERTICAL_BUFFER,
// Zeilenhoehe oder Ersatzhoehe hergeleitet: ein Test, der seine Erwartung aus derselben
// Konstante zieht wie der Code, bleibt gruen wenn die Konstante sich aendert.
// Grundlage: Zeilenhoehe 51 (gantt-row-height-Default), Ersatzhoehe 600 (Body noch
// unvermessen), Puffer 5 Zeilen.
const ZEILENHOEHE = 51

const vieleZeilen = (anzahl: number): Task[] =>
  Array.from({ length: anzahl }, (_, i) => createTask({ id: i + 1, name: `Zeile ${i + 1}` }))

/**
 * Der Composable liest Ansichtsmodus und Zeilenhoehe per inject. Ausserhalb von setup()
 * liefert inject undefined statt des Defaults - er braucht darum eine Host-Komponente.
 */
function layoutIn(tasks: Ref<Task[]>) {
  let layout!: ReturnType<typeof useTaskListLayout>
  mount(
    defineComponent({
      setup() {
        layout = useTaskListLayout(tasks)
        return () => null
      },
    })
  )
  return layout
}

describe('useTaskListLayout - Sichtbereich des virtuellen Scrollens', () => {
  it('rendert am Anfang nur das erste Fenster plus Puffer', () => {
    const layout = layoutIn(ref(vieleZeilen(100)))

    // ceil(600 / 51) = 12 sichtbare Zeilen, dazu 5 Puffer-Zeilen
    expect(layout.visibleTaskRange.value).toStrictEqual({ startIndex: 0, endIndex: 17 })
    expect(layout.visibleTasks.value).toHaveLength(17)
    expect(layout.visibleTasks.value[0].rowIndex).toBe(0)
  })

  it('verschiebt das Fenster beim Scrollen und fuehrt rowIndex mit', () => {
    const layout = layoutIn(ref(vieleZeilen(100)))

    layout.taskListScrollTop.value = 10 * ZEILENHOEHE

    // 10 Zeilen weggescrollt, 5 Puffer-Zeilen davor bleiben gerendert
    expect(layout.visibleTaskRange.value.startIndex).toBe(5)
    expect(layout.visibleTasks.value[0].rowIndex).toBe(5)
    expect(layout.visibleTasks.value[0].task.id).toBe(6)
  })

  it('nutzt die gemessene Body-Hoehe, sobald sie vorliegt, statt der Ersatzhoehe', () => {
    const layout = layoutIn(ref(vieleZeilen(100)))

    expect(layout.visibleTaskRange.value.endIndex).toBe(17)

    layout.taskListBodyHeight.value = 20 * ZEILENHOEHE

    // 20 gemessene Zeilen statt der 12 aus der Ersatzhoehe, plus 5 Puffer
    expect(layout.visibleTaskRange.value.endIndex).toBe(25)
  })

  it('haelt die Spacer so hoch, dass die Scrollstrecke vollstaendig bleibt', () => {
    const layout = layoutIn(ref(vieleZeilen(100)))

    layout.taskListScrollTop.value = 10 * ZEILENHOEHE

    // Fenster 5 bis 27: davor 5 Zeilen, gerendert 22, danach 73 Zeilen
    expect(layout.visibleTaskRange.value).toStrictEqual({ startIndex: 5, endIndex: 27 })
    expect(layout.startSpacerHeight.value).toBe(255)
    expect(layout.visibleTasks.value).toHaveLength(22)
    expect(layout.endSpacerHeight.value).toBe(3723)
    expect(layout.totalContentHeight.value).toBe(5100)
    expect(255 + 22 * ZEILENHOEHE + 3723).toBe(5100)
  })
})

describe('useTaskListLayout - Flachlegen des Baums', () => {
  it('zeigt Kinder einer offenen Gruppe mit erhoehter Ebene', () => {
    const layout = layoutIn(
      ref([
        createParentTask({
          id: 1,
          collapsed: false,
          children: [createTask({ id: 2 }), createTask({ id: 3 })],
        }),
      ])
    )

    expect(layout.flattenedTasks.value.map(e => [e.task.id, e.level])).toStrictEqual([
      [1, 0],
      [2, 1],
      [3, 1],
    ])
  })

  it('laesst die Kinder einer zugeklappten Gruppe weg', () => {
    const layout = layoutIn(
      ref([createParentTask({ id: 1, collapsed: true, children: [createTask({ id: 2 })] })])
    )

    expect(layout.flattenedTasks.value.map(e => e.task.id)).toStrictEqual([1])
  })

  it('klappt eine Meilenstein-Gruppe nie auf, auch mit Kindern', () => {
    const layout = layoutIn(
      ref([
        createParentTask({
          id: 1,
          type: 'milestone-group',
          collapsed: false,
          children: [createTask({ id: 2 })],
        }),
      ])
    )

    expect(layout.flattenedTasks.value.map(e => e.task.id)).toStrictEqual([1])
  })
})
