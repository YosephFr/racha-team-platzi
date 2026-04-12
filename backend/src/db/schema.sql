CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  conversation_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  start_photo_path TEXT,
  end_photo_path TEXT,
  start_course TEXT,
  start_lesson TEXT,
  start_class_number TEXT,
  end_course TEXT,
  end_lesson TEXT,
  end_class_number TEXT,
  classes_completed INTEGER DEFAULT 0,
  start_metadata TEXT,
  end_metadata TEXT,
  started_at TEXT,
  completed_at TEXT,
  validated INTEGER DEFAULT 0,
  image_metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  session_id INTEGER REFERENCES study_sessions(id),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user_date ON streaks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT DEFAULT 'Nueva conversacion',
  openai_conversation_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  audio_url TEXT,
  tool_calls TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  phone_number TEXT NOT NULL,
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  country TEXT NOT NULL DEFAULT 'AR',
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(active);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  image_path TEXT NOT NULL,
  course_name TEXT,
  student_name TEXT,
  completion_date TEXT,
  total_hours TEXT,
  total_classes TEXT,
  certificate_id TEXT,
  certificate_url TEXT,
  school_name TEXT,
  instructor_name TEXT,
  extracted_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
