import { describe, it, expect, vi } from 'vitest'
import { useTaskRowDrag } from '@/composables/useTaskRowDrag'
import { createTask, createParentTask } from '../../fixtures/tasks'

/**
 * Stellt einen aktiven Drag her (über das öffentlich zurückgegebene dragState)
 * und liefert die Handles für handleDragOver-Assertions.
 */
function activeDrag() {
  const onDragOver = vi.fn()
  const drag = useTaskRowDrag({ enabled: true, onDragOver })
  const dragged = createTask({ id: 99, name: 'Gezogener Bedarf' })
  drag.dragState.value.isDragging = true
  drag.dragState.value.draggedTask = dragged
  return { drag, onDragOver, dragged }
}

const overRow = () => [document.createElement('div'), new MouseEvent('mousemove')] as const

describe('useTaskRowDrag – Drop-Position beim Hover', () => {
  it('leere Gruppe (children: []) ist ein child-Drop-Ziel', () => {
    const { drag, onDragOver } = activeDrag()
    const emptyGroup = createParentTask({ id: 2, children: [] })

    drag.handleDragOver(emptyGroup, ...overRow())

    expect(onDragOver).toHaveBeenCalledWith(emptyGroup, 'child')
    expect(drag.dragState.value.dropPosition).toBe('child')
  })

  it('Zeile ohne children bleibt after-Drop-Ziel', () => {
    const { drag, onDragOver } = activeDrag()
    const leaf = createTask({ id: 2 })

    drag.handleDragOver(leaf, ...overRow())

    expect(onDragOver).toHaveBeenCalledWith(leaf, 'after')
    expect(drag.dragState.value.dropPosition).toBe('after')
  })

  it('Gruppe mit Kindern bleibt child-Drop-Ziel', () => {
    const { drag, onDragOver } = activeDrag()
    const group = createParentTask({ id: 2, children: [createTask({ id: 3 })] })

    drag.handleDragOver(group, ...overRow())

    expect(onDragOver).toHaveBeenCalledWith(group, 'child')
    expect(drag.dragState.value.dropPosition).toBe('child')
  })
})
