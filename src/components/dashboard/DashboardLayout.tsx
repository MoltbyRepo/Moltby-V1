import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useState } from "react";
import { ChatView } from "./views/ChatView";
import { OverviewView } from "./views/OverviewView";
import { ChannelsView } from "./views/ChannelsView";
import { InstancesView } from "./views/InstancesView";
import { SkillsView } from "./views/SkillsView";
import { NodesView } from "./views/NodesView";
import { SessionsView } from "./views/SessionsView";
import { CronJobsView } from "./views/CronJobsView";

export function DashboardLayout() {
  const [activeView, setActiveView] = useState("overview");

  const renderView = () => {
    switch (activeView) {
      case "chat": return <ChatView />;
      case "overview": return <OverviewView />;
      case "channels": return <ChannelsView />;
      case "instances": return <InstancesView />;
      case "sessions": return <SessionsView />;
      case "cron": return <CronJobsView />;
      case "skills": return <SkillsView />;
      case "nodes": return <NodesView />;
      default: return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-zinc-500">
          View "{activeView}" not implemented yet.
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-zinc-50 overflow-hidden font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#020617] to-[#0f172a]">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
