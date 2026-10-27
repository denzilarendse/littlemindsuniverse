/* Teacher-origin schoolwork capture. Files are quarantined and never sent to Milo here.
 * Only a trusted scan/review process may move pending_scan evidence into an analysis-ready state.
 */
(function () {
  'use strict';
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  const $ = (selector, root = document) => root.querySelector(selector);
  let panel = null;
  let selectedFile = null;
  let selectedSource = 'teacher_upload';
  let previewUrl = null;
  let cameraStream = null;
  let rosterRequest = 0;
  let uploading = false;

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[c]);
  const toast = message => {
    const node = $('#toast');
    if (node) { node.textContent = message; node.classList.add('show'); }
  };
  function context() {
    try { return window.LMU_TEACHER_EVIDENCE_CONTEXT?.() || null; } catch (_) { return null; }
  }
  function isTeacherChat() {
    const heading = $('#chatBox')?.closest('.card')?.querySelector('h2')?.textContent || '';
    const ctx = context();
    return !!ctx && ctx.mode === 'live' && ctx.role === 'teacher' && !!ctx.userId && !!ctx.supabase && /Milo\s*[·-]\s*teacher/i.test(heading);
  }
  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
    cameraStream = null;
    const video = $('#teacherEvidenceCameraVideo');
    if (video) video.srcObject = null;
  }
  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  function resetSelectedFile() {
    selectedFile = null;
    selectedSource = 'teacher_upload';
    revokePreview();
    const input = $('#teacherEvidenceFile');
    if (input) input.value = '';
    const preview = $('#teacherEvidenceFilePreview');
    if (preview) preview.replaceChildren();
    const submit = $('#teacherEvidenceUpload');
    if (submit) submit.disabled = true;
  }
  function setStatus(message, error = false) {
    const status = $('#teacherEvidenceStatus');
    if (status) {
      status.textContent = message;
      status.style.color = error ? 'var(--danger, #a22)' : '';
    }
  }
  function currentClassroomId() { return $('#teacherEvidenceClassroom')?.value || ''; }
  function currentLearnerId() { return $('#teacherEvidenceLearner')?.value || ''; }
  function validateFile(file) {
    if (!file) return 'Choose a file first.';
    if (!ALLOWED_TYPES.has(file.type)) return 'Use a JPEG, PNG, WebP image or PDF document.';
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return 'File must be between 1 byte and 20 MiB.';
    if (!currentClassroomId() || !currentLearnerId()) return 'Choose the active classroom and learner first.';
    return '';
  }
  function showPreview(file) {
    revokePreview();
    const target = $('#teacherEvidenceFilePreview');
    if (!target) return;
    target.replaceChildren();
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB · ' + file.type;
    target.appendChild(detail);
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
      const image = document.createElement('img');
      image.src = previewUrl;
      image.alt = 'Preview of selected schoolwork image';
      image.style.cssText = 'display:block;max-width:100%;max-height:320px;object-fit:contain;border-radius:8px;margin:8px 0';
      target.appendChild(image);
    }
    const submit = $('#teacherEvidenceUpload');
    if (submit) submit.disabled = !!validateFile(file) || uploading;
  }
  async function loadRoster() {
    const ctx = context();
    const classroomId = currentClassroomId();
    const select = $('#teacherEvidenceLearner');
    if (!ctx?.supabase || !select) return;
    const requestId = ++rosterRequest;
    select.disabled = true;
    select.innerHTML = '<option value="">Loading learners…</option>';
    if (!classroomId) {
      select.innerHTML = '<option value="">Choose classroom first</option>';
      return;
    }
    const { data, error } = await ctx.supabase.from('classroom_members')
      .select('learner_id, learners(id,display_name)')
      .eq('classroom_id', classroomId).eq('status', 'active').limit(200);
    if (requestId !== rosterRequest || !select.isConnected) return;
    if (error) {
      select.innerHTML = '<option value="">Roster unavailable</option>';
      setStatus('Could not load the authorized classroom roster. No upload has started.', true);
      console.warn('Teacher evidence roster unavailable:', error.message || 'query failed');
      return;
    }
    const rows = (data || []).map(row => row.learners).filter(row => row?.id);
    select.innerHTML = '<option value="">Choose learner…</option>' + rows.map(row =>
      '<option value="' + esc(row.id) + '">' + esc(row.display_name || 'Learner') + '</option>'
    ).join('');
    select.disabled = false;
    if (selectedFile) {
      const message = validateFile(selectedFile);
      const submit = $('#teacherEvidenceUpload');
      if (submit) submit.disabled = !!message || uploading;
    }
  }
  async function refreshRecent() {
    const ctx = context();
    const target = $('#teacherEvidenceRecent');
    if (!ctx?.supabase || !ctx.userId || !target) return;
    const { data, error } = await ctx.supabase.from('teacher_chat_evidence')
      .select('id,original_filename,status,created_at')
      .eq('teacher_profile_id', ctx.userId).order('created_at', { ascending: false }).limit(8);
    if (error) {
      target.textContent = 'Private evidence status is not available until the database migration is applied.';
      return;
    }
    if (!data?.length) {
      target.textContent = 'No teacher-origin schoolwork has been uploaded from this chat yet.';
      return;
    }
    target.replaceChildren();
    const list = document.createElement('ul');
    list.style.paddingLeft = '20px';
    for (const row of data) {
      const item = document.createElement('li');
      item.style.marginBottom = '8px';
      const label = document.createElement('span');
      const date = row.created_at ? new Date(row.created_at).toLocaleString() : '';
      label.textContent = row.original_filename + ' — ' + row.status.replaceAll('_', ' ') + (date ? ' · ' + date : '');
      item.appendChild(label);
      if (row.status !== 'deleted') {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ghost';
        remove.textContent = 'Delete upload';
        remove.style.marginLeft = '8px';
        remove.addEventListener('click', () => deleteEvidence(row));
        item.appendChild(remove);
      }
      list.appendChild(item);
    }
    target.appendChild(list);
  }
  function render() {
    const input = $('#miloInput');
    if (!input || !isTeacherChat()) {
      if (panel && !panel.isConnected) panel = null;
      if (!isTeacherChat()) stopCamera();
      return;
    }
    if (panel?.isConnected) return;
    const ctx = context();
    const classrooms = ctx.classrooms || [];
    panel = document.createElement('section');
    panel.id = 'teacherMiloEvidencePanel';
    panel.className = 'card';
    panel.style.marginTop = '12px';
    panel.innerHTML = `
      <div class="eyebrow">Schoolwork evidence · teacher controlled</div>
      <p class="muted">Upload a schoolwork photo, image, or PDF for a specific learner. Files enter a private quarantine and are <strong>not sent to Milo or analyzed</strong> until a trusted security scan and review workflow is implemented. Upload only material you are authorized to share; avoid including other children.</p>
      <div class="grid two">
        <div class="field"><label for="teacherEvidenceClassroom">Classroom</label><select class="select" id="teacherEvidenceClassroom">${classrooms.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('')}</select></div>
        <div class="field"><label for="teacherEvidenceLearner">Learner</label><select class="select" id="teacherEvidenceLearner"><option value="">Choose learner…</option></select></div>
      </div>
      <input id="teacherEvidenceFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden />
      <div class="actions">
        <button type="button" class="ghost" id="teacherEvidenceChoose">Choose schoolwork file</button>
        <button type="button" class="ghost" id="teacherEvidenceCamera">Use camera</button>
      </div>
      <div id="teacherEvidenceFilePreview" aria-live="polite"></div>
      <div class="actions"><button type="button" class="primary" id="teacherEvidenceUpload" disabled>Upload to private quarantine</button><button type="button" class="ghost" id="teacherEvidenceDiscard" disabled>Discard selection</button></div>
      <p id="teacherEvidenceStatus" class="muted" role="status" aria-live="polite">No file selected. Nothing is recording or uploading.</p>
      <details><summary>Recent teacher uploads</summary><div id="teacherEvidenceRecent" class="muted">Loading private evidence status…</div></details>
      <dialog id="teacherEvidenceCameraDialog" aria-labelledby="teacherEvidenceCameraTitle" style="width:min(94vw,640px);border:0;border-radius:12px;padding:16px">
        <h3 id="teacherEvidenceCameraTitle">Capture schoolwork photo</h3>
        <p class="muted">The camera starts only after you press Start camera. Preview the image before choosing Use photo. No video is recorded.</p>
        <video id="teacherEvidenceCameraVideo" autoplay muted playsinline style="width:100%;max-height:55vh;background:#111;border-radius:8px"></video>
        <div id="teacherEvidenceCameraPreview"></div>
        <div class="actions">
          <button type="button" class="ghost" id="teacherEvidenceCameraStart">Start camera</button>
          <button type="button" class="primary" id="teacherEvidenceCameraTake" disabled>Take photo</button>
          <button type="button" class="ghost" id="teacherEvidenceCameraRetake" hidden>Retake</button>
          <button type="button" class="primary" id="teacherEvidenceCameraUse" hidden>Use photo</button>
          <button type="button" class="ghost" id="teacherEvidenceCameraCancel">Cancel</button>
        </div>
        <p id="teacherEvidenceCameraStatus" class="muted" role="status" aria-live="polite">Camera is off.</p>
      </dialog>`;
    const parent = $('#miloTranscriptionTools') || input.closest('.field') || input.parentElement;
    parent.insertAdjacentElement('afterend', panel);
    $('#teacherEvidenceClassroom').addEventListener('change', () => {
      resetSelectedFile();
      loadRoster();
    });
    $('#teacherEvidenceLearner').addEventListener('change', () => {
      const submit = $('#teacherEvidenceUpload');
      if (submit) submit.disabled = !!validateFile(selectedFile) || uploading;
    });
    $('#teacherEvidenceChoose').addEventListener('click', () => $('#teacherEvidenceFile').click());
    $('#teacherEvidenceFile').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const problem = validateFile(file);
      if (problem) { resetSelectedFile(); setStatus(problem, true); return; }
      selectedFile = file;
      selectedSource = 'teacher_upload';
      showPreview(file);
      $('#teacherEvidenceDiscard').disabled = false;
      setStatus('File selected. It has not been uploaded or shared.');
    });
    $('#teacherEvidenceDiscard').addEventListener('click', () => {
      resetSelectedFile();
      $('#teacherEvidenceDiscard').disabled = true;
      setStatus('Selection discarded. No file was uploaded.');
    });
    $('#teacherEvidenceUpload').addEventListener('click', uploadSelected);
    $('#teacherEvidenceCamera').addEventListener('click', openCameraDialog);
    $('#teacherEvidenceCameraStart').addEventListener('click', startCamera);
    $('#teacherEvidenceCameraTake').addEventListener('click', takePhoto);
    $('#teacherEvidenceCameraRetake').addEventListener('click', retakePhoto);
    $('#teacherEvidenceCameraUse').addEventListener('click', usePhoto);
    $('#teacherEvidenceCameraCancel').addEventListener('click', () => closeCameraDialog(true));
    $('#teacherEvidenceCameraDialog').addEventListener('cancel', event => { event.preventDefault(); closeCameraDialog(true); });
    loadRoster();
    refreshRecent();
  }
  async function deleteEvidence(row) {
    const ctx = context();
    if (!ctx?.supabase || ctx.role !== 'teacher' || !ctx.userId) return;
    if (!window.confirm('Delete this private schoolwork upload? It will not be available for analysis.')) return;
    setStatus('Marking the selected upload deleted and removing its private file…');
    try {
      const { data: path, error } = await ctx.supabase.rpc('delete_teacher_chat_evidence', { p_evidence_id: row.id });
      if (error) throw error;
      const { error: removeError } = await ctx.supabase.storage.from('teacher-chat-evidence-quarantine').remove([path]);
      await refreshRecent();
      if (removeError) {
        console.warn('Private evidence file cleanup failed:', removeError.message || 'storage cleanup failed');
        setStatus('Upload marked deleted and hidden from reading, but storage cleanup needs administrator follow-up.', true);
      } else {
        setStatus('Private upload deleted. It was never sent to Milo.');
        toast('Schoolwork upload deleted.');
      }
    } catch (error) {
      console.warn('Teacher evidence delete failed:', error?.message || 'delete failed');
      setStatus('Could not delete this upload. No change was confirmed; retry or contact the administrator.', true);
    }
  }
  async function uploadSelected() {
    if (uploading) return;
    const ctx = context();
    const file = selectedFile;
    const classroomId = currentClassroomId();
    const learnerId = currentLearnerId();
    const problem = validateFile(file);
    if (problem) return setStatus(problem, true);
    if (!ctx?.supabase || ctx.mode !== 'live' || ctx.role !== 'teacher' || !ctx.userId) return setStatus('A signed-in live teacher account is required.', true);
    uploading = true;
    const button = $('#teacherEvidenceUpload');
    const choose = $('#teacherEvidenceChoose');
    if (button) { button.disabled = true; button.textContent = 'Uploading privately…'; }
    if (choose) choose.disabled = true;
    setStatus('Uploading to private quarantine. Milo cannot access this file.');
    const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'})[file.type];
    const evidenceId = window.crypto?.randomUUID ? window.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => { const random = Math.random() * 16 | 0; return (char === 'x' ? random : (random & 3 | 8)).toString(16); });
    const storagePath = ctx.userId + '/' + classroomId + '/' + learnerId + '/' + evidenceId + '.' + extension;
    let uploaded = false;
    try {
      const { error: uploadError } = await ctx.supabase.storage.from('teacher-chat-evidence-quarantine').upload(storagePath, file, { cacheControl: '0', contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploaded = true;
      const { data, error } = await ctx.supabase.rpc('register_teacher_chat_evidence', {
        p_classroom_id: classroomId,
        p_learner_id: learnerId,
        p_storage_path: storagePath,
        p_original_filename: file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'schoolwork.' + extension,
        p_mime_type: file.type,
        p_file_size_bytes: file.size,
        p_source_type: selectedSource
      });
      if (error) throw error;
      setStatus('Upload saved privately (reference ' + String(data).slice(0, 8) + '). Status: pending security scan. It has not been sent to Milo.');
      resetSelectedFile();
      $('#teacherEvidenceDiscard').disabled = true;
      await refreshRecent();
      toast('Schoolwork saved to private quarantine; not sent to Milo.');
    } catch (error) {
      if (uploaded) {
        try { await ctx.supabase.storage.from('teacher-chat-evidence-quarantine').remove([storagePath]); } catch (_) {}
      }
      console.warn('Teacher evidence upload failed:', error?.message || 'upload failed');
      setStatus('Upload was not registered. No file was shared with Milo. Check the classroom selection and migration status, then retry.', true);
    } finally {
      uploading = false;
      if (button?.isConnected) { button.disabled = !selectedFile || !!validateFile(selectedFile); button.textContent = 'Upload to private quarantine'; }
      if (choose?.isConnected) choose.disabled = false;
    }
  }
  async function openCameraDialog() {
    if (!currentClassroomId() || !currentLearnerId()) return setStatus('Choose an active classroom and learner before opening the camera.', true);
    resetSelectedFile();
    $('#teacherEvidenceDiscard').disabled = true;
    const dialog = $('#teacherEvidenceCameraDialog');
    const status = $('#teacherEvidenceCameraStatus');
    const preview = $('#teacherEvidenceCameraPreview');
    if (preview) preview.replaceChildren();
    $('#teacherEvidenceCameraTake').disabled = true;
    $('#teacherEvidenceCameraUse').hidden = true;
    $('#teacherEvidenceCameraRetake').hidden = true;
    $('#teacherEvidenceCameraStart').hidden = false;
    if (status) status.textContent = 'Camera is off.';
    if (dialog && !dialog.open) dialog.showModal();
  }
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const status = $('#teacherEvidenceCameraStatus');
      if (status) status.textContent = 'Camera capture is not supported here. Cancel and choose a file instead.';
      return;
    }
    try {
      stopCamera();
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = $('#teacherEvidenceCameraVideo');
      video.srcObject = cameraStream;
      await video.play();
      $('#teacherEvidenceCameraTake').disabled = false;
      $('#teacherEvidenceCameraStart').hidden = true;
      $('#teacherEvidenceCameraStatus').textContent = 'Camera is active. Frame the schoolwork, then press Take photo.';
    } catch (error) {
      stopCamera();
      $('#teacherEvidenceCameraStatus').textContent = 'Camera permission was denied or the camera could not start. You can cancel and choose a file instead.';
    }
  }
  function takePhoto() {
    const video = $('#teacherEvidenceCameraVideo');
    if (!video || !cameraStream || !video.videoWidth || !video.videoHeight) {
      $('#teacherEvidenceCameraStatus').textContent = 'Camera is not ready yet. Please wait or restart it.';
      return;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2560 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return setStatus('Could not capture a photo. Try again or choose a file.', true);
      const file = new File([blob], 'schoolwork-camera-' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      if (file.size > MAX_FILE_BYTES) return setStatus('Captured photo exceeds the 20 MiB limit. Retake with a closer crop or lower resolution.', true);
      selectedFile = file;
      selectedSource = 'camera_capture';
      const preview = $('#teacherEvidenceCameraPreview');
      preview.replaceChildren();
      const image = document.createElement('img');
      previewUrl && URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      image.src = previewUrl; image.alt = 'Captured schoolwork photo preview';
      image.style.cssText = 'max-width:100%;max-height:42vh;object-fit:contain;border-radius:8px';
      preview.appendChild(image);
      $('#teacherEvidenceCameraTake').disabled = true;
      $('#teacherEvidenceCameraRetake').hidden = false;
      $('#teacherEvidenceCameraUse').hidden = false;
      $('#teacherEvidenceCameraStatus').textContent = 'Preview captured. Choose Retake, Cancel, or Use photo. Upload is a separate step.';
    }, 'image/jpeg', 0.88);
  }
  function retakePhoto() {
    resetSelectedFile();
    $('#teacherEvidenceCameraPreview').replaceChildren();
    $('#teacherEvidenceCameraTake').disabled = !cameraStream;
    $('#teacherEvidenceCameraRetake').hidden = true;
    $('#teacherEvidenceCameraUse').hidden = true;
    $('#teacherEvidenceCameraStatus').textContent = 'Ready for another photo.';
  }
  function usePhoto() {
    if (!selectedFile) return;
    closeCameraDialog(false);
    showPreview(selectedFile);
    $('#teacherEvidenceDiscard').disabled = false;
    setStatus('Camera photo ready for review. Press Upload to send it to private quarantine; it will not be sent to Milo.');
  }
  function closeCameraDialog(discardCapture = true) {
    stopCamera();
    const dialog = $('#teacherEvidenceCameraDialog');
    if (dialog?.open) dialog.close();
    if (discardCapture && selectedSource === 'camera_capture') {
      resetSelectedFile();
      const discard = $('#teacherEvidenceDiscard'); if (discard) discard.disabled = true;
      setStatus('Camera capture cancelled. No photo was uploaded.');
    } else if (selectedFile && selectedSource === 'camera_capture') {
      const submit = $('#teacherEvidenceUpload');
      if (submit) submit.disabled = !!validateFile(selectedFile) || uploading;
    }
  }
  const style = document.createElement('style');
  style.textContent = '#teacherEvidenceCameraDialog::backdrop{background:rgba(0,0,0,.55)}#teacherEvidenceCameraDialog video{display:block}#teacherEvidenceCameraDialog[open]{max-height:94vh;overflow:auto}#teacherEvidenceRecent ul{margin-top:8px}';
  document.head.appendChild(style);
  const observer = new MutationObserver(render);
  function boot() {
    const root = $('#app');
    if (root) observer.observe(root, { childList: true, subtree: true });
    render();
  }
  window.addEventListener('beforeunload', stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();