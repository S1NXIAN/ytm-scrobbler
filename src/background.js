/* YTM Scrobbler — background service worker */

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = 'a9a6967d792facee1d782f4c8d99ed08';
const API_SECRET = '252770063354efc51597dace6c3d0190';

let scrobbleAt = 0.5;
chrome.storage.local.get('scrobbleAt').then(s => { if (s.scrobbleAt) scrobbleAt = s.scrobbleAt; });
chrome.storage.onChanged.addListener((c, a) => { if (a === 'local' && c.scrobbleAt) scrobbleAt = c.scrobbleAt.newValue; });

// ── state ──
let sessionKey = '';
let sessionName = '';
let currentTrack = null, authToken = '';

// ── startup: load persisted state ──
chrome.storage.local.get(['sessionKey', 'cachedTrack']).then(s => {
  sessionKey = s.sessionKey || '';
  if (s.sessionKey) ensureContentScript();
  if (s.cachedTrack) {
    currentTrack = s.cachedTrack;
    if (currentTrack.artist) currentTrack.artist = currentTrack.artist.split('•')[0].trim();
  }
});

// ── MD5 (blueimp) ──
function md5(s) {
  function safeAdd(x,y){var l=(x&0xffff)+(y&0xffff),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xffff)}
  function bitRotateLeft(n,c){return(n<<c)|(n>>>(32-c))}
  function md5cmn(q,a,b,x,s,t){return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b)}
  function md5ff(a,b,c,d,x,s,t){return md5cmn((b&c)|(~b&d),a,b,x,s,t)}
  function md5gg(a,b,c,d,x,s,t){return md5cmn((b&d)|(c&~d),a,b,x,s,t)}
  function md5hh(a,b,c,d,x,s,t){return md5cmn(b^c^d,a,b,x,s,t)}
  function md5ii(a,b,c,d,x,s,t){return md5cmn(c^(b|~d),a,b,x,s,t)}
  function binlMD5(x,len){
    x[len>>5]|=0x80<<len%32;x[(((len+64)>>>9)<<4)+14]=len;
    var i,oa,ob,oc,od,a=1732584193,b=-271733879,c=-1732584194,d=271733878;
    for(i=0;i<x.length;i+=16){
      oa=a;ob=b;oc=c;od=d;
      a=md5ff(a,b,c,d,x[i],7,-680876936);d=md5ff(d,a,b,c,x[i+1],12,-389564586);c=md5ff(c,d,a,b,x[i+2],17,606105819);b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
      a=md5ff(a,b,c,d,x[i+4],7,-176418897);d=md5ff(d,a,b,c,x[i+5],12,1200080426);c=md5ff(c,d,a,b,x[i+6],17,-1473231341);b=md5ff(b,c,d,a,x[i+7],22,-45705983);
      a=md5ff(a,b,c,d,x[i+8],7,1770035416);d=md5ff(d,a,b,c,x[i+9],12,-1958414417);c=md5ff(c,d,a,b,x[i+10],17,-42063);b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
      a=md5ff(a,b,c,d,x[i+12],7,1804603682);d=md5ff(d,a,b,c,x[i+13],12,-40341101);c=md5ff(c,d,a,b,x[i+14],17,-1502002290);b=md5ff(b,c,d,a,x[i+15],22,1236535329);
      a=md5gg(a,b,c,d,x[i+1],5,-165796510);d=md5gg(d,a,b,c,x[i+6],9,-1069501632);c=md5gg(c,d,a,b,x[i+11],14,643717713);b=md5gg(b,c,d,a,x[i],20,-373897302);
      a=md5gg(a,b,c,d,x[i+5],5,-701558691);d=md5gg(d,a,b,c,x[i+10],9,38016083);c=md5gg(c,d,a,b,x[i+15],14,-660478335);b=md5gg(b,c,d,a,x[i+4],20,-405537848);
      a=md5gg(a,b,c,d,x[i+9],5,568446438);d=md5gg(d,a,b,c,x[i+14],9,-1019803690);c=md5gg(c,d,a,b,x[i+3],14,-187363961);b=md5gg(b,c,d,a,x[i+8],20,1163531501);
      a=md5gg(a,b,c,d,x[i+13],5,-1444681467);d=md5gg(d,a,b,c,x[i+2],9,-51403784);c=md5gg(c,d,a,b,x[i+7],14,1735328473);b=md5gg(b,c,d,a,x[i+12],20,-1926607734);
      a=md5hh(a,b,c,d,x[i+5],4,-378558);d=md5hh(d,a,b,c,x[i+8],11,-2022574463);c=md5hh(c,d,a,b,x[i+11],16,1839030562);b=md5hh(b,c,d,a,x[i+14],23,-35309556);
      a=md5hh(a,b,c,d,x[i+1],4,-1530992060);d=md5hh(d,a,b,c,x[i+4],11,1272893353);c=md5hh(c,d,a,b,x[i+7],16,-155497632);b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
      a=md5hh(a,b,c,d,x[i+13],4,681279174);d=md5hh(d,a,b,c,x[i],11,-358537222);c=md5hh(c,d,a,b,x[i+3],16,-722521979);b=md5hh(b,c,d,a,x[i+6],23,76029189);
      a=md5hh(a,b,c,d,x[i+9],4,-640364487);d=md5hh(d,a,b,c,x[i+12],11,-421815835);c=md5hh(c,d,a,b,x[i+15],16,530742520);b=md5hh(b,c,d,a,x[i+2],23,-995338651);
      a=md5ii(a,b,c,d,x[i],6,-198630844);d=md5ii(d,a,b,c,x[i+7],10,1126891415);c=md5ii(c,d,a,b,x[i+14],15,-1416354905);b=md5ii(b,c,d,a,x[i+5],21,-57434055);
      a=md5ii(a,b,c,d,x[i+12],6,1700485571);d=md5ii(d,a,b,c,x[i+3],10,-1894986606);c=md5ii(c,d,a,b,x[i+10],15,-1051523);b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
      a=md5ii(a,b,c,d,x[i+8],6,1873313359);d=md5ii(d,a,b,c,x[i+15],10,-30611744);c=md5ii(c,d,a,b,x[i+6],15,-1560198380);b=md5ii(b,c,d,a,x[i+13],21,1309151649);
      a=md5ii(a,b,c,d,x[i+4],6,-145523070);d=md5ii(d,a,b,c,x[i+11],10,-1120210379);c=md5ii(c,d,a,b,x[i+2],15,718787259);b=md5ii(b,c,d,a,x[i+9],21,-343485551);
      a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);
    }
    return[a,b,c,d]
  }
  function rstr2binl(s){
    var o=[];o[(s.length>>2)-1]=undefined;
    for(var i=0;i<o.length;i++)o[i]=0;
    for(var i=0;i<s.length*8;i+=8)o[i>>5]|=(s.charCodeAt(i/8)&0xff)<<i%32;
    return o
  }
  function binl2rstr(i){
    var o='';
    for(var j=0;j<i.length*32;j+=8)o+=String.fromCharCode((i[j>>5]>>>j%32)&0xff);
    return o
  }
  function rstr2hex(i){
    var h='0123456789abcdef',o='';
    for(var j=0;j<i.length;j++){var x=i.charCodeAt(j);o+=h[(x>>>4)&0xf]+h[x&0xf]}
    return o
  }
  s=unescape(encodeURIComponent(s));
  return rstr2hex(binl2rstr(binlMD5(rstr2binl(s),s.length*8)))
}

