-- SSL checker metadata for browser-like host discovery and validation details
ALTER TABLE ssl_status_latest ADD COLUMN checked_host TEXT;
ALTER TABLE ssl_status_latest ADD COLUMN validation_error TEXT;
ALTER TABLE ssl_status_history ADD COLUMN checked_host TEXT;
ALTER TABLE ssl_status_history ADD COLUMN validation_error TEXT;
