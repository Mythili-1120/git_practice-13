"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  CalendarClock,
  Loader2,
} from "lucide-react"
import {
  DIFFICULTY_LABELS,
  examCountdownLabel,
  SUBJECT_COLORS,
  type ClientSubject,
  type ClientTopic,
} from "./types"

interface SubjectsTabProps {
  subjects: ClientSubject[]
  onAddSubject: (data: {
    name: string
    color: string
    examDate: string | null
    examName: string | null
  }) => Promise<void>
  onUpdateSubject: (
    id: string,
    data: {
      name?: string
      color?: string
      examDate?: string | null
      examName?: string | null
    }
  ) => Promise<void>
  onDeleteSubject: (id: string) => Promise<void>
  onAddTopic: (subjectId: string, name: string, difficulty: number) => Promise<void>
  onToggleTopic: (topic: ClientTopic) => Promise<void>
  onDeleteTopic: (id: string) => Promise<void>
}

interface SubjectFormState {
  name: string
  color: string
  examDate: string
  examName: string
}

const emptyForm: SubjectFormState = {
  name: "",
  color: SUBJECT_COLORS[0],
  examDate: "",
  examName: "",
}

export function SubjectsTab({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onAddTopic,
  onToggleTopic,
  onDeleteTopic,
}: SubjectsTabProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<ClientSubject | null>(null)
  const [form, setForm] = useState<SubjectFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [topicInputs, setTopicInputs] = useState<Record<string, { name: string; difficulty: number }>>({})

  const openAdd = () => {
    setForm({ ...emptyForm, color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] })
    setAddOpen(true)
  }

  const openEdit = (s: ClientSubject) => {
    setEditSubject(s)
    setForm({
      name: s.name,
      color: s.color,
      examDate: s.examDate ? s.examDate.slice(0, 10) : "",
      examName: s.examName ?? "",
    })
  }

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        examDate: form.examDate || null,
        examName: form.examName.trim() || null,
      }
      if (editSubject) await onUpdateSubject(editSubject.id, payload)
      else await onAddSubject(payload)
      setAddOpen(false)
      setEditSubject(null)
      setForm(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  const getTopicInput = (id: string) => topicInputs[id] ?? { name: "", difficulty: 2 }
  const setTopicInput = (id: string, patch: Partial<{ name: string; difficulty: number }>) =>
    setTopicInputs((prev) => ({ ...prev, [id]: { ...getTopicInput(id), ...patch } }))

  const submitTopic = async (subjectId: string) => {
    const t = getTopicInput(subjectId)
    if (!t.name.trim()) return
    await onAddTopic(subjectId, t.name.trim(), t.difficulty)
    setTopicInputs((prev) => ({ ...prev, [subjectId]: { name: "", difficulty: t.difficulty } }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subjects & topics</h2>
          <p className="text-sm text-muted-foreground">
            Exam dates and pending topics drive the scheduler&apos;s priorities.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" /> Add subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15">
              <BookOpen className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold">No subjects yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add each subject you&apos;re studying, set its exam date, and list the
                topics you still need to cover.
              </p>
            </div>
            <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Add your first subject
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {subjects.map((s) => {
            const total = s.topics.length
            const done = s.topics.filter((t) => t.status === "COMPLETED").length
            const pct = total === 0 ? 0 : Math.round((done / total) * 100)
            const urgent = examCountdownLabel(s.examDate, new Date().toISOString().slice(0, 10))
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: s.color }} />
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{s.name}</h3>
                        {s.examDate && (
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-semibold ${
                              urgent === "TODAY" || urgent === "Tomorrow"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                : "bg-muted"
                            }`}
                          >
                            <CalendarClock className="mr-1 h-3 w-3" />
                            Exam {examCountdownLabel(s.examDate, new Date().toISOString().slice(0, 10))}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.examName ? `${s.examName} · ` : ""}
                        {s.examDate ? s.examDate.slice(0, 10) : "no exam date"} ·{" "}
                        {done}/{total} topics done
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => openEdit(s)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${s.name}`}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete “{s.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the subject, all its topics and its
                              scheduled study blocks. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteSubject(s.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  {/* Topics */}
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {s.topics.length === 0 && (
                      <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                        No topics yet — add chapters or units below.
                      </p>
                    )}
                    {s.topics.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2"
                      >
                        <Checkbox
                          id={`topic-${t.id}`}
                          checked={t.status === "COMPLETED"}
                          onCheckedChange={() => onToggleTopic(t)}
                          aria-label={`Mark ${t.name} ${t.status === "COMPLETED" ? "pending" : "completed"}`}
                          className="data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                        />
                        <label
                          htmlFor={`topic-${t.id}`}
                          className={`min-w-0 flex-1 cursor-pointer truncate text-sm ${
                            t.status === "COMPLETED"
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {t.name}
                        </label>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 text-[10px] font-semibold ${
                            t.difficulty === 3
                              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                              : t.difficulty === 2
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          }`}
                        >
                          {DIFFICULTY_LABELS[t.difficulty]}
                        </Badge>
                        <button
                          aria-label={`Delete topic ${t.name}`}
                          onClick={() => onDeleteTopic(t.id)}
                          className="shrink-0 text-muted-foreground/60 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add topic inline */}
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="New topic / chapter…"
                      value={getTopicInput(s.id).name}
                      onChange={(e) => setTopicInput(s.id, { name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitTopic(s.id)
                      }}
                      className="h-9 min-w-36 flex-1"
                    />
                    <Select
                      value={String(getTopicInput(s.id).difficulty)}
                      onValueChange={(v) => setTopicInput(s.id, { difficulty: Number(v) })}
                    >
                      <SelectTrigger className="h-9 w-28" aria-label="Difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Easy</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => submitTopic(s.id)}
                      disabled={!getTopicInput(s.id).name.trim()}
                      className="h-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit subject dialog */}
      <Dialog
        open={addOpen || editSubject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false)
            setEditSubject(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSubject ? "Edit subject" : "Add subject"}</DialogTitle>
            <DialogDescription>
              Exam dates let the scheduler prioritise this subject as the exam
              approaches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject-name">Subject name</Label>
              <Input
                id="subject-name"
                placeholder="e.g. Mathematics"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                }}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subject-exam-date">Exam date</Label>
                <Input
                  id="subject-exam-date"
                  type="date"
                  value={form.examDate}
                  onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-exam-name">Exam label (optional)</Label>
                <Input
                  id="subject-exam-name"
                  placeholder="e.g. Finals Paper 1"
                  value={form.examName}
                  onChange={(e) => setForm({ ...form, examName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Pick colour ${c}`}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      form.color === c
                        ? "scale-110 ring-2 ring-offset-2 ring-neutral-400 dark:ring-offset-neutral-900"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false)
                setEditSubject(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!form.name.trim() || saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editSubject ? "Save changes" : "Add subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
