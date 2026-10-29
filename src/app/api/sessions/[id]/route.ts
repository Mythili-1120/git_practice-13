import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

// PATCH — toggle completed on a study session
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const current = await db.studySession.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: "Session not found" }, { status: 404 })

    const completed =
      typeof body.completed === "boolean" ? body.completed : !current.completed
    const session = await db.studySession.update({ where: { id }, data: { completed } })
    return NextResponse.json(session)
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    await db.studySession.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 })
  }
}
