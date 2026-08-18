import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Timeline from '@/components/Timeline.vue'

/**
 * Guide line at the cursor while shift is held (enableTimeDraw).
 *
 * The line promises "press now and you draw a time span". These tests therefore pin its
 * overlap with onTimeDrawStart: the line may only appear where a shift+drag actually does
 * something.
 */
describe('Timeline - shift guide line for drawing a time span', () => {
  const GUIDE = '.jg-time-draw-guide'

  function mountTimeline(allowTimeDraw: boolean, enableTimeDraw = true) {
    return mount(Timeline, {
      props: {
        tasks: [
          {
            id: 1,
            name: 'Demand',
            startDate: '2026-01-01 08:00',
            endDate: '2026-01-02 08:00',
            allowTimeDraw,
          },
        ],
        enableTimeDraw,
      },
      global: { stubs: { Teleport: true }, mocks: { $t: (key: string) => key } },
    })
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
