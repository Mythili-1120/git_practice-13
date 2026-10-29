import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  let settings = await db.settings.findUnique({ where: { id: "default" } })
  if (!settings) {
    settings = await db.settings.create({ data: { id: "default" } })
  }
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/
    if (typeof body.dayStart === "string" && timeRe.test(body.dayStart)) data.dayStart = body.dayStart
    if (typeof body.dayEnd === "string" && timeRe.test(body.dayEnd)) data.dayEnd = body.dayEnd
    if (Number.isFinite(Number(body.sessionLength)))
      data.sessionLength = Math.min(180, Math.max(15, Number(body.sessionLength)))
    if (Number.isFinite(Number(body.breakLength)))
      data.breakLength = Math.min(60, Math.max(0, Number(body.breakLength)))
    if (typeof body.studyDays === "string" && body.studyDays.length > 0)
      data.studyDays = body.studyDays

    const settings = await db.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
