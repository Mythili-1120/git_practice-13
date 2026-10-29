import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.color === "string") data.color = body.color
    if (body.examDate !== undefined)
      data.examDate = body.examDate ? new Date(`${body.examDate}T00:00:00.000Z`) : null
    if (body.examName !== undefined)
      data.examName = body.examName ? String(body.examName).trim() || null : null

    const subject = await db.subject.update({
      where: { id },
      data,
      include: { topics: { orderBy: [{ status: "desc" }, { createdAt: "asc" }] } },
    })
    return NextResponse.json(subject)
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    await db.subject.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 })
  }
}
