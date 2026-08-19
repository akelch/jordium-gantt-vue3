import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TaskList from '@/components/TaskList/TaskList.vue'
import type { Task } from '@/models/classes/Task'
import { createTask, createParentTask } from '../fixtures/tasks'

type MovePayload = {
  draggedTask: Task
  targetTask: Task
  position: 'after' | 'child'
  oldParent: Task | null
  newParent: Task | null
}

/** Ein Blatt und eine gefuellte Gruppe - deckt Drop-Ziel und Collapse-Schaltflaeche ab. */
function bestand(): Task[] {
  return [
    createTask({ id: 1, name: 'Bedarf Kran', type: 'task' }),
    createParentTask({
      id: 2,
      name: 'Gruppe Beta',
      collapsed: false,
      children: [createTask({ id: 3, name: 'Bedarf Bagger', type: 'task' })],
    }),
  ]
}

function mountTaskList() {
  return mount(TaskList, {
    props: { tasks: bestand(), enableTaskRowMove: true },
    global: { stubs: { Teleport: true, TaskContextMenu: true } },
  })
}

let wrapper: VueWrapper | null = null

afterEach(() => {
  document.dispatchEvent(new MouseEvent('mouseup'))
  vi.restoreAllMocks()
  wrapper?.unmount()
  wrapper = null
})

describe('TaskList - Zeile auf eine Gruppe fallen lassen', () => {
  it('meldet den Umhaenge-Wunsch als task-row-moved mit Position child', async () => {
    wrapper = mountTaskList()
    const zeile = (id: number) => wrapper!.get(`[data-task-id="${id}"]`)

    await zeile(1).trigger('mousedown', { clientX: 0, clientY: 0 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 0 }))

    // happy-dom hat keine Layout-Engine, elementFromPoint liefert immer null. Ohne
    // untergeschobene Zielzeile findet der Drag nie ein Drop-Ziel und onDrop bleibt aus.
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(zeile(2).element)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 0 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    const gemeldet = wrapper.emitted('task-row-moved')
    expect(gemeldet).toHaveLength(1)

    const payload = gemeldet![0][0] as MovePayload
    expect(payload.draggedTask.id).toBe(1)
    expect(payload.targetTask.id).toBe(2)
    expect(payload.position).toBe('child')
  })

  it('meldet nichts, wenn die Maus kein Drop-Ziel erreicht hat', async () => {
    wrapper = mountTaskList()

    await wrapper.get('[data-task-id="1"]').trigger('mousedown', { clientX: 0, clientY: 0 })
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 0 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(wrapper.emitted('task-row-moved')).toBeUndefined()
  })
})

describe('TaskList - Gruppe zuklappen', () => {
  it('kippt collapsed und meldet task-collapse-change', async () => {
    wrapper = mountTaskList()

    await wrapper.get('[data-task-id="2"] .collapse-btn').trigger('click')

    const gemeldet = wrapper.emitted('task-collapse-change')
    expect(gemeldet).toHaveLength(1)
    expect((gemeldet![0][0] as Task).collapsed).toBe(true)
    expect(wrapper.find('[data-task-id="3"]').exists()).toBe(false)
  })
})
