"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  CalendarCheck2,
  BookOpen,
  Settings2,
  GraduationCap,
  RefreshCw,
  Flame,
  ListTodo,
  Timer,
  Moon,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { TodayTab } from "@/components/study/today-tab"
import { SubjectsTab } from "@/components/study/subjects-tab"
import { SettingsTab } from "@/components/study/settings-tab"
import {
  addDaysLocal,
  api,
  daysUntil,
  todayStr,
  type ClientSession,
  type ClientSettings,
  type ClientSubject,
  type ClientTopic,
} from "@/components/study/types"

const PLAN_DAYS = 14

export default function Home() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState(() => todayStr())
  const [viewDate, setViewDate] = useState(() => todayStr())
  const [tab, setTab] = useState("today")
  const [subjects, setSubjects] = useState<ClientSubject[]>([])
  const [sessions, setSessions] = useState<ClientSession[]>([])
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dirty, setDirty] = useState(false)

  // keep "today" fresh across midnight / long sessions
  useEffect(() => {
    setMounted(true)
    const tick = setInterval(() => {
      const t = todayStr()
      setToday((prev) => (prev === t ? prev : t))
    }, 30000)
    return () => clearInterval(tick)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const t = todayStr()
      const [subs, sess, cfg] = await Promise.all([
        api<ClientSubject[]>("/api/subjects"),
        api<ClientSession[]>(
          `/api/timetable?from=${t}&to=${addDaysLocal(t, PLAN_DAYS - 1)}`
        ),
        api<ClientSettings>("/api/settings"),
      ])
      setSubjects(subs)
      setSessions(sess)
      setSettings(cfg)
    } catch (e) {
      toast({
        title: "Could not load data",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
     
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── actions ────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await api<{ generated: number }>("/api/timetable", {
        method: "POST",
        body: JSON.stringify({ startDate: todayStr(), days: PLAN_DAYS }),
      })
      setDirty(false)
      setViewDate(todayStr())
      const t = todayStr()
      setSessions(
        await api<ClientSession[]>(`/api/timetable?from=${t}&to=${addDaysLocal(t, PLAN_DAYS - 1)}`)
      )
      toast({
        title: "Timetable ready 🎯",
        description: `${res.generated} study blocks planned for the next ${PLAN_DAYS} days.`,
      })
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
     
  }, [])

  const markDirty = () => setDirty(true)

  const addSubject: SubjectsTabProps["onAddSubject"] = async (data) => {
    await api("/api/subjects", { method: "POST", body: JSON.stringify(data) })
    setSubjects(await api<ClientSubject[]>("/api/subjects"))
    setDirty(true)
    toast({ title: "Subject added", description: `${data.name} is ready to plan.` })
  }

  const updateSubject: SubjectsTabProps["onUpdateSubject"] = async (id, data) => {
    await api(`/api/subjects/${id}`, { method: "PATCH", body: JSON.stringify(data) })
    setSubjects(await api<ClientSubject[]>("/api/subjects"))
    setDirty(true)
    toast({ title: "Subject updated" })
  }

  const deleteSubject: SubjectsTabProps["onDeleteSubject"] = async (id) => {
    await api(`/api/subjects/${id}`, { method: "DELETE" })
    const [subs, t] = await Promise.all([
      api<ClientSubject[]>("/api/subjects"),
      Promise.resolve(todayStr()),
    ])
    setSubjects(subs)
    setSessions(
      await api<ClientSession[]>(`/api/timetable?from=${t}&to=${addDaysLocal(t, PLAN_DAYS - 1)}`)
    )
    setDirty(true)
    toast({ title: "Subject deleted" })
  }

  const addTopic: SubjectsTabProps["onAddTopic"] = async (subjectId, name, difficulty) => {
    await api("/api/topics", {
      method: "POST",
      body: JSON.stringify({ subjectId, name, difficulty }),
    })
    setSubjects(await api<ClientSubject[]>("/api/subjects"))
    setDirty(true)
  }

  const toggleTopic: SubjectsTabProps["onToggleTopic"] = async (topic) => {
    const next = topic.status === "COMPLETED" ? "PENDING" : "COMPLETED"
    await api<ClientTopic>(`/api/topics/${topic.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    })
    setSubjects(await api<ClientSubject[]>("/api/subjects"))
    setDirty(true)
  }

  const deleteTopic: SubjectsTabProps["onDeleteTopic"] = async (id) => {
    await api(`/api/topics/${id}`, { method: "DELETE" })
    const [subs, t] = await Promise.all([
      api<ClientSubject[]>("/api/subjects"),
      Promise.resolve(todayStr()),
    ])
    setSubjects(subs)
    setSessions(
      await api<ClientSession[]>(`/api/timetable?from=${t}&to=${addDaysLocal(t, PLAN_DAYS - 1)}`)
    )
    setDirty(true)
  }

  const toggleSession = async (s: ClientSession) => {
    // optimistic update
    setSessions((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, completed: !x.completed } : x))
    )
    try {
      await api(`/api/sessions/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !s.completed }),
      })
    } catch {
      setSessions((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, completed: s.completed } : x))
      )
      toast({
        title: "Could not update session",
        variant: "destructive",
      })
    }
  }

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((x) => x.id !== id))
    try {
      await api(`/api/sessions/${id}`, { method: "DELETE" })
    } catch {
      loadAll()
    }
  }

  const saveSettings = async (cfg: ClientSettings) => {
    setSettings(
      await api<ClientSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(cfg),
      })
    )
    setDirty(true)
    toast({
      title: "Settings saved",
      description: "Regenerate the timetable to apply your new schedule.",
    })
  }

  const clearPlan = async () => {
    await api(`/api/timetable?from=${todayStr()}`, { method: "DELETE" })
    const t = todayStr()
    setSessions(
      await api<ClientSession[]>(`/api/timetable?from=${t}&to=${addDaysLocal(t, PLAN_DAYS - 1)}`)
    )
    toast({ title: "Upcoming plan cleared" })
  }

  // ── derived stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const todaySessions = sessions.filter((s) => s.date === today)
    const doneToday = todaySessions.filter((s) => s.completed).length
    const pendingTopics = subjects.reduce(
      (acc, s) => acc + s.topics.filter((t) => t.status !== "COMPLETED").length,
      0
    )
    const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0)
    const doneTopics = totalTopics - pendingTopics
    const nextExam = subjects
      .filter((s) => s.examDate)
      .map((s) => ({ name: s.name, diff: daysUntil(s.examDate, today) ?? 9999 }))
      .filter((x) => x.diff >= 0)
      .sort((a, b) => a.diff - b.diff)[0]
    const minutesToday = todaySessions.reduce((a, s) => a + s.duration, 0)
    return {
      todayCount: todaySessions.length,
      doneToday,
      pendingTopics,
      totalTopics,
      doneTopics,
      nextExam,
      minutesToday,
      readiness: totalTopics === 0 ? 0 : Math.round((doneTopics / totalTopics) * 100),
    }
  }, [sessions, subjects, today])

  const examHint =
    stats.nextExam === undefined
      ? "Add exam dates to unlock priority planning"
      : stats.nextExam.diff === 0
        ? `${stats.nextExam.name} is today — good luck!`
        : stats.nextExam.diff === 1
          ? `${stats.nextExam.name} is tomorrow`
          : `Next exam: ${stats.nextExam.name} in ${stats.nextExam.diff} days`

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/20">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">StudyFlow</h1>
              <p className="text-xs text-muted-foreground">
                Smart daily timetables, driven by your exams
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 p-0"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={generate}
              disabled={generating || subjects.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {generating ? "Planning…" : "Generate plan"}
              </span>
              <span className="sm:hidden">{generating ? "…" : "Plan"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              TODAY&apos;S PROGRESS
            </div>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold">
                {stats.doneToday}
                <span className="text-base font-medium text-muted-foreground">
                  /{stats.todayCount} blocks
                </span>
              </p>
            )}
            <div className="mt-2">
              <Progress
                value={stats.todayCount === 0 ? 0 : (stats.doneToday / stats.todayCount) * 100}
                className="h-1.5"
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ListTodo className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              PENDING TOPICS
            </div>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold">
                {stats.pendingTopics}
                <span className="text-base font-medium text-muted-foreground">
                  /{stats.totalTopics}
                </span>
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.totalTopics === 0
                ? "Add topics to track readiness"
                : `Overall readiness ${stats.readiness}%`}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Flame className="h-4 w-4 text-red-500" />
              NEXT EXAM
            </div>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold">
                {stats.nextExam === undefined
                  ? "—"
                  : stats.nextExam.diff === 0
                    ? "TODAY"
                    : `${stats.nextExam.diff}d`}
              </p>
            )}
            <p className="mt-2 truncate text-xs text-muted-foreground">{examHint}</p>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Timer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              PLANNED TODAY
            </div>
            {loading ? (
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold">
                {Math.round((stats.minutesToday / 60) * 10) / 10}
                <span className="text-base font-medium text-muted-foreground"> hours</span>
              </p>
            )}
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {settings
                ? `${settings.dayStart}–${settings.dayEnd} · ${settings.sessionLength}m sessions`
                : "Set your study window in Settings"}
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="today" className="gap-1.5">
              <CalendarCheck2 className="h-4 w-4" /> Today
            </TabsTrigger>
            <TabsTrigger value="subjects" className="gap-1.5">
              <BookOpen className="h-4 w-4" /> Subjects
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <TodayTab
              today={today}
              viewDate={viewDate}
              setViewDate={setViewDate}
              sessions={sessions}
              subjects={subjects}
              generating={generating}
              onGenerate={generate}
              onToggleSession={toggleSession}
              onDeleteSession={deleteSession}
              onGoToSubjects={() => setTab("subjects")}
              dirty={dirty}
            />
          </TabsContent>

          <TabsContent value="subjects">
            <SubjectsTab
              subjects={subjects}
              onAddSubject={addSubject}
              onUpdateSubject={updateSubject}
              onDeleteSubject={deleteSubject}
              onAddTopic={addTopic}
              onToggleTopic={toggleTopic}
              onDeleteTopic={deleteTopic}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab settings={settings} onSave={saveSettings} onClearPlan={clearPlan} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
        StudyFlow · exam-driven study planning — pending topics first, spaced revision always.
      </footer>
    </div>
  )
}

// type re-export for handler signature reuse
type SubjectsTabProps = ComponentProps<typeof SubjectsTab>
