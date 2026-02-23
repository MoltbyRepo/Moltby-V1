import { motion } from "motion/react";
import { useState, FormEvent } from "react";
import { ArrowRight, Bot, Key, AlertCircle, Loader2 } from "lucide-react";

interface StepProps {
  onNext: (value: string) => void;
}

export function BotToken({ onNext }: StepProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/bot/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        onNext(value.trim());
      } else {
        setError(data.error || "Invalid bot token. Please check and try again.");
      }
    } catch (err) {
      setError("Failed to validate token. Please check your connection.");
    } finally {
      setIsValidating(false);
    }
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
            <Bot className="w-6 h-6 text-blue-100" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Bot Token</h2>
            <p className="text-slate-400 text-sm">Enter the API token from @BotFather.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 transition duration-500 ${isFocused ? 'opacity-100' : 'group-hover:opacity-50'}`} />
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className={`w-full bg-[#020617] border ${error ? 'border-red-500/50' : 'border-blue-900/30'} rounded-xl pl-10 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono text-sm`}
              />
            </div>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2 text-red-400 text-xs"
              >
                <AlertCircle className="w-3 h-3" />
                {error}
              </motion.div>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={!value.trim() || isValidating}
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
