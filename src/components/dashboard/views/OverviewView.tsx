import { Activity, Clock, Server, Layers, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

export function OverviewView() {
  const [uptime, setUptime] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:18789");
  const [gatewayToken, setGatewayToken] = useState("888e621f0f55c0b247085a8d2c3168");
  const [password, setPassword] = useState("");
  const [sessionKey, setSessionKey] = useState("agent:main:main");

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(u => u + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  const timeSinceRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000);
    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Force update for "time ago" display
  const [_, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Access */}
        <motion.div 
          whileHover={{ borderColor: "rgba(59, 130, 246, 0.2)" }}
          className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm transition-colors"
        >
          <h3 className="text-lg font-semibold mb-1 text-white">Gateway Access</h3>
          <p className="text-slate-400 text-sm mb-6">Where the dashboard connects and how it authenticates.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider group-hover:text-slate-400 transition-colors">WebSocket URL</label>
              <input 
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full bg-[#020617]/50 border border-blue-900/30 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 truncate group-hover:border-blue-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider group-hover:text-slate-400 transition-colors">Gateway Token</label>
              <input 
                type="text"
                value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
                className="w-full bg-[#020617]/50 border border-blue-900/30 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 truncate group-hover:border-blue-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider group-hover:text-slate-400 transition-colors">Password (not stored)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="system or shared password"
                className="w-full bg-[#020617]/50 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700 placeholder:text-slate-700 transition-all"
              />
            </div>
            <div className="group">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider group-hover:text-slate-400 transition-colors">Default Session Key</label>
              <input 
                type="text" 
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                className="w-full bg-[#020617]/50 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : "Connect"}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={handleRefresh}
              className="px-4 py-2 bg-[#020617] border border-blue-900/30 hover:bg-blue-900/20 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </motion.button>
            <span className="text-xs text-slate-500 self-center ml-2">Click Connect to apply connection changes.</span>
          </div>
        </motion.div>

        {/* Snapshot */}
        <motion.div 
          whileHover={{ borderColor: "rgba(59, 130, 246, 0.2)" }}
          className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 flex flex-col backdrop-blur-sm transition-colors"
        >
          <h3 className="text-lg font-semibold mb-1 text-white">Snapshot</h3>
          <p className="text-slate-400 text-sm mb-6">Latest gateway handshake information.</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#020617]/50 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition-colors">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">STATUS</div>
              <div className={`text-xl font-bold ${isConnected ? 'text-emerald-500' : 'text-red-500'} flex items-center gap-2`}>
                {isConnected ? 'Connected' : 'Disconnected'}
                {isConnected && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>
            <div className="bg-[#020617]/50 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition-colors">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">UPTIME</div>
              <div className="text-xl font-bold text-white">{formatUptime(uptime)}</div>
            </div>
            <div className="bg-[#020617]/50 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition-colors">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TICK INTERVAL</div>
              <div className="text-xl font-bold text-slate-400">1000ms</div>
            </div>
          </div>

          <div className="bg-[#020617]/50 border border-blue-900/30 rounded-lg p-4 mb-4 hover:bg-blue-900/20 transition-colors">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">LAST CHANNELS REFRESH</div>
             <div className="text-2xl font-bold text-white">{timeSinceRefresh()}</div>
          </div>

          <div className="mt-auto bg-[#020617]/30 border border-blue-900/20 rounded-lg p-3 text-xs text-slate-400">
            Use Channels to link WhatsApp, Telegram, Discord, Signal, or iMessage.
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -2 }} className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm hover:border-blue-700/30 transition-all">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">INSTANCES</div>
          <div className="text-4xl font-bold text-white mb-2">2</div>
          <div className="text-sm text-slate-500">Presence beacons in the last 5 minutes.</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm hover:border-blue-700/30 transition-all">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">SESSIONS</div>
          <div className="text-4xl font-bold text-white mb-2">1</div>
          <div className="text-sm text-slate-500">Recent session keys tracked by the gateway.</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm hover:border-blue-700/30 transition-all">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CRON</div>
          <div className="text-4xl font-bold text-white mb-2">Enabled</div>
          <div className="text-sm text-slate-500">Next wake n/a</div>
        </motion.div>
      </div>

      {/* Notes */}
      <motion.div 
        whileHover={{ borderColor: "rgba(59, 130, 246, 0.2)" }}
        className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm transition-colors"
      >
        <h3 className="text-lg font-semibold mb-1 text-white">Notes</h3>
        <p className="text-slate-400 text-sm mb-6">Quick reminders for remote control setups.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group">
            <h4 className="font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">Tailscale serve</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Prefer serve mode to keep the gateway on loopback with tailnet auth.</p>
          </div>
          <div className="group">
            <h4 className="font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">Session hygiene</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Use /new or sessions.patch to reset context.</p>
          </div>
          <div className="group">
            <h4 className="font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">Cron reminders</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Use isolated sessions for recurring runs.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
