const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const sIdx = content.indexOf('<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">');
const eIdx = content.indexOf('                {/* End of Settings */}');

if (sIdx === -1 || eIdx === -1) {
    console.log("Not found", sIdx, eIdx);
    process.exit(1);
}

const newSettings = `
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Account & Subscription */}
                  <div className="lg:col-span-7 space-y-8">
                    {/* User Profile / Auth */}
                    <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border border-white/5">
                      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                            <User size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Account Access</h3>
                            <p className="text-[11px] text-white/40 mt-0.5">Manage your identity and synchronization</p>
                          </div>
                        </div>
                        {loggedInUser && (
                          <span className={\`px-3 py-1 text-[9px] font-black tracking-widest uppercase rounded-full border \${
                            loggedInUser.email === "rakibulhasantohin@gmail.com" || loggedInUser.email === "rakibulhasantuhin010@gmail.com"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }\`}>
                            {loggedInUser.email === "rakibulhasantohin@gmail.com" || loggedInUser.email === "rakibulhasantuhin010@gmail.com" ? "OWNER" : "SUBSCRIBER"}
                          </span>
                        )}
                      </div>

                      {loggedInUser ? (
                        <div className="space-y-6 relative z-10">
                          <div className="flex items-center gap-5 bg-white/5 p-5 rounded-2xl border border-white/10">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-rose-600 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg flex-shrink-0">
                              {loggedInUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <h4 className="text-xl font-black text-white truncate tracking-tight">{loggedInUser.name}</h4>
                              <p className="text-xs text-white/50 font-mono truncate mt-0.5">{loggedInUser.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0b0b0b] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Plan</span>
                              <span className="text-sm font-black mt-1 text-white">
                                {isPremiumInstalled || loggedInUser.plusActive ? (
                                  <span className="text-amber-400 flex items-center gap-1.5"><Crown size={14} /> VIP PLUS</span>
                                ) : (
                                  "Standard Ad-Supported"
                                )}
                              </span>
                            </div>
                            <div className="bg-[#0b0b0b] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Member Since</span>
                              <span className="text-sm font-bold mt-1 text-white">
                                {loggedInUser.createdAt ? new Date(loggedInUser.createdAt).toLocaleDateString() : "Active Session"}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={handleUserLogout}
                            className="w-full py-3.5 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all mt-4 cursor-pointer"
                          >
                            Disconnect Session
                          </button>
                        </div>
                      ) : (
                        <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 relative z-10">
                          <div className="flex mb-6 bg-white/5 p-1 rounded-xl">
                            <button
                              onClick={() => { setAuthMode("signin"); setAuthError(null); setAuthSuccess(null); }}
                              className={\`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer \${authMode === "signin" ? "bg-white/10 text-white shadow" : "text-white/40"}\`}
                            >
                              Sign In
                            </button>
                            <button
                              onClick={() => { setAuthMode("signup"); setAuthError(null); setAuthSuccess(null); }}
                              className={\`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer \${authMode === "signup" ? "bg-white/10 text-white shadow" : "text-white/40"}\`}
                            >
                              Sign Up
                            </button>
                          </div>

                          <div className="px-5 pb-5 space-y-4">
                            {authSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center">{authSuccess}</div>}
                            {authError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center">{authError}</div>}

                            {authMode === "signup" && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black text-white/40 pl-1">Full Name</label>
                                <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-primary/50 focus:bg-white/5 transition-colors outline-none" placeholder="Enter your name" />
                              </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black text-white/40 pl-1">Email Address</label>
                                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-primary/50 focus:bg-white/5 transition-colors outline-none" placeholder="name@example.com" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black text-white/40 pl-1">Password</label>
                                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-primary/50 focus:bg-white/5 transition-colors outline-none" placeholder="••••••••" />
                            </div>

                            <button onClick={authMode === "signup" ? handleUserRegister : handleUserLogin} className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-primary/20 tracking-wide uppercase">
                              {authMode === "signup" ? "Create Account" : "Access Platform"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TV PLUS SUBSCRIPTION */}
                    <div className="bg-gradient-to-br from-[#1a150b] to-[#120f08] border border-amber-900/30 p-8 rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute -inset-24 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 relative">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Crown className="text-black" size={26} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">TV Plus VIP <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest border border-amber-400/20">Pro</span></h3>
                            <p className="text-white/40 text-xs mt-1">Unlock ad-free experience & 4K nodes</p>
                          </div>
                        </div>
                        {isPremiumInstalled ? (
                          <div className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Active Plan
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-2xl font-black text-amber-400">৳199<span className="text-[10px] text-white/40 uppercase tracking-widest"> / mo</span></div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-white/60 mb-8 relative">
                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5"><div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center"><Check size={12} className="text-amber-400" /></div> No Video Ads</div>
                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5"><div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center"><Check size={12} className="text-amber-400" /></div> 4K Ultra HD Matches</div>
                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5"><div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center"><Check size={12} className="text-amber-400" /></div> BDIX Direct CDN</div>
                        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5"><div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center"><Check size={12} className="text-amber-400" /></div> 24/7 VIP Support</div>
                      </div>

                      {!isPremiumInstalled && (
                        <div className="relative border-t border-amber-900/40 pt-6">
                          {!showPlusCheckout ? (
                            <button onClick={() => { if (!loggedInUser) setAuthError("Create account first!"); else setShowPlusCheckout(true); }} className="w-full cursor-pointer py-4 bg-amber-400 hover:bg-amber-500 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                              Unlock TV Plus Now
                            </button>
                          ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/80 backdrop-blur-xl p-6 rounded-2xl border border-amber-500/20 shadow-2xl">
                              <div className="flex items-center justify-between mb-5">
                                <h4 className="text-sm font-black text-white">Payment Gateway</h4>
                                <button onClick={() => setShowPlusCheckout(false)} className="text-[10px] text-white/40 cursor-pointer hover:text-white uppercase font-bold tracking-widest">Cancel</button>
                              </div>
                              <div className="grid grid-cols-3 gap-3 mb-5">
                                {[ { id: 'bkash', color: 'bg-[#e2125a]', name: 'bKash' }, { id: 'nagad', color: 'bg-[#f57c24]', name: 'Nagad' }, { id: 'rocket', color: 'bg-[#8c3494]', name: 'Rocket' } ].map(op => (
                                  <button key={op.id} onClick={() => setPlusMethod(op.id as any)} className={\`py-2.5 rounded-xl cursor-pointer text-xs font-black transition-all border \${plusMethod === op.id ? \`border-amber-400 text-white \${op.color}\` : 'border-white/10 bg-[#111] text-white/40 hover:text-white'}\`}>{op.name}</button>
                                ))}
                              </div>
                              <div className="p-4 bg-amber-400/5 border border-amber-400/10 rounded-xl mb-5 space-y-2">
                                <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Instructions</p>
                                <p className="text-xs text-white/70">Send exactly <b className="text-white">BDT 199</b> to Personal Number <b className="text-white tracking-widest font-mono bg-white/10 px-1 rounded">+8801736630089</b> via {plusMethod}.</p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-5">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block">Sender Number</label>
                                  <input type="text" value={plusPhone} onChange={e => setPlusPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:border-amber-500 outline-none transition-colors" />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-white/40 pb-1.5 block">Transaction ID</label>
                                  <input type="text" value={plusTransaction} onChange={e => setPlusTransaction(e.target.value)} placeholder="TRX..." className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono uppercase focus:border-amber-500 outline-none transition-colors" />
                                </div>
                              </div>
                              
                              {plusStatus && <div className="mb-4 p-3 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-xl text-center border border-emerald-500/20">{plusStatus}</div>}
                              {plusError && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl text-center border border-red-500/20">{plusError}</div>}
                              
                              <button onClick={handleActivatePremium} className="w-full cursor-pointer py-3.5 bg-amber-400 hover:bg-amber-500 text-black font-black uppercase tracking-widest text-[11px] rounded-xl transition-all">Submit Verification Request</button>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Preferences & Notifications */}
                  <div className="lg:col-span-5 space-y-8">
                    {/* Notifications */}
                    <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                          <Bell size={20} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white tracking-tight">Notifications</h4>
                          <p className="text-[11px] text-white/40 mt-0.5 mt-0.5">Manage your alert preferences</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {[ 
                          { id: 'app', title: 'Start Notification', desc: 'Sound alert when app launches', state: notifApp, setter: setNotifApp },
                          { id: 'match', title: 'Live Match Alerts', desc: 'Dynamic sports match pushes', state: notifMatch, setter: setNotifMatch },
                          { id: 'channel', title: 'Channel States', desc: 'Offline and latency overlays', state: notifChannel, setter: setNotifChannel }
                        ].map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white-[0.07] transition-colors rounded-2xl border border-white/5">
                            <div>
                              <h5 className="text-sm font-bold text-white/90">{item.title}</h5>
                              <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                            <div 
                              onClick={() => { item.setter(!item.state); localStorage.setItem(\`tuhinext_notif_\${item.id}\`, String(!item.state)); }}
                              className={\`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 \${item.state ? 'bg-emerald-500' : 'bg-white/10'}\`}
                            >
                              <div className={\`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform \${item.state ? 'translate-x-6' : 'translate-x-0'}\`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Playback Settings */}
                    <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                          <SlidersHorizontal size={20} />
                        </div>
                        <h4 className="text-xl font-bold text-white tracking-tight">Playback Engine</h4>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest pl-1">Resolution Lock</label>
                          <div className="bg-[#111] p-1.5 rounded-xl border border-white/5 flex gap-1.5">
                            <button onClick={() => { setStreamQuality("auto"); localStorage.setItem("tuhinext_stream_quality", "auto"); }} className={\`flex-1 py-2 text-[11px] font-bold cursor-pointer rounded-lg transition-all \${streamQuality === "auto" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80"}\`}>Auto Adaptive</button>
                            <button onClick={() => { setStreamQuality("hd"); localStorage.setItem("tuhinext_stream_quality", "hd"); }} className={\`flex-1 py-2 text-[11px] font-bold cursor-pointer rounded-lg transition-all \${streamQuality === "hd" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80"}\`}>Force 1080p</button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest pl-1">Latency Log</label>
                          <div className="bg-[#111] p-1.5 rounded-xl border border-white/5 flex gap-1.5">
                            <button onClick={() => { setBufferTime("standard"); localStorage.setItem("tuhinext_buffer_time", "standard"); }} className={\`flex-1 py-2 cursor-pointer text-[11px] font-bold rounded-lg transition-all \${bufferTime === "standard" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80"}\`}>Fast Edge</button>
                            <button onClick={() => { setBufferTime("massive"); localStorage.setItem("tuhinext_buffer_time", "massive"); }} className={\`flex-1 py-2 cursor-pointer text-[11px] font-bold rounded-lg transition-all \${bufferTime === "massive" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80"}\`}>Massive (No Lag)</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Info */}
                    <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Routing</span>
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> <span className="text-[10px] font-black text-emerald-400">BDIX ACTIVE</span></div>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Total Schedulers</span>
                        <span className="text-[11px] font-black text-white">{channels.length} Source DB</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Platform Core</span>
                        <span className="text-[11px] font-black text-white px-2 py-0.5 bg-white/5 rounded-md">v4.0 BUILD</span>
                      </div>
                      
                      <button onClick={() => { localStorage.removeItem("tuhinext_channels"); localStorage.removeItem("tuhinext_playlist_url"); setPlaylistInput(PLAYLIST_URL); window.location.reload(); }} className="w-full py-3 bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all mt-2">
                        Purge Memory & Reload
                      </button>
                    </div>
                  </div>
                </div>
`;

content = content.substring(0, sIdx) + newSettings + content.substring(eIdx);
fs.writeFileSync('src/App.tsx', content);
console.log('Done replacement');
