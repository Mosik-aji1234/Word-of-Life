-- Bible App Tables for Supabase

-- Favorite Verses Table
CREATE TABLE favorite_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, verse_reference)
);
                                
-- Enable Row Level Security
ALTER TABLE favorite_verses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own favorites
CREATE POLICY "Users can view their own favorites"
  ON favorite_verses
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON favorite_verses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON favorite_verses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verse Notes Table
CREATE TABLE verse_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_reference TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE verse_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notes
CREATE POLICY "Users can view their own notes"
  ON verse_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own notes
CREATE POLICY "Users can insert their own notes"
  ON verse_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON verse_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX favorite_verses_user_id ON favorite_verses(user_id);
CREATE INDEX verse_notes_user_id ON verse_notes(user_id);
