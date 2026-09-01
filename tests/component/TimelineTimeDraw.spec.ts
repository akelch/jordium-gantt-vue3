import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Timeline from '@/components/Timeline.vue'
import { taskRowLayoutsProvide } from '../fixtures/taskRowLayouts'

/**
 * Guide line at the cursor while shift is held (enableTimeDraw).
 *
 * The line promises "press now and you draw a time span". These tests therefore pin its
 * overlap with onTimeDrawStart: the line may only appear where a shift+drag actually does
 * something.
 */
const GUIDE = '.jg-time-draw-guide'

/** Mount with one row; task flags and Timeline props are set per test. */
function mountWith(taskProps: Record<string, unknown>, props: Record<string, unknown>) {
  const tasks = [
    {
      id: 1,
      name: 'Row',
      startDate: '2026-01-01 08:00',
      endDate: '2026-01-02 08:00',
      ...taskProps,
    },
  ]
  return mount(Timeline, {
    props: { tasks, ...props },
    global: {
      stubs: { Teleport: true },
      mocks: { $t: (key: string) => key },
      provide: taskRowLayoutsProvide(tasks as never),
    },
  })
}

describe('Timeline - shift guide line for drawing a time span', () => {

  function mountTimeline(allowTimeDraw: boolean, enableTimeDraw = true) {
    return mountWith({ allowTimeDraw }, { enableTimeDraw })
  }

  /** Put the cursor on the row (hoveredTaskId) and move it across the timeline. */
  async function hoverRow(
    wrapper: ReturnType<typeof mountTimeline>,
    options: { shiftKey?: boolean } = {}
  ) {
    await wrapper.find('.task-row').trigger('mouseenter')
    await wrapper.find('.timeline-body').trigger('mousemove', { clientX: 120, clientY: 80, ...options })
  }

  it('shows the line once shift is held over a drawable row', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(true)
    expect(wrapper.find('.timeline-body').classes()).toContain('jg-time-draw-armed')
    wrapper.unmount()
  })

  it('shows no line without shift', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper)

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    expect(wrapper.find('.timeline-body').classes()).not.toContain('jg-time-draw-armed')
    wrapper.unmount()
  })

  it('shows no line on a row without allowTimeDraw', async () => {
    // onTimeDrawStart bails out there, so a line would promise something that never happens.
    const wrapper = mountTimeline(false)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows no line without enableTimeDraw', async () => {
    const wrapper = mountTimeline(true, false)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('reacts to shift without mouse movement (window keydown/keyup)', async () => {
    // The common case: the cursor already rests somewhere, then shift goes down. Without the
    // keyboard listeners the line would only appear on the next pixel of movement.
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper)
    expect(wrapper.find(GUIDE).exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find(GUIDE).exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', shiftKey: false }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('detaches the keyboard listeners on unmount', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper)
    wrapper.unmount()

    // No error and no access to the destroyed state after unmounting.
    expect(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }))
    ).not.toThrow()
  })
})

/**
 * Pick mode (enableTimePick): the guide line is permanent, no modifier, and a plain click
 * reports the point in time. Used for placing something at a date.
 */
describe('Timeline - pick mode reports a point in time on click', () => {
  /** Put the cursor on the row and move it across the timeline. */
  async function hover(wrapper: ReturnType<typeof mountWith>) {
    await wrapper.find('.task-row').trigger('mouseenter')
    await wrapper.find('.timeline-body').trigger('mousemove', { clientX: 120, clientY: 80 })
  }

  function mountPick(allowTimePick: boolean, enableTimePick = true) {
    return mountWith({ allowTimePick }, { enableTimePick })
  }

  it('shows the guide line without any modifier', async () => {
    // The whole mode exists to place something, so the line is the standing hint.
    const wrapper = mountPick(true)
    await hover(wrapper)

    expect(wrapper.find(GUIDE).exists()).toBe(true)
    expect(wrapper.find('.timeline-body').classes()).toContain('jg-time-draw-armed')
    wrapper.unmount()
  })

  it('shows no line on a row without allowTimePick', async () => {
    const wrapper = mountPick(false)
    await hover(wrapper)

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows no line without enableTimePick', async () => {
    const wrapper = mountPick(true, false)
    await hover(wrapper)

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('emits time-pick with the task and the snapped date', async () => {
    const wrapper = mountPick(true)
    await hover(wrapper)

    await wrapper.find('.task-row').trigger('click', { clientX: 120, clientY: 80 })

    const emitted = wrapper.emitted('time-pick')
    expect(emitted).toHaveLength(1)
    const payload = emitted![0][0] as { task: { id: number }; date: string }
    expect(payload.task.id).toBe(1)
    // Same format as the draw emit, snapped to five minutes.
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:(00|05|10|15|20|25|30|35|40|45|50|55)$/)
    wrapper.unmount()
  })

  it('emits nothing on a row without allowTimePick', async () => {
    const wrapper = mountPick(false)
    await hover(wrapper)

    await wrapper.find('.task-row').trigger('click', { clientX: 120, clientY: 80 })

    expect(wrapper.emitted('time-pick')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits nothing while pick mode is off', async () => {
    const wrapper = mountPick(true, false)
    await hover(wrapper)

    await wrapper.find('.task-row').trigger('click', { clientX: 120, clientY: 80 })

    expect(wrapper.emitted('time-pick')).toBeUndefined()
    wrapper.unmount()
  })

  it('ignores a click that is not the primary button', async () => {
    const wrapper = mountPick(true)
    await hover(wrapper)

    await wrapper.find('.task-row').trigger('click', { clientX: 120, button: 2 })

    expect(wrapper.emitted('time-pick')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the cursor badge in pick mode', async () => {
    // The date under the cursor must be readable, otherwise placing is guesswork.
    const wrapper = mountPick(true)
    await hover(wrapper)

    expect(wrapper.find('.jg-time-cursor-badge').exists()).toBe(true)
    wrapper.unmount()
  })
})
