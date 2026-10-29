import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const subjects = await db.subject.findMany({
    orderBy: [{ examDate: "asc" }, { createdAt: "asc" }],
    include: { topics: { orderBy: [{ status: "desc" }, { createdAt: "asc" }] } },
  })
  return NextResponse.json(subjects)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = (body.name ?? "").toString().trim()
    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 })
    }
    const color = typeof body.color === "string" ? body.color : "#10b981"
    const examDate = body.examDate ? new Date(`${body.examDate}T00:00:00.000Z`) : null
    const examName = body.examName ? String(body.examName).trim() || null : null

    const subject = await db.subject.create({
      data: { name, color, examDate, examName },
      include: { topics: true },
    })
    return NextResponse.json(subject, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
