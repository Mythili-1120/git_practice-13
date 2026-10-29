"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Loader2, Save, Eraser, Clock, CalendarRange } from "lucide-react"
import { WEEKDAY_SHORT, type ClientSettings } from "./types"

interface SettingsTabProps {
  settings: ClientSettings | null
  onSave: (s: ClientSettings) => Promise<void>
  onClearPlan: () => Promise<void>
}

export function SettingsTab({ settings, onSave, onClearPlan }: SettingsTabProps) {
  const [form, setForm] = useState<ClientSettings>({
    dayStart: "16:00",
    dayEnd: "21:00",
    sessionLength: 45,
    breakLength: 10,
    studyDays: "1,2,3,4,5,6",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const toggleDay = (d: number) => {
    const set = new Set(
      form.studyDays
        .split(",")
        .map((x) => parseInt(x, 10))
        .filter((x) => !isNaN(x))
    )
    if (set.has(d)) set.delete(d)
    else set.add(d)
    if (set.size === 0) return // must keep at least one day
    const sorted = Array.from(set).sort((a, b) => a - b)
    setForm({ ...form, studyDays: sorted.join(",") })
  }

  const selectedDays = new Set(
    form.studyDays
      .split(",")
      .map((x) => parseInt(x, 10))
      .filter((x) => !isNaN(x))
  )

  const windowMinutes =
    (parseInt(form.dayEnd.split(":")[0]) * 60 + parseInt(form.dayEnd.split(":")[1])) -
    (parseInt(form.dayStart.split(":")[0]) * 60 + parseInt(form.dayStart.split(":")[1]))
  const perDay =
    windowMinutes > 0
      ? Math.floor(
          (windowMinutes + form.breakLength) / Math.max(1, form.sessionLength + form.breakLength)
        ) * form.sessionLength
      : 0

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Daily study window
          </CardTitle>
          <CardDescription>
            The scheduler only places study blocks inside this window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="day-start">Starts at</Label>
              <Input
                id="day-start"
                type="time"
                value={form.dayStart}
                onChange={(e) => setForm({ ...form, dayStart: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="day-end">Ends at</Label>
              <Input
                id="day-end"
                type="time"
                value={form.dayEnd}
                onChange={(e) => setForm({ ...form, dayEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="session-length">Session length (min)</Label>
              <Input
                id="session-length"
                type="number"
                min={15}
                max={180}
                step={5}
                value={form.sessionLength}
                onChange={(e) =>
                  setForm({ ...form, sessionLength: Number(e.target.value) || 45 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="break-length">Break between sessions (min)</Label>
              <Input
                id="break-length"
                type="number"
                min={0}
                max={60}
                step={5}
                value={form.breakLength}
                onChange={(e) =>
                  setForm({ ...form, breakLength: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            ≈ {Math.round((perDay / 60) * 10) / 10} hours of focused study per study day
            ({perDay > 0 ? Math.floor(windowMinutes / (form.sessionLength + form.breakLength)) + 1 : 0}{" "}
            sessions max).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Study days
          </CardTitle>
          <CardDescription>
            Days of the week you are available to study.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((label, d) => {
              const active = selectedDays.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDay(d)}
                  className={`h-11 w-14 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-muted-foreground hover:text-red-600">
              <Eraser className="mr-2 h-4 w-4" /> Clear upcoming plan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all upcoming study blocks?</AlertDialogTitle>
              <AlertDialogDescription>
                Uncompleted sessions from today onward will be removed. Completed
                history and your subjects stay untouched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClearPlan}
                className="bg-red-600 hover:bg-red-700"
              >
                Clear plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave(form)
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save settings
        </Button>
      </div>
    </div>
  )
}
