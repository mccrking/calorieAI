'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Calculator, Save, Loader2, Activity, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { useCalorieStore } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const activities = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', mult: 1.2 },
  { value: 'light', label: 'Light', desc: '1-3 days/week', mult: 1.375 },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week', mult: 1.55 },
  { value: 'active', label: 'Active', desc: '6-7 days/week', mult: 1.725 },
  { value: 'very_active', label: 'Very Active', desc: '2x per day', mult: 1.9 },
]

export function ProfileView() {
  const { profile, setProfile, goals, setGoals, selectedDate } = useCalorieStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState({ ...profile })
  const [calculated, setCalculated] = useState({ bmr: profile.bmr, tdee: profile.tdee })

  useEffect(() => { setLocal({ ...profile }) }, [profile])

  const calculateBMR = () => {
    let bmr: number
    if (local.gender === 'male') {
      bmr = 10 * local.weight + 6.25 * local.height - 5 * local.age + 5
    } else {
      bmr = 10 * local.weight + 6.25 * local.height - 5 * local.age - 161
    }
    const mult = activities.find(a => a.value === local.activity)?.mult || 1.55
    const tdee = Math.round(bmr * mult)
    setCalculated({ bmr: Math.round(bmr), tdee })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      })
      const data = await res.json()
      if (data.success) {
        setProfile({ ...local, bmr: calculated.bmr, tdee: calculated.tdee })
        // Optionally update goals based on TDEE
        toast({ title: 'Profile saved! ✅', description: `BMR: ${calculated.bmr} kcal • TDEE: ${calculated.tdee} kcal` })
      } else toast({ title: 'Error', description: data.error, variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const applyTDEE = async () => {
    if (!calculated.tdee) return
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, calorieTarget: calculated.tdee }),
      })
      const data = await res.json()
      if (data.success) {
        setGoals({ ...goals, calorieTarget: data.data.calorieTarget })
        toast({ title: 'Goals updated! 🎯', description: `Calorie target set to ${calculated.tdee} (your TDEE)` })
      }
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold">Profile & BMR</h2></div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          {/* Personal Info */}
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input value={local.name} onChange={e => setLocal({ ...local, name: e.target.value })} className="mt-1 h-9 text-sm" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Age</Label><Input type="number" value={local.age} onChange={e => setLocal({ ...local, age: Number(e.target.value) || 0 })} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Weight (kg)</Label><Input type="number" value={local.weight} onChange={e => setLocal({ ...local, weight: Number(e.target.value) || 0 })} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Height (cm)</Label><Input type="number" value={local.height} onChange={e => setLocal({ ...local, height: Number(e.target.value) || 0 })} className="mt-1 h-9 text-sm" /></div>
            </div>
            <div>
              <Label className="text-xs">Gender</Label>
              <div className="flex gap-2 mt-1">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => setLocal({ ...local, gender: g })}
                    className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all border', local.gender === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border/50')}>
                    {g === 'male' ? '👨 Male' : '👩 Female'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Activity Level</Label>
              <div className="space-y-1.5 mt-1.5">
                {activities.map(a => (
                  <button key={a.value} onClick={() => setLocal({ ...local, activity: a.value as any })}
                    className={cn('w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all border', local.activity === a.value ? 'bg-primary/5 border-primary/50' : 'border-transparent hover:bg-muted/30')}>
                    <div className="text-left"><span className="font-medium">{a.label}</span><span className="text-muted-foreground ml-2">{a.desc}</span></div>
                    <span className="text-muted-foreground">×{a.mult}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <Button onClick={calculateBMR} variant="outline" className="w-full gap-2">
            <Calculator className="w-4 h-4" /> Calculate BMR & TDEE
          </Button>

          {/* Results */}
          {(calculated.bmr > 0 || calculated.tdee > 0) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Basal Metabolic Rate</p>
                  <p className="text-xl font-bold text-primary mt-1">{calculated.bmr}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Total Daily Energy</p>
                  <p className="text-xl font-bold text-primary mt-1">{calculated.tdee}</p>
                  <p className="text-[10px] text-muted-foreground">kcal/day (TDEE)</p>
                </div>
              </div>
              <Button onClick={applyTDEE} variant="outline" className="w-full gap-2 text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Apply TDEE as my calorie goal
              </Button>
            </motion.div>
          )}

          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}