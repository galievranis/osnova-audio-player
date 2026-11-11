const byId = id => document.getElementById(id);
const insertButton = byId('editor-insert');
const blockMenu = byId('editor-block-menu');
const audioBlock = byId('editor-audio');
const picker = byId('audio-pick');
const fileInput = byId('audio-file');
const upload = byId('audio-upload');
const playerShell = byId('audio-player-shell');
const player = byId('compact-player');
const settings = byId('audio-settings');
const settingsMenu = byId('audio-settings-menu');
const error = byId('audio-error');
const audio = byId('cp-audio');
const insertRow = byId('editor-insert-row');
const modal = byId('editor-modal');
const maximize = byId('editor-maximize');
let activeUpload;
let audioUrl;

function setMenu(open) {
  blockMenu.hidden = !open;
  insertButton.setAttribute('aria-expanded', String(open));
}

insertButton.addEventListener('click', () => {
  setMenu(blockMenu.hidden);
  if (!blockMenu.hidden) byId('editor-audio-option').focus();
});
function setSettings(open) {
  settingsMenu.hidden = !open;
  settings.setAttribute('aria-expanded', String(open));
}

settings.addEventListener('click', () => {
  setSettings(settingsMenu.hidden);
  if (!settingsMenu.hidden) byId('audio-replace').focus();
});
document.addEventListener('click', event => {
  if (!blockMenu.contains(event.target) && !insertButton.contains(event.target)) setMenu(false);
  if (!settingsMenu.contains(event.target) && !settings.contains(event.target)) setSettings(false);
});
byId('editor-audio-option').addEventListener('click', () => {
  setMenu(false);
  audioBlock.hidden = false;
  insertRow.hidden = true;
  byId('audio-choose').focus();
});

function showAudioState(state) {
  picker.hidden = state !== 'pick';
  upload.hidden = state !== 'loading';
  playerShell.hidden = state === 'pick';
  playerShell.dataset.state = state;
  player.inert = state === 'loading';
}

function clearAudio() {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = undefined;
}

function cancelUpload() {
  activeUpload?.abort();
  activeUpload = undefined;
  clearAudio();
  error.hidden = true;
  showAudioState('pick');
}

function waitForMetadata(url, signal) {
  return new Promise((resolve, reject) => {
    const listeners = new AbortController();
    const finish = callback => {
      listeners.abort();
      callback();
    };
    audio.addEventListener('loadedmetadata', () => finish(resolve), {signal: listeners.signal});
    audio.addEventListener('error', () => finish(() => reject(audio.error)), {signal: listeners.signal});
    signal.addEventListener('abort', () => finish(() => reject(signal.reason)), {once: true, signal: listeners.signal});
    audio.src = url;
  });
}

async function addAudio(file) {
  cancelUpload();
  const controller = new AbortController();
  const {signal} = controller;
  activeUpload = controller;
  showAudioState('loading');
  const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 1700));

  try {
    audioUrl = URL.createObjectURL(file);
    await Promise.all([waitForMetadata(audioUrl, signal), minimumLoadingTime]);
    signal.throwIfAborted();

    byId('cp-error').hidden = true;
    showAudioState('ready');
  } catch {
    if (signal.aborted) return;
    clearAudio();
    showAudioState('pick');
    error.textContent = 'Не удалось открыть аудио. Попробуйте другой файл.';
    error.hidden = false;
  } finally {
    if (activeUpload === controller) activeUpload = undefined;
  }
}

byId('audio-choose').addEventListener('click', () => fileInput.click());
byId('audio-replace').addEventListener('click', () => {
  setSettings(false);
  settings.focus();
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  fileInput.value = '';
  if (file) addAudio(file);
});
byId('audio-remove').addEventListener('click', () => {
  setSettings(false);
  cancelUpload();
  audioBlock.hidden = true;
  insertRow.hidden = false;
  insertButton.focus();
});
maximize.addEventListener('click', () => {
  const expanded = modal.classList.toggle('modal-fullpage--maximized');
  maximize.setAttribute('aria-pressed', String(expanded));
  maximize.setAttribute('aria-label', expanded ? 'Свернуть редактор' : 'Развернуть редактор');
});
modal.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  if (!settingsMenu.hidden) {
    setSettings(false);
    settings.focus();
  } else if (!blockMenu.hidden) {
    setMenu(false);
    insertButton.focus();
  } else {
    location.href = 'index.html';
  }
});
