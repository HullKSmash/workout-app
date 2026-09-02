-- Exercise + workout library. Standard SQLite (libSQL-compatible): no
-- extensions, so this schema ports to a hosted libSQL/Turso instance unchanged.

CREATE TABLE exercises (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  tips              TEXT,
  video             TEXT,
  video_alternating TEXT
);

CREATE TABLE workouts (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  difficulty  TEXT,
  description TEXT
);

CREATE TABLE workout_audiences (
  workout_id INTEGER NOT NULL REFERENCES workouts(id),
  audience   TEXT NOT NULL,
  PRIMARY KEY (workout_id, audience)
);

CREATE TABLE workout_exercises (
  workout_id   INTEGER NOT NULL REFERENCES workouts(id),
  exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
  phase_name   TEXT NOT NULL,
  phase_pos    INTEGER NOT NULL,
  circuit_pos  INTEGER NOT NULL,
  rounds       INTEGER NOT NULL,
  exercise_pos INTEGER NOT NULL,
  rep_count    TEXT NOT NULL,
  side         TEXT,
  tips         TEXT,
  PRIMARY KEY (workout_id, phase_pos, circuit_pos, exercise_pos)
);
