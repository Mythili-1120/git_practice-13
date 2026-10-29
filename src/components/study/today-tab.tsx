"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trash2,
  BookOpen,
  RefreshCw,
  Sparkles,
  CircleCheck,
} from "lucide-react"
import {
  addDaysLocal,
  endTimeOf,
  examCountdownLabel,
  prettyDate,
  SESSION_TYPE_STYLES,
  shortDate,
  WEEKDAY_SHORT,
  type ClientSession,
  type ClientSubject,
} from "./types"

interface TodayTabProps {
  today: string
  viewDate: string
  setViewDate: (d: string) => void
  sessions: ClientSession[] // all sessions in the 14-day window
  subjects: ClientSubject[]
  generating: boolean
  onGenerate: () => void
  onToggleSession: (s: ClientSession) => void
  onDeleteSession: (id: string) => void
  onGoToSubjects: () => void
  dirty: boolean
}

export function TodayTab({
  today,
  viewDate,
  setViewDate,
  sessions,
  subjects,
  generating,
  onGenerate,
  onToggleSession,
  onDeleteSession,
  onGoToSubjects,
  dirty,
}: TodayTabProps) {
  const daySessions = sessions.filter((s) => s.date === viewDate)
  const doneCount = daySessions.filter((s) => s.completed).length
  const plannedMinutes = daySessions.reduce((a, s) => a + s.duration, 0)
  const doneMinutes = daySessions
    .filter((s) => s.completed)
    .reduce((a, s) => a + s.duration, 0)
  const progressPct =
    daySessions.length === 0
      ? 0
      : Math.round((doneCount / daySessions.length) * 100)

  const hasSubjects = subjects.length > 0
  const hasPendingTopics = subjects.some((s) =>
    s.topics.some((t) => t.status !== "COMPLETED")
  )
  const windowDays = Array.from({ length: 7 }, (_, i) => addDaysLocal(today, i))

  return (
    <div className="space-y-5">
      {/* Exam countdown strip */}
      {subjects.some((s) => s.examDate) && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {subjects
            .filter((s) => s.examDate)
            .map((s) => {
              const urgent =
                examCountdownLabel(s.examDate, today) === "TODAY" ||
                examCountdownLabel(s.examDate, today) === "Tomorrow"
              return (
                <div
                  key={s.id}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    urgent
                      ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                      : "bg-card"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span
                    className={`font-semibold ${
                      urgent
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {examCountdownLabel(s.examDate, today)}
                  </span>
                </div>
              )
            })}
        </div>
      )}

      {/* Day navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous day"
            disabled={viewDate <= today}
            onClick={() => setViewDate(addDaysLocal(viewDate, -1))}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-44 text-center">
            <p className="text-base font-semibold leading-tight">
              {prettyDate(viewDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {shortDate(viewDate)} ·{" "}
              {daySessions.length === 0
                ? "rest day"
                : `${plannedMinutes} min planned`}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            disabled={viewDate >= addDaysLocal(today, 13)}
            onClick={() => setViewDate(addDaysLocal(viewDate, 1))}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {daySessions.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {doneCount}/{daySessions.length} done ·{" "}
              {Math.round(doneMinutes / 60 * 10) / 10}h/
              {Math.round(plannedMinutes / 60 * 10) / 10}h
            </span>
            <div className="w-28">
              <Progress value={progressPct} className="h-2" />
            </div>
          </div>
        )}
      </div>

      {/* Week overview strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {windowDays.map((d) => {
          const ds = sessions.filter((s) => s.date === d)
          const allDone = ds.length > 0 && ds.every((s) => s.completed)
          return (
            <button
              key={d}
              onClick={() => setViewDate(d)}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-xs transition-colors ${
                d === viewDate
                  ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10"
                  : "bg-card hover:bg-muted/60"
              }`}
            >
              <span className="text-muted-foreground text-[10px] uppercase">
                {WEEKDAY_SHORT[new Date(d + "T00:00:00").getDay()]}
              </span>
              <span className="font-semibold">{d.slice(8)}</span>
              <span
                className={`text-[10px] ${
                  allDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ds.length > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                }`}
              >
                {ds.length === 0 ? "—" : allDone ? "✓ done" : `${ds.length} blocks`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Regenerate hint */}
      {dirty && hasSubjects && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Sparkles className="h-4 w-4 shrink-0" />
            Your subjects or topics changed — regenerate to refresh the plan.
          </span>
          <Button
            size="sm"
            onClick={onGenerate}
            disabled={generating}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            {generating ? "Planning…" : "Regenerate"}
          </Button>
        </div>
      )}

      {/* Session timeline */}
      {daySessions.length > 0 ? (
        <div className="space-y-2.5">
          {daySessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all sm:p-4 ${
                s.completed ? "opacity-60" : "hover:shadow-sm"
              }`}
            >
              <div
                className="flex h-11 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.subject.color }}
              />
              <div className="w-16 shrink-0 sm:w-20">
                <p className="text-sm font-semibold tabular-nums">{s.startTime}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {endTimeOf(s.startTime, s.duration)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">{s.subject.name}</span>
                  <Badge
                    variant="secondary"
                    className={`h-5 px-1.5 text-[10px] font-semibold ${
                      SESSION_TYPE_STYLES[s.type] ?? ""
                    }`}
                  >
                    {s.type}
                  </Badge>
                </div>
                <p
                  className={`truncate text-sm text-muted-foreground ${
                    s.completed ? "line-through" : ""
                  }`}
                >
                  {s.topicName || "General study"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {s.duration}m
              </span>
              <Button
                size="icon"
                variant={s.completed ? "secondary" : "outline"}
                aria-label={s.completed ? "Mark as not done" : "Mark as done"}
                onClick={() => onToggleSession(s)}
                className={`h-9 w-9 shrink-0 ${
                  s.completed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "hover:border-emerald-500 hover:text-emerald-600"
                }`}
              >
                {s.completed ? (
                  <CircleCheck className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete session"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this study block?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.subject.name} · {s.topicName} at {s.startTime}. You can
                      regenerate the plan anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteSession(s.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15">
              {hasSubjects ? (
                <CalendarDays className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <BookOpen className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            {hasSubjects ? (
              <>
                <div>
                  <p className="font-semibold">No study blocks for this day</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {hasPendingTopics
                      ? "Generate your personalised timetable — it fills your free hours and prioritises what matters most."
                      : "All topics are completed. Add new topics or enjoy the rest day!"}
                  </p>
                </div>
                {hasPendingTopics && (
                  <Button
                    onClick={onGenerate}
                    disabled={generating}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                    {generating ? "Planning…" : "Generate my timetable"}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold">Welcome to StudyFlow 👋</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Add your subjects with exam dates and pending topics, then let
                    StudyFlow build your daily study timetable automatically.
                  </p>
                </div>
                <Button
                  onClick={onGoToSubjects}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Add your first subject
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <CardHeader className="sr-only">
        <CardTitle>Daily timetable</CardTitle>
      </CardHeader>
    </div>
  )
}
