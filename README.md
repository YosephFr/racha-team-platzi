# Racha Team Platzi

A mobile-first PWA that helps a group of friends maintain their daily study streak on [Platzi](https://platzi.com). Users prove they studied by uploading screenshots, AI validates their progress, and the group gets notified via WhatsApp.

## How it works

1. **Start studying** - Upload a screenshot of your Platzi course. The AI analyzes it, extracts course info, and starts a timed session.
2. **Study timer** - A real-time timer tracks your session. Color-coded motivation: red (<15min), yellow (15-25min), green (30min+).
3. **Complete your streak** - Upload a final screenshot showing progress. The AI validates advancement and marks your daily streak.
4. **Group notifications** - WhatsApp messages notify the group when someone starts studying, completes their streak, or hits a milestone.
5. **Smart reminders** - AI-powered personal WhatsApp reminders at your chosen time, plus automatic alerts at 10 PM if you haven't studied and session-timeout warnings.

## Stack

| Layer             | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Frontend          | Next.js 15 (App Router), React 19, Tailwind CSS 3, Motion, Serwist PWA   |
| Backend           | Node.js, Express 5 (ESM), SQLite (better-sqlite3, WAL mode)              |
| AI Vision         | GPT-4o - Screenshot analysis with EXIF metadata extraction               |
| AI Conversational | GPT-5.4 Mini - Agentic tool loop via OpenAI Responses API                |
| Voice             | ElevenLabs TTS, OpenAI Whisper STT                                       |
| WhatsApp          | whatsapp-web.js with pairing code auth, health checks, graceful shutdown |
| Auth              | Google OAuth 2.0, JWT (30-day expiry)                                    |
| Deploy            | PM2, Nginx reverse proxy, Let's Encrypt SSL, Cloudflare                  |

## Architecture

```
Browser (PWA)
    |
    v
Nginx (SSL termination, reverse proxy)
    |
    +-- / --------> Next.js 15 (port 4035)
    |                  App Router, SSR/static
    |                  Tailwind + Motion animations
    |
    +-- /api/ ----> Express 5 (port 4036)
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
- Agentic tool loop with up to 10 iterations - the AI decides which actions to take (start session, validate progress, mark streak, send notification)

### Study Session Timer

- Real-time synchronized timer persists across page refreshes (backed by `started_at` in the database)
- Color-coded progress: red → yellow → green as study time increases
- Automatically detects active sessions on page load

### Streak System

- Configurable required days (Mon-Fri), optional days (weekends), excluded days (holidays)
- **4 AM reset** - Streaks reset at 4 AM local time (configurable), not midnight, so late-night study sessions count
- 6 streak levels with animated SVG mascot: Apagado → Chispa → Fuego → Ardiendo → Inferno → Legendario

### WhatsApp Integration

- Pairing code authentication (no QR scanning needed)
- Puppeteer health checks every 60s with automatic session recovery
- Graceful shutdown with SIGKILL backstop for zombie Chrome processes
- Group notifications for study events
- Private AI-generated reminders via heartbeat injection into the user's AI conversation

### Smart Reminders

- User-configurable daily reminder at any time (supports Argentina, Colombia, Peru timezones)
- Automatic 10 PM alert if you haven't studied today
- 2-hour open session warning
- All reminders are AI-generated through the user's Indi conversation thread

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

Key variables:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `OPENAI_API_KEY` - For vision analysis and conversational AI
- `WA_PRIMARY_PHONE` - WhatsApp number for pairing code auth
- `WA_NOTIFY_TARGETS` - WhatsApp group ID for notifications
- `STREAK_RESET_HOUR` - Hour at which streaks reset (default: 4 AM)

See `.env.example` for the full list.

### Development

The app is designed to be deployed to a remote server. Code locally, push, then deploy:

```bash
npm run lint
npm run format
```

### Production Deploy

```bash
git push
ssh <server> "cd ~/racha-team-platzi && git pull && cd frontend && npm install && npm run build && cd ../backend && npm install && cd .. && pm2 restart racha-frontend racha-backend"
```

## API Endpoints

| Method          | Path                      | Description                                     |
| --------------- | ------------------------- | ----------------------------------------------- |
| POST            | /api/auth/login           | Email login (bypass mode)                       |
| GET             | /api/auth/google          | Google OAuth redirect                           |
| GET             | /api/auth/google/callback | Google OAuth callback                           |
| GET             | /api/auth/me              | Current user profile                            |
| POST            | /api/study/submit         | Upload photo → AI analysis + session management |
| POST            | /api/study/start          | Start study session with photo                  |
| POST            | /api/study/complete       | Complete study session with photo               |
| GET             | /api/study/active         | Get active study session                        |
| GET             | /api/study/sessions       | Session history                                 |
| GET             | /api/streaks              | Streak info + 30-day calendar                   |
| GET             | /api/streaks/leaderboard  | All users ranked by streak                      |
| POST            | /api/chat                 | Send message to Indi                            |
| POST            | /api/chat/transcribe      | Audio transcription (Whisper)                   |
| POST            | /api/tts                  | Text-to-speech (ElevenLabs)                     |
| GET/POST/DELETE | /api/reminders            | Manage daily reminders                          |
| GET             | /api/whatsapp/status      | WhatsApp connection status                      |
| GET             | /health                   | Backend health check                            |

## Database

SQLite with WAL mode. 6 tables:

- **users** - Email, name, avatar, OpenAI conversation_id
- **study_sessions** - Start/end photos, course metadata, EXIF data, validation status
- **streaks** - Daily completion records per user
- **chat_conversations** - AI chat threads with OpenAI conversation_id
- **chat_messages** - Message history (text, images, audio, tool calls)
- **reminders** - WhatsApp reminder schedules with country/timezone

## License

MIT
