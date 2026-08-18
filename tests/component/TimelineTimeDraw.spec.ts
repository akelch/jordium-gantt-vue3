import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Timeline from '@/components/Timeline.vue'

/**
 * Führungslinie am Cursor, solange Shift gedrückt ist (enableTimeDraw).
 *
 * Sie sagt dem Nutzer zu: "wenn du jetzt drückst, ziehst du eine Zeitspanne auf". Getestet
 * wird deshalb genau die Deckung mit onTimeDrawStart — die Linie darf nur dort erscheinen,
 * wo ein Shift+Drag tatsächlich etwas tut.
 */
describe('Timeline — Shift-Führungslinie für das Aufziehen einer Zeitspanne', () => {
  const GUIDE = '.jg-time-draw-guide'

  function mountTimeline(allowTimeDraw: boolean, enableTimeDraw = true) {
    return mount(Timeline, {
      props: {
        tasks: [
          {
            id: 1,
            name: 'Bedarf',
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

  /** Cursor auf die Row setzen (hoveredTaskId) und über die Timeline bewegen. */
  async function hoverRow(
    wrapper: ReturnType<typeof mountTimeline>,
    options: { shiftKey?: boolean } = {}
  ) {
    await wrapper.find('.task-row').trigger('mouseenter')
    await wrapper.find('.timeline-body').trigger('mousemove', { clientX: 120, clientY: 80, ...options })
  }

  it('zeigt die Linie, sobald Shift über einer aufziehbaren Zeile gedrückt ist', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(true)
    expect(wrapper.find('.timeline-body').classes()).toContain('jg-time-draw-armed')
    wrapper.unmount()
  })

  it('zeigt keine Linie ohne Shift', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper)

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    expect(wrapper.find('.timeline-body').classes()).not.toContain('jg-time-draw-armed')
    wrapper.unmount()
  })

  it('zeigt keine Linie auf einer Zeile ohne allowTimeDraw', async () => {
    // Dort bricht onTimeDrawStart ab — eine Linie wäre ein leeres Versprechen.
    const wrapper = mountTimeline(false)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('zeigt keine Linie ohne enableTimeDraw', async () => {
    const wrapper = mountTimeline(true, false)
    await hoverRow(wrapper, { shiftKey: true })

    expect(wrapper.find(GUIDE).exists()).toBe(false)
    wrapper.unmount()
  })

  it('reagiert auf Shift ohne Mausbewegung (keydown/keyup am window)', async () => {
    // Der häufige Fall: Cursor steht schon, dann wird Shift gedrückt. Ohne die
    // Tastatur-Listener erschiene die Linie erst beim nächsten Pixel Mausbewegung.
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

  it('nimmt die Tastatur-Listener beim Unmount wieder ab', async () => {
    const wrapper = mountTimeline(true)
    await hoverRow(wrapper)
    wrapper.unmount()

    // Kein Fehler und kein Zugriff auf den zerstörten Zustand nach dem Unmount.
    expect(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }))
    ).not.toThrow()
  })
})
