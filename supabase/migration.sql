-- ============================================
-- CalorieAI - Supabase Migration SQL
-- ============================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all tables with Row Level Security (RLS)
-- ============================================

-- 1. Food Entries Table
CREATE TABLE IF NOT EXISTS food_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL DEFAULT 0,
  carbs REAL DEFAULT 0,
  fat REAL DEFAULT 0,
  fiber REAL DEFAULT 0,
  serving TEXT,
  meal_type TEXT DEFAULT 'snack',
  image_url TEXT,
  source TEXT DEFAULT 'text',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Goals Table
CREATE TABLE IF NOT EXISTS daily_goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT UNIQUE NOT NULL,
  calorie_target INTEGER DEFAULT 2000,
  protein_target REAL DEFAULT 150,
  carb_target REAL DEFAULT 250,
  fat_target REAL DEFAULT 65,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT DEFAULT 'User',
  age INTEGER DEFAULT 25,
  weight REAL DEFAULT 70,
  height REAL DEFAULT 170,
  gender TEXT DEFAULT 'male',
  activity TEXT DEFAULT 'moderate',
  bmr REAL DEFAULT 0,
  tdee REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Water Logs Table
CREATE TABLE IF NOT EXISTS water_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);
CREATE INDEX IF NOT EXISTS idx_food_entries_source ON food_entries(source);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================
-- Updated_at trigger (auto-update timestamp)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_entries_updated_at
  BEFORE UPDATE ON food_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_goals_updated_at
  BEFORE UPDATE ON daily_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- For now, allow all operations (single-user app).
-- When you add auth, replace with per-user policies.

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated (or anon) users
CREATE POLICY "Allow all on food_entries" ON food_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_goals" ON daily_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on water_logs" ON water_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on badges" ON badges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Seed default badges
-- ============================================
INSERT INTO badges (key, name, description, icon) VALUES
  ('first_scan', 'First Scan', 'Log food using image recognition', '📷'),
  ('week_streak', 'Week Warrior', 'Maintain a 7-day logging streak', '🔥'),
  ('protein_goal', 'Protein Pro', 'Hit your daily protein target', '💪'),
  ('calorie_goal', 'Calorie Captain', 'Stay within 10% of calorie target', '🎯'),
  ('hydrated', 'Hydration Hero', 'Drink 8 glasses of water in a day', '💧'),
  ('meal_planner', 'Meal Planner', 'Generate an AI meal plan', '📋'),
  ('voice_logger', 'Voice Logger', 'Log food using voice input', '🎤'),
  ('social', 'Social Butterfly', 'Share your progress with friends', '🤝')
ON CONFLICT (key) DO NOTHING;