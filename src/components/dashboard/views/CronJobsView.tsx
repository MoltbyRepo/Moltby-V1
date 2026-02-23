import { RefreshCw, AlertCircle, Check, Play, Pause, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect, FormEvent } from "react";

interface CronJob {
  id: string;
  name: string;
  description?: string;
  agentId?: string;
  schedule: string;
  chatId: string;
  message: string;
  enabled: boolean;
  wakeMode?: string;
  payloadType?: string;
  lastRun?: string;
  runHistory?: string[];
}

interface Session {
  chatId: number;
  username?: string;
  firstName?: string;
  type: string;
}

export function CronJobsView() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("default");
  const [enabled, setEnabled] = useState(true);
  
  // Schedule Builder State
  const [scheduleType, setScheduleType] = useState("Every");
  const [everyValue, setEveryValue] = useState("30");
  const [everyUnit, setEveryUnit] = useState("Minutes");
  
  const [targetSession, setTargetSession] = useState("");
  const [wakeMode, setWakeMode] = useState("Next heartbeat");
  const [payloadType, setPayloadType] = useState("System event");
  const [systemText, setSystemText] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, sessionsRes] = await Promise.all([
        fetch("/api/cron"),
        fetch("/api/bot/sessions")
      ]);
      
      const jobsData = await jobsRes.json();
      const sessionsData = await sessionsRes.json();
      
      setJobs(jobsData.jobs || []);
      setSessions(sessionsData.sessions || []);
      
      // Set default session if available and not set
      if (sessionsData.sessions?.length > 0 && !targetSession) {
        setTargetSession(sessionsData.sessions[0].chatId.toString());
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const generateCronExpression = () => {
    if (scheduleType === "Every") {
      const val = parseInt(everyValue) || 1;
      switch (everyUnit) {
        case "Minutes": return `*/${val} * * * *`;
        case "Hours": return `0 */${val} * * *`;
        case "Days": return `0 0 */${val} * *`;
        default: return `*/${val} * * * *`;
      }
    }
    return "* * * * *"; // Fallback
  };

  const handleCreateJob = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const schedule = generateCronExpression();

    try {
      const response = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          agentId,
          enabled,
          schedule,
          chatId: targetSession,
          wakeMode,
          payloadType,
          message: systemText
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setJobs([...jobs, data.job]);
        // Reset form partially
        setName("");
        setDescription("");
        setSystemText("");
      } else {
        setError(data.error || "Failed to create job");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      await fetch(`/api/cron/${id}`, { method: "DELETE" });
      setJobs(jobs.filter(job => job.id !== id));
      if (selectedJobId === id) setSelectedJobId(null);
    } catch (err) {
      console.error("Failed to delete job:", err);
    }
  };

  const handleToggleJob = async (id: string) => {
    try {
      const response = await fetch(`/api/cron/${id}/toggle`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setJobs(jobs.map(job => job.id === id ? { ...job, enabled: data.job.enabled } : job));
      }
    } catch (err) {
      console.error("Failed to toggle job:", err);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduler Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 h-full">
            <h3 className="text-lg font-semibold text-white mb-1">Scheduler</h3>
            <p className="text-slate-400 text-sm mb-6">Gateway-owned cron scheduler status.</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">ENABLED</div>
                <div className="text-xl font-semibold text-white">Yes</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">JOBS</div>
                <div className="text-xl font-semibold text-white">{jobs.length}</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">NEXT WAKE</div>
                <div className="text-xl font-semibold text-white">n/a</div>
              </div>
            </div>

            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Right Column: New Job Form */}
        <div className="lg:col-span-2">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-1">New Job</h3>
            <p className="text-slate-400 text-sm mb-6">Create a scheduled wakeup or agent run.</p>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Agent ID</label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={e => setAgentId(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enabled}
                      onChange={e => setEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-[#020617] text-blue-600 focus:ring-offset-0 focus:ring-0"
                    />
                    <span className="text-sm text-slate-300">Enabled</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Schedule</label>
                <select 
                  value={scheduleType}
                  onChange={e => setScheduleType(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option>Every</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Every</label>
                  <input
                    type="number"
                    min="1"
                    value={everyValue}
                    onChange={e => setEveryValue(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
                  <select 
                    value={everyUnit}
                    onChange={e => setEveryUnit(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>Minutes</option>
                    <option>Hours</option>
                    <option>Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Session (Target Chat)</label>
                  <select 
                    value={targetSession}
                    onChange={e => setTargetSession(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {sessions.length === 0 && <option value="">No active sessions</option>}
                    {sessions.map(s => (
                      <option key={s.chatId} value={s.chatId}>
                        {s.firstName || s.username || s.chatId} ({s.chatId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Wake mode</label>
                  <select 
                    value={wakeMode}
                    onChange={e => setWakeMode(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option>Next heartbeat</option>
                    <option>Immediate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payload</label>
                <select 
                  value={payloadType}
                  onChange={e => setPayloadType(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option>System event</option>
                  <option>Custom payload</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">System text (Message)</label>
                <textarea
                  required
                  rows={4}
                  value={systemText}
                  onChange={e => setSystemText(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add job"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Jobs</h3>
        <p className="text-slate-400 text-sm mb-6">All scheduled jobs stored in the gateway.</p>

        {jobs.length === 0 ? (
          <div className="text-slate-500 text-sm">No jobs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Schedule</th>
                  <th className="pb-3 font-medium">Target</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {jobs.map(job => (
                  <tr 
                    key={job.id} 
                    className={`group hover:bg-slate-900/50 transition-colors cursor-pointer ${selectedJobId === job.id ? 'bg-slate-900/80' : ''}`}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <td className="py-3 text-white font-medium">{job.name}</td>
                    <td className="py-3 text-slate-400 font-mono">{job.schedule}</td>
                    <td className="py-3 text-slate-400">{job.chatId}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${job.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {job.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleJob(job.id); }}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                          className="p-1.5 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Run History */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Run history</h3>
        <p className="text-slate-400 text-sm mb-6">Latest runs for {selectedJob ? selectedJob.name : '(select a job)'}.</p>

        {!selectedJob ? (
          <div className="text-slate-500 text-sm">Select a job to inspect run history.</div>
        ) : (
          <div className="space-y-2">
            {!selectedJob.runHistory || selectedJob.runHistory.length === 0 ? (
              <div className="text-slate-500 text-sm">No run history available for this job.</div>
            ) : (
              selectedJob.runHistory.map((runTime, i) => (
                <div key={i} className="flex items-center gap-3 text-sm p-2 hover:bg-slate-900/50 rounded border border-transparent hover:border-slate-800 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white font-mono">{new Date(runTime).toLocaleString()}</span>
                  <span className="text-slate-500 ml-auto">Success</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
