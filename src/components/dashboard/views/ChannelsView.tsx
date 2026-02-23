import { ToggleRight, ToggleLeft, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, Bot } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface BotStatus {
  isRunning: boolean;
  username?: string;
  lastStart?: Date;
}

export function ChannelsView() {
  const [botStatus, setBotStatus] = useState<BotStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<string[]>(['@hyperjenny', '@Pembantutingkatdewa_bot']);
  const [newAllowedUser, setNewAllowedUser] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    checkBotStatus();
  }, []);

  const checkBotStatus = async () => {
    setIsLoading(true);
    try {
      // In a real app, we'd have a status endpoint. 
      // For now, we'll check localStorage and assume if token exists, it's "configured"
      // and if we successfully started it in App.tsx, it's "running".
      
      // We can also try to validate the token again to get the username
      const walletAddress = Object.keys(localStorage).find(k => k.startsWith('moltby_user_'))?.replace('moltby_user_', '');
      if (walletAddress) {
        const userData = JSON.parse(localStorage.getItem(`moltby_user_${walletAddress}`) || '{}');
        if (userData.token) {
           const response = await fetch("/api/bot/validate-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: userData.token }),
          });
          const data = await response.json();
          
          if (data.valid) {
             setBotStatus({
               isRunning: true,
               username: data.username,
               lastStart: new Date() // In a real app, get this from server
             });
          } else {
             setBotStatus({ isRunning: false });
             setError("Bot token is invalid or expired.");
          }
        }
      }
    } catch (err) {
      console.error("Failed to check bot status", err);
      setError("Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartBot = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const walletAddress = Object.keys(localStorage).find(k => k.startsWith('moltby_user_'))?.replace('moltby_user_', '');
      if (walletAddress) {
        const userData = JSON.parse(localStorage.getItem(`moltby_user_${walletAddress}`) || '{}');
        if (userData.token) {
           await fetch("/api/bot/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: userData.token, chatId: userData.chatId }),
          });
          await checkBotStatus();
        }
      }
    } catch (err) {
      setError("Failed to restart bot.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    if (newAllowedUser.trim()) {
      setAllowedUsers([...allowedUsers, newAllowedUser.trim()]);
      setNewAllowedUser("");
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = (index: number) => {
    setAllowedUsers(allowedUsers.filter((_, i) => i !== index));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-blue-950/20 border border-blue-900/20 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-blue-900/20 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              Telegram
            </h3>
            <p className="text-slate-400 text-sm">Bot status and channel configuration.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRestartBot}
            disabled={isLoading}
            className="p-2 bg-blue-900/30 hover:bg-blue-800/50 rounded-lg text-slate-300 border border-blue-800/30 transition-colors disabled:opacity-50"
            title="Restart Bot"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
        
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-slate-400">Configured</div>
            <div className="text-right text-white font-mono">{botStatus.username ? `@${botStatus.username}` : 'No'}</div>
            
            <div className="text-slate-400">Status</div>
            <div className={`text-right font-bold ${botStatus.isRunning ? 'text-emerald-400' : 'text-red-400'}`}>
              {botStatus.isRunning ? 'Running' : 'Stopped'}
            </div>
            
            <div className="text-slate-400">Mode</div>
            <div className="text-right text-white">polling</div>
            
            <div className="text-slate-400">Last start</div>
            <div className="text-right text-white">
              {botStatus.lastStart ? botStatus.lastStart.toLocaleTimeString() : '-'}
            </div>
          </div>

          <div className={`bg-[#020617]/50 border ${botStatus.isRunning ? 'border-emerald-500/30' : 'border-red-500/30'} rounded-lg p-3 text-xs font-mono text-slate-300 flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${botStatus.isRunning ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            {botStatus.isRunning ? 'Probe ok - Bot is responsive' : 'Probe failed - Bot is not running'}
          </div>

          {/* Actions Section */}
          <div className="bg-[#020617]/30 border border-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider">Actions</h4>
            <div className="space-y-4">
              {['Delete Message', 'Reactions', 'Send Message', 'Sticker'].map((action) => (
                <motion.div 
                  key={action} 
                  className="flex items-center justify-between group cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{action}</span>
                  <ToggleRight className="w-6 h-6 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Allow From Section */}
          <div className="bg-[#020617]/30 border border-blue-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Allow From</h4>
              <div className="flex gap-2">
                <span className="text-xs bg-blue-900/30 px-2 py-1 rounded text-slate-400 border border-blue-800/30">{allowedUsers.length} items</span>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddingUser(true)}
                  className="text-xs bg-blue-900/30 hover:bg-blue-800/50 px-2 py-1 rounded text-white flex items-center gap-1 border border-blue-800/30 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </motion.button>
              </div>
            </div>
            
            {isAddingUser && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 flex gap-2"
              >
                <input 
                  autoFocus
                  type="text" 
                  value={newAllowedUser}
                  onChange={(e) => setNewAllowedUser(e.target.value)}
                  placeholder="@username"
                  className="flex-1 bg-[#020617] border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                />
                <button onClick={handleAddUser} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-medium">Save</button>
                <button onClick={() => setIsAddingUser(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-medium">Cancel</button>
              </motion.div>
            )}
            
            <div className="space-y-3">
              {allowedUsers.map((user, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative"
                >
                  <div className="text-[10px] text-slate-500 mb-1 font-mono">#{i + 1}</div>
                  <div className="bg-[#020617]/80 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-slate-300 flex justify-between items-center group-hover:border-blue-700/50 transition-colors">
                    {user}
                    <Trash2 
                      className="w-4 h-4 text-slate-600 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-all" 
                      onClick={() => handleRemoveUser(i)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
