import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Telegraf } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cron, { ScheduledTask } from "node-cron";

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

  // --- Nodes & Security System ---

  interface Device {
    id: string;
    name: string;
    description: string;
    roles: string[];
    scopes: string[];
    tokens: { name: string; status: string; scopes: string[]; age: string }[];
  }

  interface ExecConfig {
    targetHost: string;
    scope: string;
    securityMode: string;
    askMode: string;
    askFallback: string;
    autoAllowCLIs: boolean;
  }

  interface NodeBinding {
    defaultBinding: string;
    agentBindings: Record<string, string>;
  }

  // Mock Data Store
  let execConfig: ExecConfig = {
    targetHost: "Gateway",
    scope: "Defaults",
    securityMode: "Deny",
    askMode: "On miss",
    askFallback: "Deny",
    autoAllowCLIs: false
  };

  let nodeBinding: NodeBinding = {
    defaultBinding: "Any node",
    agentBindings: {
      "main": "Use default"
    }
  };

  let devices: Device[] = [
    {
      id: "c9e4584e970807cc18fe02080a550e906208429026c58c828c442b67c2cd9874",
      name: "c9e4584e970807cc18fe02080a550e906208429026c58c828c442b67c2cd9874",
      description: "c9e4584e970807cc18fe02080a550e906208429026c58c828c442b67c2cd9874",
      roles: ["operator"],
      scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
      tokens: [
        { name: "operator", status: "active", scopes: ["operator.admin", "operator.approvals", "operator.pairing"], age: "6d ago" }
      ]
    },
    {
      id: "openclaw-tui",
      name: "openclaw-tui",
      description: "fb9b64897f79697e54c05d95beaba5776c3397f591ba2fb1b7614f0bb6701e85",
      roles: ["operator"],
      scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
      tokens: [
        { name: "operator", status: "active", scopes: ["operator.admin", "operator.approvals", "operator.pairing"], age: "6d ago" }
      ]
    }
  ];

  // Endpoints
  app.get("/api/nodes/config", (req, res) => {
    res.json({ execConfig, nodeBinding });
  });

  app.post("/api/nodes/config/exec", (req, res) => {
    execConfig = { ...execConfig, ...req.body };
    res.json({ success: true, execConfig });
  });

  app.post("/api/nodes/config/binding", (req, res) => {
    nodeBinding = { ...nodeBinding, ...req.body };
    res.json({ success: true, nodeBinding });
  });

  app.get("/api/nodes/devices", (req, res) => {
    res.json({ devices });
  });

  app.post("/api/nodes/devices/:id/rotate", (req, res) => {
    const { id } = req.params;
    const device = devices.find(d => d.id === id);
    if (device) {
      // Mock rotation
      device.tokens.forEach(t => t.age = "Just now");
      res.json({ success: true, device });
    } else {
      res.status(404).json({ error: "Device not found" });
    }
  });

  app.post("/api/nodes/devices/:id/revoke", (req, res) => {
    const { id } = req.params;
    const device = devices.find(d => d.id === id);
    if (device) {
      // Mock revocation
      device.tokens = [];
      res.json({ success: true, device });
    } else {
      res.status(404).json({ error: "Device not found" });
    }
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
          // Try both variable names as the platform might inject either
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          
          if (!apiKey) {
            console.error("API Key missing. GEMINI_API_KEY:", !!process.env.GEMINI_API_KEY, "API_KEY:", !!process.env.API_KEY);
            return ctx.reply("Error: Gemini API Key is not configured on the server.");
          }

          const ai = new GoogleGenAI({ apiKey });
          
          // Configure Tools based on enabled skills
          const tools: any[] = [];
          let systemInstruction = "You are a helpful AI assistant.";

          if (skills['google_search'].enabled) {
            tools.push(skills['google_search'].config);
          }
          if (skills['weather_tool'].enabled) {
            tools.push(skills['weather_tool'].config);
          }
          if (skills['concise_mode'].enabled) {
            systemInstruction = skills['concise_mode'].config.systemInstruction;
          }

          const modelConfig: any = {
            model: "gemini-3-flash-preview",
            contents: [
              {
                role: "user",
                parts: [{ text: userMessage }]
              }
            ],
            config: {
              systemInstruction
            }
          };

          if (tools.length > 0) {
            modelConfig.config.tools = tools;
          }

          const response = await ai.models.generateContent(modelConfig);

          // Handle Function Calls
          const functionCalls = response.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
             const call = functionCalls[0];
             if (call.name === "get_weather") {
                const location = (call.args as any).location;
                // Mock Weather Data
                const weatherData = {
                  location: location,
                  temperature: "72°F",
                  condition: "Sunny",
                  humidity: "45%"
                };
                
                // Send function response back to model
                const functionResponse = await ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: [
                    { role: "user", parts: [{ text: userMessage }] },
                    { role: "model", parts: response.candidates![0].content.parts },
                    { 
                      role: "function", 
                      parts: [{
                        functionResponse: {
                          name: "get_weather",
                          response: { name: "get_weather", content: weatherData }
                        }
                      }]
                    }
                  ],
                  config: { systemInstruction }
                });
                
                await ctx.reply(functionResponse.text || "Here is the weather info.");
                return;
             }
          }

          const replyText = response.text || "I'm sorry, I couldn't generate a response.";
          await ctx.reply(replyText);
        } catch (error: any) {
          console.error("Error generating Gemini response for Telegram:", error);
          // Send more detailed error to Telegram for debugging
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
