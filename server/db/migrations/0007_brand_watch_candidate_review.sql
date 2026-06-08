ALTER TABLE brand_watch_candidates ADD COLUMN review_status TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE brand_watch_candidates ADD COLUMN review_note TEXT;
ALTER TABLE brand_watch_candidates ADD COLUMN reviewed_at INTEGER;
ALTER TABLE brand_watch_candidates ADD COLUMN reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_review_status_v12
ON brand_watch_candidates(review_status);
