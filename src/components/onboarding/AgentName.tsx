import { motion } from "motion/react";
import { useState, FormEvent } from "react";
import { ArrowRight, User } from "lucide-react";

interface StepProps {
  onNext: (value: string) => void;
}

export function AgentName({ onNext }: StepProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onNext(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    >
      <div className="bg-[#0f172a]/90 border border-blue-900/30 p-8 rounded-2xl max-w-md w-full shadow-2xl shadow-black/50 ring-1 ring-blue-500/10 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-950/50 rounded-xl border border-blue-800/50">
            <User className="w-6 h-6 text-blue-100" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Name your Agent</h2>
            <p className="text-slate-400 text-sm">Give your new assistant a unique identity.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 transition duration-500 ${isFocused ? 'opacity-100' : 'group-hover:opacity-50'}`} />
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="e.g. Jarvis, Friday..."
              className="relative w-full bg-[#020617] border border-blue-900/30 rounded-xl px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-lg"
            />
          </div>

          <motion.button
            type="submit"
            disabled={!value.trim()}
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
