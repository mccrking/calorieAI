/**
 * CalorieAI - Database Abstraction Layer
 * 
 * Automatically switches between Supabase (PostgreSQL) and Prisma (SQLite)
 * based on environment variables:
 *   - If NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set → Supabase
 *   - Otherwise → Prisma/SQLite (local development)
 */

import { db } from '@/lib/db'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ============================================
// Types
// ============================================

export interface FoodEntryRow {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  serving: string | null
  mealType: string
  imageUrl: string | null
  source: string
  date: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface DailyGoalRow {
  id: string
  date: string
  calorieTarget: number
  proteinTarget: number
  carbTarget: number
  fatTarget: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface UserProfileRow {
  id: string
  name: string
  age: number
  weight: number
  height: number
  gender: string
  activity: string
  bmr: number
  tdee: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface WaterLogRow {
  id: string
  amount: number
  date: string
  createdAt: Date | string
}

export interface BadgeRow {
  id: string
  key: string
  name: string
  description: string
  icon: string
  unlockedAt: Date | string | null
}

export interface ChatMessageRow {
  id: string
  role: string
  content: string
  createdAt: Date | string
}

// ============================================
// Helper: Convert snake_case (Supabase) to camelCase
// ============================================

function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result as T
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

// ============================================
// FoodEntry Operations
// ============================================

export async function getEntriesByDate(date: string): Promise<FoodEntryRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<FoodEntryRow>(row))
  }
  return db.foodEntry.findMany({
    where: { date },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEntriesByDateRange(startDate: string, endDate: string): Promise<FoodEntryRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<FoodEntryRow>(row))
  }
  return db.foodEntry.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
  })
}

export async function getAllEntries(): Promise<FoodEntryRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<FoodEntryRow>(row))
  }
  return db.foodEntry.findMany()
}

export async function findFirstEntryBySource(source: string): Promise<FoodEntryRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('source', source)
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<FoodEntryRow>(data) : null
  }
  return db.foodEntry.findFirst({ where: { source } })
}

export async function findFirstEntryByDate(date: string): Promise<FoodEntryRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('date', date)
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<FoodEntryRow>(data) : null
  }
  return db.foodEntry.findFirst({ where: { date } })
}

export async function createEntry(data: {
  name: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  serving?: string | null
  mealType?: string
  imageUrl?: string | null
  source?: string
  date: string
}): Promise<FoodEntryRow> {
  if (isSupabaseConfigured && supabase) {
    const snakeData = toSnakeCase({
      ...data,
      protein: data.protein ?? 0,
      carbs: data.carbs ?? 0,
      fat: data.fat ?? 0,
      fiber: data.fiber ?? 0,
      mealType: data.mealType || 'snack',
      source: data.source || 'text',
    })
    const { data: row, error } = await supabase
      .from('food_entries')
      .insert(snakeData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<FoodEntryRow>(row)
  }
  return db.foodEntry.create({
    data: {
      name: data.name,
      calories: Math.round(Number(data.calories)),
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fat: Number(data.fat) || 0,
      fiber: Number(data.fiber) || 0,
      serving: data.serving || null,
      mealType: data.mealType || 'snack',
      imageUrl: data.imageUrl || null,
      source: data.source || 'text',
      date: data.date,
    },
  })
}

export async function deleteEntry(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('food_entries').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  await db.foodEntry.delete({ where: { id } })
}

// ============================================
// DailyGoal Operations
// ============================================

export async function getGoalByDate(date: string): Promise<DailyGoalRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('date', date)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<DailyGoalRow>(data) : null
  }
  return db.dailyGoal.findUnique({ where: { date } })
}

export async function upsertGoal(date: string, data: {
  calorieTarget?: number
  proteinTarget?: number
  carbTarget?: number
  fatTarget?: number
}): Promise<DailyGoalRow> {
  if (isSupabaseConfigured && supabase) {
    const existing = await getGoalByDate(date)
    if (existing) {
      const updateData: Record<string, unknown> = {}
      if (data.calorieTarget !== undefined) updateData.calorie_target = Number(data.calorieTarget)
      if (data.proteinTarget !== undefined) updateData.protein_target = Number(data.proteinTarget)
      if (data.carbTarget !== undefined) updateData.carb_target = Number(data.carbTarget)
      if (data.fatTarget !== undefined) updateData.fat_target = Number(data.fatTarget)
      const { data: row, error } = await supabase
        .from('daily_goals')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return toCamelCase<DailyGoalRow>(row)
    } else {
      const snakeData = toSnakeCase({
        date,
        calorieTarget: data.calorieTarget || 2000,
        proteinTarget: data.proteinTarget || 150,
        carbTarget: data.carbTarget || 250,
        fatTarget: data.fatTarget || 65,
      })
      const { data: row, error } = await supabase
        .from('daily_goals')
        .insert(snakeData)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return toCamelCase<DailyGoalRow>(row)
    }
  }
  return db.dailyGoal.upsert({
    where: { date },
    update: {
      ...(data.calorieTarget !== undefined && { calorieTarget: Number(data.calorieTarget) }),
      ...(data.proteinTarget !== undefined && { proteinTarget: Number(data.proteinTarget) }),
      ...(data.carbTarget !== undefined && { carbTarget: Number(data.carbTarget) }),
      ...(data.fatTarget !== undefined && { fatTarget: Number(data.fatTarget) }),
    },
    create: {
      date,
      calorieTarget: Number(data.calorieTarget) || 2000,
      proteinTarget: Number(data.proteinTarget) || 150,
      carbTarget: Number(data.carbTarget) || 250,
      fatTarget: Number(data.fatTarget) || 65,
    },
  })
}

