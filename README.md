# Racha Team Platzi

A mobile-first PWA that helps a group of friends maintain their daily study streak on [Platzi](https://platzi.com). Users prove they studied by uploading screenshots, AI validates their progress, and the group gets notified via WhatsApp.

## How it works

1. **Start studying** - Upload a screenshot of your Platzi course. The AI analyzes it, extracts course info, and starts a timed session.
2. **Study timer** - A real-time timer tracks your session. Color-coded motivation: red (<15min), yellow (15-25min), green (30min+).
3. **Complete your streak** - Upload a final screenshot showing progress. The AI validates advancement and marks your daily streak.
4. **Group notifications** - WhatsApp messages notify the group when someone starts studying, completes their streak, or hits a milestone.
5. **Smart reminders** - AI-powered personal WhatsApp reminders at your chosen time, plus automatic alerts if you haven't studied.

## Stack

| Layer             | Technology                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | Next.js 15 (App Router), React 19, Tailwind CSS 3, Motion, Serwist PWA                                                    |
| Backend           | Node.js, Express 5 (ESM), SQLite (better-sqlite3, WAL mode)                                                               |
| AI Vision         | Pluggable: OpenAI GPT-4o (default) or Google Gemini 2.5 — screenshot analysis with EXIF metadata extraction               |
| AI Conversational | Pluggable: OpenAI GPT-5.4 Mini via Responses API (default) or DeepSeek V4 (Flash/Pro) via Chat Completions — agentic loop |
| Voice             | ElevenLabs TTS, OpenAI Whisper STT                                                                                        |
| WhatsApp          | whatsapp-web.js with pairing code auth, health checks, graceful shutdown                                                  |
| Auth              | Google OAuth 2.0, JWT in HttpOnly cookies (30-day expiry)                                                                 |

## Architecture

```
Browser (PWA)
    |
    v
Reverse Proxy (SSL termination)
    |
    +-- / --------> Next.js (frontend)
    |                  App Router, SSR/static
    |                  Tailwind + Motion animations
    |
    +-- /api/ ----> Express (backend)
                       |
                       +-- Pluggable chat provider (OpenAI Responses or DeepSeek Chat Completions)
                       +-- Pluggable vision provider (OpenAI GPT-4o or Google Gemini 2.5)
                       +-- ElevenLabs TTS / OpenAI Whisper STT
                       +-- SQLite (WAL mode)
                       +-- whatsapp-web.js (Puppeteer)
```

## Features

### AI-Powered Study Validation

- The configured vision provider (GPT-4o or Gemini 2.5) analyzes uploaded screenshots to extract course name, lesson, class number, progress percentage, instructor, and more
- EXIF metadata extraction (device, timestamp, dimensions) for anti-cheat validation
- Server-side guards reject images that aren't clearly from Platzi — the AI cannot start sessions with empty or invalid data
- Agentic tool loop with up to 10 iterations - the AI decides which actions to take (start session, validate progress, mark streak, send notification)

### Study Session Timer

- Real-time synchronized timer persists across page refreshes (backed by `started_at` in the database)
- Color-coded progress: red -> yellow -> green as study time increases
- Automatically detects active sessions on page load

### Streak System

- Configurable required days (Mon-Fri), optional days (weekends), excluded days (holidays)
- **4 AM reset** - Streaks reset at 4 AM local time (configurable), not midnight, so late-night study sessions count
- 6 streak levels with animated SVG mascot: Apagado, Chispa, Fuego, Ardiendo, Inferno, Legendario

### WhatsApp Integration

- Pairing code authentication (no QR scanning needed)
- Puppeteer health checks every 60s with automatic session recovery
- Graceful shutdown with SIGKILL backstop for zombie Chrome processes
- Group notifications for study events
- Private AI-generated reminders via heartbeat injection into the user's AI conversation

### Smart Reminders

- User-configurable daily reminder at any time (supports multiple timezones)
- Automatic evening alert if you haven't studied today
- 2-hour open session warning
- All reminders are AI-generated through the user's conversation thread

### Indi (AI Assistant)

- Personal AI study companion with persistent conversation history. When OpenAI is the chat provider, threads are stored server-side via the OpenAI Conversations API; when DeepSeek is used, history is replayed from the local SQLite `chat_messages` table on each turn
- Responds to text, images, and voice messages (audio transcription uses OpenAI Whisper)
- Can start/complete study sessions, check streaks, and send notifications via function tools
- System heartbeat messages allow automated actions (reminders, alerts) to flow through the AI naturally

## Setup

### Prerequisites

- Node.js 22+
- A Google OAuth 2.0 client (for authentication)
- An API key for at least one chat provider (OpenAI or DeepSeek) and one vision provider (OpenAI or Gemini). OpenAI is the default for both, so a single OpenAI key is enough to run the full stack
- An OpenAI API key is also required for audio transcription (Whisper) regardless of which chat/vision providers are selected
- A WhatsApp account for notifications (optional)

### Install

```bash
git clone https://github.com/YosephFr/racha-team-platzi.git
cd racha-team-platzi
npm run install:all
```

### Configure

Copy the environment templates and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Required variables (in `backend/.env`):

| Variable               | Description                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`           | Random secret for signing JWTs (required, backend won't start without it). Generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                                                                   |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                                               |
| `OPENAI_API_KEY`       | Required when OpenAI is the chat or vision provider (default for both), and always required for Whisper STT |

Optional variables:

| Variable              | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `AI_CHAT_PROVIDER`    | `openai` (default) or `deepseek` — drives the agentic chat/heartbeat loop    |
| `AI_VISION_PROVIDER`  | `openai` (default) or `gemini` — drives screenshot + certificate analysis   |
| `DEEPSEEK_API_KEY`    | Required when `AI_CHAT_PROVIDER=deepseek`                                    |
| `DEEPSEEK_CHAT_MODEL` | `deepseek-v4-flash` (default) or `deepseek-v4-pro`                           |
| `GEMINI_API_KEY`      | Required when `AI_VISION_PROVIDER=gemini`                                    |
| `GEMINI_VISION_MODEL` | `gemini-2.5-flash` (default), `gemini-2.5-pro`, or `gemini-2.5-flash-lite`   |
| `WA_PRIMARY_PHONE`    | WhatsApp number for pairing code auth                                        |
| `WA_NOTIFY_TARGETS`   | WhatsApp group ID for notifications                                          |
| `ELEVENLABS_API_KEY`  | For text-to-speech                                                           |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice to use                                                      |
| `STREAK_RESET_HOUR`   | Hour at which streaks reset (default: 4 AM)                                  |
| `CORS_ORIGINS`        | Comma-separated allowed origins                                              |
| `BYPASS_OAUTH`        | Set to `true` to enable email login (dev only)                               |

See `.env.example` for the full list.

### AI providers

Chat and vision are split into independent provider slots so they can be mixed.

| Slot           | Provider   | Model defaults                              | Notes                                                                                              |
| -------------- | ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Chat / agent   | `openai`   | `gpt-5.4-mini` (Responses API)              | Default. Server-side conversation persistence via OpenAI Conversations API.                        |
| Chat / agent   | `deepseek` | `deepseek-v4-flash` or `deepseek-v4-pro`    | Chat Completions standard. No vision; the engine pre-analyzes images via the vision provider.      |
| Vision / image | `openai`   | `gpt-4o`                                    | Default. Chat Completions vision with base64 images.                                               |
| Vision / image | `gemini`   | `gemini-2.5-flash` (also `-pro`, `-lite`)   | `generateContent` with `inline_data` and JSON-mode output for structured fields.                   |

Switching is a no-code change: set `AI_CHAT_PROVIDER` / `AI_VISION_PROVIDER` and the matching API key. The backend fails fast at startup if a configured provider is missing its key. OpenAI remains the default for both slots, so existing deployments don't need to change anything.

### Development

```bash
npm run lint
npm run format
```

## API Endpoints

| Method          | Path                      | Auth | Description                                    |
| --------------- | ------------------------- | ---- | ---------------------------------------------- |
| GET             | /api/auth/google          | No   | Google OAuth redirect                          |
| GET             | /api/auth/google/callback | No   | Google OAuth callback                          |
| POST            | /api/auth/login           | No   | Email login (bypass mode only)                 |
| POST            | /api/auth/logout          | No   | Clear auth cookie                              |
| GET             | /api/auth/me              | Yes  | Current user profile                           |
| POST            | /api/study/submit         | Yes  | Upload photo, AI analysis + session management |
| POST            | /api/study/start          | Yes  | Start study session with photo                 |
| POST            | /api/study/complete       | Yes  | Complete study session with photo + AI validation |
| POST            | /api/study/end            | Yes  | Close active session without photo or AI (one-tap) |
| GET             | /api/study/active         | Yes  | Get active study session                       |
| GET             | /api/study/sessions       | Yes  | Session history                                |
| GET             | /api/streaks              | Yes  | Streak info + 30-day calendar                  |
| GET             | /api/streaks/leaderboard  | Yes  | All users ranked by streak                     |
| POST            | /api/chat                 | Yes  | Send message to Indi                           |
| POST            | /api/chat/transcribe      | Yes  | Audio transcription (Whisper)                  |
| POST            | /api/tts                  | Yes  | Text-to-speech (ElevenLabs)                    |
| GET/POST/DELETE | /api/reminders            | Yes  | Manage daily reminders                         |
| GET/POST/DELETE | /api/certificates         | Yes  | Manage Platzi certificates (upload, list, detail) |
| GET             | /api/whatsapp/status      | Yes  | WhatsApp connection status                     |
| GET             | /health                   | No   | Backend health check                           |
| GET             | /version                  | No   | Frontend build identifier (used by the in-app update checker) |

## Database

SQLite with WAL mode. 7 tables:

- **users** - Email, name, avatar, optional OpenAI conversation id (only populated when the chat provider is OpenAI)
- **study_sessions** - Start/end photos, course metadata, EXIF data, validation status
- **streaks** - Daily completion records per user
- **chat_conversations** - Chat threads. The `openai_conversation_id` column is set only when OpenAI is the chat provider; with DeepSeek, history is reconstructed from `chat_messages` on each turn
- **chat_messages** - Message history (text, images, audio, tool calls)
- **reminders** - WhatsApp reminder schedules with timezone
- **certificates** - Uploaded Platzi certificates with extracted metadata

## Security

- Auth via HttpOnly, Secure, SameSite cookies
- OAuth 2.0 with CSRF protection (state parameter)
- Upload validation: only JPEG, PNG, WebP, HEIC accepted; original files deleted after processing
- Rate limiting on all API endpoints
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- Server-side guards on AI tool execution (streak completion requires validated session)
- CORS with explicit origin allowlist
- EXIF fields sanitized before AI prompt injection

## License

MIT
