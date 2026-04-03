import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { config } from '../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

mkdirSync(dirname(config.db.path), { recursive: true })

export const db = new Database(config.db.path)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
db.exec(schema)

try {
  db.exec("ALTER TABLE reminders ADD COLUMN country TEXT NOT NULL DEFAULT 'AR'")
} catch (_) {}
try {
  db.exec('ALTER TABLE study_sessions ADD COLUMN image_metadata TEXT')
} catch (_) {}

export const queries = {
  upsertUser(email, name, avatarUrl) {
    return db
      .prepare(
        `
      INSERT INTO users (email, name, avatar_url)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = COALESCE(excluded.name, users.name),
        avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
        updated_at = datetime('now')
      RETURNING *
    `
      )
      .get(email, name, avatarUrl)
  },

  getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  },

  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  },

  getConversationId(userId) {
    const row = db.prepare('SELECT conversation_id FROM users WHERE id = ?').get(userId)
    return row?.conversation_id || null
  },

  saveConversationId(userId, conversationId) {
    db.prepare('UPDATE users SET conversation_id = ? WHERE id = ?').run(conversationId, userId)
  },

  createSession(userId, startPhotoPath, startMeta) {
    return db
      .prepare(
        `
      INSERT INTO study_sessions (user_id, start_photo_path, start_course, start_lesson, start_class_number, start_metadata, started_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      RETURNING *
    `
      )
      .get(
        userId,
        startPhotoPath,
        startMeta?.course,
        startMeta?.lesson,
        startMeta?.classNumber,
        JSON.stringify(startMeta)
      )
  },

  completeSession(sessionId, endPhotoPath, endMeta, classesCompleted, validated) {
    return db
      .prepare(
        `
      UPDATE study_sessions SET
        end_photo_path = ?,
        end_course = ?,
        end_lesson = ?,
        end_class_number = ?,
        end_metadata = ?,
        classes_completed = ?,
        validated = ?,
        completed_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `
      )
      .get(
        endPhotoPath,
        endMeta?.course,
        endMeta?.lesson,
        endMeta?.classNumber,
        JSON.stringify(endMeta),
        classesCompleted,
        validated ? 1 : 0,
        sessionId
      )
  },

  updateSessionMetadata(sessionId, metadata) {
    db.prepare('UPDATE study_sessions SET image_metadata = ? WHERE id = ?').run(
      JSON.stringify(metadata),
      sessionId
    )
  },

  getActiveSession(userId) {
    return db
      .prepare(
        `
      SELECT * FROM study_sessions
      WHERE user_id = ? AND completed_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `
      )
      .get(userId)
  },

  getSessionById(id) {
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id)
  },

  getUserSessions(userId, limit = 20) {
    return db
      .prepare(
        `
      SELECT * FROM study_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
    `
      )
      .all(userId, limit)
  },

  markStreak(userId, date, sessionId) {
    return db
      .prepare(
        `
      INSERT INTO streaks (user_id, date, completed, session_id)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET completed = 1, session_id = excluded.session_id
    `
      )
      .run(userId, date, sessionId)
  },

  getStreakDays(userId, fromDate, toDate) {
    return db
      .prepare(
        `
      SELECT * FROM streaks
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `
      )
      .all(userId, fromDate, toDate)
  },

  getStreakDay(userId, date) {
    return db.prepare('SELECT * FROM streaks WHERE user_id = ? AND date = ?').get(userId, date)
  },

  getAllUsers() {
    return db.prepare('SELECT * FROM users ORDER BY name ASC').all()
  },

  createChatConversation(id, userId, title) {
    return db
      .prepare(
        `
      INSERT INTO chat_conversations (id, user_id, title)
      VALUES (?, ?, ?)
      RETURNING *
    `
      )
      .get(id, userId, title)
  },

  getChatConversations(userId) {
    return db
      .prepare(
        `
      SELECT c.*, (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chat_conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `
      )
      .all(userId)
  },

  getChatConversation(id, userId) {
    return db
      .prepare('SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?')
      .get(id, userId)
  },

  deleteChatConversation(id, userId) {
    return db.prepare('DELETE FROM chat_conversations WHERE id = ? AND user_id = ?').run(id, userId)
  },

  updateChatConversationTitle(id, title) {
    db.prepare(
      "UPDATE chat_conversations SET title = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(title, id)
  },

  saveChatConversationOpenAIId(id, openaiConversationId) {
    db.prepare(
      "UPDATE chat_conversations SET openai_conversation_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(openaiConversationId, id)
  },

  getChatMessages(conversationId, limit = 50, offset = 0) {
    return db
      .prepare(
        `
      SELECT * FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `
      )
      .all(conversationId, limit, offset)
  },

  getChatMessageCount(conversationId) {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM chat_messages WHERE conversation_id = ?')
      .get(conversationId)
    return row.count
  },

  addChatMessage(conversationId, role, content, imageUrl, audioUrl, toolCalls) {
    db.prepare("UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?").run(
      conversationId
    )
    return db
      .prepare(
        `
      INSERT INTO chat_messages (conversation_id, role, content, image_url, audio_url, tool_calls)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(
        conversationId,
        role,
        content,
        imageUrl || null,
        audioUrl || null,
        toolCalls ? JSON.stringify(toolCalls) : null
      )
  },

  createReminder(userId, phoneNumber, hour, minute, country, timezone) {
    db.prepare('DELETE FROM reminders WHERE user_id = ?').run(userId)
    return db
      .prepare(
        `
      INSERT INTO reminders (user_id, phone_number, hour, minute, country, timezone)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `
      )
      .get(userId, phoneNumber, hour, minute, country, timezone)
  },

  getReminder(userId) {
    return db.prepare('SELECT * FROM reminders WHERE user_id = ? AND active = 1').get(userId)
  },

  deleteReminder(id, userId) {
    return db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, userId)
  },

  getActiveReminders() {
    return db
      .prepare(
        `
      SELECT r.*, u.name as user_name
      FROM reminders r
      JOIN users u ON r.user_id = u.id
      WHERE r.active = 1
    `
      )
      .all()
  },
}
