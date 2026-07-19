/* YTM Scrobbler — content script for music.youtube.com */

setInterval(() => { try {
  const bar = document.querySelector('ytmusic-player-bar');
  if (!bar) return;
  const texts = bar.querySelectorAll('yt-formatted-string');
  if (texts.length < 2) return;
  const title = texts[0]?.textContent?.trim();
  const subtitle = texts[1]?.textContent?.trim();
  const artist = subtitle ? subtitle.split('•')[0].trim() : '';
  if (!title || !artist) return;

  const el = document.querySelector('audio, video');
  if (!el || el.paused) return;

  chrome.runtime.sendMessage({
    action: 'track',
    data: {
      artist, track: title,
      album: navigator.mediaSession?.metadata?.album || '',
      duration: Math.floor(el.duration) || 0,
      currentTime: Math.floor(el.currentTime) || 0
    }
  }).catch(() => {});
} catch(e) {} }, 2000);
