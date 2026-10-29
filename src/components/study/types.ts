// Shared client-side types + helpers for StudyFlow UI

export interface ClientTopic {
  id: string
  name: string
  difficulty: number
  status: string
}

export interface ClientSubject {
  id: string
  name: string
  color: string
  examDate: string | null
  examName: string | null
  topics: ClientTopic[]
}

export interface ClientSession {
  id: string
  subjectId: string
  topicId: string | null
  topicName: string
  date: string
  startTime: string
  duration: number
  type: string
  completed: boolean
  subject: { id: string; name: string; color: string }
}

export interface ClientSettings {
  dayStart: string
  dayEnd: string
  sessionLength: number
  breakLength: number
  studyDays: string
}

export const SUBJECT_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple
]

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
}

export const SESSION_TYPE_STYLES: Record<string, string> = {
  LEARN:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REVISE:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PRACTICE:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function addDaysLocal(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return todayStr(dt)
}

export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const today = todayStr()
  if (dateStr === today) return "Today"
  if (dateStr === addDaysLocal(today, 1)) return "Tomorrow"
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function endTimeOf(startTime: string, duration: number): string {
  const [h, m] = startTime.split(":").map(Number)
  const total = h * 60 + m + duration
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`
}

export function daysUntil(examDate: string | null, today: string): number | null {
  if (!examDate) return null
  const [ey, em, ed] = examDate.slice(0, 10).split("-").map(Number)
  const [ty, tm, td] = today.split("-").map(Number)
  const diff = Math.round(
    (new Date(ey, em - 1, ed).getTime() - new Date(ty, tm - 1, td).getTime()) /
      86400000
  )
  return diff
}

export function examCountdownLabel(examDate: string | null, today: string): string {
  const diff = daysUntil(examDate, today)
  if (diff === null) return "No exam date"
  if (diff < 0) return "Exam done"
  if (diff === 0) return "TODAY"
  if (diff === 1) return "Tomorrow"
  return `${diff} days`
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  })
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j) => j.error)
      .catch(() => `Request failed (${res.status})`)
    throw new Error(msg)
  }
  return res.json()
}
