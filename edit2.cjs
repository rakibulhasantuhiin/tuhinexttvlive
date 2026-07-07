const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const startTarget = '{/* Unlocked Admin Workspace as requested */}';
const endTarget = '              </motion.div>\n              )}\n              {activeTab === "home" && (';

const sIdx = content.indexOf(startTarget);
const eIdx = content.indexOf(endTarget);

if (sIdx === -1 || eIdx === -1) {
    console.log("Not found", sIdx, eIdx);
    process.exit(1);
}

const newAdminLayout = `
                    <div className="space-y-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-red-500/5 border border-red-500/10 p-8 rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-500/20 rounded-full blur-[100px] pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
                            <Sliders className="text-white" size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-3xl font-black text-white tracking-tight">System Admin</h2>
                              <span className="px-2.5 py-1 text-[9px] bg-red-500 text-white font-black rounded-lg uppercase tracking-widest shadow-md">Root Access</span>
                            </div>
                            <p className="text-white/50 text-xs mt-1.5 leading-relaxed max-w-sm">
                              Manage network streams, categories, and globally distributed platform configurations.
                            </p>
                          </div>
                        </div>
                        
                        <div className="relative z-10 grid grid-cols-2 gap-3 min-w-[200px]">
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-0.5">Network Load</div>
                            <div className="text-lg text-emerald-400 font-black">{channels.length} Nodes</div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-0.5">Category DB</div>
                            <div className="text-lg text-blue-400 font-black">{currentEditableCategories.length} Types</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Editor Controls Column */}
                        <div className="lg:col-span-5 space-y-8">
                          
                          {/* GLOBAL M3U CONFIGURATION */}
                          <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/5">
                            <h4 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                              <Globe size={18} className="text-red-400" />
                              Playlist Source Origin
                            </h4>
                            <p className="text-white/40 text-[11px] mb-5 leading-relaxed">
                              Define the global M3U8 list root URI.
                            </p>

                            <div className="space-y-4">
                              <input
                                type="url"
                                value={playlistInput}
                                onChange={(e) => setPlaylistInput(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-red-500 focus:outline-none font-mono"
                              />
                              
                              {saveStatus && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">{saveStatus}</div>}
                              
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleSaveSettings(playlistInput)}
                                  disabled={isSaving}
                                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 py-3 rounded-xl text-xs font-black transition-all text-white shadow-lg cursor-pointer uppercase tracking-widest"
                                >
                                  {isSaving ? "Syncing..." : "Sync DB"}
                                </button>
                                <button
                                  onClick={() => { setPlaylistInput(PLAYLIST_URL); handleSaveSettings(PLAYLIST_URL); }}
                                  disabled={isSaving}
                                  className="px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold transition-all text-white/60 hover:text-white cursor-pointer uppercase tracking-widest"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* CATEGORY MANAGEMENT */}
                          <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/5 flex flex-col max-h-[800px]">
                            <h4 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                              <LayoutList size={18} className="text-blue-400" />
                              Taxonomy & Categories
                            </h4>

                            <div className="flex gap-2 mb-5">
                              <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                                placeholder="New category..."
                                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:bg-white/5 transition-colors font-mono"
                              />
                              <button
                                onClick={handleAddCategory}
                                disabled={!newCategoryName.trim()}
                                className="px-5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-white shadow-lg cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-2 border-t border-white/5 pt-4">
                              {currentEditableCategories.length === 0 && <p className="text-white/30 text-[10px] text-center font-bold tracking-widest uppercase pb-2">No categories</p>}
                              {currentEditableCategories.map((category, idx) => (
                                <div key={category} className="flex items-center justify-between bg-black/40 hover:bg-white/5 transition-colors border border-white/5 rounded-xl px-4 py-2.5 group">
                                  <span className="text-xs font-black text-white">{category}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleMoveCategory(idx, 'up')} disabled={idx === 0} className="p-1.5 bg-[#111] hover:bg-[#222] disabled:opacity-30 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"><ChevronUp size={12} /></button>
                                    <button onClick={() => handleMoveCategory(idx, 'down')} disabled={idx === currentEditableCategories.length - 1} className="p-1.5 bg-[#111] hover:bg-[#222] disabled:opacity-30 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"><ChevronDown size={12} /></button>
                                    <div className="w-[1px] h-4 bg-white/10 mx-1 self-center" />
                                    <button onClick={() => handleDeleteCategory(category)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-all cursor-pointer"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* ADD MANUAL CHANNEL */}
                          <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/5">
                            <h4 className="text-lg font-black text-white flex items-center gap-2 mb-5">
                              <Plus size={18} className="text-emerald-400" />
                              Add Logical Channel
                            </h4>

                            {adminStatus && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-bold text-center">{adminStatus}</div>}
                            {adminError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-bold text-center">{adminError}</div>}

                            <div className="space-y-4">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block pl-1">Channel Label</label>
                                <input type="text" value={newChanName} onChange={e => setNewChanName(e.target.value)} placeholder="e.g. Sports HD" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none" />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block pl-1">M3U8 Stream Endpoint</label>
                                <input type="text" value={newChanUrl} onChange={e => setNewChanUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block pl-1">Category / Group</label>
                                  <select value={newChanCat} onChange={e => setNewChanCat(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none appearance-none">
                                    <option value="">Ungrouped</option>
                                    {currentEditableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block pl-1">Logo URL (Optional)</label>
                                  <input type="text" value={newChanLogo} onChange={e => setNewChanLogo(e.target.value)} placeholder="https://..." className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none" />
                                </div>
                              </div>
                              <button onClick={handleAddChannel} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 outline-none text-black font-black uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-2">
                                Instantiate Channel
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Channel Management Column */}
                        <div className="lg:col-span-7">
                          <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/5 h-full flex flex-col max-h-[1400px]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                              <div>
                                <h4 className="text-lg font-black text-white">Live Node Catalog</h4>
                                <p className="text-[11px] text-white/40 mt-1">Select channels to remove or modify.</p>
                              </div>
                              <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                  type="text"
                                  placeholder="Direct search..."
                                  value={adminSearchQuery}
                                  onChange={e => setAdminSearchQuery(e.target.value)}
                                  className="w-full bg-[#111] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-white/30 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar border-t border-white/5 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredAdminChannels.length === 0 ? (
                                  <div className="col-span-full py-16 text-center text-white/30 text-xs font-black uppercase tracking-widest">
                                    No node matches your query.
                                  </div>
                                ) : (
                                  filteredAdminChannels.map(channel => (
                                    <div key={channel.id} className="flex items-center justify-between bg-black/40 hover:bg-[#111] border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all group">
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center p-1.5 flex-shrink-0">
                                          <img src={optimizeImage(channel.logo, 50, 50) || "https://logodix.com/logo/2112449.png"} alt="logo" className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = 'https://logodix.com/logo/2112449.png'; }} />
                                        </div>
                                        <div className="min-w-0">
                                          <h5 className="text-xs font-black text-white truncate">{channel.name}</h5>
                                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block truncate mt-0.5">{channel.category}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-1">
                                        {deletingChanId === channel.id ? (
                                          <div className="flex bg-red-500/10 border border-red-500/20 rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                                            <button onClick={() => { handleDeleteChannel(channel.id); setDeletingChanId(null); }} className="px-3 py-1.5 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors cursor-pointer">Confirm</button>
                                            <button onClick={() => setDeletingChanId(null)} className="px-3 py-1.5 hover:bg-white/10 text-white/70 text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer">Cancel</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setDeletingChanId(channel.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Purge Node">
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                </div>
              </motion.div>
              )}
              {activeTab === "home" && (
`;

content = content.substring(0, sIdx) + newAdminLayout + content.substring(eIdx + endTarget.length);
fs.writeFileSync('src/App.tsx', content);
console.log('Admin replace exact done');
