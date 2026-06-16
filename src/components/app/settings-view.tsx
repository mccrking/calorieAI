'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Target, Save, Loader2, RotateCcw, Database, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { useCalorieStore } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'

const presets = [
  { label: 'Weight Loss', desc: '1,500 kcal', calories: 1500, protein: 130, carbs: 150, fat: 50 },
  { label: 'Maintain', desc: '2,000 kcal', calories: 2000, protein: 150, carbs: 250, fat: 65 },
  { label: 'Muscle Gain', desc: '2,500 kcal', calories: 2500, protein: 200, carbs: 280, fat: 80 },
  { label: 'Athlete', desc: '3,000 kcal', calories: 3000, protein: 220, carbs: 350, fat: 90 },
]

export function SettingsView() {
  const { goals, setGoals, selectedDate } = useCalorieStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [localGoals, setLocalGoals] = useState({ ...goals })
  const [dbMode, setDbMode] = useState<string>('')
  const [aiMode, setAiMode] = useState<string>('')

  useEffect(() => {
    setLocalGoals({ ...goals })
  }, [goals])

  useEffect(() => {
    fetch('/api/db-mode')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDbMode(d.data.database.label)
          setAiMode(d.data.ai.label)
        }
      })
      .catch(() => {})
  }, [])

  const handlePreset = (preset: typeof presets[0]) => {
    setLocalGoals({
      ...localGoals,
      calorieTarget: preset.calories,
      proteinTarget: preset.protein,
      carbTarget: preset.carbs,
      fatTarget: preset.fat,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          ...localGoals,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGoals({ ...localGoals, date: selectedDate })
        toast({ title: 'Goals updated', description: 'Your daily targets have been saved' })
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save goals', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const changed = JSON.stringify(localGoals) !== JSON.stringify(goals)

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Daily Goals</h2>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground font-medium">Quick Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <motion.button
              key={preset.label}
              whileTap={{ scale: 0.97 }}
              onClick={() => handlePreset(preset)}
              className={`p-3 rounded-xl border text-left transition-all ${
                localGoals.calorieTarget === preset.calories
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 bg-card hover:border-primary/30'
              }`}
            >
              <p className="text-sm font-medium">{preset.label}</p>
              <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Goals */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Targets</h3>

          {/* Calories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Calories</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={localGoals.calorieTarget}
                  onChange={(e) => setLocalGoals({ ...localGoals, calorieTarget: Number(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                />
                <span className="text-[10px] text-muted-foreground">kcal</span>
              </div>
            </div>
            <Slider
              value={[localGoals.calorieTarget]}
              onValueChange={([v]) => setLocalGoals({ ...localGoals, calorieTarget: v })}
              min={800}
              max={5000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>800</span>
              <span>5,000</span>
            </div>
          </div>

          {/* Protein */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Protein</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={localGoals.proteinTarget}
                  onChange={(e) => setLocalGoals({ ...localGoals, proteinTarget: Number(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                />
                <span className="text-[10px] text-muted-foreground">g</span>
              </div>
            </div>
            <Slider
              value={[localGoals.proteinTarget]}
              onValueChange={([v]) => setLocalGoals({ ...localGoals, proteinTarget: v })}
              min={50}
              max={400}
              step={5}
              className="w-full"
            />
          </div>

          {/* Carbs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Carbs</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={localGoals.carbTarget}
                  onChange={(e) => setLocalGoals({ ...localGoals, carbTarget: Number(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                />
                <span className="text-[10px] text-muted-foreground">g</span>
              </div>
            </div>
            <Slider
              value={[localGoals.carbTarget]}
              onValueChange={([v]) => setLocalGoals({ ...localGoals, carbTarget: v })}
              min={50}
              max={600}
              step={5}
              className="w-full"
            />
          </div>

          {/* Fat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Fat</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={localGoals.fatTarget}
                  onChange={(e) => setLocalGoals({ ...localGoals, fatTarget: Number(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                />
                <span className="text-[10px] text-muted-foreground">g</span>
              </div>
            </div>
            <Slider
              value={[localGoals.fatTarget]}
              onValueChange={([v]) => setLocalGoals({ ...localGoals, fatTarget: v })}
              min={20}
              max={200}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setLocalGoals({ ...goals })}
          disabled={!changed}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={handleSave}
          disabled={!changed || saving}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Goals
        </Button>
      </div>

      {/* Backend Status */}
      {(dbMode || aiMode) && (
        <div className="space-y-1.5">
          {dbMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">Database:</span>
              <span className={`text-[11px] font-semibold ${dbMode.includes('Supabase') ? 'text-emerald-600' : 'text-amber-600'}`}>{dbMode}</span>
            </div>
          )}
          {aiMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">AI Engine:</span>
              <span className={`text-[11px] font-semibold ${aiMode.includes('OpenAI') ? 'text-emerald-600' : 'text-amber-600'}`}>{aiMode}</span>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-start gap-2">
          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1">Beginner vs Pro Mode</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Beginners:</strong> Start with the presets and let AI do the work. Just snap photos or describe meals.
              <br />
              <strong>Pros:</strong> Customize your macros precisely. Use the text mode with detailed descriptions including weights and brands for maximum accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}