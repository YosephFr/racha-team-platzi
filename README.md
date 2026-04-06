# Racha Team Platzi

A mobile-first PWA that helps a group of friends maintain their daily study streak on [Platzi](https://platzi.com). Users prove they studied by uploading screenshots, AI validates their progress, and the group gets notified via WhatsApp.

## How it works

1. **Start studying** - Upload a screenshot of your Platzi course. The AI analyzes it, extracts course info, and starts a timed session.
2. **Study timer** - A real-time timer tracks your session. Color-coded motivation: red (<15min), yellow (15-25min), green (30min+).
3. **Complete your streak** - Upload a final screenshot showing progress. The AI validates advancement and marks your daily streak.
4. **Group notifications** - WhatsApp messages notify the group when someone starts studying, completes their streak, or hits a milestone.
5. **Smart reminders** - AI-powered personal WhatsApp reminders at your chosen time, plus automatic alerts if you haven't studied.

## Stack

| Layer             | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Frontend          | Next.js 15 (App Router), React 19, Tailwind CSS 3, Motion, Serwist PWA   |
| Backend           | Node.js, Express 5 (ESM), SQLite (better-sqlite3, WAL mode)              |
| AI Vision         | GPT-4o - Screenshot analysis with EXIF metadata extraction               |
| AI Conversational | GPT-5.4 Mini - Agentic tool loop via OpenAI Responses API                |
| Voice             | ElevenLabs TTS, OpenAI Whisper STT                                       |
| WhatsApp          | whatsapp-web.js with pairing code auth, health checks, graceful shutdown |
| Auth              | Google OAuth 2.0, JWT in HttpOnly cookies (30-day expiry)                |

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
                       +-- OpenAI Responses API (agentic tool loop)
                       +-- OpenAI Chat Completions (GPT-4o vision)
                       +-- ElevenLabs TTS / Whisper STT
                       +-- SQLite (WAL mode)
                       +-- whatsapp-web.js (Puppeteer)
```

## Features

### AI-Powered Study Validation

- GPT-4o analyzes uploaded screenshots to extract course name, lesson, class number, progress percentage, instructor, and more
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

- Personal AI study companion with persistent conversation via OpenAI Conversations API
- Responds to text, images, and voice messages
- Can start/complete study sessions, check streaks, and send notifications via function tools
- System heartbeat messages allow automated actions (reminders, alerts) to flow through the AI naturally

## Setup

### Prerequisites

- Node.js 22+
- A Google OAuth 2.0 client (for authentication)
- OpenAI API key (GPT-4o + GPT-5.4 Mini)
- A WhatsApp account for notifications (optional)

### Install

```bash
git clone https://github.com/YosephFr/racha-team-platzi.git
cd racha-team-platzi
npm run install:all
```

### Configure

Copy the environment template and fill in your values:

```bash
cp .env.example backend/.env
```

Required variables:

| Variable               | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `JWT_SECRET`           | Random secret for signing JWTs (required, backend won't start without it) |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                                    |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                |
| `OPENAI_API_KEY`       | For vision analysis and conversational AI                                 |

Optional variables:

| Variable              | Description                                    |
| --------------------- | ---------------------------------------------- |
| `WA_PRIMARY_PHONE`    | WhatsApp number for pairing code auth          |
| `WA_NOTIFY_TARGETS`   | WhatsApp group ID for notifications            |
| `ELEVENLABS_API_KEY`  | For text-to-speech                             |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice to use                        |
| `STREAK_RESET_HOUR`   | Hour at which streaks reset (default: 4 AM)    |
| `CORS_ORIGINS`        | Comma-separated allowed origins                |
| `BYPASS_OAUTH`        | Set to `true` to enable email login (dev only) |

See `.env.example` for the full list.

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
| POST            | /api/study/complete       | Yes  | Complete study session with photo              |
| GET             | /api/study/active         | Yes  | Get active study session                       |
| GET             | /api/study/sessions       | Yes  | Session history                                |
| GET             | /api/streaks              | Yes  | Streak info + 30-day calendar                  |
| GET             | /api/streaks/leaderboard  | Yes  | All users ranked by streak                     |
| POST            | /api/chat                 | Yes  | Send message to Indi                           |
| POST            | /api/chat/transcribe      | Yes  | Audio transcription (Whisper)                  |
| POST            | /api/tts                  | Yes  | Text-to-speech (ElevenLabs)                    |
| GET/POST/DELETE | /api/reminders            | Yes  | Manage daily reminders                         |
| GET             | /api/whatsapp/status      | Yes  | WhatsApp connection status                     |
| GET             | /health                   | No   | Backend health check                           |

## Database

SQLite with WAL mode. 6 tables:

- **users** - Email, name, avatar, OpenAI conversation_id
- **study_sessions** - Start/end photos, course metadata, EXIF data, validation status
- **streaks** - Daily completion records per user
- **chat_conversations** - AI chat threads with OpenAI conversation_id
- **chat_messages** - Message history (text, images, audio, tool calls)
- **reminders** - WhatsApp reminder schedules with timezone

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