// ── Last.fm API ──
function signedParams(params) {
  params.api_key = API_KEY;
  const keys = Object.keys(params).filter(k => k !== 'api_sig' && k !== 'format').sort();
  const sigStr = keys.map(k => k + params[k]).join('') + API_SECRET;
  params.api_sig = md5(sigStr);
  return params;
}

async function apiCall(method, params) {
  params.method = method;
  params.format = 'json';
  if (sessionKey) params.sk = sessionKey;
  signedParams(params);
  const r = await fetch(API_ROOT, { method: 'POST', body: new URLSearchParams(params) });
  return r.json();
}

// ── track handler ──
async function onTrack(info, startedAt) {
  // Dedup: block repeated 2s ticks from content script
  if (currentTrack && info.track === currentTrack.track && info.artist === currentTrack.artist) {
    // ponytail: currentTime-based scrobble for seek-past-threshold
    if (currentTrack.scrobbled && info.currentTime < 5) currentTrack.scrobbled = false;
    if (!currentTrack.scrobbled && info.currentTime && currentTrack.duration) {
      const ratio = info.currentTime / currentTrack.duration;
      if (ratio >= scrobbleAt) doScrobble(currentTrack).catch(() => {});
    }
    return;
  }

  // Skip ads / non-music
  const adPatterns = ['advertisement', 'ad:', 'promoted'];
  if (adPatterns.some(p => (info.artist + info.track).toLowerCase().includes(p))) {
    currentTrack = null;
    return;
  }

  // Scrobble previous track if played enough and not stale cached data
  const prev = currentTrack;
  if (prev && !prev.scrobbled) {
    const elapsed = Date.now() - prev.startedAt;
    const delay = Math.min(prev.duration * scrobbleAt * 1000, 4 * 60 * 1000);
    const maxAge = (prev.duration + 120) * 1000;
    if (elapsed >= delay && elapsed <= maxAge) {
      try { await doScrobble(prev); } catch (e) { console.error('scrobble prev failed', e); }
    }
  }

  const dur = Math.max(30, info.duration || 30); // floor: 30s
  currentTrack = { ...info, duration: dur, scrobbled: false, startedAt };
  chrome.storage.local.set({ cachedTrack: currentTrack });

  // Now playing (fire-and-forget, don't block on failure)
  apiCall('track.updateNowPlaying', {
    artist: info.artist, track: info.track,
    album: info.album || '', duration: String(dur)
  }).catch(e => console.error('nowPlaying failed', e));
}

