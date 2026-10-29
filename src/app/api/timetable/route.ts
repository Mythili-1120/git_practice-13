import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  generateTimetable,
  todayStr,
  type PlannerSettings,
  type BlockedInterval,
} from "@/lib/timetable"

// GET /api/timetable?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get("from") ?? todayStr()
  const to = url.searchParams.get("to") ?? from
  const sessions = await db.studySession.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { subject: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(sessions)
}

// POST /api/timetable — generate a fresh plan
// body: { startDate?: string, days?: number }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const startDate =
      typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
        ? body.startDate
        : todayStr()
    const days = Math.min(30, Math.max(1, Number(body.days) || 14))

    const [subjects, settingsRow] = await Promise.all([
      db.subject.findMany({
        include: { topics: { orderBy: [{ status: "desc" }, { createdAt: "asc" }] } },
      }),
      db.settings.findUnique({ where: { id: "default" } }).then(
        (r) =>
          r ?? db.settings.create({ data: { id: "default" } })
      ),
    ])

    const settings: PlannerSettings = {
      dayStart: settingsRow.dayStart,
      dayEnd: settingsRow.dayEnd,
      sessionLength: settingsRow.sessionLength,
      breakLength: settingsRow.breakLength,
      studyDays: settingsRow.studyDays,
    }

    // keep completed sessions (history + today's progress), clear the rest ahead
    await db.studySession.deleteMany({
      where: { date: { gte: startDate }, completed: false },
    })

    // completed sessions on planned days act as fixed, non-movable blocks
    const kept = await db.studySession.findMany({
      where: { date: { gte: startDate }, completed: true },
    })
    const blocked: BlockedInterval[] = kept.map((s) => ({
      date: s.date,
      startMinutes:
        Number(s.startTime.split(":")[0]) * 60 + Number(s.startTime.split(":")[1]),
      duration: s.duration,
    }))

    const plan = generateTimetable(
      subjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        examDate: s.examDate ? s.examDate.toISOString() : null,
        topics: s.topics.map((t) => ({
          id: t.id,
          name: t.name,
          difficulty: t.difficulty,
          status: t.status,
        })),
      })),
      settings,
      startDate,
      days,
      blocked
    )

    if (plan.length > 0) {
      await db.studySession.createMany({ data: plan })
    }

    const created = await db.studySession.count({
      where: { date: { gte: startDate }, completed: false },
    })
    return NextResponse.json({ ok: true, generated: plan.length, upcomingSessions: created })
  } catch (e) {
    console.error("generate error", e)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}

// DELETE /api/timetable?from=YYYY-MM-DD — clear uncompleted sessions from a date
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get("from") ?? todayStr()
  await db.studySession.deleteMany({ where: { date: { gte: from }, completed: false } })
  return NextResponse.json({ ok: true })
}
