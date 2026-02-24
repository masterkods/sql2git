import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Save, Database, GitBranch, Key, User, Mail, Clock, Terminal } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState({
    pg_url: '',
    git_url: '',
    git_branch: 'main',
    git_token: '',
    git_name: '',
    git_email: '',
    cron_schedule: '0 * * * *'
  });
  const [status, setStatus] = useState({ running: false });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data) setConfig(data);
  };

  const fetchStatus = async () => {
    const res = await fetch('/api/status');
    const data = await res.json();
    setStatus(data);
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    const data = await res.json();
    setLogs(data);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      setMessage('Configuration saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save configuration.');
    }
    setLoading(false);
  };

  const handleAction = async (action: string) => {
    await fetch(`/api/${action}`, { method: 'POST' });
    fetchStatus();
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">PostgreSQL to Git Exporter</h1>
            <p className="text-zinc-500 mt-1">Periodically export your database to JSON and push to a Git repository.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${status.running ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
              <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></div>
              {status.running ? 'Cron Job Running' : 'Cron Job Stopped'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-zinc-400" />
                Configuration
              </h2>
              
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">PostgreSQL Connection URL</label>
                  <input 
                    type="text" 
                    value={config.pg_url || ''} 
                    onChange={e => setConfig({...config, pg_url: e.target.value})}
                    placeholder="postgresql://user:password@localhost:5432/dbname"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-zinc-400" /> Git Repository URL
                    </label>
                    <input 
                      type="text" 
                      value={config.git_url || ''} 
                      onChange={e => setConfig({...config, git_url: e.target.value})}
                      placeholder="https://github.com/user/repo.git"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-zinc-400" /> Git Branch
                    </label>
                    <input 
                      type="text" 
                      value={config.git_branch || ''} 
                      onChange={e => setConfig({...config, git_branch: e.target.value})}
                      placeholder="main"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                    <Key className="w-4 h-4 text-zinc-400" /> Git Personal Access Token
                  </label>
                  <input 
                    type="password" 
                    value={config.git_token || ''} 
                    onChange={e => setConfig({...config, git_token: e.target.value})}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-400" /> Git Author Name
                    </label>
                    <input 
                      type="text" 
                      value={config.git_name || ''} 
                      onChange={e => setConfig({...config, git_name: e.target.value})}
                      placeholder="DB Exporter"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" /> Git Author Email
                    </label>
                    <input 
                      type="email" 
                      value={config.git_email || ''} 
                      onChange={e => setConfig({...config, git_email: e.target.value})}
                      placeholder="exporter@example.com"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" /> Cron Schedule
                  </label>
                  <input 
                    type="text" 
                    value={config.cron_schedule || ''} 
                    onChange={e => setConfig({...config, cron_schedule: e.target.value})}
                    placeholder="0 * * * *"
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Default is every hour (0 * * * *).</p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Configuration'}
                  </button>
                  {message && <span className="text-sm text-emerald-600 font-medium">{message}</span>}
                </div>
              </form>
            </div>
          </div>

          {/* Actions & Logs */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
              <h2 className="text-xl font-medium mb-6">Actions</h2>
              <div className="space-y-3">
                {!status.running ? (
                  <button 
                    onClick={() => handleAction('start')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-medium"
                  >
                    <Play className="w-4 h-4" /> Start Cron Job
                  </button>
                ) : (
                  <button 
                    onClick={() => handleAction('stop')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-medium"
                  >
                    <Square className="w-4 h-4" /> Stop Cron Job
                  </button>
                )}
                
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-zinc-400 uppercase tracking-wider">or</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleAction('trigger')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" /> Trigger Export Now
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 h-[400px] flex flex-col">
              <h2 className="text-lg font-medium mb-4 text-zinc-100 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-zinc-400" />
                Execution Logs
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-zinc-500 italic">No logs available.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <span className="text-zinc-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`shrink-0 ${log.level === 'ERROR' ? 'text-rose-400' : 'text-emerald-400'}`}>[{log.level}]</span>
                      <span className="text-zinc-300 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