async function doScrobble(track) {
  if (!track || track.scrobbled) return;
  const r = await apiCall('track.scrobble', {
    artist: track.artist, track: track.track,
    album: track.album || '',
    timestamp: String(Math.floor(track.startedAt / 1000)),
    duration: String(track.duration || 0)
  });
  if (r.error) throw new Error('Last.fm: ' + r.error + ': ' + (r.message || ''));
  track.scrobbled = true;
}

// ── auth helpers ──
async function doGetToken() {
  const r = await apiCall('auth.getToken', {});
  if (r.token) {
    authToken = r.token;
    await chrome.storage.local.set({ lastAuthToken: r.token, authInProgress: true });
  }
  return r;
}

async function doGetSession() {
  if (!authToken) authToken = (await chrome.storage.local.get('lastAuthToken')).lastAuthToken;
  if (!authToken) throw new Error('no token');
  const r = await apiCall('auth.getSession', { token: authToken });
  if (r.session && r.session.key) {
    sessionKey = r.session.key;
    sessionName = r.session.name;
    await chrome.storage.local.set({ sessionKey, sessionName: r.session.name });
    await chrome.storage.local.remove(['lastAuthToken', 'authInProgress']);
    ensureContentScript();
  }
  return r;
}

// ── inject content script into open YTM tabs ──
async function ensureContentScript() {
  const tabs = await chrome.tabs.query({ url: 'https://music.youtube.com/*' }).catch(() => []);
  for (const t of tabs) {
    chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['src/ytmusic.js'] }).catch(() => {});
  }
}

// ── message router ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'track') {
    onTrack(msg.data, Date.now()).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.action === 'getToken') {
    doGetToken().then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.action === 'getSession') {
    doGetSession().catch(e => console.error('getSession failed', e));
    sendResponse({ checking: true });
    return false;
  }
  if (msg.action === 'getStatus') {
    sendResponse({ connected: !!sessionKey, track: currentTrack, sessionName });
    return false;
  }
  if (msg.action === 'clearAuth') {
    sessionKey = authToken = '';
    currentTrack = null;
    chrome.storage.local.remove(['sessionKey', 'lastAuthToken', 'authInProgress']);
    sendResponse({ ok: true });
    return false;
  }
});
