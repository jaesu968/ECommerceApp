-- Sample catalog data for local development.
-- Safe to re-run: clears the catalog first.
-- Run with: psql -d PhysicalCDStore -f db/seed.sql

TRUNCATE songs, albums, artist_band RESTART IDENTITY CASCADE;


INSERT INTO artist_band (name, genre) VALUES
  ('The Midnight Signal', 'Rock'),
  ('Ana Vasquez', 'Jazz'),
  ('Glass Harbor', 'Electronic'),
  ('Rustbelt Choir', 'Folk'),
  ('Kofi Mensah Quartet', 'Jazz');

-- Look artists up by name so this does not depend on generated id values
INSERT INTO albums (name, genre, price, artist_band_id) VALUES
  ('Neon Overpass',      'Rock',       14.99, (SELECT id FROM artist_band WHERE name = 'The Midnight Signal')),
  ('Slow Static',        'Rock',       12.50, (SELECT id FROM artist_band WHERE name = 'The Midnight Signal')),
  ('Blue Hour',          'Jazz',       18.00, (SELECT id FROM artist_band WHERE name = 'Ana Vasquez')),
  ('Recuerdos',          'Jazz',       16.75, (SELECT id FROM artist_band WHERE name = 'Ana Vasquez')),
  ('Tidal Range',        'Electronic', 11.99, (SELECT id FROM artist_band WHERE name = 'Glass Harbor')),
  ('Signal Decay',       'Electronic',  9.99, (SELECT id FROM artist_band WHERE name = 'Glass Harbor')),
  ('Long Way From Home', 'Folk',       13.25, (SELECT id FROM artist_band WHERE name = 'Rustbelt Choir')),
  ('Accra Nights',       'Jazz',       19.99, (SELECT id FROM artist_band WHERE name = 'Kofi Mensah Quartet'));

INSERT INTO songs (name, album_id) VALUES
  ('Headlights',      (SELECT id FROM albums WHERE name = 'Neon Overpass')),
  ('Overpass',        (SELECT id FROM albums WHERE name = 'Neon Overpass')),
  ('Four Lanes East', (SELECT id FROM albums WHERE name = 'Neon Overpass')),
  ('Carrier Wave',    (SELECT id FROM albums WHERE name = 'Slow Static')),
  ('Blue Hour',       (SELECT id FROM albums WHERE name = 'Blue Hour')),
  ('Second Set',      (SELECT id FROM albums WHERE name = 'Blue Hour')),
  ('Marea',           (SELECT id FROM albums WHERE name = 'Recuerdos')),
  ('Ebb',             (SELECT id FROM albums WHERE name = 'Tidal Range')),
  ('Spring Tide',     (SELECT id FROM albums WHERE name = 'Tidal Range')),
  ('Porch Light',     (SELECT id FROM albums WHERE name = 'Long Way From Home')),
  ('Highlife',        (SELECT id FROM albums WHERE name = 'Accra Nights'));
