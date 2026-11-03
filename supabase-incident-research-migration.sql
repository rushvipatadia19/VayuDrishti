-- Migration: Incident Research Table and Indexes
-- Stores durably grounded Tavily web research, historical case comparisons,
-- evidence-backed action plans, and verifiable citation sources.

CREATE TABLE IF NOT EXISTS public.incident_research (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  similar_incidents JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by incident
CREATE INDEX IF NOT EXISTS idx_incident_research_incident_id 
  ON public.incident_research (incident_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.incident_research ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view research
CREATE POLICY "Allow authenticated users to read incident research"
  ON public.incident_research
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to read incident research (matches public read pattern for incidents)
CREATE POLICY "Allow public read incident research"
  ON public.incident_research
  FOR SELECT
  TO anon
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access on incident_research"
  ON public.incident_research
  FOR ALL
  USING (true)
  WITH CHECK (true);

