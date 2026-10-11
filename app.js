(() => {
  const $ = id => document.getElementById(id);
  const input = $('video-file'), dropzone = $('dropzone'), sourceVideo = $('source-video');
  const createBtn = $('create-btn'), emptyState = $('empty-state'), clipList = $('clip-list');
  let file = null, objectUrl = null, clips = [], toastTimer = null;
  const toast = message => {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  };
  const fmt = s => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };
  function setFile(f) {
    if (!f) return;
    if (!f.type.startsWith('video/')) { toast('Choose a video file.'); return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    file = f; objectUrl = URL.createObjectURL(f);
    sourceVideo.src = objectUrl;
    $('file-name').textContent = f.name;
    $('file-details').textContent = `${(f.size/1024/1024).toFixed(1)} MB · Loading duration…`;
    dropzone.classList.add('hidden'); $('source-info').classList.remove('hidden');
    sourceVideo.onloadedmetadata = () => {
      $('file-details').textContent = `${fmt(sourceVideo.duration)} · ${(f.size/1024/1024).toFixed(1)} MB`;
      createBtn.disabled = !(sourceVideo.duration > 0);
    };
    sourceVideo.onerror = () => { toast('This video format may not be supported by your browser.'); };
    clips = []; renderClips(); emptyState.classList.remove('hidden'); clipList.classList.add('hidden');
  }
  input.addEventListener('change', e => setFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(name => dropzone.addEventListener(name, e => {e.preventDefault();dropzone.classList.add('dragover');}));
  ['dragleave','drop'].forEach(name => dropzone.addEventListener(name, e => {e.preventDefault();dropzone.classList.remove('dragover');}));
  dropzone.addEventListener('drop', e => setFile(e.dataTransfer.files[0]));
  $('remove-video').addEventListener('click', () => {
    file = null; clips = []; sourceVideo.pause(); sourceVideo.removeAttribute('src'); sourceVideo.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null;
    $('source-info').classList.add('hidden'); dropzone.classList.remove('hidden'); createBtn.disabled = true;
    emptyState.classList.remove('hidden'); clipList.classList.add('hidden'); $('clip-count').textContent='0 / 5';
  });
  function captionFor(index, start, length) {
    const raw = $('script').value.trim();
    if (!raw) return 'Add a transcript in settings to create caption text for this clip.';
    const sentences = raw.match(/[^.!?]+[.!?]*/g) || [raw];
    const parts = sentences.map(s=>s.trim()).filter(Boolean);
    if (!parts.length) return raw.slice(0,160);
    const chunk = Math.max(1, Math.ceil(parts.length/5));
    return parts.slice(index*chunk, (index+1)*chunk).join(' ').slice(0,260) || parts[index%parts.length].slice(0,260);
  }
  async function createClips() {
    if (!file || !Number.isFinite(sourceVideo.duration)) return;
    const duration = sourceVideo.duration, requested = Number($('duration').value);
    if (duration < 5) { toast('Video is too short to create five useful clips.'); return; }
    createBtn.disabled = true; emptyState.classList.add('hidden'); clipList.classList.add('hidden'); $('processing').classList.remove('hidden');
    const bar = $('progress-bar'), title = $('processing-title'), sub = $('processing-sub');
    clips = [];
    for (let i=0;i<5;i++) {
      title.textContent = `Preparing clip ${i+1} of 5…`;
      sub.textContent = 'Choosing a segment and preparing its caption draft';
      bar.style.width = `${(i/5)*100}%`;
      await new Promise(resolve => setTimeout(resolve, 180));
      const len = Math.min(requested, duration);
      const start = duration <= len ? 0 : Math.min(Math.max(0, duration*(i+0.5)/5-len/2), duration-len);
      clips.push({id:i+1,start,end:start+len,caption:captionFor(i,start,len),format:$('format').value,style:$('caption-style').value});
    }
    bar.style.width='100%'; await new Promise(resolve=>setTimeout(resolve,250));
    $('processing').classList.add('hidden'); clipList.classList.remove('hidden'); renderClips();
    createBtn.disabled = false; createBtn.innerHTML='<span>↻</span> Recreate 5 shorts <span class="arrow">→</span>';
    toast('Five clip drafts are ready. Export each clip from its card.');
  }
  function renderClips() {
    $('clip-count').textContent = `${clips.length} / 5`;
    if (!clips.length) { clipList.innerHTML=''; return; }
    clipList.innerHTML = clips.map(c => `
      <article class="clip-card" data-id="${c.id}">
        <div class="clip-thumb"><div class="thumb-play">▶</div></div>
        <div class="clip-info">
          <div class="clip-top"><b>Short ${c.id}</b><span class="clip-time">${fmt(c.start)}–${fmt(c.end)}</span></div>
          <p>${c.end-c.start}s · ${c.format} · Draft segment</p>
          <div class="clip-caption" id="caption-${c.id}">${escapeHtml(c.caption)}</div>
          <div class="clip-buttons"><button class="small-btn" data-action="preview" data-id="${c.id}">▶ Preview</button><button class="small-btn secondary" data-action="caption" data-id="${c.id}">Edit caption</button><button class="small-btn secondary" data-action="voice" data-id="${c.id}">Hear voice</button><button class="small-btn secondary" data-action="export" data-id="${c.id}">Export clip</button></div>
        </div>
      </article>`).join('');
    clipList.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>handleClipAction(btn.dataset.action,Number(btn.dataset.id))));
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function handleClipAction(action,id) {
    const c = clips.find(x=>x.id===id); if (!c) return;
    if (action==='caption') {
      const updated = prompt('Edit the caption / narration text for Short '+id, c.caption);
      if (updated !== null) { c.caption=updated.trim(); $('caption-'+id).textContent=c.caption || ' '; }
    } else if (action==='voice') {
      if (!('speechSynthesis' in window)) { toast('Text-to-speech is not supported in this browser.'); return; }
      const utterance = new SpeechSynthesisUtterance(c.caption || 'Add narration text first.');
      const voices = speechSynthesis.getVoices(), preference = $('voice').value;
      const matching = voices.find(v => preference==='female' ? /female|samantha|victoria|zira|karen/i.test(v.name) : preference==='male' ? /male|david|mark|daniel|alex/i.test(v.name) : true);
      if (matching && preference!=='none') utterance.voice=matching;
      if (preference==='none') { toast('Select a narrator voice in settings first.'); return; }
      speechSynthesis.cancel(); speechSynthesis.speak(utterance);
    } else if (action==='preview') {
      sourceVideo.pause(); sourceVideo.currentTime=c.start; sourceVideo.controls=true; sourceVideo.play().catch(()=>{});
      const stopAt=()=>{ if(sourceVideo.currentTime>=c.end){sourceVideo.pause();sourceVideo.removeEventListener('timeupdate',stopAt);} };
      sourceVideo.addEventListener('timeupdate',stopAt); toast(`Previewing Short ${id} in the source player.`);
    } else if (action==='export') {
      exportClip(c);
    }
  }
  async function exportClip(c) {
    if (!file || !sourceVideo.videoWidth) { toast('Wait for the video to finish loading.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Video export is not supported in this browser. Try a current desktop Chrome or Edge.'); return; }
    toast('Preparing export. Keep this tab open until it finishes.');
    const canvas=document.createElement('canvas');
    const ratio=c.format==='9:16'?[9,16]:c.format==='1:1'?[1,1]:[16,9];
    const w=720,h=Math.round(w*ratio[1]/ratio[0]); canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');
    const stream=canvas.captureStream(30);
    let audioStream=null, combined=stream;
    try {
      const media=sourceVideo.captureStream ? sourceVideo.captureStream() : sourceVideo.mozCaptureStream?.();
      if(media){ const tracks=media.getAudioTracks(); tracks.forEach(t=>stream.addTrack(t)); }
    } catch(e) {}
    const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m)) || '';
    let recorder; try {recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);} catch(e){toast('Could not start video export in this browser.');return;}
    const chunks=[]; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>toast('Export failed. Try a shorter clip or a different browser.');
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'}), url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download=`clipforge-short-${c.id}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
      stream.getTracks().forEach(t=>t.stop());toast(`Short ${c.id} exported. Captions are not burned into this video file.`);
    };
    let drawing=true;
    function draw(){
      if(!drawing)return;
      const vw=sourceVideo.videoWidth,vh=sourceVideo.videoHeight;
      const scale=Math.max(w/vw,h/vh), sw=w/scale, sh=h/scale, sx=(vw-sw)/2, sy=(vh-sh)/2;
      ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
      try{ctx.drawImage(sourceVideo,sx,sy,sw,sh,0,0,w,h);}catch(e){}
      if(c.caption && !c.caption.startsWith('Add a transcript')) {
        const style=c.style; const fontSize=style==='minimal'?24:style==='clean'?27:31;
        ctx.font=`${style==='bold'?'800':'600'} ${fontSize}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
        const words=c.caption.split(/\s+/);let lines=[],line='';
        for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>w-70&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);
        lines=lines.slice(0,3);const lineH=fontSize*1.2, y=h*.78-(lines.length-1)*lineH/2;
        lines.forEach((ln,i)=>{const yy=y+i*lineH;if(style==='bold'){ctx.lineWidth=5;ctx.strokeStyle='#111';ctx.strokeText(ln,w/2,yy);}ctx.fillStyle=style==='minimal'?'#fff':style==='clean'?'#bff9f1':'#fff';ctx.fillText(ln,w/2,yy);});
      }
      requestAnimationFrame(draw);
    }
    const oldTime=sourceVideo.currentTime, oldPaused=sourceVideo.paused;
    sourceVideo.pause();sourceVideo.currentTime=c.start;
    await new Promise(resolve=>{const fn=()=>{sourceVideo.removeEventListener('seeked',fn);resolve();};sourceVideo.addEventListener('seeked',fn);sourceVideo.currentTime=c.start;});
    recorder.start(250); drawing=true;draw();sourceVideo.play().catch(()=>{});
    const finish=()=>{drawing=false;sourceVideo.pause();sourceVideo.removeEventListener('timeupdate',watch);try{recorder.stop();}catch(e){}sourceVideo.currentTime=oldTime;if(!oldPaused)sourceVideo.play().catch(()=>{});};
    const watch=()=>{if(sourceVideo.currentTime>=c.end)finish();};
    sourceVideo.addEventListener('timeupdate',watch);
    setTimeout(()=>{if(recorder.state==='recording')finish();},(c.end-c.start)*1000+2000);
  }
  createBtn.addEventListener('click',createClips);
  document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n===btn));
    $('studio-view').classList.toggle('hidden',btn.dataset.view!=='studio');
    $('library-view').classList.toggle('hidden',btn.dataset.view!=='library');
  }));
  $('back-to-studio').addEventListener('click',()=>document.querySelector('[data-view="studio"]').click());
})();