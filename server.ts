import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Telegraf } from "telegraf";
import OpenAI from "openai";
import dotenv from "dotenv";
import cron, { ScheduledTask } from "node-cron";
import Database from "better-sqlite3";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.json());

// In-memory store for bot instances (for demo purposes)
let activeBot: Telegraf | null = null;
let activeBotToken: string | null = null;
let botStartTime: Date | null = null;
let botUsername: string | null = null;

// In-memory store for sessions
interface Session {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  lastMessage: string;
  lastActive: Date;
  messageCount: number;
  type: string;
}

const sessions: Record<number, Session> = {};

// In-memory store for cron jobs
interface CronJobConfig {
  id: string;
  name: string;
  description?: string;
  agentId?: string;
  schedule: string;
  chatId: string;
  message: string;
  enabled: boolean;
  wakeMode?: string;
  payloadType?: string;
  lastRun?: Date;
  runHistory: Date[];
}

const cronJobs: Record<string, CronJobConfig> = {};
const scheduledTasks: Record<string, ScheduledTask> = {};

// --- Skills System ---
interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'system';
  enabled: boolean;
  config: any;
}

const skills: Record<string, Skill> = {
  'google_search': {
    id: 'google_search',
    name: 'Google Search',
    description: 'Allows the agent to search the web for real-time information.',
    type: 'tool',
    enabled: true,
    config: { googleSearch: {} }
  },
  'weather_tool': {
    id: 'weather_tool',
    name: 'Weather Service',
    description: 'Provides current weather information for any city.',
    type: 'tool',
    enabled: false,
    config: {
      functionDeclarations: [{
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
          type: "OBJECT",
          properties: {
            location: {
              type: "STRING",
              description: "The city and state, e.g. San Francisco, CA",
            },
          },
          required: ["location"],
        },
      }]
    }
  },
  'concise_mode': {
    id: 'concise_mode',
    name: 'Concise Mode',
    description: 'Forces the agent to be extremely concise and brief.',
    type: 'system',
    enabled: false,
    config: { systemInstruction: "You are a helpful assistant. Be extremely concise. Do not use markdown formatting unless necessary. Keep answers under 50 words." }
  }
};

