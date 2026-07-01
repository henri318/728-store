-- Enable the unaccent extension for accent-insensitive full-text search.
-- This is required by the product search query which uses unaccent()
-- to strip diacritics from both the search term and the stored data,
-- so "café" matched "cafe" and vice versa.
CREATE EXTENSION IF NOT EXISTS unaccent;
