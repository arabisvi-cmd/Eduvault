-- Roster / user class metadata for PR4 file visibility.
ALTER TABLE user_directory ADD COLUMN class_grade TEXT;
ALTER TABLE user_directory ADD COLUMN class_division TEXT;
ALTER TABLE users ADD COLUMN class_grade TEXT;
ALTER TABLE users ADD COLUMN class_division TEXT;