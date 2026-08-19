import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskBar from '@/components/TaskBar.vue'
import { TimelineScale } from '@/models/types/TimelineScale'
import type { Task } from '@/models/classes/Task'

// Der rote parent-overflow-bar-Strich (bei enableParentTaskAutoSchedule=false, wenn Kinder
// ueber das Eltern-Zeitfenster hinausragen) muss sich exakt wie ein normaler Task-Balken
// verhalten, der die Kinder-Huellkurve (minStart..maxEnd) spannt - inklusive Uhrzeit.
// Invariante statt harter Pixelwerte: Overflow-Kanten == Balken-Kanten gleicher Spanne.

const DAY_WIDTH = 48
const ROW_HEIGHT = 40
const BASE = new Date(2026, 6, 20) // 20.07.2026, lokale Mitternacht (Timeline-Basis)

function mountBar(props: Record<string, unknown>) {
  return mount(TaskBar, {
    props: {
      rowHeight: ROW_HEIGHT,
      dayWidth: DAY_WIDTH,
      startDate: BASE,
      currentTimeScale: TimelineScale.DAY,
      ...props,
    },
    global: {
      stubs: { Teleport: true },
      mocks: { $t: (k: string) => k },
    },
  })
}

function px(wrapper: ReturnType<typeof mount>, selector: string, prop: 'left' | 'width'): number {
  const el = wrapper.find(selector).element as HTMLElement
  return parseFloat(el.style[prop] || '0')
}

// Kinder mit konkreten Uhrzeiten -> Huellkurve 20.07. 08:00 .. 28.07. 14:00
const children: Partial<Task>[] = [
  { id: 11, name: 'c1', startDate: '2026-07-20 08:00', endDate: '2026-07-24 12:00', progress: 0 },
  { id: 12, name: 'c2', startDate: '2026-07-22 09:00', endDate: '2026-07-28 14:00', progress: 0 },
]

describe('TaskBar parent-overflow-bar', () => {
  it('deckt sich mit einem Task-Balken der gleichen Spanne (Tagesansicht, ohne timelineData)', () => {
    // Eltern: Config-Fenster 21.07..26.07 (schmaler als Kinder -> Overflow links UND rechts)
    const parent = mountBar({
      isParent: true,
      enableParentTaskAutoSchedule: false,
      task: {
        id: 1,
        name: 'project',
        startDate: '2026-07-21 00:00',
        endDate: '2026-07-26 00:00',
        progress: 0,
        isParent: true,
        children,
      },
    })

    // Normaler Balken, der exakt minStart..maxEnd spannt
    const plain = mountBar({
      isParent: false,
      task: {
        id: 2,
        name: 'span',
        startDate: '2026-07-20 08:00',
        endDate: '2026-07-28 14:00',
        progress: 0,
      },
    })

    expect(parent.find('.parent-overflow-bar').exists()).toBe(true)

    const oLeft = px(parent, '.parent-overflow-bar', 'left')
    const oWidth = px(parent, '.parent-overflow-bar', 'width')
    const bLeft = px(plain, '.task-bar', 'left')
    const bWidth = px(plain, '.task-bar', 'width')

    expect(oLeft).toBeCloseTo(bLeft, 1)
    expect(oWidth).toBeCloseTo(bWidth, 1)
  })

  it('deckt sich mit einem Task-Balken der gleichen Spanne (Tagesansicht, mit timelineData)', () => {
    // timelineData wie die App sie liefert: ein Zeitraum mit Tages-Zellen ab 20.07.
    const days = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(2026, 6, 20 + i),
      day: 20 + i,
    }))
    const timelineData = [{ days }]

    const parent = mountBar({
      isParent: true,
      enableParentTaskAutoSchedule: false,
      timelineData,
      task: {
        id: 1,
        name: 'project',
        startDate: '2026-07-21 00:00',
        endDate: '2026-07-26 00:00',
        progress: 0,
        isParent: true,
        children,
      },
    })
    const plain = mountBar({
      isParent: false,
      timelineData,
      task: {
        id: 2,
        name: 'span',
        startDate: '2026-07-20 08:00',
        endDate: '2026-07-28 14:00',
        progress: 0,
      },
    })

    expect(parent.find('.parent-overflow-bar').exists()).toBe(true)
    expect(px(parent, '.parent-overflow-bar', 'left')).toBeCloseTo(
      px(plain, '.task-bar', 'left'),
      1
    )
    expect(px(parent, '.parent-overflow-bar', 'width')).toBeCloseTo(
      px(plain, '.task-bar', 'width'),
      1
    )
  })

  it('deckt sich mit einem Task-Balken der gleichen Spanne (Stundenansicht)', () => {
    const parent = mountBar({
      isParent: true,
      enableParentTaskAutoSchedule: false,
      currentTimeScale: TimelineScale.HOUR,
      task: {
        id: 1,
        name: 'project',
        startDate: '2026-07-21 00:00',
        endDate: '2026-07-26 00:00',
        progress: 0,
        isParent: true,
        children,
      },
    })
    const plain = mountBar({
      isParent: false,
      currentTimeScale: TimelineScale.HOUR,
      task: {
        id: 2,
        name: 'span',
        startDate: '2026-07-20 08:00',
        endDate: '2026-07-28 14:00',
        progress: 0,
      },
    })

    expect(parent.find('.parent-overflow-bar').exists()).toBe(true)
    expect(px(parent, '.parent-overflow-bar', 'left')).toBeCloseTo(
      px(plain, '.task-bar', 'left'),
      1
    )
    expect(px(parent, '.parent-overflow-bar', 'width')).toBeCloseTo(
      px(plain, '.task-bar', 'width'),
      1
    )
  })
})

