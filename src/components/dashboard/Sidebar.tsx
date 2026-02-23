import { 
  MessageSquare, 
  LayoutDashboard, 
  Share2, 
  Radio, 
  FileText, 
  Clock, 
  Zap, 
  Network, 
  Settings, 
  Bug, 
  ScrollText, 
  BookOpen,
  Menu,
  X,
  Twitter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "motion/react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuGroups = [
    {
      label: "Chat",
      items: [
        { id: "chat", icon: MessageSquare, label: "Chat" },
      ]
    },
    {
      label: "Control",
      items: [
        { id: "overview", icon: LayoutDashboard, label: "Overview" },
        { id: "channels", icon: Share2, label: "Channels" },
        { id: "instances", icon: Radio, label: "Instances" },
        { id: "sessions", icon: FileText, label: "Sessions" },
        { id: "cron", icon: Clock, label: "Cron Jobs" },
      ]
    },
    {
      label: "Agent",
      items: [
        { id: "skills", icon: Zap, label: "Skills" },
        { id: "nodes", icon: Network, label: "Nodes" },
      ]
    },
    {
      label: "Settings",
      items: [
        { id: "config", icon: Settings, label: "Config" },
        { id: "debug", icon: Bug, label: "Debug" },
        { id: "logs", icon: ScrollText, label: "Logs" },
      ]
    },
    {
      label: "Resources",
      items: [
        { id: "docs", icon: BookOpen, label: "Docs" },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Trigger - Only visible when sidebar is closed */}
      {!isMobileOpen && (
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-950/30 backdrop-blur-md rounded-md border border-blue-900/30 text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[#020617]/95 backdrop-blur-xl border-r border-blue-900/20 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static flex flex-col",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-blue-900/20">
          <div className="flex items-center">
            <img src="/logo.png" alt="Moltby" className="w-8 h-8 rounded-lg mr-3 shadow-lg shadow-blue-500/20 object-cover" />
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">MOLTBY</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Gateway Dashboard</p>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-thin scrollbar-thumb-blue-900/20 scrollbar-track-transparent">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileOpen(false);
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                      activeView === item.id 
                        ? "text-white" 
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {activeView === item.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-blue-600/10 border border-blue-500/20 rounded-lg"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    {hoveredItem === item.id && activeView !== item.id && (
                      <motion.div
                        layoutId="hoverTab"
                        className="absolute inset-0 bg-blue-900/10 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4 transition-colors", activeView === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t border-blue-900/20">
          <a
            href="https://x.com/moltbyofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-blue-900/10 transition-colors"
          >
            <Twitter className="w-4 h-4" />
            @moltbyofficial
          </a>
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