export async function createGoalIfNotExists(date: string): Promise<DailyGoalRow> {
  const existing = await getGoalByDate(date)
  if (existing) return existing
  return upsertGoal(date, {
    calorieTarget: 2000,
    proteinTarget: 150,
    carbTarget: 250,
    fatTarget: 65,
  })
}

// ============================================
// UserProfile Operations
// ============================================

export async function getProfile(): Promise<UserProfileRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<UserProfileRow>(data) : null
  }
  return db.userProfile.findFirst()
}

export async function createProfile(data: {
  name: string
  age: number
  weight: number
  height: number
  gender: string
  activity: string
  bmr: number
  tdee: number
}): Promise<UserProfileRow> {
  if (isSupabaseConfigured && supabase) {
    const snakeData = toSnakeCase(data)
    const { data: row, error } = await supabase
      .from('user_profiles')
      .insert(snakeData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<UserProfileRow>(row)
  }
  return db.userProfile.create({ data: data as never })
}

export async function updateProfile(id: string, data: {
  name: string
  age: number
  weight: number
  height: number
  gender: string
  activity: string
  bmr: number
  tdee: number
}): Promise<UserProfileRow> {
  if (isSupabaseConfigured && supabase) {
    const snakeData = toSnakeCase(data)
    const { data: row, error } = await supabase
      .from('user_profiles')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<UserProfileRow>(row)
  }
  return db.userProfile.update({
    where: { id },
    data: data as never,
  })
}

export async function upsertProfile(data: {
  name: string
  age: number
  weight: number
  height: number
  gender: string
  activity: string
  bmr: number
  tdee: number
}): Promise<UserProfileRow> {
  const existing = await getProfile()
  if (existing) {
    return updateProfile(existing.id, data)
  }
  return createProfile(data)
}

// ============================================
// WaterLog Operations
// ============================================

export async function getWaterLogsByDate(date: string): Promise<WaterLogRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<WaterLogRow>(row))
  }
  return db.waterLog.findMany({
    where: { date },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getAllWaterLogs(): Promise<WaterLogRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<WaterLogRow>(row))
  }
  return db.waterLog.findMany()
}

export async function createWaterLog(data: { amount: number; date: string }): Promise<WaterLogRow> {
  if (isSupabaseConfigured && supabase) {
    const snakeData = toSnakeCase(data)
    const { data: row, error } = await supabase
      .from('water_logs')
      .insert(snakeData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<WaterLogRow>(row)
  }
  return db.waterLog.create({ data })
}

export async function findFirstWaterLogByDate(date: string): Promise<WaterLogRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('date', date)
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<WaterLogRow>(data) : null
  }
  return db.waterLog.findFirst({ where: { date } })
}

// ============================================
// Badge Operations
// ============================================

export async function getBadgeByKey(key: string): Promise<BadgeRow | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .eq('key', key)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ? toCamelCase<BadgeRow>(data) : null
  }
  return db.badge.findUnique({ where: { key } })
}

export async function createBadge(data: {
  key: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date | string | null
}): Promise<BadgeRow> {
  if (isSupabaseConfigured && supabase) {
    const snakeData = toSnakeCase(data)
    const { data: row, error } = await supabase
      .from('badges')
      .insert(snakeData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<BadgeRow>(row)
  }
  return db.badge.create({ data: data as never })
}

export async function upsertBadge(key: string, data: {
  name: string
  description: string
  icon: string
  unlockedAt?: Date | string | null
}): Promise<BadgeRow> {
  if (isSupabaseConfigured && supabase) {
    const existing = await getBadgeByKey(key)
    if (existing) {
      const updateData: Record<string, unknown> = {}
      if (data.unlockedAt !== undefined) updateData.unlocked_at = data.unlockedAt || null
      const { data: row, error } = await supabase
        .from('badges')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return toCamelCase<BadgeRow>(row)
    } else {
      return createBadge(data)
    }
  }
  return db.badge.upsert({
    where: { key },
    update: { unlockedAt: data.unlockedAt as Date | null ?? undefined },
    create: {
      key,
      name: data.name,
      description: data.description,
      icon: data.icon,
      unlockedAt: data.unlockedAt as Date | null ?? undefined,
    },
  })
}

export async function getAllBadges(): Promise<BadgeRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('key', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<BadgeRow>(row))
  }
  return db.badge.findMany({ orderBy: { key: 'asc' } })
}

// ============================================
// ChatMessage Operations
// ============================================

export async function createChatMessage(data: { role: string; content: string }): Promise<ChatMessageRow> {
  if (isSupabaseConfigured && supabase) {
    const { data: row, error } = await supabase
      .from('chat_messages')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamelCase<ChatMessageRow>(row)
  }
  return db.chatMessage.create({ data })
}

export async function getChatMessageCount(): Promise<number> {
  if (isSupabaseConfigured && supabase) {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return count || 0
  }
  return db.chatMessage.count()
}

export async function getOldestChatMessages(limit: number): Promise<ChatMessageRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamelCase<ChatMessageRow>(row))
  }
  return db.chatMessage.findMany({
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })
}

export async function deleteChatMessagesByIds(ids: string[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .in('id', ids)
    if (error) throw new Error(error.message)
    return
  }
  await db.chatMessage.deleteMany({ where: { id: { in: ids } } })
}

// ============================================
// Utility: Which DB is active?
// ============================================

export function getDatabaseMode(): 'supabase' | 'sqlite' {
  return isSupabaseConfigured ? 'supabase' : 'sqlite'
}