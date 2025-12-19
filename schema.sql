-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users
INSERT OR IGNORE INTO users (username, password, phone) VALUES ('Jennifer', 'starch2008', '+46700000001');
INSERT OR IGNORE INTO users (username, password, phone) VALUES ('Klas', 'papalagi23', '+46700000002');

-- Schedule table - stores the current agreed/confirmed schedule
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  switch_date DATE NOT NULL,
  parent_after TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(switch_date)
);

-- Proposal table - single shared proposal (only one row ever exists when active)
CREATE TABLE IF NOT EXISTS proposal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_active INTEGER DEFAULT 0,
  schedule_data TEXT,
  day_comments TEXT,
  created_by TEXT NOT NULL,
  last_updated_by TEXT,
  jennifer_accepted INTEGER DEFAULT 0,
  klas_accepted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Day comments table - stores confirmed day comments
CREATE TABLE IF NOT EXISTS day_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_date DATE NOT NULL,
  comment TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_date)
);

-- Comments table - conversation about the proposal
CREATE TABLE IF NOT EXISTS proposal_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial schedule data (weekly alternating starting Dec 15)
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2025-12-15', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2025-12-22', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2025-12-29', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-01-05', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-01-12', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-01-19', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-01-26', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-02-02', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-02-09', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-02-16', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-02-23', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-03-02', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-03-09', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-03-16', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-03-23', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-03-30', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-04-06', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-04-13', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-04-20', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-04-27', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-05-04', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-05-11', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-05-18', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-05-25', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-06-01', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-06-08', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-06-15', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-06-22', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-06-29', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-07-06', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-07-13', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-07-20', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-07-27', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-08-03', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-08-10', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-08-17', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-08-24', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-08-31', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-09-07', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-09-14', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-09-21', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-09-28', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-10-05', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-10-12', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-10-19', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-10-26', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-11-02', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-11-09', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-11-16', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-11-23', 'Klas');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-11-30', 'Jennifer');
INSERT OR IGNORE INTO schedule (switch_date, parent_after) VALUES ('2026-12-07', 'Klas');
