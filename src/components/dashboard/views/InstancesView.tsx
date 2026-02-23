import { Laptop, Globe, Bot, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface Instance {
  id: string;
  type: 'bot' | 'client';
  name: string;
  status: 'running' | 'online' | 'offline';
  uptime?: string;
  details: string;
  tags: string[];
  lastSeen: string;
}

export function InstancesView() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bot/status");
      const data = await response.json();

      const newInstances: Instance[] = [];

      // Add Client Instance (Browser)
      newInstances.push({
        id: 'client-browser',
        type: 'client',
        name: 'Dashboard Client',
        status: 'online',
        details: `${navigator.platform} (${navigator.language})`,
        tags: ['browser', 'dashboard', 'client'],
        lastSeen: 'Just now'
      });

      // Add Bot Instance if running
      if (data.status === 'running') {
        const uptimeSeconds = Math.floor(data.uptime || 0);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

        newInstances.push({
          id: `bot-${data.username}`,
          type: 'bot',
          name: `@${data.username}`,
          status: 'running',
          uptime: uptimeString,
          details: `Telegram Bot Instance`,
          tags: ['telegram', 'bot', 'backend'],
          lastSeen: 'Active'
        });
      }

      setInstances(newInstances);
    } catch (err) {
      console.error("Failed to fetch instances:", err);
      setError("Failed to load instance data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchInstances, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Instances</h2>
          <p className="text-slate-400 text-sm mt-1">Presence beacons from connected clients and nodes.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={fetchInstances}
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

      <div className="bg-blue-950/20 border border-blue-900/20 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-1 text-white">Connected Instances</h3>
        <p className="text-slate-400 text-sm mb-6">Presence beacons from the gateway and clients.</p>

        <div className="space-y-4">
          {instances.length === 0 && !isLoading && (
            <div className="text-center py-8 text-slate-500">
              No active instances found.
            </div>
          )}

          {instances.map((instance) => (
            <motion.div 
              key={instance.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01, borderColor: "rgba(59, 130, 246, 0.2)" }}
              className="bg-[#020617]/50 border border-blue-900/30 rounded-xl p-4 transition-all cursor-default"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-800/20">
                    {instance.type === 'bot' ? (
                      <Bot className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Laptop className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <span className="font-medium text-white">{instance.name}</span>
                  {instance.status === 'running' && (
                    <span className="flex h-2 w-2 relative ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">{instance.lastSeen}</div>
              </div>
              <div className="text-xs text-slate-500 mb-4 pl-10">
                {instance.details}
                {instance.uptime && <span className="ml-2 text-emerald-500/80">• Uptime: {instance.uptime}</span>}
              </div>
              
              <div className="flex gap-2 pl-10">
                {instance.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-950/30 border border-blue-900/30 rounded text-[10px] text-slate-400 uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
