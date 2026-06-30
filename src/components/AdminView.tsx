import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, GripVertical, Save, Edit2, Check, X, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { Channel, AppSettings } from '../types';

export default function AdminView() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // App Settings State
  const [settings, setSettings] = useState<AppSettings>({ appName: '', appLogo: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [url, setUrl] = useState('');

  const fetchChannels = () => {
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => setChannels(data))
      .catch(err => console.error("Error fetching channels:", err));
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Error fetching settings:", err));
  };

  useEffect(() => {
    fetchChannels();
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      // Optionally show a success toast here
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    try {
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logo, url })
      });
      setIsAdding(false);
      setName('');
      setLogo('');
      setUrl('');
      fetchChannels();
    } catch (err) {
      console.error("Error adding channel:", err);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Channel>) => {
    try {
      await fetch(`/api/channels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchChannels();
    } catch (err) {
      console.error("Error updating channel:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    try {
      await fetch(`/api/channels/${id}`, { method: 'DELETE' });
      fetchChannels();
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    try {
      await fetch('/api/channels/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction })
      });
      fetchChannels();
    } catch (err) {
      console.error("Error reordering:", err);
    }
  };

  const startEditing = (channel: Channel) => {
    setEditingId(channel.id);
    setName(channel.name);
    setLogo(channel.logo);
    setUrl(channel.url);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await handleUpdate(editingId, { name, logo, url });
    setEditingId(null);
    setName('');
    setLogo('');
    setUrl('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setLogo('');
    setUrl('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Stream<span className="text-indigo-400">Admin</span></h1>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-full font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Channel</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 pb-24">
        
        {/* App Settings Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">App Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">App Name</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full bg-zinc-800 border-none rounded-md px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. StreamBox"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">App Logo URL</label>
              <input
                type="url"
                value={settings.appLogo}
                onChange={(e) => setSettings({ ...settings, appLogo: e.target.value })}
                className="w-full bg-zinc-800 border-none rounded-md px-3 py-2 text-sm text-zinc-400 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {isAdding && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 shadow-lg">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Add New Channel</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">Channel Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 border-none rounded-md px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Sports Network"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">Logo URL</label>
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full bg-zinc-800 border-none rounded-md px-3 py-2 text-sm text-zinc-400 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">Stream URL (m3u8, mpd, ts) *</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-zinc-800 border-none rounded-md px-3 py-2 text-sm text-zinc-400 font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="https://example.com/stream.m3u8"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-xs font-bold hover:bg-zinc-700 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Save Channel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[100px_80px_1fr_100px_150px] gap-6 p-6 bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest font-bold">
            <div className="text-center">Order</div>
            <div className="text-center">Logo</div>
            <div>Channel Info</div>
            <div className="text-center">Status</div>
            <div className="text-right pr-4">Actions</div>
          </div>
          
          <div className="divide-y divide-zinc-800/50">
            {channels.map((channel, index) => (
              <div key={channel.id} className={`p-4 md:p-6 hover:bg-zinc-800/30 transition-all ${channel.isHidden ? 'opacity-60' : ''}`}>
                <div className="flex flex-col md:grid md:grid-cols-[100px_80px_1fr_100px_150px] gap-6 md:items-center">
                  
                  {/* Top row on mobile: Logo + Name + Status */}
                  <div className={`flex items-center gap-3 md:hidden ${editingId === channel.id ? 'opacity-50' : ''}`}>
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="w-full h-full object-cover bg-white" />
                      ) : (
                        <div className="text-[10px] text-zinc-500 font-bold">NO LOGO</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-100 text-base truncate">{channel.name}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${
                        channel.isHidden 
                          ? 'bg-zinc-800 text-zinc-500' 
                          : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {channel.isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Order Controls */}
                  <div className="hidden md:flex flex-row items-center justify-center space-x-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleReorder(channel.id, 'top')}
                          disabled={index === 0}
                          className="p-1.5 bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                          title="Move to Top"
                        >
                          <ChevronsUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleReorder(channel.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleReorder(channel.id, 'down')}
                          disabled={index === channels.length - 1}
                          className="p-1.5 bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleReorder(channel.id, 'bottom')}
                          disabled={index === channels.length - 1}
                          className="p-1.5 bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                          title="Move to Bottom"
                        >
                          <ChevronsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Logo */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700 shadow-sm">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" className="w-full h-full object-cover bg-white" />
                      ) : (
                        <div className="text-[10px] text-zinc-500 font-bold">NO LOGO</div>
                      )}
                    </div>
                  </div>

                  {/* Name and URL (or Edit Form) */}
                  <div className="flex-1 min-w-0">
                    {editingId === channel.id ? (
                      <div className="space-y-3 py-2 mt-2 md:mt-0">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                          placeholder="Channel Name"
                        />
                        <input
                          type="text"
                          value={logo}
                          onChange={(e) => setLogo(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                          placeholder="Logo URL"
                        />
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                          placeholder="Stream URL (m3u8, etc)"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-zinc-100 text-lg mb-1 hidden md:block truncate">{channel.name}</div>
                        <div className="text-[11px] md:text-sm text-zinc-400 font-mono mt-1 md:mt-0 break-all" title={channel.url}>
                          {channel.url}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop Status */}
                  <div className="hidden md:flex items-center justify-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      channel.isHidden 
                        ? 'bg-zinc-800 text-zinc-500' 
                        : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {channel.isHidden ? 'Hidden' : 'Visible'}
                    </span>
                  </div>

                  {/* Actions & Mobile Order Controls */}
                  <div className="flex items-center justify-between md:justify-end mt-2 md:mt-0 pt-2 border-t border-zinc-800/50 md:border-t-0 md:pt-0">
                    
                    {/* Mobile Order Controls */}
                    <div className="flex items-center space-x-1 md:hidden">
                      <button 
                        onClick={() => handleReorder(channel.id, 'top')}
                        disabled={index === 0}
                        className="p-1.5 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
                      >
                        <ChevronsUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleReorder(channel.id, 'up')}
                        disabled={index === 0}
                        className="p-1.5 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleReorder(channel.id, 'down')}
                        disabled={index === channels.length - 1}
                        className="p-1.5 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleReorder(channel.id, 'bottom')}
                        disabled={index === channels.length - 1}
                        className="p-1.5 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
                      >
                        <ChevronsDown className="w-3 h-3" />
                      </button>
                    </div>

                    {editingId === channel.id ? (
                      <div className="flex items-center space-x-2">
                        <button onClick={saveEdit} className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded transition-colors" title="Save">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-2 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 rounded transition-colors" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleUpdate(channel.id, { isHidden: !channel.isHidden })}
                          className="p-2 text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 md:bg-transparent rounded transition-colors"
                          title={channel.isHidden ? "Show Channel" : "Hide Channel"}
                        >
                          {channel.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => startEditing(channel)}
                          className="p-2 text-zinc-500 hover:text-indigo-400 bg-zinc-800/50 md:bg-transparent rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(channel.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 bg-zinc-800/50 md:bg-transparent rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
            {channels.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No channels found. Click "Add New Channel" to create one.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
