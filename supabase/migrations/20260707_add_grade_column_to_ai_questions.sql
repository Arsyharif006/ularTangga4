-- Add 'grade' column to ai_questions to store tingkat (sd/smp/sma_smk)

ALTER TABLE IF EXISTS ai_questions
  ADD COLUMN IF NOT EXISTS grade TEXT CHECK (grade IN ('sd','smp','sma_smk'));

-- Keep existing 'difficulty' column for backward compatibility (do not drop automatically).
