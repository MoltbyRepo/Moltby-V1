import { Shield, Server, Smartphone, RefreshCw, Save, AlertCircle, Lock, Key, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface Device {
  id: string;
  name: string;
  description: string;
  roles: string[];
  scopes: string[];
  tokens: { name: string; status: string; scopes: string[]; age: string }[];
}

interface ExecConfig {
  targetHost: string;
  scope: string;
  securityMode: string;
  askMode: string;
  askFallback: string;
  autoAllowCLIs: boolean;
}

interface NodeBinding {
  defaultBinding: string;
  agentBindings: Record<string, string>;
}

export function NodesView() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [execConfig, setExecConfig] = useState<ExecConfig | null>(null);
  const [nodeBinding, setNodeBinding] = useState<NodeBinding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingExec, setIsSavingExec] = useState(false);
  const [isSavingBinding, setIsSavingBinding] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, devicesRes] = await Promise.all([
        fetch("/api/nodes/config"),
        fetch("/api/nodes/devices")
      ]);
      
      const configData = await configRes.json();
      const devicesData = await devicesRes.json();
      
      setExecConfig(configData.execConfig);
      setNodeBinding(configData.nodeBinding);
      setDevices(devicesData.devices || []);
    } catch (err) {
      console.error("Failed to fetch node data:", err);
      setError("Failed to load node configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveExec = async () => {
    if (!execConfig) return;
    setIsSavingExec(true);
    try {
      await fetch("/api/nodes/config/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(execConfig),
      });
    } catch (err) {
      console.error("Failed to save exec config:", err);
    } finally {
      setIsSavingExec(false);
    }
  };

  const handleSaveBinding = async () => {
    if (!nodeBinding) return;
    setIsSavingBinding(true);
    try {
      await fetch("/api/nodes/config/binding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nodeBinding),
      });
    } catch (err) {
      console.error("Failed to save binding config:", err);
    } finally {
      setIsSavingBinding(false);
    }
  };

  const handleRotateToken = async (id: string) => {
    try {
      await fetch(`/api/nodes/devices/${id}/rotate`, { method: "POST" });
      fetchData(); // Refresh to show new token age
    } catch (err) {
      console.error("Failed to rotate token:", err);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke tokens for this device?")) return;
    try {
      await fetch(`/api/nodes/devices/${id}/revoke`, { method: "POST" });
      fetchData();
    } catch (err) {
      console.error("Failed to revoke token:", err);
    }
  };

  if (!execConfig || !nodeBinding) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-[1200px] mx-auto pb-10"
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Exec Approvals Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Exec approvals</h3>
            <p className="text-slate-400 text-sm">Allowlist and approval policy for exec <code>host=gateway/node</code>.</p>
          </div>
          <button 
            onClick={handleSaveExec}
            disabled={isSavingExec}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
          >
            {isSavingExec ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Target Host */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Target</label>
              <p className="text-xs text-slate-400">Gateway edits local approvals; node edits the selected node.</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Host</div>
              <select 
                value={execConfig.targetHost}
                onChange={e => setExecConfig({...execConfig, targetHost: e.target.value})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>Gateway</option>
              </select>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-4 border-b border-slate-800/50 pb-6">
            <span className="text-sm text-slate-400">Scope</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setExecConfig({...execConfig, scope: "Defaults"})}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${execConfig.scope === "Defaults" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
              >
                Defaults
              </button>
              <button 
                onClick={() => setExecConfig({...execConfig, scope: "main"})}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${execConfig.scope === "main" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
              >
                main
              </button>
            </div>
          </div>

          {/* Security Mode */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Security</label>
              <p className="text-xs text-slate-400">Default security mode.</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Mode</div>
              <select 
                value={execConfig.securityMode}
                onChange={e => setExecConfig({...execConfig, securityMode: e.target.value})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>Deny</option>
                <option>Allow</option>
              </select>
            </div>
          </div>

          {/* Ask Mode */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Ask</label>
              <p className="text-xs text-slate-400">Default prompt policy.</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Mode</div>
              <select 
                value={execConfig.askMode}
                onChange={e => setExecConfig({...execConfig, askMode: e.target.value})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>On miss</option>
                <option>Always</option>
                <option>Never</option>
              </select>
            </div>
          </div>

          {/* Ask Fallback */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Ask fallback</label>
              <p className="text-xs text-slate-400">Applied when the UI prompt is unavailable.</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Fallback</div>
              <select 
                value={execConfig.askFallback}
                onChange={e => setExecConfig({...execConfig, askFallback: e.target.value})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>Deny</option>
                <option>Allow</option>
              </select>
            </div>
          </div>

          {/* Auto-allow CLIs */}
          <div className="flex items-center justify-between pt-2">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Auto-allow skill CLIs</label>
              <p className="text-xs text-slate-400">Allow skill executables listed by the Gateway.</p>
            </div>
            <div className="w-64 flex justify-end items-center gap-4">
              <span className="text-xs text-slate-500">Enabled</span>
              <input 
                type="checkbox" 
                checked={execConfig.autoAllowCLIs}
                onChange={e => setExecConfig({...execConfig, autoAllowCLIs: e.target.checked})}
                className="w-4 h-4 rounded border-slate-700 bg-[#020617] text-blue-600 focus:ring-offset-0 focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exec Node Binding Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Exec node binding</h3>
            <p className="text-slate-400 text-sm">Pin agents to a specific node when using exec <code>host=node</code>.</p>
          </div>
          <button 
            onClick={handleSaveBinding}
            disabled={isSavingBinding}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
          >
            {isSavingBinding ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Default Binding */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">Default binding</label>
              <p className="text-xs text-slate-400">Used when agents do not override a node binding.</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Node</div>
              <select 
                value={nodeBinding.defaultBinding}
                onChange={e => setNodeBinding({...nodeBinding, defaultBinding: e.target.value})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>Any node</option>
                <option>Localhost</option>
              </select>
              <p className="text-[10px] text-slate-500 text-right mt-1">No nodes with system.run available.</p>
            </div>
          </div>

          {/* Main Agent Binding */}
          <div className="flex items-center justify-between">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white mb-1">main</label>
              <p className="text-xs text-slate-400">default agent • uses default (any)</p>
            </div>
            <div className="w-64">
              <div className="text-xs text-slate-500 mb-1 text-right">Binding</div>
              <select 
                value={nodeBinding.agentBindings["main"]}
                onChange={e => setNodeBinding({...nodeBinding, agentBindings: {...nodeBinding.agentBindings, "main": e.target.value}})}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option>Use default</option>
                <option>Any node</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Devices</h3>
            <p className="text-slate-400 text-sm">Pairing requests + role tokens.</p>
          </div>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-sm text-slate-500">Paired</div>
          
          {devices.map(device => (
            <div key={device.id} className="bg-[#020617] border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-mono text-white font-medium mb-1">{device.name}</h4>
                  <p className="text-xs text-slate-500 font-mono break-all">{device.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-1">
                  roles: <span className="text-slate-300">{device.roles.join(", ")}</span> • scopes: <span className="text-slate-300">{device.scopes.join(", ")}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-slate-500">Tokens</div>
                {device.tokens.map((token, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-mono">
                      {token.name} • {token.status} • scopes: {token.scopes.join(", ")} • {token.age}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRotateToken(device.id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors border border-slate-700"
                      >
                        Rotate
                      </button>
                      <button 
                        onClick={() => handleRevokeToken(device.id)}
                        className="px-3 py-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 rounded text-xs font-medium transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nodes Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Nodes</h3>
            <p className="text-slate-400 text-sm">Paired devices and live links.</p>
          </div>
          <button 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            Refresh
          </button>
        </div>
        <div className="p-6 text-slate-500 text-sm">
          No nodes found.
        </div>
      </div>
    </motion.div>
  );
}
