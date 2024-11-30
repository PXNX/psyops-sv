CREATE TABLE users (
    id INTEGER NOT NULL PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture TEXT NOT NULL
);

CREATE INDEX google_id_index ON users(google_id);

CREATE TABLE sessions (
    id TEXT NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
);