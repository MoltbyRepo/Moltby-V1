# Moltby

## Overview
A React + Express application for managing Telegram bot agents powered by OpenAI. Users connect a wallet, configure a Telegram bot token and chat ID, then manage their AI agent through a dashboard.

## Architecture
- **Frontend**: React 19 + Vite + TailwindCSS 4 + Motion (animations)
- **Backend**: Express server (server.ts) with Vite dev middleware in development
- **AI**: OpenAI API (gpt-4o-mini)
- **Bot**: Telegraf (Telegram bot framework)
- **Database**: SQLite (better-sqlite3) for persistent storage (Nodes & Security)
- **Scheduling**: node-cron for scheduled messages

## Project Structure
- `server.ts` - Express server with API routes, SQLite database, and Vite middleware
- `moltby.db` - SQLite database file (auto-created, gitignored)
- `src/` - React frontend source
  - `App.tsx` - Main app with onboarding flow and dashboard
  - `components/onboarding/` - Wallet connect, agent name, bot token, chat ID setup
  - `components/dashboard/` - Dashboard layout, sidebar, header, and views
  - `components/dashboard/views/` - Overview, Sessions, Skills, Cron Jobs, Nodes, Chat, Channels, Instances
- `vite.config.ts` - Vite configuration with TailwindCSS plugin
- `index.html` - Entry HTML
- `public/logo.png` - App logo and favicon

## Key Configuration
- **Port**: 5000 (Express serves both API and frontend)
- **Dev command**: `npm run dev` (runs `tsx server.ts`)
- **Build**: `npm run build` (Vite build)
- **Deployment**: VM target (always-on for Telegram bot), production uses `node --import tsx server.ts`

## Environment Variables
- `OPENAI_API_KEY` - OpenAI API key (required for AI responses in bot and dashboard chat)
- `NODE_ENV` - Set to "production" for production mode

## Database Tables (SQLite)
- `exec_config` - Execution approval configuration (single row)
- `node_binding` - Node binding configuration (single row)
- `devices` - Paired devices with roles and scopes
- `device_tokens` - Authentication tokens for devices

## API Endpoints
- `POST /api/bot/start` - Start Telegram bot with token/chatId
- `POST /api/bot/stop` - Stop the bot
- `GET /api/bot/status` - Get bot status
- `GET /api/bot/sessions` - List chat sessions
- `POST /api/bot/validate-token` - Validate bot token
- `POST /api/chat` - Send message to OpenAI (dashboard chat)
- `GET /api/skills` - List skills
- `POST /api/skills/:id/toggle` - Toggle a skill
- `GET /api/cron` - List cron jobs
- `POST /api/cron` - Create cron job
- `DELETE /api/cron/:id` - Delete cron job
- `POST /api/cron/:id/toggle` - Toggle cron job
- `GET /api/nodes/config` - Get exec config and node binding
- `POST /api/nodes/config/exec` - Update exec config (persisted to SQLite)
- `POST /api/nodes/config/binding` - Update node binding (persisted to SQLite)
- `GET /api/nodes/devices` - List devices (from SQLite)
- `POST /api/nodes/devices` - Add new device (persisted to SQLite)
- `DELETE /api/nodes/devices/:id` - Delete device
- `POST /api/nodes/devices/:id/rotate` - Rotate device tokens
- `POST /api/nodes/devices/:id/revoke` - Revoke device tokens
