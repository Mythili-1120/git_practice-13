import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const subjectId = body.subjectId
    const name = (body.name ?? "").toString().trim()
    const difficulty = [1, 2, 3].includes(Number(body.difficulty)) ? Number(body.difficulty) : 2
    if (!subjectId || !name) {
      return NextResponse.json({ error: "subjectId and name are required" }, { status: 400 })
    }
    const topic = await db.topic.create({ data: { subjectId, name, difficulty } })
    return NextResponse.json(topic, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
