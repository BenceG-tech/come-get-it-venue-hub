-- Viselkedési minták cache
CREATE TABLE public.user_behavior_patterns (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  cluster_id TEXT,
  cluster_name TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Predikciók log
CREATE TABLE public.user_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  was_correct BOOLEAN
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS
ALTER TABLE public.user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_behavior_patterns
CREATE POLICY "Admins can manage all behavior patterns"
  ON public.user_behavior_patterns
  FOR ALL
  USING (is_admin());

CREATE POLICY "Service role full access on behavior patterns"
  ON public.user_behavior_patterns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for user_predictions
CREATE POLICY "Admins can manage all predictions"
  ON public.user_predictions
  FOR ALL
  USING (is_admin());

CREATE POLICY "Service role full access on predictions"
  ON public.user_predictions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for user_achievements
CREATE POLICY "Admins can manage all achievements"
  ON public.user_achievements
  FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on achievements"
  ON public.user_achievements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_user_predictions_user_id ON public.user_predictions(user_id);
CREATE INDEX idx_user_predictions_type ON public.user_predictions(prediction_type);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON public.user_achievements(achievement_type);