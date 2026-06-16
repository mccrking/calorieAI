'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Type, Upload, Sparkles, Plus, Check, Loader2, X, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCalorieStore, type FoodItem } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const mealTypes = [
  { value: 'breakfast' as const, label: 'Breakfast', emoji: '🌅' },
  { value: 'lunch' as const, label: 'Lunch', emoji: '☀️' },
  { value: 'dinner' as const, label: 'Dinner', emoji: '🌙' },
  { value: 'snack' as const, label: 'Snack', emoji: '🍎' },
]

export function TrackView() {
  const {
    trackMode,
    setTrackMode,
    isAnalyzing,
    setIsAnalyzing,
    analysisResult,
    setAnalysisResult,
    imagePreview,
    setImagePreview,
    selectedDate,
    addEntry,
    setActiveTab,
  } = useCalorieStore()

  const { toast } = useToast()
  const [text, setText] = useState('')
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 10MB', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
      setAnalysisResult(null)
    }
    reader.readAsDataURL(file)
  }, [setImagePreview, setAnalysisResult, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
        setAnalysisResult(null)
      }
      reader.readAsDataURL(file)
    }
  }, [setImagePreview, setAnalysisResult])

  const analyzeImage = async () => {
    if (!imagePreview) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    try {
      const blob = await fetch(imagePreview).then((r) => r.blob())
      const formData = new FormData()
      formData.append('image', blob, 'food.jpg')

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setAnalysisResult(data.data)
      } else {
        toast({ title: 'Analysis failed', description: data.error || 'Could not analyze image', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to analyze image', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeText = async () => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setAnalysisResult(data.data)
        setText('')
      } else {
        toast({ title: 'Analysis failed', description: data.error || 'Could not analyze food', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to analyze food', variant: 'destructive' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveEntry = async () => {
    if (!analysisResult) return
    setSaving(true)
    try {
      const entry: FoodItem = {
        name: analysisResult.name,
        calories: analysisResult.calories,
        protein: analysisResult.protein,
        carbs: analysisResult.carbs,
        fat: analysisResult.fat,
        fiber: analysisResult.fiber,
        serving: analysisResult.serving,
        mealType: selectedMeal,
        source: trackMode,
        imageUrl: trackMode === 'image' ? imagePreview || undefined : undefined,
        date: selectedDate,
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      const data = await res.json()
      if (data.success) {
        entry.id = data.data.id
        addEntry(entry)
        toast({ title: 'Logged!', description: `${entry.name} added to ${selectedMeal}` })
        setAnalysisResult(null)
        setImagePreview(null)
        setText('')
        setActiveTab('dashboard')
      } else {
        toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save entry', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Mode Toggle */}
      <div className="bg-card rounded-xl p-1 flex border border-border/50">
        <button
          onClick={() => { setTrackMode('text'); setAnalysisResult(null); setImagePreview(null) }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            trackMode === 'text'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Type className="w-4 h-4" />
          Describe
        </button>
        <button
          onClick={() => { setTrackMode('image'); setAnalysisResult(null); setText('') }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            trackMode === 'image'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Camera className="w-4 h-4" />
          Photo
        </button>
      </div>

      {/* Image Mode */}
      <AnimatePresence mode="wait">
        {trackMode === 'image' && (
          <motion.div
            key="image"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[200px]"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Take a photo or upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Snap your meal or drag &amp; drop an image
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Choose Image
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Food preview"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={() => { setImagePreview(null); setAnalysisResult(null) }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing food...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze Food
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Text Mode */}
        {trackMode === 'text' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Textarea
                placeholder="Describe your meal... e.g. 'Grilled chicken breast with brown rice and steamed broccoli, about 200g chicken and 1 cup rice'"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="resize-none rounded-xl border-border/50 focus:border-primary text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyzeText()
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">
                  Tip: Be specific for better accuracy
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {text.length > 0 && '⌘+Enter to analyze'}
                </p>
              </div>
            </div>
            <Button
              onClick={analyzeText}
              disabled={isAnalyzing || !text.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Food
                </>
              )}
            </Button>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {['2 eggs scrambled with toast', 'Chicken salad bowl', 'Pasta bolognese', 'Greek yogurt with granola'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setText(suggestion)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Result */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl border border-primary/20 p-4 space-y-4 shadow-lg shadow-primary/5"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{analysisResult.name}</p>
                <p className="text-[11px] text-muted-foreground">{analysisResult.serving}</p>
              </div>
              {analysisResult.confidence >= 80 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  High confidence
                </span>
              )}
            </div>

            {/* Calories */}
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">{analysisResult.calories}</p>
              <p className="text-xs text-muted-foreground">calories estimated</p>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Protein', value: analysisResult.protein, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Carbs', value: analysisResult.carbs, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Fat', value: analysisResult.fat, color: 'text-rose-600 dark:text-rose-400' },
                { label: 'Fiber', value: analysisResult.fiber, color: 'text-violet-600 dark:text-violet-400' },
              ].map((m) => (
                <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50">
                  <p className={cn('text-base font-bold', m.color)}>{m.value}g</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Meal Type Selector */}
            <div>
              <p className="text-[11px] text-muted-foreground mb-2 font-medium">Add to meal:</p>
              <div className="grid grid-cols-4 gap-1.5">
                {mealTypes.map((mt) => (
                  <button
                    key={mt.value}
                    onClick={() => setSelectedMeal(mt.value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-all',
                      selectedMeal === mt.value
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className="text-sm">{mt.emoji}</span>
                    <span>{mt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={saveEntry}
              disabled={saving}
              className="w-full gap-2"
              size="lg"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Log to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Card */}
      {!analysisResult && !isAnalyzing && (
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <h3 className="text-xs font-semibold text-primary mb-2">Pro Tips for Better Results</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              For photos: capture the full plate with good lighting
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              For text: include quantities and cooking methods
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              Multiple items? List them all for accurate totals
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}