async function startServer() {
  // Get Bot Status Endpoint
  app.get("/api/bot/status", async (req, res) => {
    if (activeBot && activeBotToken) {
      res.json({
        status: "running",
        username: botUsername,
        startTime: botStartTime,
        uptime: botStartTime ? (new Date().getTime() - botStartTime.getTime()) / 1000 : 0
      });
    } else {
      res.json({ status: "stopped" });
    }
  });

  // Get Sessions Endpoint
  app.get("/api/bot/sessions", async (req, res) => {
    const sessionList = Object.values(sessions).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    res.json({ sessions: sessionList });
  });

  // --- Skills Endpoints ---
  app.get("/api/skills", (req, res) => {
    res.json({ skills: Object.values(skills) });
  });

  app.post("/api/skills/:id/toggle", (req, res) => {
    const { id } = req.params;
    if (skills[id]) {
      skills[id].enabled = !skills[id].enabled;
      res.json({ success: true, skill: skills[id] });
    } else {
      res.status(404).json({ error: "Skill not found" });
    }
  });

  // --- Nodes & Security System (SQLite-backed) ---

  const db = new Database("moltby.db");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS exec_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      target_host TEXT NOT NULL DEFAULT 'Gateway',
      scope TEXT NOT NULL DEFAULT 'Defaults',
      security_mode TEXT NOT NULL DEFAULT 'Deny',
      ask_mode TEXT NOT NULL DEFAULT 'On miss',
      ask_fallback TEXT NOT NULL DEFAULT 'Deny',
      auto_allow_clis INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO exec_config (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS node_binding (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      default_binding TEXT NOT NULL DEFAULT 'Any node',
      agent_bindings TEXT NOT NULL DEFAULT '{"main":"Use default"}'
    );
    INSERT OR IGNORE INTO node_binding (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      roles TEXT NOT NULL DEFAULT '[]',
      scopes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS device_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      scopes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  function getTimeAgo(dateStr: string): string {
    const created = new Date(dateStr + "Z");
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function getDevicesFromDb() {
    const rows = db.prepare("SELECT * FROM devices ORDER BY created_at DESC").all() as any[];
    return rows.map((d: any) => {
      const tokens = db.prepare("SELECT * FROM device_tokens WHERE device_id = ?").all(d.id) as any[];
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        roles: JSON.parse(d.roles),
        scopes: JSON.parse(d.scopes),
        tokens: tokens.map((t: any) => ({
          name: t.name,
          status: t.status,
          scopes: JSON.parse(t.scopes),
          age: getTimeAgo(t.created_at),
        })),
      };
    });
  }

  function getExecConfig() {
    const row = db.prepare("SELECT * FROM exec_config WHERE id = 1").get() as any;
    return {
      targetHost: row.target_host,
      scope: row.scope,
      securityMode: row.security_mode,
      askMode: row.ask_mode,
      askFallback: row.ask_fallback,
      autoAllowCLIs: !!row.auto_allow_clis,
    };
  }

  function getNodeBinding() {
    const row = db.prepare("SELECT * FROM node_binding WHERE id = 1").get() as any;
    return {
      defaultBinding: row.default_binding,
      agentBindings: JSON.parse(row.agent_bindings),
    };
  }

  // Endpoints
  app.get("/api/nodes/config", (req, res) => {
    res.json({ execConfig: getExecConfig(), nodeBinding: getNodeBinding() });
  });

  app.post("/api/nodes/config/exec", (req, res) => {
    const { targetHost, scope, securityMode, askMode, askFallback, autoAllowCLIs } = req.body;
    db.prepare(`
      UPDATE exec_config SET
        target_host = COALESCE(?, target_host),
        scope = COALESCE(?, scope),
        security_mode = COALESCE(?, security_mode),
        ask_mode = COALESCE(?, ask_mode),
        ask_fallback = COALESCE(?, ask_fallback),
        auto_allow_clis = COALESCE(?, auto_allow_clis)
      WHERE id = 1
    `).run(targetHost ?? null, scope ?? null, securityMode ?? null, askMode ?? null, askFallback ?? null, autoAllowCLIs !== undefined ? (autoAllowCLIs ? 1 : 0) : null);
    res.json({ success: true, execConfig: getExecConfig() });
  });

  app.post("/api/nodes/config/binding", (req, res) => {
    const { defaultBinding, agentBindings } = req.body;
    if (defaultBinding) {
      db.prepare("UPDATE node_binding SET default_binding = ? WHERE id = 1").run(defaultBinding);
    }
    if (agentBindings) {
      db.prepare("UPDATE node_binding SET agent_bindings = ? WHERE id = 1").run(JSON.stringify(agentBindings));
    }
    res.json({ success: true, nodeBinding: getNodeBinding() });
  });

  app.get("/api/nodes/devices", (req, res) => {
    res.json({ devices: getDevicesFromDb() });
  });

  app.post("/api/nodes/devices", (req, res) => {
    const { name, description, roles, scopes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const id = crypto.randomBytes(32).toString("hex");
    const deviceRoles = roles || ["operator"];
    const deviceScopes = scopes || ["operator.admin", "operator.approvals", "operator.pairing"];

    db.prepare("INSERT INTO devices (id, name, description, roles, scopes) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, description || name, JSON.stringify(deviceRoles), JSON.stringify(deviceScopes));

    db.prepare("INSERT INTO device_tokens (device_id, name, status, scopes) VALUES (?, ?, ?, ?)")
      .run(id, "operator", "active", JSON.stringify(deviceScopes));

    const devices = getDevicesFromDb();
    const device = devices.find(d => d.id === id);
    res.json({ success: true, device });
  });

  app.delete("/api/nodes/devices/:id", (req, res) => {
    const { id } = req.params;
    const existing = db.prepare("SELECT id FROM devices WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Device not found" });

    db.prepare("DELETE FROM device_tokens WHERE device_id = ?").run(id);
    db.prepare("DELETE FROM devices WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/nodes/devices/:id/rotate", (req, res) => {
    const { id } = req.params;
    const existing = db.prepare("SELECT id FROM devices WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Device not found" });

    db.prepare("UPDATE device_tokens SET created_at = datetime('now') WHERE device_id = ?").run(id);

    const devices = getDevicesFromDb();
    const device = devices.find(d => d.id === id);
    res.json({ success: true, device });
  });

  app.post("/api/nodes/devices/:id/revoke", (req, res) => {
    const { id } = req.params;
    const existing = db.prepare("SELECT id FROM devices WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Device not found" });

    db.prepare("DELETE FROM device_tokens WHERE device_id = ?").run(id);

    const devices = getDevicesFromDb();
    const device = devices.find(d => d.id === id);
    res.json({ success: true, device });
  });

  // --- Cron Job Endpoints ---

  // List all cron jobs
  app.get("/api/cron", (req, res) => {
    const jobs = Object.values(cronJobs).map(job => ({
      ...job,
    }));
    res.json({ jobs });
  });

  // Create a new cron job
  app.post("/api/cron", (req, res) => {
    const { name, description, agentId, schedule, chatId, message, enabled, wakeMode, payloadType } = req.body;

    if (!name || !schedule || !chatId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!cron.validate(schedule)) {
      return res.status(400).json({ error: "Invalid cron expression" });
    }

    const id = Date.now().toString();
    const newJob: CronJobConfig = {
      id,
      name,
      description,
      agentId: agentId || 'default',
      schedule,
      chatId,
      message,
      enabled: enabled !== false, // Default to true
      wakeMode: wakeMode || 'Next heartbeat',
      payloadType: payloadType || 'System event',
      runHistory: []
    };

    // Schedule the task
    try {
      const task = cron.schedule(schedule, async () => {
        console.log(`Executing cron job: ${name} (${id})`);
        
        // Only run if enabled
        if (cronJobs[id] && cronJobs[id].enabled) {
          if (activeBot) {
            try {
              await activeBot.telegram.sendMessage(chatId, message);
              const now = new Date();
              cronJobs[id].lastRun = now;
              cronJobs[id].runHistory.unshift(now);
              // Keep history limited to 10
              if (cronJobs[id].runHistory.length > 10) {
                cronJobs[id].runHistory.pop();
              }
              console.log(`Message sent to ${chatId}`);
            } catch (error) {
              console.error(`Failed to send cron message to ${chatId}:`, error);
            }
          } else {
            console.warn("Cron job skipped: Bot is not active");
          }
        }
      }, {
        scheduled: newJob.enabled,
        timezone: "UTC"
      } as any);

      scheduledTasks[id] = task;
      cronJobs[id] = newJob;

      res.json({ success: true, job: newJob });
    } catch (error: any) {
      console.error("Failed to schedule cron job:", error);
      res.status(500).json({ error: "Failed to schedule job" });
    }
  });

  // Delete a cron job
  app.delete("/api/cron/:id", (req, res) => {
    const { id } = req.params;

    if (scheduledTasks[id]) {
      scheduledTasks[id].stop();
      delete scheduledTasks[id];
    }

    if (cronJobs[id]) {
      delete cronJobs[id];
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Job not found" });
    }
  });

  // Toggle a cron job (stop/start)
  app.post("/api/cron/:id/toggle", (req, res) => {
    const { id } = req.params;
    const job = cronJobs[id];

    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.enabled) {
      if (scheduledTasks[id]) scheduledTasks[id].stop();
      job.enabled = false;
    } else {
      if (scheduledTasks[id]) {
        scheduledTasks[id].start();
      } else {
        // Re-create if missing
         const task = cron.schedule(job.schedule, async () => {
            if (activeBot && cronJobs[id] && cronJobs[id].enabled) {
              try {
                await activeBot.telegram.sendMessage(job.chatId, job.message);
                const now = new Date();
                cronJobs[id].lastRun = now;
                cronJobs[id].runHistory.unshift(now);
                if (cronJobs[id].runHistory.length > 10) cronJobs[id].runHistory.pop();
              } catch (error) {
                console.error(`Failed to send cron message:`, error);
              }
            }
         });
         scheduledTasks[id] = task;
      }
      job.enabled = true;
    }

    res.json({ success: true, job });
  });

  // Validate Bot Token Endpoint
  app.post("/api/bot/validate-token", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
      const tempBot = new Telegraf(token);
      const botInfo = await tempBot.telegram.getMe();
      res.json({ valid: true, username: botInfo.username, id: botInfo.id });
    } catch (error: any) {
      console.error("Token validation failed:", error.message);
      res.status(400).json({ valid: false, error: "Invalid token or network error" });
    }
  });

  // Validate Chat ID Endpoint
  app.post("/api/bot/validate-chatid", async (req, res) => {
    const { token, chatId } = req.body;
    if (!token || !chatId) return res.status(400).json({ error: "Token and Chat ID are required" });

    try {
      const tempBot = new Telegraf(token);
      // Try to send a silent message or get chat info to verify
      // getChat works if the bot has interacted with the user
      const chat = await tempBot.telegram.getChat(chatId);
      res.json({ valid: true, type: chat.type, title: 'title' in chat ? chat.title : undefined });
    } catch (error: any) {
      console.error("Chat ID validation failed:", error.message);
      res.status(400).json({ valid: false, error: "Invalid Chat ID or bot hasn't started conversation with this user." });
    }
  });

  // API Routes
  app.post("/api/bot/start", async (req, res) => {
    const { token, chatId } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // If bot is already running with same token, do nothing
    if (activeBot && activeBotToken === token) {
      return res.json({ status: "running", message: "Bot is already running" });
    }

    // Stop existing bot if different token
    if (activeBot) {
      try {
        activeBot.stop("SIGINT");
      } catch (e) {
        console.error("Error stopping previous bot:", e);
      }
      activeBot = null;
    }

    try {
      const bot = new Telegraf(token);
      
      // Get bot info to verify and store username
      const botInfo = await bot.telegram.getMe();
      botUsername = botInfo.username;
      
      activeBot = bot;
      activeBotToken = token;
      botStartTime = new Date();

      // Handle start command
      bot.start((ctx) => ctx.reply("Hello! I am your Moltby AI Agent. I am ready to chat!"));

      // Handle text messages with Gemini
      bot.on("text", async (ctx) => {
        const userMessage = ctx.message.text;
        const chatId = ctx.chat.id;
        const from = ctx.from;

        // Update session
        if (!sessions[chatId]) {
          sessions[chatId] = {
            chatId,
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            lastMessage: userMessage,
            lastActive: new Date(),
            messageCount: 1,
            type: ctx.chat.type
          };
        } else {
          sessions[chatId].lastMessage = userMessage;
          sessions[chatId].lastActive = new Date();
          sessions[chatId].messageCount++;
          // Update user info in case it changed
          sessions[chatId].username = from.username;
          sessions[chatId].firstName = from.first_name;
          sessions[chatId].lastName = from.last_name;
        }
        
        try {
          const apiKey = process.env.OPENAI_API_KEY;
          
          if (!apiKey) {
            return ctx.reply("Error: OpenAI API Key is not configured on the server.");
          }

          const openai = new OpenAI({ apiKey });
          
          let systemInstruction = "You are a helpful AI assistant.";
          if (skills['concise_mode'].enabled) {
            systemInstruction = skills['concise_mode'].config.systemInstruction;
          }

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userMessage }
            ],
          });

          const replyText = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
          await ctx.reply(replyText);
        } catch (error: any) {
          console.error("Error generating OpenAI response for Telegram:", error);
          await ctx.reply(`I encountered an error: ${error.message || "Unknown error"}`);
        }
      });

      // Launch the bot
      bot.launch(() => {
        console.log("Telegram bot started successfully");
      }).catch((err) => {
        console.error("Failed to launch Telegram bot:", err);
      });

      // Send a welcome message to the specified chat ID if provided
      if (chatId) {
        try {
          await bot.telegram.sendMessage(chatId, "Moltby Agent connected successfully! I am now online.");
        } catch (e) {
          console.error("Failed to send welcome message to chat ID:", e);
        }
      }

      res.json({ status: "started", message: "Bot started successfully" });
    } catch (error: any) {
      console.error("Error starting bot:", error);
      res.status(500).json({ error: "Failed to start bot", details: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "OpenAI API Key is not configured." });

      const openai = new OpenAI({ apiKey });

      let systemInstruction = "You are a helpful AI assistant.";
      if (skills['concise_mode'].enabled) {
        systemInstruction = skills['concise_mode'].config.systemInstruction;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: message }
        ],
      });

      const reply = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      res.json({ reply });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  app.post("/api/bot/stop", async (req, res) => {
    if (activeBot) {
      activeBot.stop("SIGINT");
      activeBot = null;
      activeBotToken = null;
      botStartTime = null;
      botUsername = null;
      res.json({ status: "stopped", message: "Bot stopped successfully" });
    } else {
      res.json({ status: "stopped", message: "No bot was running" });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
