import { Monitor, Sun, Moon, Bell } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-blue-900/20 bg-[#020617]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or Title could go here */}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-950/30 rounded-full border border-blue-900/30">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-medium text-blue-200">Health OK</span>
        </div>

        <div className="h-4 w-px bg-blue-900/30" />

        <div className="flex items-center gap-1 bg-blue-950/30 rounded-lg p-1 border border-blue-900/30">
          <button className="p-1.5 rounded hover:bg-blue-900/30 text-slate-400 hover:text-white transition-colors">
            <Monitor className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-blue-900/30 text-slate-400 hover:text-white transition-colors">
            <Sun className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded bg-blue-900/50 text-white shadow-sm border border-blue-800/50">
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
