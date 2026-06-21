'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Type, Mic, ScanBarcode, Upload, Sparkles, Plus, Check, Loader2, X, ImagePlus, MicOff, Volume2 } from 'lucide-react'
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

const trackModes = [
  { value: 'text' as const, icon: Type, label: 'Describe' },
  { value: 'image' as const, icon: Camera, label: 'Photo' },
  { value: 'voice' as const, icon: Mic, label: 'Voice' },
  { value: 'barcode' as const, icon: ScanBarcode, label: 'Barcode' },
]

export function TrackView() {
  const {
    trackMode, setTrackMode, isAnalyzing, setIsAnalyzing,
    analysisResult, setAnalysisResult, imagePreview, setImagePreview,
    selectedDate, addEntry, setActiveTab,
  } = useCalorieStore()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [saving, setSaving] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice Recognition
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setVoiceText(transcript)
      }
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => {
        setIsListening(false)
        toast({ title: 'Voice error', description: 'Could not recognize speech. Try again.', variant: 'destructive' })
      }
    }
  }, [toast])

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      setVoiceText('')
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }, [isListening])

  const stopVoiceAndAnalyze = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    if (voiceText.trim()) analyzeText(voiceText.trim())
  }, [voiceText])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 10MB', variant: 'destructive' })
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => { setImagePreview(reader.result as string); setAnalysisResult(null) }
    reader.readAsDataURL(file)
  }, [setImagePreview, setAnalysisResult, toast])

  const analyzeImage = async () => {
    if (!selectedFile) return
    setIsAnalyzing(true); setAnalysisResult(null)
    try {
      const formData = new FormData()
      formData.append('image', selectedFile, selectedFile.name || 'food.jpg')
      const res = await fetch('/api/analyze-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) setAnalysisResult(data.data)
      else toast({ title: 'Analysis failed', description: data.error || 'Could not analyze image', variant: 'destructive' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze image'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
    finally { setIsAnalyzing(false) }
  }

  const analyzeText = async (inputText?: string) => {
    const t = inputText || text
    if (!t.trim()) return
    setIsAnalyzing(true); setAnalysisResult(null)
    try {
      const res = await fetch('/api/analyze-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.trim() }) })
      const data = await res.json()
      if (data.success) { setAnalysisResult(data.data); if (!inputText) setText('') }
      else toast({ title: 'Analysis failed', description: data.error || 'Could not analyze food', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Failed to analyze food', variant: 'destructive' }) }
    finally { setIsAnalyzing(false) }
  }

  const lookupBarcode = async () => {
    if (!barcode.trim()) return
    setBarcodeLoading(true); setAnalysisResult(null)
    try {
      const res = await fetch('/api/barcode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barcode: barcode.trim() }) })
      const data = await res.json()
      if (data.success) {
        const d = data.data
        setAnalysisResult({ name: d.brand ? `${d.name} (${d.brand})` : d.name, calories: Math.round(d.calories), protein: Math.round(d.protein * 10) / 10, carbs: Math.round(d.carbs * 10) / 10, fat: Math.round(d.fat * 10) / 10, fiber: Math.round(d.fiber * 10) / 10, serving: d.servingSize || '100g', confidence: 98 })
      } else toast({ title: 'Product not found', description: 'Try entering the barcode again or describe the food', variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Failed to lookup barcode', variant: 'destructive' }) }
    finally { setBarcodeLoading(false) }
  }

  const saveEntry = async () => {
    if (!analysisResult) return
    setSaving(true)
    try {
      const entry: FoodItem = {
        name: analysisResult.name, calories: analysisResult.calories,
        protein: analysisResult.protein, carbs: analysisResult.carbs, fat: analysisResult.fat,
        fiber: analysisResult.fiber, serving: analysisResult.serving, mealType: selectedMeal,
        source: trackMode === 'voice' ? 'voice' : trackMode === 'barcode' ? 'barcode' : trackMode,
        imageUrl: trackMode === 'image' ? imagePreview || undefined : undefined, date: selectedDate,
      }
      const res = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
      const data = await res.json()
      if (data.success) {
        entry.id = data.data.id
        addEntry(entry)
        toast({ title: 'Logged! ✅', description: `${entry.name} → ${selectedMeal}` })
        setAnalysisResult(null); setImagePreview(null); setSelectedFile(null); setText(''); setBarcode(''); setVoiceText('')
        setActiveTab('dashboard')
      } else toast({ title: 'Save failed', description: data.error, variant: 'destructive' })
    } catch { toast({ title: 'Error', description: 'Failed to save entry', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Mode Toggle - 4 modes */}
      <div className="bg-card rounded-xl p-1 flex border border-border/50">
        {trackModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button key={mode.value} onClick={() => { setTrackMode(mode.value); setAnalysisResult(null); setImagePreview(null); setSelectedFile(null); setText(''); setVoiceText(''); setBarcode('') }}
              className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all', trackMode === mode.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* TEXT MODE */}
        {trackMode === 'text' && (
          <motion.div key="text" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
            <Textarea placeholder="Describe your meal... e.g. 'Grilled chicken breast with brown rice'" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="resize-none rounded-xl border-border/50 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyzeText() }} />
            <Button onClick={() => analyzeText()} disabled={isAnalyzing || !text.trim()} className="w-full gap-2" size="lg">
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze Food</>}
            </Button>
            <div className="flex flex-wrap gap-1.5">
              {['2 eggs scrambled with toast', 'Chicken salad bowl', 'Pasta bolognese', 'Greek yogurt with granola', 'Avocado toast'].map((s) => (
                <button key={s} onClick={() => setText(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors">{s}</button>
              ))}
            </div>
          </motion.div>
        )}

        {/* IMAGE MODE */}
        {trackMode === 'image' && (
          <motion.div key="image" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
            {!imagePreview ? (
              <div onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setSelectedFile(f); const r = new FileReader(); r.onload = () => { setImagePreview(r.result as string); setAnalysisResult(null) }; r.readAsDataURL(f) } }}
                onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[180px]">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><ImagePlus className="w-7 h-7 text-primary" /></div>
                <div className="text-center"><p className="text-sm font-medium">Snap or upload food photo</p><p className="text-xs text-muted-foreground mt-1">AI will identify and estimate nutrition</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden"><img src={imagePreview} alt="Food" className="w-full h-48 object-cover" />
                  <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white" onClick={() => { setImagePreview(null); setAnalysisResult(null); setSelectedFile(null) }}><X className="w-3.5 h-3.5" /></Button></div>
                <Button onClick={analyzeImage} disabled={isAnalyzing || !selectedFile} className="w-full gap-2" size="lg">
                  {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing food...</> : <><Sparkles className="w-4 h-4" /> Analyze Food</>}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* VOICE MODE */}
        {trackMode === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-border/50 flex flex-col items-center gap-4">
              <motion.button onClick={toggleVoice}
                className={cn('w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg', isListening ? 'bg-red-500 shadow-red-500/30 pulse-glow' : 'bg-primary shadow-primary/20')}
                whileTap={{ scale: 0.95 }}>
                {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-primary-foreground" />}
              </motion.button>
              <div className="text-center">
                <p className="text-sm font-medium">{isListening ? 'Listening...' : 'Tap to speak'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Say what you ate, e.g. &quot;I had a chicken sandwich and an apple&quot;</p>
              </div>
            </div>
            {voiceText && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-3 border border-border/50 space-y-2">
                <div className="flex items-center gap-2"><Volume2 className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">You said:</span></div>
                <p className="text-sm text-foreground">{voiceText}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={toggleVoice}><Mic className="w-3.5 h-3.5 mr-1" /> Retry</Button>
                  <Button size="sm" className="flex-1 gap-1" onClick={stopVoiceAndAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Analyze</>}
                  </Button>
                </div>
              </motion.div>
            )}
            {!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400">Voice recognition is not supported in this browser. Try Chrome or use text input instead.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* BARCODE MODE */}
        {trackMode === 'barcode' && (
          <motion.div key="barcode" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-border/50 flex flex-col items-center gap-4">
              <ScanBarcode className="w-12 h-12 text-muted-foreground" />
              <div className="w-full space-y-2">
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" placeholder="Enter barcode number..." value={barcode} onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') lookupBarcode() }}
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm" />
                  <Button onClick={lookupBarcode} disabled={barcodeLoading || !barcode.trim()} size="lg" className="gap-2">
                    {barcodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanBarcode className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Scan or type the barcode from any packaged food product</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['3017620422003', '8076809513753', '5000159484695', '7622210449283'].map((code) => (
                <button key={code} onClick={() => { setBarcode(code); }} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors font-mono">{code}</button>
              ))}
              <span className="text-[10px] text-muted-foreground self-center">Demo barcodes</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Result */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl border border-primary/20 p-4 space-y-4 shadow-lg shadow-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{analysisResult.name}</p>
                <p className="text-[11px] text-muted-foreground">{analysisResult.serving}</p>
              </div>
              {analysisResult.confidence >= 80 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">High confidence</span>}
            </div>
            <div className="text-center py-1"><p className="text-3xl font-bold text-primary">{analysisResult.calories}</p><p className="text-xs text-muted-foreground">calories</p></div>
            <div className="grid grid-cols-4 gap-2">
              {[{ label: 'Protein', value: analysisResult.protein, color: 'text-emerald-600 dark:text-emerald-400' }, { label: 'Carbs', value: analysisResult.carbs, color: 'text-amber-600 dark:text-amber-400' }, { label: 'Fat', value: analysisResult.fat, color: 'text-rose-600 dark:text-rose-400' }, { label: 'Fiber', value: analysisResult.fiber, color: 'text-violet-600 dark:text-violet-400' }].map((m) => (
                <div key={m.label} className="text-center p-2 rounded-lg bg-muted/50"><p className={cn('text-base font-bold', m.color)}>{m.value}g</p><p className="text-[10px] text-muted-foreground">{m.label}</p></div>
              ))}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-2 font-medium">Add to meal:</p>
              <div className="grid grid-cols-4 gap-1.5">
                {mealTypes.map((mt) => (
                  <button key={mt.value} onClick={() => setSelectedMeal(mt.value)}
                    className={cn('flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-all', selectedMeal === mt.value ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                    <span className="text-sm">{mt.emoji}</span><span>{mt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={saveEntry} disabled={saving} className="w-full gap-2" size="lg">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Log to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
