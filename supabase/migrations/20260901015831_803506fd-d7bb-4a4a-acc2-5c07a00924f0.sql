CREATE TABLE public.simulator_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  team_name TEXT,
  phase TEXT,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.simulator_progress TO anon;
GRANT SELECT, INSERT, UPDATE ON public.simulator_progress TO authenticated;
GRANT ALL ON public.simulator_progress TO service_role;

ALTER TABLE public.simulator_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read progress by session code"
  ON public.simulator_progress FOR SELECT USING (true);

CREATE POLICY "Anyone can create progress"
  ON public.simulator_progress FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update progress"
  ON public.simulator_progress FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_simulator_progress_updated_at
BEFORE UPDATE ON public.simulator_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();