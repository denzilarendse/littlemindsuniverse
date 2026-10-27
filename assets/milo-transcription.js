/* Teacher–Milo transcription tools.
 * Audio notes are held in memory for preview and are never uploaded by this module.
 * Browser speech-recognition privacy and processing depend on browser/device settings.
 */
(function () {
  'use strict';
  const MAX_NOTE_BYTES = 20 * 1024 * 1024;
  const MAX_NOTE_MS = 3 * 60 * 1000;
  let recognition = null;
  let listening = false;
  let recording = null;
  let noteUrl = null;
  let finalTranscript = '';
  let interimTranscript = '';
  let activeStream = null;
  let controlsRoot = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
  const toast = message => {
    const node = $('#toast');
    if (node) { node.textContent = message; node.classList.add('show'); }
  };
  const isTeacherMilo = () => {
    const heading = $('#chatBox')?.closest('.card')?.querySelector('h2');
    return !!heading && /Milo\s*[·-]\s*teacher/i.test(heading.textContent || '');
  };
  const currentLanguage = () => {
    const language = (window.LMU_CONFIG && window.LMU_CONFIG.language) || document.documentElement.lang || 'en-ZA';
    return /^(af|zu|xh|st|nso|tn|ss|ve|ts|nr)(-|$)/i.test(language) ? language : 'en-ZA';
  };
  function stopRecognition() {
    if (recognition) {
      try { recognition.onresult = recognition.onerror = recognition.onend = null; recognition.stop(); } catch (_) {}
    }
    recognition = null;
    listening = false;
  }
  function stopTracks() {
    if (activeStream) activeStream.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
    activeStream = null;
  }
  function revokeNoteUrl() {
    if (noteUrl) URL.revokeObjectURL(noteUrl);
    noteUrl = null;
  }
  function appendToInput(text) {
    const input = $('#miloInput');
    const value = String(text || '').trim();
    if (!input || !value) return;
    input.value = input.value.trim() ? input.value.trimEnd() + '\n' + value : value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }
  function updateStatus(message) {
    const status = $('#miloTranscriptionStatus');
    if (status) status.textContent = message;
  }
  function startRecognition({ voiceNote = false } = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Speech transcription is not supported in this browser. You can still type and export the chat.');
      return null;
    }
    stopRecognition();
    finalTranscript = '';
    interimTranscript = '';
    recognition = new SpeechRecognition();
    recognition.lang = currentLanguage();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { listening = true; updateStatus(voiceNote ? 'Recording voice note and transcribing speech…' : 'Listening… speak now.'); };
    recognition.onresult = event => {
      interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = String(event.results[i][0]?.transcript || '').trim();
        if (!text) continue;
        if (event.results[i].isFinal) finalTranscript += (finalTranscript ? ' ' : '') + text;
        else interimTranscript += (interimTranscript ? ' ' : '') + text;
      }
      const preview = $('#miloTranscriptPreview');
      if (preview) preview.value = [finalTranscript, interimTranscript].filter(Boolean).join(' ').slice(0, 12000);
      updateStatus(voiceNote ? 'Voice note active. Transcription may be incomplete; review it before use.' : (interimTranscript ? 'Hearing: ' + interimTranscript : 'Listening…'));
    };
    recognition.onerror = event => {
      updateStatus('Speech transcription stopped (' + String(event.error || 'unavailable') + '). You can type or retry.');
    };
    recognition.onend = () => {
      listening = false;
      if (!recording) updateStatus(finalTranscript ? 'Transcription ready to review.' : 'Transcription stopped.');
    };
    try { recognition.start(); return recognition; }
    catch (error) { stopRecognition(); toast('Could not start speech transcription. Check microphone permission.'); return null; }
  }
  function renderControls() {
    const input = $('#miloInput');
    const chat = $('#chatBox');
    if (!input || !chat || !isTeacherMilo()) {
      if (controlsRoot && !controlsRoot.isConnected) controlsRoot = null;
      if (!isTeacherMilo()) cleanup();
      return;
    }
    if (controlsRoot?.isConnected) return;
    controlsRoot = document.createElement('section');
    controlsRoot.id = 'miloTranscriptionTools';
    controlsRoot.className = 'card';
    controlsRoot.style.marginTop = '12px';
    controlsRoot.innerHTML = `
      <div class="eyebrow">Teacher–Milo voice & transcript</div>
      <p class="muted">Speech recognition is provided by your browser and may use its configured processing service. Audio-note files stay in this page's memory and are not uploaded by these controls.</p>
      <div class="actions">
        <button type="button" class="ghost" id="miloDictateBtn">🎙 Dictate message</button>
        <button type="button" class="ghost" id="miloVoiceNoteBtn">● Record voice note</button>
        <button type="button" class="ghost" id="miloExportTranscriptBtn">Export chat transcript (.txt)</button>
      </div>
      <p id="miloTranscriptionStatus" class="muted" role="status" aria-live="polite">Ready. Review speech-to-text before sending.</p>
      <div class="field"><label for="miloTranscriptPreview">Voice-note transcript preview (editable)</label><textarea id="miloTranscriptPreview" class="textarea" maxlength="12000" placeholder="Your speech transcript will appear here…"></textarea></div>
      <div class="actions">
        <button type="button" class="primary" id="miloUseTranscriptBtn">Use transcript in message</button>
        <button type="button" class="ghost" id="miloDiscardNoteBtn">Discard voice note</button>
      </div>
      <div id="miloVoiceNotePreview"></div>
      <small class="muted">Speech recognition availability and accuracy depend on the browser, language, microphone permission and network. This is a working transcript, not a certified record.</small>`;
    const parent = input.closest('.field') || chat.parentElement;
    parent.insertAdjacentElement('afterend', controlsRoot);
    $('#miloDictateBtn', controlsRoot).addEventListener('click', () => {
      if (listening && !recording) { stopRecognition(); updateStatus('Dictation stopped.'); $('#miloDictateBtn').textContent = '🎙 Dictate message'; return; }
      const started = startRecognition();
      if (started) {
        $('#miloDictateBtn').textContent = '■ Stop dictation';
        started.onend = () => {
          listening = false;
          $('#miloDictateBtn').textContent = '🎙 Dictate message';
          if (finalTranscript) appendToInput(finalTranscript);
          updateStatus(finalTranscript ? 'Dictation added to the message box. Review before sending.' : 'No speech was transcribed.');
        };
      }
    });
    $('#miloVoiceNoteBtn', controlsRoot).addEventListener('click', toggleVoiceNote);
    $('#miloUseTranscriptBtn', controlsRoot).addEventListener('click', () => {
      const transcript = $('#miloTranscriptPreview')?.value || finalTranscript;
      if (!transcript.trim()) return toast('There is no transcript to use yet.');
      appendToInput(transcript);
      updateStatus('Transcript added to the message box. Review it, then send to Milo.');
    });
    $('#miloDiscardNoteBtn', controlsRoot).addEventListener('click', () => {
      if (recording) stopVoiceNote();
      stopRecognition(); stopTracks(); revokeNoteUrl();
      finalTranscript = ''; interimTranscript = '';
      const preview = $('#miloTranscriptPreview'); if (preview) preview.value = '';
      const player = $('#miloVoiceNotePreview'); if (player) player.replaceChildren();
      updateStatus('Local voice note and transcript discarded.');
    });
    $('#miloExportTranscriptBtn', controlsRoot).addEventListener('click', exportTranscript);
  }
  async function toggleVoiceNote() {
    if (recording) { stopVoiceNote(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('Voice-note recording is not supported on this device/browser. Use Dictate message instead.');
      return;
    }
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => window.MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(activeStream, preferred ? { mimeType: preferred } : undefined);
      const chunks = [];
      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data);
        if (chunks.reduce((sum, chunk) => sum + chunk.size, 0) > MAX_NOTE_BYTES) {
          updateStatus('Voice note exceeded the 20 MB limit and is being stopped.');
          stopVoiceNote();
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
        stopTracks();
        recording = null;
        const button = $('#miloVoiceNoteBtn'); if (button) button.textContent = '● Record voice note';
        revokeNoteUrl();
        if (blob.size > MAX_NOTE_BYTES) { updateStatus('Voice note was too large and was discarded.'); return; }
        noteUrl = URL.createObjectURL(blob);
        const player = $('#miloVoiceNotePreview');
        if (player) player.innerHTML = '<audio controls preload="metadata" style="width:100%;margin-top:10px" aria-label="Recorded voice note preview" src="' + esc(noteUrl) + '"></audio><p class="muted">Local preview only · ' + (blob.size / 1024).toFixed(0) + ' KB. Audio is not uploaded.</p>';
        updateStatus(finalTranscript ? 'Voice note ready. Review the transcript; the audio remains local.' : 'Voice note recorded, but no speech was transcribed. Type a transcript or retry dictation.');
      };
      recording = recorder;
      startRecognition({ voiceNote: true });
      recorder.start(250);
      const button = $('#miloVoiceNoteBtn'); if (button) button.textContent = '■ Stop voice note';
      updateStatus('Recording and transcribing. Speak clearly; press Stop voice note when finished.');
      window.setTimeout(() => { if (recording === recorder) stopVoiceNote(); }, MAX_NOTE_MS);
    } catch (error) {
      stopRecognition(); stopTracks(); recording = null;
      console.warn('Teacher voice note could not start:', error?.name || 'unknown error');
      toast('Microphone permission was denied or recording could not start.');
    }
  }
  function stopVoiceNote() {
    const recorder = recording;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (_) {}
    } else { recording = null; stopTracks(); }
    stopRecognition();
    if (finalTranscript) {
      const preview = $('#miloTranscriptPreview');
      if (preview) preview.value = finalTranscript;
    }
  }
  function exportTranscript() {
    const chat = $('#chatBox');
    if (!chat) return toast('Open the current Milo chat first.');
    const rows = [...chat.querySelectorAll('.bubble')].map(bubble => {
      const who = bubble.classList.contains('user') ? 'Teacher' : 'Milo';
      return who + ': ' + (bubble.innerText || bubble.textContent || '').trim();
    }).filter(row => !row.endsWith(':'));
    if (!rows.length) return toast('There are no chat messages to export yet.');
    const content = 'LittleMindsUniverse — Teacher–Milo chat transcript\nExported: ' + new Date().toISOString() + '\n\n' + rows.join('\n\n') + '\n';
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'teacher-milo-transcript-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Current chat transcript exported as a text file.');
  }
  function cleanup() {
    stopRecognition();
    if (recording) { try { recording.stop(); } catch (_) {} recording = null; }
    stopTracks();
  }
  const observer = new MutationObserver(renderControls);
  function boot() {
    const root = $('#app');
    if (root) observer.observe(root, { childList: true, subtree: true });
    renderControls();
  }
  window.addEventListener('beforeunload', () => { cleanup(); revokeNoteUrl(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();