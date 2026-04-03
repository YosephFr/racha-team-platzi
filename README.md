# Racha Team Platzi

App mobile-first PWA que motiva a un grupo de amigos a mantener su racha de estudio en Platzi. Cada usuario comprueba que estudio subiendo fotos, la IA valida el avance, y se notifica al grupo por WhatsApp.

**Produccion:** [platzi.indexa.ar](https://platzi.indexa.ar)

## Stack

| Capa              | Tecnologia                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Frontend          | Next.js 15 (App Router), React 19, Tailwind CSS 3, Motion (Framer Motion), Lucide React, Serwist (PWA) |
| Backend           | Node.js, Express 5 (ESM), SQLite (better-sqlite3), Multer                                              |
| IA Vision         | GPT-4o via Chat Completions API (analisis de imagenes)                                                 |
| IA Conversacional | GPT-5.4 Mini via Responses API con `conversation_id` (modelo razonador)                                |
| WhatsApp          | whatsapp-web.js (Puppeteer, LocalAuth, QR pairing)                                                     |
| Proxy             | Nginx reverse proxy con SSL (Cloudflare)                                                               |

## Arquitectura

```
                    ┌─────────────────────┐
                    │   platzi.indexa.ar   │
                    │       (Nginx)        │
                    └────┬───────────┬─────┘
                         │           │
                    /    │     /api/  │
                         │           │
              ┌──────────▼──┐  ┌─────▼──────────┐
              │  Frontend   │  │    Backend      │
              │  Next.js    │  │    Express      │
              │  :4035      │  │    :4036        │
              └─────────────┘  └──┬──────┬───┬───┘
                                  │      │   │
                            ┌─────▼┐ ┌───▼┐ ┌▼────────┐
                            │OpenAI│ │ DB │ │WhatsApp  │
                            │ API  │ │SQLi│ │ Web.js   │
                            └──────┘ └────┘ └──────────┘
```

El backend expone una API REST. La IA no es un chat aparte: esta incrustada en el flujo de la app. Un motor agentico (tool loop) decide cuando iniciar sesiones, validar estudio, marcar rachas y enviar notificaciones via Function Tools.

## Estructura de carpetas

```
racha-team-platzi/
├── frontend/                   Next.js PWA (port 4035)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js       Root layout (fonts, AuthProvider)
│   │   │   ├── page.js         Redirect segun auth
│   │   │   ├── globals.css     Tailwind + design system
│   │   │   ├── manifest.js     PWA manifest
│   │   │   ├── login/page.js   Login con bypass OAuth
│   │   │   ├── dashboard/page.js  App shell (tabs: home, racha, chat, perfil)
│   │   │   └── study/page.js   Flujo de estudio (4 pasos con camara)
│   │   ├── components/
│   │   │   ├── BottomNav.js    Navegacion inferior con 5 tabs
│   │   │   ├── StreakFireButton.js  Boton central animado (cambia segun racha)
│   │   │   ├── StreakMascot.js SVG animado con 6 niveles de evolucion
│   │   │   ├── StreakCalendar.js  Calendario heatmap de 30 dias
│   │   │   ├── HomeTab.js      Dashboard: racha, stats, leaderboard
│   │   │   ├── RachaTab.js     Historial, calendario, estadisticas
│   │   │   ├── ChatTab.js      Chat con IA (Indi) - localStorage
│   │   │   ├── ProfileTab.js   Perfil, nivel, WhatsApp status, logout
│   │   │   └── PhotoCapture.js Camara/galeria con preview
│   │   ├── lib/
│   │   │   ├── api.js          Cliente HTTP (resuelve host dinamicamente)
│   │   │   ├── auth.js         React Context + JWT en localStorage
│   │   │   └── utils.js        cn(), getStreakLevel(), formatRelativeTime()
│   │   └── sw.js               Service worker (Serwist)
│   ├── tailwind.config.mjs
│   ├── postcss.config.mjs
│   └── next.config.mjs         Serwist + allowedDevOrigins
│
├── backend/                    Node.js + Express (port 4036)
│   ├── src/
│   │   ├── server.js           Entry point (CORS, multer, JWT, rutas)
│   │   ├── config.js           Variables de entorno
│   │   ├── ai/
│   │   │   ├── provider.js     OpenAI client (Responses API + Chat Completions)
│   │   │   ├── engine.js       Motor agentico: tool loop (max 10 iteraciones)
│   │   │   └── tools/
│   │   │       ├── definitions.js  6 function tools
│   │   │       └── handlers.js     Implementacion de cada tool
│   │   ├── db/
│   │   │   ├── index.js        SQLite init + prepared statements
│   │   │   └── schema.sql      Tablas: users, study_sessions, streaks
│   │   ├── services/
│   │   │   └── streak.js       Calculo de racha (reglas configurables)
│   │   ├── whatsapp/
│   │   │   ├── client.js       Factory de whatsapp-web.js con Puppeteer
│   │   │   ├── session-manager.js  Lifecycle, auto-reconnect, QR
│   │   │   └── notify.js       Envio a WA_NOTIFY_TARGETS
│   │   └── routes/
│   │       ├── auth.js         POST /login, GET /me
│   │       ├── study.js        POST /start, POST /complete, GET /sessions, GET /active
│   │       ├── streaks.js      GET /, GET /leaderboard
│   │       ├── whatsapp.js     GET /status, GET /qr
│   │       └── chat.js         POST / (chat directo con IA)
│   └── data/                   SQLite DB + uploads + WhatsApp session (gitignored)
│
├── nginx/
│   └── platzi.indexa.ar.conf   Reverse proxy (/ -> :4035, /api/ -> :4036)
│
├── package.json                Scripts del monorepo
├── .env.example                Template de variables de entorno
└── CLAUDE.md                   Contexto tecnico para agentes
```

## Variables de entorno

Copiar `.env.example` a `backend/.env` y `frontend/.env.local`:

### Backend (`backend/.env`)

| Variable                  | Default                           | Descripcion                                                                 |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `BACKEND_PORT`            | `4036`                            | Puerto del servidor Express                                                 |
| `FRONTEND_URL`            | `http://localhost:4035`           | Origen permitido en CORS                                                    |
| `JWT_SECRET`              | `racha-dev-secret-change-in-prod` | Secreto para firmar JWT                                                     |
| `BYPASS_OAUTH`            | `true`                            | `true` = login solo con email, `false` = requiere OAuth                     |
| `DATABASE_PATH`           | `./data/racha.db`                 | Ruta de la base SQLite                                                      |
| `OPENAI_API_KEY`          | —                                 | API key de OpenAI (requerida)                                               |
| `OPENAI_VISION_MODEL`     | `gpt-4o`                          | Modelo para analisis de imagenes                                            |
| `OPENAI_CHAT_MODEL`       | `gpt-5.4-mini`                    | Modelo conversacional (Responses API)                                       |
| `OPENAI_REASONING_EFFORT` | `medium`                          | Esfuerzo de razonamiento: `low`, `medium`, `high`                           |
| `STREAK_REQUIRED_DAYS`    | `1,2,3,4,5`                       | Dias obligatorios (0=Dom, 1=Lun, ..., 6=Sab)                                |
| `STREAK_OPTIONAL_DAYS`    | `6,0`                             | Dias opcionales (suman pero no rompen la racha)                             |
| `STREAK_EXCLUDED_DATES`   | —                                 | Fechas excluidas/feriados (formato `YYYY-MM-DD`, separadas por coma)        |
| `WA_NOTIFY_TARGETS`       | —                                 | Destinatarios WhatsApp (numeros `@c.us` o IDs de grupo, separados por coma) |
| `WA_SESSION_PATH`         | `./data/.wwebjs_auth`             | Ruta de sesion persistente de WhatsApp                                      |
| `WA_CACHE_PATH`           | `./data/.wwebjs_cache`            | Cache del navegador de WhatsApp                                             |

### Frontend (`frontend/.env.local`)

| Variable               | Default                 | Descripcion                                                           |
| ---------------------- | ----------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:4036` | URL del backend (solo para SSR; en browser se resuelve dinamicamente) |
| `NEXT_PUBLIC_API_PORT` | `4036`                  | Puerto del backend (para resolucion dinamica en browser)              |

## Desarrollo local

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Configurar variables de entorno
cp .env.example backend/.env
# Editar backend/.env con tu OPENAI_API_KEY

echo "NEXT_PUBLIC_API_URL=http://localhost:4036" > frontend/.env.local

# 3. Correr ambos servicios
npm run dev
# O por separado:
npm run dev:frontend   # http://localhost:4035
npm run dev:backend    # http://localhost:4036
```

El frontend resuelve el backend dinamicamente usando `window.location.hostname` + puerto 4036, lo que permite acceder desde Tailscale, LAN, o cualquier IP sin configuracion adicional.

## Deploy en produccion

**Servidor:** ImanLeads (148.113.220.109, `ssh imanleads`)
**Dominio:** platzi.indexa.ar (DNS via Cloudflare)

```bash
# En el servidor:

# 1. Clonar y configurar
git clone <repo> /path/to/racha-team-platzi
cd racha-team-platzi
npm run install:all
cp .env.example backend/.env
# Editar backend/.env con valores de produccion

# 2. Build del frontend
npm run build

# 3. Configurar Nginx
sudo cp nginx/platzi.indexa.ar.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/platzi.indexa.ar.conf /etc/nginx/sites-enabled/
# Generar certificado SSL self-signed (Cloudflare lo termina):
sudo mkdir -p /etc/nginx/ssl/platzi.indexa.ar
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/platzi.indexa.ar/platzi.indexa.ar.key \
  -out /etc/nginx/ssl/platzi.indexa.ar/platzi.indexa.ar.crt
sudo nginx -t && sudo systemctl reload nginx

# 4. Iniciar servicios
npm run start
# O usar pm2:
pm2 start npm --name "racha-frontend" -- run start:frontend
pm2 start npm --name "racha-backend" -- run start:backend
```

### Nginx

La config en `nginx/platzi.indexa.ar.conf` hace:

- Puerto 80: redirige a HTTPS
- Puerto 443: SSL con Cloudflare allow-list
- `location /` → proxy a `:4035` (frontend)
- `location /api/` → proxy a `:4036` (backend)
- WebSocket upgrade headers en ambos locations
- Body limit 50MB, read timeout 600s

## API endpoints

Todos los endpoints autenticados requieren header `Authorization: Bearer <jwt>`.

### Autenticacion

| Metodo | Ruta              | Auth | Descripcion                                                |
| ------ | ----------------- | ---- | ---------------------------------------------------------- |
| POST   | `/api/auth/login` | No   | Login. Body: `{ email, name? }`. Retorna `{ user, token }` |
| GET    | `/api/auth/me`    | Si   | Perfil del usuario autenticado                             |

### Estudio

| Metodo | Ruta                  | Auth | Descripcion                                                                                                     |
| ------ | --------------------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/study/start`    | Si   | Iniciar sesion. Body: `multipart/form-data` con campo `photo`. La IA analiza la imagen y registra el inicio     |
| POST   | `/api/study/complete` | Si   | Completar sesion. Body: `multipart/form-data` con campo `photo`. La IA compara inicio vs fin y valida el avance |
| GET    | `/api/study/active`   | Si   | Sesion activa actual (o `null`)                                                                                 |
| GET    | `/api/study/sessions` | Si   | Historial de sesiones (ultimas 20)                                                                              |

### Rachas

| Metodo | Ruta                       | Auth | Descripcion                                                             |
| ------ | -------------------------- | ---- | ----------------------------------------------------------------------- |
| GET    | `/api/streaks`             | Si   | Info de racha: `currentStreak`, `todayCompleted`, calendario de 30 dias |
| GET    | `/api/streaks/leaderboard` | No   | Ranking de todos los usuarios por racha                                 |

### Chat

| Metodo | Ruta        | Auth | Descripcion                                                        |
| ------ | ----------- | ---- | ------------------------------------------------------------------ |
| POST   | `/api/chat` | Si   | Chat directo con la IA. Body: `{ message }`. Retorna `{ message }` |

### WhatsApp

| Metodo | Ruta                   | Auth | Descripcion                   |
| ------ | ---------------------- | ---- | ----------------------------- |
| GET    | `/api/whatsapp/status` | No   | Estado de conexion WhatsApp   |
| GET    | `/api/whatsapp/qr`     | No   | QR code para emparejar sesion |

## Sistema de rachas

### Reglas configurables via `.env`

- **Dias requeridos** (`STREAK_REQUIRED_DAYS`): Por defecto Lun-Vie. Si no se estudia un dia requerido, la racha se rompe.
- **Dias opcionales** (`STREAK_OPTIONAL_DAYS`): Por defecto Sab-Dom. Si se estudia, suma al contador. Si no, la racha NO se rompe.
- **Fechas excluidas** (`STREAK_EXCLUDED_DATES`): Feriados. Se saltan completamente en el calculo.

### Calculo

El servicio `streak.js` camina hacia atras desde hoy hasta 365 dias, contando dias consecutivos completados. El calculo respeta las reglas de dias requeridos/opcionales/excluidos.

### Niveles de mascota

| Nivel | Racha      | Visual                                |
| ----- | ---------- | ------------------------------------- |
| 0     | 0 dias     | Gris, apagado, ojos cerrados          |
| 1     | 1-3 dias   | Amarillo, ojos abiertos               |
| 2     | 4-7 dias   | Naranja, sonrisa, bouncing            |
| 3     | 8-14 dias  | Rojo, cara feliz, particulas          |
| 4     | 15-30 dias | Rojo oscuro, entusiasmado, cheeks     |
| 5     | 30+ dias   | Violeta, corona, particulas multiples |

## Integracion con IA

### Dos modelos, dos APIs

1. **Vision (GPT-4o)** — Chat Completions API
   - Analiza screenshots de Platzi
   - Extrae: curso, leccion, numero de clase, progreso
   - Retorna JSON estructurado

2. **Conversacional (GPT-5.4 Mini)** — Responses API
   - Modelo razonador con `reasoning: { effort }` configurable
   - Usa `developer` role (no `system`) y NO acepta `temperature`
   - Persistencia via `conversation_id` por usuario
   - Motor agentico con tool loop (max 10 iteraciones)

### Function Tools

La IA decide que herramientas usar segun el contexto:

| Tool                | Cuando se usa                                           |
| ------------------- | ------------------------------------------------------- |
| `start_study`       | Cuando el usuario sube foto de inicio                   |
| `validate_study`    | Cuando el usuario sube foto final                       |
| `complete_streak`   | Despues de validar estudio exitosamente                 |
| `get_streak_info`   | Cuando se pide info de la racha                         |
| `send_notification` | Despues de iniciar y completar estudio                  |
| `get_user_info`     | Antes de enviar notificaciones (para obtener el nombre) |

### Flujo tipico de estudio

```
Usuario sube foto de inicio
  → Backend llama analyzeImage() (GPT-4o vision)
  → Resultado se inyecta como prompt al motor agentico
  → IA llama start_study → get_user_info → send_notification
  → WhatsApp envia: "Juan empezo a estudiar Curso de React!"

Usuario sube foto final
  → analyzeImage() analiza foto final
  → Motor agentico compara inicio vs fin
  → IA llama validate_study(isValid: true) → complete_streak → get_user_info → send_notification
  → WhatsApp envia: "Juan completo su dia 7 de racha!"
```

## Integracion WhatsApp

Usa `whatsapp-web.js` con Puppeteer headless:

- **Pairing**: QR code disponible en `GET /api/whatsapp/qr`, se muestra en terminal tambien
- **Sesion**: persistida con `LocalAuth` en `WA_SESSION_PATH`
- **Auto-reconnect**: hasta 3 intentos con backoff exponencial (10s, 20s, 40s)
- **Notificaciones**: se envian a todos los `WA_NOTIFY_TARGETS` configurados
- **Mensajes**: generados por la IA, creativos y diferentes cada vez

## Base de datos

SQLite con WAL mode. Tres tablas:

- **`users`**: id, email (unique), name, avatar_url, conversation_id, timestamps
- **`study_sessions`**: id, user_id, fotos inicio/fin, metadatos curso/leccion/clase, validated, timestamps
- **`streaks`**: id, user_id, date, completed, session_id. UNIQUE(user_id, date)

La DB se crea automaticamente al iniciar el backend. Ubicacion por defecto: `backend/data/racha.db`.