// progress wird im Booking-Gantt als Ressourcen-Belegung (gebucht/gesamt) genutzt, nicht als
// Fertigstellung. Ein zu 100% belegter Bedarf muss weiter zeitlich verschieb- und resizebar sein.
// allowDragAndResize=true spiegelt die Produktion (GanttChart/Timeline reichen den Default durch).
describe('TaskBar: Verschieben/Resize trotz 100% Belegung (progress=100)', () => {
  const fullyBooked: Partial<Task> = {
    id: 3,
    name: 'full',
    startDate: '2026-07-20 08:00',
    endDate: '2026-07-24 12:00',
    progress: 100,
  }
  const mountBooked = (extra: Record<string, unknown> = {}) =>
    mountBar({ isParent: false, allowDragAndResize: true, task: fullyBooked, ...extra })

  it('rendert die Resize-Griffe auch bei progress=100 (Nicht-Parent)', () => {
    const w = mountBooked()
    expect(w.find('.resize-handle-left').exists()).toBe(true)
    expect(w.find('.resize-handle-right').exists()).toBe(true)
  })

  it('blockiert den Drag-Start bei progress=100 nicht (mousedown wird verarbeitet)', () => {
    const w = mountBooked()
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    w.find('.task-bar-content').element.dispatchEvent(ev)
    // handleMouseDown ruft preventDefault erst, wenn es NICHT frueh abbricht (progress>=100 brach ab).
    expect(ev.defaultPrevented).toBe(true)
  })

  it('zeigt cursor:move bei progress=100 (Nicht-Parent)', () => {
    const el = mountBooked().find('.task-bar').element as HTMLElement
    expect(el.style.cursor).toBe('move')
  })

  it('sperrt Parent-Balken auch bei progress=100 weiterhin (keine Griffe)', () => {
    const w = mountBar({
      isParent: true,
      allowDragAndResize: true,
      task: { ...fullyBooked, isParent: true },
    })
    expect(w.find('.resize-handle-left').exists()).toBe(false)
    expect(w.find('.resize-handle-right').exists()).toBe(false)
  })
})

/**
 * VIUR PATCH: moving a bar must snap to five minutes and keep the exact duration.
 *
 * Before the patch the day scale derived the new start from the pixel position at day
 * precision and rebuilt the end from a duration counted in whole days — a task at
 * 08:00-18:00 jumped to midnight and got stretched across full days, while resizing already
 * snapped to five minutes.
 */
