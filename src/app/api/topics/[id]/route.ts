import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if ([1, 2, 3].includes(Number(body.difficulty))) data.difficulty = Number(body.difficulty)
    if (body.status === "PENDING" || body.status === "COMPLETED") {
      data.status = body.status
      data.completedAt = body.status === "COMPLETED" ? new Date() : null
    }
    const topic = await db.topic.update({ where: { id }, data })
    return NextResponse.json(topic)
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    await db.topic.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 })
  }
}
