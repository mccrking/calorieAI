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
  source: 'image' | 'text' | 'voice' | 'barcode'
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

export interface AnalysisResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  serving: string
  confidence: number
}

export interface AnalyticsData {
  chartData: { date: string; calories: number; protein: number; carbs: number; fat: number; count: number; meals: Record<string, number> }[]
  streak: number
  consistencyScore: number
  avgCalories: number
  avgProtein: number
  bestDay: { date: string; calories: number } | null
  worstDay: { date: string; calories: number } | null
  totalEntries: number
}

export interface UserProfile {
  id?: string
  name: string
  age: number
  weight: number
  height: number
  gender: 'male' | 'female'
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  bmr: number
  tdee: number
}

export interface Badge {
  id: string
  key: string
  name: string
  description: string
  icon: string
  unlockedAt: string | null
}

export interface WaterState {
  totalGlasses: number
  goalGlasses: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface MealPlan {
  day: string
  meals: {
    mealType: string
    name: string
    description: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }[]
}

interface CalorieState {
  activeTab: 'dashboard' | 'track' | 'history' | 'settings' | 'chat' | 'mealplan' | 'profile'
  setActiveTab: (tab: CalorieState['activeTab']) => void

  selectedDate: string
  setSelectedDate: (date: string) => void

  entries: FoodItem[]
  setEntries: (entries: FoodItem[]) => void
  addEntry: (entry: FoodItem) => void
  removeEntry: (id: string) => void

  goals: DailyGoals
  setGoals: (goals: DailyGoals) => void

  isAnalyzing: boolean
  setIsAnalyzing: (val: boolean) => void
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult | null) => void

  trackMode: 'image' | 'text' | 'voice' | 'barcode'
  setTrackMode: (mode: CalorieState['trackMode']) => void

  imagePreview: string | null
  setImagePreview: (url: string | null) => void

  // Analytics
  analytics: AnalyticsData | null
  setAnalytics: (data: AnalyticsData | null) => void
  analyticsRange: number
  setAnalyticsRange: (range: number) => void

  // Badges
  badges: Badge[]
  setBadges: (badges: Badge[]) => void

  // Water
  water: WaterState
  setWater: (water: WaterState) => void
  addWater: (glasses: number) => void

  // Profile
  profile: UserProfile
  setProfile: (profile: UserProfile) => void

  // Chat
  chatMessages: ChatMessage[]
  setChatMessages: (msgs: ChatMessage[]) => void
  addChatMessage: (msg: ChatMessage) => void
  isChatLoading: boolean
  setIsChatLoading: (val: boolean) => void

  // Meal Plan
  mealPlan: MealPlan[]
  setMealPlan: (plan: MealPlan[]) => void
  isGeneratingPlan: boolean
  setIsGeneratingPlan: (val: boolean) => void

  // Notifications
  lastReminder: string | null
  setLastReminder: (r: string | null) => void

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

  goals: { date: today, calorieTarget: 2000, proteinTarget: 150, carbTarget: 250, fatTarget: 65 },
  setGoals: (goals) => set({ goals }),

  isAnalyzing: false,
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),

  trackMode: 'text',
  setTrackMode: (mode) => set({ trackMode: mode, analysisResult: null, imagePreview: null }),

  imagePreview: null,
  setImagePreview: (url) => set({ imagePreview: url }),

  analytics: null,
  setAnalytics: (data) => set({ analytics: data }),
  analyticsRange: 7,
  setAnalyticsRange: (range) => set({ analyticsRange: range }),

  badges: [],
  setBadges: (badges) => set({ badges }),

  water: { totalGlasses: 0, goalGlasses: 8 },
  setWater: (water) => set({ water }),
  addWater: (glasses) => set((s) => ({ water: { ...s.water, totalGlasses: s.water.totalGlasses + glasses } })),

  profile: {
    name: 'User', age: 25, weight: 70, height: 170,
    gender: 'male', activity: 'moderate', bmr: 0, tdee: 0,
  },
  setProfile: (profile) => set({ profile }),

  chatMessages: [],
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  isChatLoading: false,
  setIsChatLoading: (val) => set({ isChatLoading: val }),

  mealPlan: [],
  setMealPlan: (plan) => set({ mealPlan: plan }),
  isGeneratingPlan: false,
  setIsGeneratingPlan: (val) => set({ isGeneratingPlan: val }),

  lastReminder: null,
  setLastReminder: (r) => set({ lastReminder: r }),

  totalCalories: () => get().entries.reduce((sum, e) => sum + e.calories, 0),
  totalProtein: () => get().entries.reduce((sum, e) => sum + e.protein, 0),
  totalCarbs: () => get().entries.reduce((sum, e) => sum + e.carbs, 0),
  totalFat: () => get().entries.reduce((sum, e) => sum + e.fat, 0),
  calorieProgress: () => {
    const { totalCalories, goals } = get()
    return Math.min((totalCalories() / goals.calorieTarget) * 100, 100)
  },
}))