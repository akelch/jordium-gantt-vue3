import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TaskList from '@/components/TaskList/TaskList.vue'
import { createTask } from '../fixtures/tasks'
import { taskRowLayoutsProvide } from '../fixtures/taskRowLayouts'

/**
 * Der Zeilen-Drag haengt an einem Prop, das erst zur Laufzeit umgeschaltet wird
 * (im Konsumenten: der Bearbeiten-Modus). Getestet wird darum immer der Wechsel,
 * nie nur der Startwert.
 */
function mountTaskList(enableTaskRowMove: boolean) {
  const tasks = [
    createTask({ id: 1, name: 'Bedarf Kran', type: 'task' }),
    createTask({ id: 2, name: 'Bedarf Bagger', type: 'task' }),
  ]
  return mount(TaskList, {
    props: { tasks, enableTaskRowMove },
    global: {
      stubs: { Teleport: true, TaskContextMenu: true },
      provide: taskRowLayoutsProvide(tasks),
    },
  })
}

/** Druck auf die erste Zeile plus Bewegung ueber die 5px-Schwelle von useTaskRowDrag. */
async function ziehZeile(wrapper: VueWrapper) {
  await wrapper.findAll('.task-row')[0].trigger('mousedown', { clientX: 0, clientY: 0 })
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 0 }))
}

/** Das halbtransparente Abbild der gezogenen Zeile - erstes sichtbares Zeichen eines Drags. */
const ghost = () => document.querySelector('.task-row-dragging')

let wrapper: VueWrapper | null = null

afterEach(() => {
  document.dispatchEvent(new MouseEvent('mouseup'))
  wrapper?.unmount()
  wrapper = null
})

describe('TaskList - Zeilen-Drag folgt dem Prop zur Laufzeit', () => {
  it('startet einen Drag, nachdem das Verschieben eingeschaltet wurde', async () => {
    wrapper = mountTaskList(false)

    await wrapper.setProps({ enableTaskRowMove: true })
    await ziehZeile(wrapper)

    expect(ghost()).not.toBeNull()
  })

  it('startet keinen Drag mehr, nachdem das Verschieben wieder ausgeschaltet wurde', async () => {
    wrapper = mountTaskList(true)

    await wrapper.setProps({ enableTaskRowMove: false })
    await ziehZeile(wrapper)

    expect(ghost()).toBeNull()
  })
})
