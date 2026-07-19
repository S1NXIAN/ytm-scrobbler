/* YTM Scrobbler — popup */
const $ = s => document.querySelector(s);

document.addEventListener('DOMContentLoaded', async () => {
  const loaded = await chrome.storage.local.get(['sessionKey', 'authInProgress', 'scrobbleAt']);
  const slider = $('#scrobble-at'), pct = $('#scrobble-pct');
  if (slider && loaded.scrobbleAt !== undefined) { slider.value = loaded.scrobbleAt; pct.textContent = Math.round(loaded.scrobbleAt * 100) + '%'; }
  if (loaded.sessionKey) {
    showPlayer();
  } else if (loaded.authInProgress) {
    setWaiting(true);
    startSessionPoll();
  }
});

$('#scrobble-at')?.addEventListener('input', e => {
  const v = parseFloat(e.target.value);
  $('#scrobble-pct').textContent = Math.round(v * 100) + '%';
  chrome.storage.local.set({ scrobbleAt: v });
});

let btn = $('#btn-auth'), statusInterval = null, sessionPoll = null;

function setWaiting(w) {
  $('#spinner').classList.toggle('hidden', !w);
  btn.classList.toggle('hidden', w);
  $('#auth .status').classList.toggle('hidden', w);
  $('#auth-msg').classList.add('hidden');
}

function startAuth() {
  setWaiting(true);
  chrome.runtime.sendMessage({ action: 'getToken' }).then(r => {
    if (r.error || !r.token) {
      setWaiting(false);
      showAuthMsg('Failed: ' + (r.error || 'no token'));
      return;
    }
    chrome.tabs.create({ url: 'https://www.last.fm/api/auth/?api_key=a9a6967d792facee1d782f4c8d99ed08&token=' + r.token });
    startSessionPoll();
  });
}
btn.onclick = startAuth;

function startSessionPoll() {
  if (sessionPoll) return;
  sessionPoll = setInterval(async () => {
    chrome.runtime.sendMessage({ action: 'getSession' }).catch(() => {});
    const { sessionKey } = await chrome.storage.local.get('sessionKey');
    if (sessionKey) {
      clearInterval(sessionPoll);
      sessionPoll = null;
      showPlayer();
    }
  }, 2000);
}

$('#btn-disconnect').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'clearAuth' });
  clearInterval(statusInterval);
});

function showPlayer() {
  $('#auth').style.display = 'none';
  $('#player').classList.remove('hidden');
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = setInterval(updateStatus, 2000);
  updateStatus();
}
async function updateStatus() {
  const s = await chrome.runtime.sendMessage({ action: 'getStatus' }).catch(() => null);
  if (!s) return;
  const dot = $('#status-dot');
  const titleEl = $('#track-title'), artistEl = $('#track-artist');
  if (!s.connected) { dot.className = 'dot grey'; $('#header-text').textContent = ' Scrobbler'; return; }
  dot.className = 'dot red';
  if (s.connected && s.sessionName) $('#header-text').textContent = ' Scrobbler // ' + s.sessionName;
  if (s.track) {
    titleEl.textContent = s.track.track;
    artistEl.textContent = s.track.artist;
  } else {
    titleEl.textContent = '—';
    artistEl.textContent = '';
  }
}
function showAuthMsg(m) {
  const el = $('#auth-msg');
  el.textContent = m;
  el.classList.toggle('hidden', !m);
}
