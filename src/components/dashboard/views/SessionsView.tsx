import { MessageSquare, RefreshCw, AlertCircle, User, Clock, Hash } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface Session {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  lastMessage: string;
  lastActive: string; // Date string from JSON
  messageCount: number;
  type: string;
}

export function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bot/sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to load sessions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Active Sessions</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time chat interactions with your bot.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={fetchSessions}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-950/30 border border-blue-900/30 hover:bg-blue-900/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-blue-950/20 border border-blue-900/20 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-blue-900/20">
          <h3 className="text-lg font-semibold text-white">Recent Conversations</h3>
        </div>

        <div className="divide-y divide-blue-900/20">
          {sessions.length === 0 && !isLoading && (
            <div className="p-8 text-center text-slate-500">
              No active sessions found. Start chatting with your bot on Telegram!
            </div>
          )}

          {sessions.map((session) => (
            <motion.div 
              key={session.chatId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 hover:bg-blue-900/10 transition-colors flex items-start gap-4"
            >
              <div className="p-3 bg-blue-900/20 rounded-full border border-blue-800/20 shrink-0">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-white truncate pr-2">
                    {session.firstName} {session.lastName} 
                    {session.username && <span className="text-slate-500 text-sm ml-2 font-normal">@{session.username}</span>}
                  </h4>
                  <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(session.lastActive)}
                  </span>
                </div>
                
                <p className="text-slate-300 text-sm truncate mb-2">
                  {session.lastMessage}
                </p>
                
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950/40 border border-blue-900/30 rounded text-[10px] text-slate-400 font-mono">
                    <Hash className="w-3 h-3" /> {session.chatId}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950/40 border border-blue-900/30 rounded text-[10px] text-slate-400 uppercase">
                    <MessageSquare className="w-3 h-3" /> {session.messageCount} msgs
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-950/40 border border-blue-900/30 rounded text-[10px] text-slate-400 uppercase">
                    {session.type}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
