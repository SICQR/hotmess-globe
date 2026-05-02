-- Remove the 2 orphan rows (Phil + Glen pre-trigger-fix duplicates of same UK mobile)
DELETE FROM trusted_contacts WHERE user_id IS NULL;

-- Prevent recurrence: user_id is now mandatory
ALTER TABLE trusted_contacts ALTER COLUMN user_id SET NOT NULL;
