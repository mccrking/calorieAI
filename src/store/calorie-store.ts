import { create } from 'zustand'

export interface FoodItem {
  id?: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  serving?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  imageUrl?: string
  source: 'image' | 'text'
  date: string
  createdAt?: string
}

export interface DailyGoals {
  date: string
  calorieTarget: number
  proteinTarget: number
  carbTarget: number
  fatTarget: number
}

interface AnalysisResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  serving: string
  confidence: number
}

interface CalorieState {
  // Current tab
  activeTab: 'dashboard' | 'track' | 'history' | 'settings'
  setActiveTab: (tab: 'dashboard' | 'track' | 'history' | 'settings') => void

  // Selected date
  selectedDate: string
  setSelectedDate: (date: string) => void

  // Food entries
  entries: FoodItem[]
  setEntries: (entries: FoodItem[]) => void
  addEntry: (entry: FoodItem) => void
  removeEntry: (id: string) => void

  // Daily goals
  goals: DailyGoals
  setGoals: (goals: DailyGoals) => void

  // Analysis state
  isAnalyzing: boolean
  setIsAnalyzing: (val: boolean) => void
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult | null) => void

  // Track mode
  trackMode: 'image' | 'text'
  setTrackMode: (mode: 'image' | 'text') => void

  // Image preview
  imagePreview: string | null
  setImagePreview: (url: string | null) => void

  // Computed
  totalCalories: () => number
  totalProtein: () => number
  totalCarbs: () => number
  totalFat: () => number
  calorieProgress: () => number
}

const today = new Date().toISOString().split('T')[0]

export const useCalorieStore = create<CalorieState>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedDate: today,
  setSelectedDate: (date) => set({ selectedDate: date }),

  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

  goals: {
    date: today,
    calorieTarget: 2000,
    proteinTarget: 150,
    carbTarget: 250,
    fatTarget: 65,
  },
  setGoals: (goals) => set({ goals }),

  isAnalyzing: false,
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),

  trackMode: 'text',
  setTrackMode: (mode) => set({ trackMode: mode, analysisResult: null, imagePreview: null }),

  imagePreview: null,
  setImagePreview: (url) => set({ imagePreview: url }),

  totalCalories: () => get().entries.reduce((sum, e) => sum + e.calories, 0),
  totalProtein: () => get().entries.reduce((sum, e) => sum + e.protein, 0),
  totalCarbs: () => get().entries.reduce((sum, e) => sum + e.carbs, 0),
  totalFat: () => get().entries.reduce((sum, e) => sum + e.fat, 0),
  calorieProgress: () => {
    const { totalCalories, goals } = get()
    return Math.min((totalCalories() / goals.calorieTarget) * 100, 100)
  },
}))