// ─────────────────────────────────────────────────────────────
// StudyFlow · Smart Timetable Generation Engine
// Prioritizes subjects by exam proximity + pending workload,
// then fills each study day with timed, balanced sessions.
// ─────────────────────────────────────────────────────────────

export interface PlannerTopic {
  id: string
  name: string
  difficulty: number // 1 Easy · 2 Medium · 3 Hard
  status: string // PENDING | COMPLETED
}

export interface PlannerSubject {
  id: string
  name: string
  color: string
  examDate: string | null // ISO date string or null
  topics: PlannerTopic[]
}

export interface PlannerSettings {
  dayStart: string // "16:00"
  dayEnd: string // "21:00"
  sessionLength: number // minutes
  breakLength: number // minutes
  studyDays: string // "1,2,3,4,5,6" (0 = Sunday)
}

export interface PlannedSession {
  subjectId: string
  topicId: string | null
  topicName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  duration: number // minutes
  type: "LEARN" | "REVISE" | "PRACTICE"
}

export interface BlockedInterval {
  date: string
  startMinutes: number
  duration: number
}

// ── date helpers (all local, no TZ drift) ────────────────────
export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return todayStr(dt)
}

export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).getDay() // 0 = Sunday
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split("-").map(Number)
  const [ty, tm, td] = toStr.split("-").map(Number)
  const from = new Date(fy, fm - 1, fd).getTime()
  const to = new Date(ty, tm - 1, td).getTime()
  return Math.round((to - from) / 86400000)
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Number of 45-min-style blocks a topic needs: hard topics take 2
export function sessionsNeeded(topic: PlannerTopic): number {
  return topic.difficulty >= 3 ? 2 : 1
}

export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function daysUntilExamLabel(examDate: string | null, today: string): string {
  if (!examDate) return "No exam date"
  const diff = daysBetween(today, examDate.slice(0, 10))
  if (diff < 0) return "Exam finished"
  if (diff === 0) return "Exam is TODAY"
  if (diff === 1) return "Tomorrow!"
  return `in ${diff} days`
}

// ── core generator ───────────────────────────────────────────
interface SubjectState {
  subject: PlannerSubject
  pending: PlannerTopic[] // ordered queue (hardest first)
  completed: PlannerTopic[]
  learnUnitsLeft: number // total sessions needed for remaining pending
  practiceQueue: { topic: PlannerTopic; nth: number }[]
  reviseIdx: number
  sessionsToday: number
  reviseToday: number
  lastPicked: boolean
}

