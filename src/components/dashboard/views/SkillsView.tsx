import { Zap, ToggleLeft, ToggleRight, Search, Cloud, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'tool' | 'system';
  enabled: boolean;
}

export function SkillsView() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/skills");
      const data = await response.json();
      setSkills(data.skills || []);
    } catch (err) {
      console.error("Failed to fetch skills:", err);
      setError("Failed to load skills.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleToggleSkill = async (id: string) => {
    try {
      const response = await fetch(`/api/skills/${id}/toggle`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setSkills(skills.map(skill => skill.id === id ? { ...skill, enabled: data.skill.enabled } : skill));
      }
    } catch (err) {
      console.error("Failed to toggle skill:", err);
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'google_search': return <Search className="w-5 h-5 text-blue-400" />;
      case 'weather_tool': return <Cloud className="w-5 h-5 text-sky-400" />;
      case 'concise_mode': return <MessageSquare className="w-5 h-5 text-purple-400" />;
      default: return <Zap className="w-5 h-5 text-slate-400" />;
    }
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Agent Skills</h2>
          <p className="text-slate-400 text-sm mt-1">Configure capabilities and tools available to the AI agent.</p>
        </div>
        <button 
          onClick={fetchSkills}
          disabled={isLoading}
          className="p-2 bg-blue-950/30 border border-blue-900/30 hover:bg-blue-900/50 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className={`bg-[#020617]/80 border ${skill.enabled ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-800'} rounded-xl p-6 transition-all relative overflow-hidden group`}
          >
            {skill.enabled && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-3xl -mr-4 -mt-4" />
            )}

            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border ${skill.enabled ? 'bg-blue-900/20 border-blue-800/20' : 'bg-slate-900/50 border-slate-800'}`}>
                {getIcon(skill.id)}
              </div>
              <button
                onClick={() => handleToggleSkill(skill.id)}
                className={`transition-colors ${skill.enabled ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
              >
                {skill.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            <h3 className={`font-semibold mb-2 ${skill.enabled ? 'text-white' : 'text-slate-400'}`}>
              {skill.name}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4 min-h-[40px]">
              {skill.description}
            </p>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider font-medium ${
                skill.type === 'tool' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-500'
              }`}>
                {skill.type}
              </span>
              {skill.enabled && (
                <span className="text-[10px] px-2 py-1 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 uppercase tracking-wider font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