describe('TaskBar - moving snaps to five minutes (VIUR PATCH)', () => {
  const MOVED = 'drag-end'

  // handleMouseDown bails out unless a `.timeline` element exists in the document (it reads the
  // container to compute the drag offset) — without it no drag starts at all.
  let timelineStub: HTMLElement
  beforeEach(() => {
    timelineStub = document.createElement('div')
    timelineStub.className = 'timeline'
    document.body.appendChild(timelineStub)
  })
  afterEach(() => {
    timelineStub.remove()
  })

  /** One task with a time of day that must survive the move. */
  const task: Partial<Task> = {
    id: 1,
    name: 'Techniker',
    startDate: '2026-07-20 08:00',
    endDate: '2026-07-20 18:00',
    progress: 0,
  }

  /**
   * Drag the bar horizontally by `dx` pixels and return the emitted dates. The drag handle is
   * `.task-bar-content` (the bar itself only carries the resize handles), and the move has to
   * exceed the 5px drag threshold before anything is committed.
   */
  async function drag(wrapper: ReturnType<typeof mountBar>, dx: number) {
    const content = wrapper.find('.task-bar-content')
    content.element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true })
    )
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: dx, clientY: 0, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: dx, clientY: 0, bubbles: true }))
    await wrapper.vm.$nextTick()
    const emitted = wrapper.emitted(MOVED) as Task[][] | undefined
    return emitted?.[emitted.length - 1]?.[0]
  }

  it('keeps the time of day instead of rounding onto midnight', async () => {
    // Exactly one day to the right: 08:00-18:00 must stay 08:00-18:00, one day later.
    const wrapper = mountBar({ task, allowDragAndResize: true })

    const moved = await drag(wrapper, DAY_WIDTH)

    expect(moved?.startDate).toBe('2026-07-21 08:00')
    expect(moved?.endDate).toBe('2026-07-21 18:00')
    wrapper.unmount()
  })

  it('keeps the exact duration instead of stretching to whole days', async () => {
    const wrapper = mountBar({ task, allowDragAndResize: true })

    const moved = await drag(wrapper, DAY_WIDTH * 2)

    const start = new Date(moved!.startDate!.replace(' ', 'T'))
    const end = new Date(moved!.endDate!.replace(' ', 'T'))
    expect(end.getTime() - start.getTime()).toBe(10 * 60 * 60 * 1000) // unveraendert 10 Stunden
    wrapper.unmount()
  })

  it('snaps a sub-day distance to the five minute grid', async () => {
    // A third of a day-column is 8 hours; anything in between must land on a 5-minute mark.
    const wrapper = mountBar({ task, allowDragAndResize: true })

    const moved = await drag(wrapper, Math.round(DAY_WIDTH / 3) + 1)

    expect(moved?.startDate).toMatch(/ \d{2}:(00|05|10|15|20|25|30|35|40|45|50|55)$/)
    wrapper.unmount()
  })
})

/**
 * VIUR PATCH: the bar must not resize while it is being moved.
 *
 * The drag branch of taskBarStyle derived the width from the number of calendar days spanned,
 * so a 08:00-18:00 task rendered 10/24 of a column at rest but snapped to a full column the
 * moment it was grabbed — and to two columns once the drag crossed midnight.
 */
describe('TaskBar - moving keeps the bar width (VIUR PATCH)', () => {
  let timelineStub: HTMLElement
  beforeEach(() => {
    timelineStub = document.createElement('div')
    timelineStub.className = 'timeline'
    document.body.appendChild(timelineStub)
  })
  afterEach(() => {
    timelineStub.remove()
  })

  /** A task inside one day: 10 of 24 hours, so clearly narrower than a full column. */
  const task: Partial<Task> = {
    id: 1,
    name: 'Techniker',
    startDate: '2026-07-20 08:00',
    endDate: '2026-07-20 18:00',
    progress: 0,
  }

  /** Press on the bar and move by `dx` WITHOUT releasing — the state during the drag. */
  async function startDrag(wrapper: ReturnType<typeof mountBar>, dx: number) {
    const content = wrapper.find('.task-bar-content')
    content.element.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true })
    )
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: dx, clientY: 0, bubbles: true }))
    await wrapper.vm.$nextTick()
  }

  it('keeps the width while dragging inside the same day', async () => {
    const wrapper = mountBar({ task, allowDragAndResize: true })
    const before = px(wrapper, '.task-bar', 'width')
    expect(before).toBeLessThan(DAY_WIDTH) // 10h < 1 Tag — sonst prueft der Test nichts

    await startDrag(wrapper, 10)

    expect(px(wrapper, '.task-bar', 'width')).toBe(before)
    wrapper.unmount()
  })

  it('keeps the width when the drag crosses midnight', async () => {
    // Genau der Fall, in dem die alte Rechnung von einer auf zwei Tagesspalten sprang.
    const wrapper = mountBar({ task, allowDragAndResize: true })
    const before = px(wrapper, '.task-bar', 'width')

    await startDrag(wrapper, DAY_WIDTH)

    expect(px(wrapper, '.task-bar', 'width')).toBe(before)
    wrapper.unmount()
  })

  it('keeps the width of a multi-day bar', async () => {
    const wrapper = mountBar({
      task: { id: 2, name: 'Aufbau', startDate: '2026-07-20 08:00', endDate: '2026-07-23 18:00', progress: 0 },
      allowDragAndResize: true,
    })
    const before = px(wrapper, '.task-bar', 'width')

    await startDrag(wrapper, DAY_WIDTH * 2)

    expect(px(wrapper, '.task-bar', 'width')).toBe(before)
    wrapper.unmount()
  })
})