export function generateTimetable(
  subjects: PlannerSubject[],
  settings: PlannerSettings,
  startDate: string,
  days: number,
  blocked: BlockedInterval[] = []
): PlannedSession[] {
  const usable = subjects.filter((s) => s.topics.length > 0)
  if (usable.length === 0) return []

  const studyDaySet = new Set(
    settings.studyDays
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !isNaN(d))
  )

  const winStart = toMinutes(settings.dayStart)
  const winEnd = toMinutes(settings.dayEnd)
  const blockLen = Math.max(15, settings.sessionLength)
  const gap = Math.max(0, settings.breakLength)

  // Build per-subject mutable state
  const states: SubjectState[] = usable.map((s) => {
    const pending = s.topics
      .filter((t) => t.status !== "COMPLETED")
      .sort((a, b) => b.difficulty - a.difficulty) // hardest first
    const completed = s.topics.filter((t) => t.status === "COMPLETED")
    const learnUnitsLeft = pending.reduce((acc, t) => acc + sessionsNeeded(t), 0)
    return {
      subject: s,
      pending,
      completed,
      learnUnitsLeft,
      practiceQueue: [],
      reviseIdx: 0,
      sessionsToday: 0,
      reviseToday: 0,
      lastPicked: false,
    }
  })

  const plan: PlannedSession[] = []
  const blockedByDate = new Map<string, BlockedInterval[]>()
  for (const b of blocked) {
    if (!blockedByDate.has(b.date)) blockedByDate.set(b.date, [])
    blockedByDate.get(b.date)!.push(b)
  }

  for (let offset = 0; offset < days; offset++) {
    const date = addDays(startDate, offset)
    const wd = weekdayOf(date)
    if (!studyDaySet.has(wd)) continue

    // reset daily counters
    for (const st of states) {
      st.sessionsToday = 0
      st.reviseToday = 0
    }

    // build free time slots for this day (skip completed/blocked overlaps)
    const dayBlocks = blockedByDate.get(date) ?? []
    const slots: { start: number; end: number }[] = []
    let cursor = winStart
    while (cursor + blockLen <= winEnd) {
      const slot = { start: cursor, end: cursor + blockLen }
      const clash = dayBlocks.some(
        (b) => slot.start < b.startMinutes + b.duration && slot.end > b.startMinutes
      )
      if (!clash) slots.push(slot)
      cursor += blockLen + gap
    }

    for (const slot of slots) {
      // helper: what kind of session would this subject get next?
      const wouldRevise = (st: SubjectState, daysToExam: number | null) => {
        const cram = daysToExam !== null && daysToExam <= 2 && st.completed.length > 0
        return cram || (st.learnUnitsLeft === 0 && st.practiceQueue.length === 0 && st.completed.length > 0)
      }

      const examDayOf = (st: SubjectState) =>
        st.subject.examDate ? daysBetween(date, st.subject.examDate.slice(0, 10)) : null

      // revision cap per subject per day (3 in final-48h cram mode, else 2)
      const reviseCap = (daysToExam: number | null) => (daysToExam !== null && daysToExam <= 2 ? 3 : 2)

      // pass 1: subjects with fresh work (learn/practice) or revision within cap
      // pass 2 (fallback): allow revision beyond cap so free time is never wasted
      const evaluate = (st: SubjectState, allowReviseOverflow: boolean) => {
        const daysToExam = examDayOf(st)
        if (daysToExam !== null && daysToExam < 0) return null // exam finished

        const revise = wouldRevise(st, daysToExam)
        const hasPrimary = st.learnUnitsLeft > 0 || st.practiceQueue.length > 0
        const hasAny = hasPrimary || st.completed.length > 0
        if (!hasAny) return null

        if (revise) {
          if (st.reviseToday >= reviseCap(daysToExam) && !allowReviseOverflow) return null
        }

        // daily block cap: 3/subject/day unless exam ≤ 3 days
        const cap = daysToExam !== null && daysToExam <= 3 ? 99 : 3
        if (st.sessionsToday >= cap) return null

        // count remaining study days (this day included) until exam
        let studyDaysLeft = 0
        if (daysToExam !== null) {
          for (let k = 0; k <= daysToExam; k++) {
            if (studyDaySet.has(weekdayOf(addDays(date, k)))) studyDaysLeft++
          }
        } else {
          studyDaysLeft = Math.max(1, days - offset)
        }

        const remainingWork =
          st.learnUnitsLeft +
          st.practiceQueue.length +
          (st.completed.length > 0 ? 0.5 : 0) // mild pull toward revision-only subjects

        let urgency = remainingWork / Math.max(1, studyDaysLeft)
        if (daysToExam === null) urgency *= 0.55 // undated subjects rank lower

        // proximity boosts — final days count double
        let boost = 1
        if (daysToExam !== null) {
          if (daysToExam <= 2) boost = 1.8
          else if (daysToExam <= 7) boost = 1.3
        }

        // prefer variety: small penalty when same subject ran in previous slot
        const varietyPenalty = st.lastPicked ? 0.25 : 0
        return { score: urgency * boost - varietyPenalty, daysToExam }
      }

      const othersHaveFreshWork = states.some((o) => {
        const d = examDayOf(o)
        if (d !== null && d < 0) return false
        const cap = d !== null && d <= 3 ? 99 : 3
        if (o.sessionsToday >= cap) return false
        if (wouldRevise(o, d)) return o.reviseToday < reviseCap(d)
        return o.learnUnitsLeft > 0 || o.practiceQueue.length > 0
      })

      // ── pick the highest-priority subject for this slot ──
      let best: SubjectState | null = null
      let bestDaysToExam: number | null = null
      let bestScore = -1

      for (const allowOverflow of [false, true]) {
        if (allowOverflow && othersHaveFreshWork) break
        for (const st of states) {
          const res = evaluate(st, allowOverflow)
          if (res && res.score > bestScore) {
            bestScore = res.score
            best = st
            bestDaysToExam = res.daysToExam
          }
        }
        if (best) break
      }

      if (!best) continue

      best.lastPicked = true
      for (const other of states) if (other !== best) other.lastPicked = false

      const daysToExam = bestDaysToExam

      // ── decide session type for the picked subject ──
      let type: PlannedSession["type"]
      let topicId: string | null = null
      let topicName = ""

      const cramMode = daysToExam !== null && daysToExam <= 2 && best.completed.length > 0

      if (cramMode) {
        // final 48h → consolidate what's already learned
        type = "REVISE"
        const t = best.completed[best.reviseIdx % best.completed.length]
        best.reviseIdx++
        topicId = t.id
        topicName = t.name
      } else if (best.pending.length > 0) {
        const t = best.pending[0]
        if (sessionsNeeded(t) === 2) {
          // hard topic → first block LEARN, second block PRACTICE
          if (best.practiceQueue.length > 0 && best.practiceQueue[0].topic.id === t.id) {
            type = "PRACTICE"
            best.practiceQueue.shift()
            // topic fully covered after practice → remove from pending
            best.pending.shift()
            best.learnUnitsLeft--
          } else {
            type = "LEARN"
            best.practiceQueue.unshift({ topic: t, nth: 2 })
          }
        } else {
          type = "LEARN"
          best.pending.shift()
          best.learnUnitsLeft--
        }
        topicId = t.id
        topicName = t.name
      } else if (best.completed.length > 0) {
        type = "REVISE"
        const t = best.completed[best.reviseIdx % best.completed.length]
        best.reviseIdx++
        topicId = t.id
        topicName = t.name
      } else {
        continue
      }

      best.sessionsToday++
      if (type === "REVISE") best.reviseToday++
      plan.push({
        subjectId: best.subject.id,
        topicId,
        topicName,
        date,
        startTime: toHHMM(slot.start),
        duration: blockLen,
        type,
      })
    }
  }

  return plan
}
