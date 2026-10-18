(() => {
  const $ = id => document.getElementById(id);
  const video = $("sourceVideo"), canvas = $("previewCanvas"), ctx = canvas.getContext("2d");
  const state = { file: null, url: null, duration: 0, clips: [], selected: -1, exporting: false, raf: 0 };
  const fmt = n => { n = Math.max(0, Number(n) || 0); const m = Math.floor(n / 60), s = Math.floor(n % 60); return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const activeClip = () => state.clips[state.selected];
  const setStatus = t => $("editStatus").textContent = t || "";
  function enableEditor(on) { ["clipTitle","captionText","startTime","endTime","captionStyle","saveClip","deleteClip"].forEach(id => $(id).disabled = !on); }
  function videoLoaded() {
    state.duration = video.duration || 0;
    $("videoMeta").classList.remove("hidden");
    $("videoMeta").textContent = `${state.file.name} · ${fmt(state.duration)} · ${(state.file.size / 1048576).toFixed(1)} MB`;
    $("durationText").textContent = fmt(state.duration);
    $("scrubber").max = state.duration || 100;
    $("scrubber").disabled = false; $("playPause").disabled = false; $("generateClips").disabled = !(state.duration > 0);
    $("sourceVideo").classList.remove("hidden");
    $("sourceVideo").style.display = "none";
    $("previewCanvas").classList.remove("hidden");
    $("videoStage").querySelector(".empty-preview").classList.add("hidden");
    resizeCanvas(); drawPreview();
  }
  function loadFile(file) {
    if (!file || !file.type.startsWith("video/")) { alert("Please choose a valid video file."); return; }
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = file; state.url = URL.createObjectURL(file);
    state.clips = []; state.selected = -1; renderClips(); renderExports();
    video.pause(); video.src = state.url; video.load();
    video.onloadedmetadata = () => videoLoaded();
    video.onerror = () => alert("This video format could not be opened by your browser. Try MP4 (H.264) or WebM.");
  }
  function resizeCanvas() {
    if (!video.videoWidth || !video.videoHeight) return;
    const mode = $("format").value;
    let w, h;
    if (mode === "vertical") { w = 720; h = 1280; }
    else if (mode === "square") { w = 900; h = 900; }
    else { const ratio = video.videoWidth / video.videoHeight; if (ratio >= 1) { w = 960; h = Math.round(960 / ratio); } else { h = 960; w = Math.round(960 * ratio); } }
    canvas.width = w; canvas.height = h;
    canvas.style.aspectRatio = `${w}/${h}`;
    canvas.style.width = "auto"; canvas.style.maxWidth = "100%";
  }
  function drawFrame(targetCtx, targetCanvas, withText = true) {
    if (!video.videoWidth || !video.videoHeight) return;
    const w = targetCanvas.width, h = targetCanvas.height, vr = video.videoWidth / video.videoHeight, cr = w / h;
    let sx=0, sy=0, sw=video.videoWidth, sh=video.videoHeight;
    if ($("format").value === "original") { if (vr > cr) { sh = video.videoHeight; sw = sh * cr; sx = (video.videoWidth - sw)/2; } else { sw = video.videoWidth; sh = sw/cr; sy = (video.videoHeight-sh)/2; } }
    else if (vr > cr) { sw = video.videoHeight * cr; sx = (video.videoWidth-sw)/2; }
    else { sh = video.videoWidth / cr; sy = (video.videoHeight-sh)/2; }
    targetCtx.fillStyle = "#050507"; targetCtx.fillRect(0,0,w,h);
    targetCtx.drawImage(video,sx,sy,sw,sh,0,0,w,h);
    const c = activeClip();
    if (withText && c) {
      const title = c.title.trim(), caption = c.caption.trim();
      if (title || caption) {
        targetCtx.textAlign = "center"; targetCtx.textBaseline = "middle";
        const style = c.style || "bold";
        if (title) {
          const size = Math.max(22, Math.round(w*0.045)); targetCtx.font = `900 ${size}px Arial,sans-serif`;
          targetCtx.lineWidth = Math.max(3,w*0.006); targetCtx.strokeStyle = "rgba(0,0,0,.9)"; targetCtx.fillStyle = "#fff";
          const words = title.toUpperCase().split(/\s+/); const lines=[]; let line="";
          words.forEach(word=>{ const test=line?line+" "+word:word; if(targetCtx.measureText(test).width>w*.84&&line){lines.push(line);line=word;}else line=test;}); if(line)lines.push(line);
          const y = h*.76 - (lines.length-1)*size*.56;
          lines.slice(0,3).forEach((l,i)=>{targetCtx.strokeText(l,w/2,y+i*size*1.12);targetCtx.fillText(l,w/2,y+i*size*1.12);});
        }
        if (caption && style !== "minimal") {
          const size=Math.max(17,Math.round(w*.027));targetCtx.font=`${style==="bold"?"800":"500"} ${size}px Arial,sans-serif`;
          const maxW=w*.86, words=caption.split(/\s+/),lines=[];let line="";
          words.forEach(word=>{const test=line?line+" "+word:word;if(targetCtx.measureText(test).width>maxW&&line){lines.push(line);line=word;}else line=test;});if(line)lines.push(line);
          const visible=lines.slice(0,3), lineH=size*1.3, y=h*.88-(visible.length-1)*lineH/2, pad=size*.45;
          if(style==="bold"){const maxWidth=Math.max(...visible.map(l=>targetCtx.measureText(l).width));targetCtx.fillStyle="rgba(0,0,0,.8)";targetCtx.fillRect((w-maxWidth)/2-pad,y-lineH/2-pad,maxWidth+pad*2,visible.length*lineH+pad*2);}
          targetCtx.fillStyle="#fff";visible.forEach((l,i)=>targetCtx.fillText(l,w/2,y+i*lineH));
        } else if(caption && style==="minimal") {
          targetCtx.font=`500 ${Math.max(16,Math.round(w*.025))}px Arial`;targetCtx.fillStyle="#fff";targetCtx.fillText(caption.slice(0,90),w/2,h*.9);
        }
      }
    }
  }
  function drawPreview() {
    if (!video.videoWidth) return;
    resizeCanvas(); drawFrame(ctx,canvas,true);
    $("currentTime").textContent = fmt(video.currentTime);
    $("scrubber").value = video.currentTime;
    $("previewOverlay").classList.add("hidden");
  }
  function loop() { drawPreview(); if (!video.paused && !video.ended) state.raf = requestAnimationFrame(loop); }
  function chooseClip(i) {
    if (i < 0 || i >= state.clips.length) return;
    state.selected = i; const c=activeClip();
    $("selectedClipLabel").textContent=`Clip ${i+1}`;
    $("clipTitle").value=c.title; $("captionText").value=c.caption;
    $("startTime").value=c.start.toFixed(1); $("endTime").value=c.end.toFixed(1); $("captionStyle").value=c.style;
    enableEditor(true); setStatus(""); renderClips(); renderExports();
    video.pause(); video.currentTime = c.start; video.onseeked = () => { drawPreview(); video.onseeked=null; };
  }
  function renderClips() {
    $("clipCountBadge").textContent=`${state.clips.length} clip${state.clips.length===1?"":"s"}`;
    const list=$("clipList");
    if(!state.clips.length){list.innerHTML='<div class="empty-list">Your clip candidates will appear here.</div>';return;}
    list.innerHTML=state.clips.map((c,i)=>`<article class="clip-card ${i===state.selected?"active":""}" data-index="${i}"><div class="clip-card-top"><span class="clip-number">CLIP ${i+1}</span><span class="clip-duration">${fmt(c.end-c.start)}</span></div><h4>${esc(c.title||"Untitled clip")}</h4><p>${fmt(c.start)} – ${fmt(c.end)} · ${esc(c.caption||"No caption added")}</p><div class="clip-card-bottom"><span>${i===state.selected?"Editing":"Candidate"}</span><button type="button" data-remove="${i}" aria-label="Remove clip ${i+1}">Remove</button></div></article>`).join("");
    list.querySelectorAll(".clip-card").forEach(el=>el.addEventListener("click",e=>{if(e.target.dataset.remove!==undefined){e.stopPropagation();const i=Number(e.target.dataset.remove);state.clips.splice(i,1);state.selected=-1;enableEditor(false);renderClips();renderExports();$("selectedClipLabel").textContent="No clip selected";drawPreview();}else chooseClip(Number(el.dataset.index));}));
  }
  function renderExports() {
    const out=$("exportList");
    if(!state.clips.length){out.innerHTML='<p class="hint">Add a video and create clip candidates to see export options.</p>';return;}
    out.innerHTML=state.clips.map((c,i)=>`<div class="export-item"><div><strong>Clip ${i+1}: ${esc(c.title||"Untitled")}</strong><span>${fmt(c.end-c.start)} · WebM video</span></div><button class="button secondary" data-export="${i}" ${state.exporting?"disabled":""}>Export clip</button></div>`).join("");
    out.querySelectorAll("[data-export]").forEach(b=>b.addEventListener("click",()=>exportClip(Number(b.dataset.export))));
  }
  function generate() {
    if(!state.duration){return;}
    const count=Number($("clipCount").value), len=Math.min(Number($("clipLength").value),state.duration), maxStart=Math.max(0,state.duration-len);
    state.clips=[];
    // Evenly spaced candidate segments; these are starting points, not AI-detected highlights.
    for(let i=0;i<count;i++){
      let start=count===1?0:(maxStart*i/(count-1));
      if(maxStart===0)start=0;
      const end=Math.min(state.duration,start+len);
      state.clips.push({start:Number(start.toFixed(1)),end:Number(end.toFixed(1)),title:["THE MOMENT YOU NEED TO SEE","HERE’S THE KEY TAKEAWAY","WATCH WHAT HAPPENS NEXT","THIS CHANGES EVERYTHING","DON’T MISS THIS PART","THE BIGGEST LESSON","A MOMENT WORTH SHARING"][i%7],caption:"",style:"bold"});
    }
    renderClips();renderExports();chooseClip(0);
  }
  function saveEdits() {
    const c=activeClip(); if(!c)return;
    const start=Number($("startTime").value),end=Number($("endTime").value);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>state.duration||end<=start){setStatus("Use valid times within the video.");return;}
    c.start=start;c.end=end;c.title=$("clipTitle").value.trim();c.caption=$("captionText").value.trim();c.style=$("captionStyle").value;
    setStatus("Edits saved.");renderClips();renderExports();video.currentTime=c.start;video.onseeked=()=>{drawPreview();video.onseeked=null;};
  }
  async function seekTo(t) {
    if(Math.abs(video.currentTime-t)<.04)return;
    await new Promise(resolve=>{const done=()=>{video.removeEventListener("seeked",done);resolve();};video.addEventListener("seeked",done);video.currentTime=t;});
  }
  async function exportClip(index) {
    const c=state.clips[index]; if(!c||state.exporting)return;
    if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream){alert("This browser does not support local video export. Try the latest Chrome or Edge.");return;}
    state.exporting=true;renderExports();$("exportProgress").classList.remove("hidden");$("progressBar").style.width="0%";$("progressLabel").textContent="Preparing clip…";
    const oldTime=video.currentTime, wasPaused=video.paused;
    let stream=null, recorder=null, chunks=[];
    try{
      resizeCanvas();await seekTo(c.start);drawFrame(ctx,canvas,true);
      const canvasStream=canvas.captureStream(30);
      const audioStream=typeof video.captureStream==="function"?video.captureStream():null;
      if(audioStream){audioStream.getAudioTracks().forEach(t=>canvasStream.addTrack(t));}
      stream=canvasStream;
      const mimeTypes=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
      const mime=mimeTypes.find(t=>MediaRecorder.isTypeSupported(t))||"";
      recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:4500000}:undefined);
      chunks=[];recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
      const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error("The browser could not render this clip."));});
      recorder.start(250);video.muted=false;await video.play();
      const total=c.end-c.start;
      $("progressLabel").textContent=`Rendering clip ${index+1}…`;
      await new Promise((resolve,reject)=>{
        let last=0;
        const tick=()=>{
          if(video.currentTime>=c.end || video.ended){video.pause();resolve();return;}
          const pct=Math.min(99,((video.currentTime-c.start)/total)*100);
          $("progressBar").style.width=`${pct}%`;
          if(performance.now()-last>250){$("progressLabel").textContent=`Rendering ${Math.floor(pct)}%`;last=performance.now();}
          requestAnimationFrame(tick);
        };requestAnimationFrame(tick);
        video.onerror=()=>reject(new Error("Playback failed during export."));
      });
      if(recorder.state!=="inactive")recorder.stop();await finished;
      if(!chunks.length)throw new Error("No video data was produced. Try a shorter clip or a different browser.");
      const blob=new Blob(chunks,{type:recorder.mimeType||"video/webm"});
      const a=document.createElement("a"),url=URL.createObjectURL(blob);
      a.href=url;a.download=`clipforge-clip-${index+1}.webm`;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      $("progressBar").style.width="100%";$("progressLabel").textContent="Download started";
    }catch(err){console.error(err);alert(`Export failed: ${err.message||err}. Try Chrome, use a shorter clip, or use an MP4/WebM source.`);$("progressLabel").textContent="Export failed";}
    finally{
      if(stream)stream.getTracks().forEach(t=>t.stop());
      if(recorder&&recorder.state!=="inactive"){try{recorder.stop();}catch{}}
      state.exporting=false;video.pause();try{await seekTo(Math.min(oldTime,state.duration));}catch{}
      if(!wasPaused)video.play().catch(()=>{});else drawPreview();
      renderExports();
    }
  }
  $("videoFile").addEventListener("change",e=>loadFile(e.target.files[0]));
  const dz=$("dropzone");["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("dragover");}));["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("dragover");}));dz.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));
  $("openYoutube").addEventListener("click",()=>{const url=$("youtubeUrl").value.trim();if(!url){alert("Paste a YouTube link first.");return;}try{const u=new URL(url);if(!["youtube.com","www.youtube.com","youtu.be","m.youtube.com"].includes(u.hostname)){alert("Enter a valid YouTube URL.");return;}window.open(u.href,"_blank","noopener,noreferrer");}catch{alert("Enter a valid URL.");}});
  $("generateClips").addEventListener("click",generate);
  $("format").addEventListener("change",()=>{resizeCanvas();drawPreview();});
  $("clipLength").addEventListener("input",()=> $("clipLengthOut").textContent=`${$("clipLength").value} seconds`);
  $("playPause").addEventListener("click",()=>{if(video.paused){const c=activeClip();if(c&&(video.currentTime<c.start||video.currentTime>=c.end))video.currentTime=c.start;video.play().then(()=>{ $("playPause").textContent="Ⅱ Pause";loop();}).catch(()=>{});}else{video.pause();$("playPause").textContent="▶ Play";}});
  video.addEventListener("pause",()=>{$("playPause").textContent="▶ Play";drawPreview();});
  video.addEventListener("play",()=>{cancelAnimationFrame(state.raf);loop();});
  video.addEventListener("timeupdate",()=>{const c=activeClip();if(c&&!video.paused&&video.currentTime>=c.end){video.pause();video.currentTime=c.start;}});
  $("scrubber").addEventListener("input",()=>{video.currentTime=Number($("scrubber").value);drawPreview();});
  $("saveClip").addEventListener("click",saveEdits);
  $("deleteClip").addEventListener("click",()=>{if(state.selected<0)return;state.clips.splice(state.selected,1);state.selected=-1;enableEditor(false);$("selectedClipLabel").textContent="No clip selected";renderClips();renderExports();drawPreview();});
  $("clipTitle").addEventListener("input",()=>{const c=activeClip();if(c){c.title=$("clipTitle").value;drawPreview();}});
  $("captionText").addEventListener("input",()=>{const c=activeClip();if(c){c.caption=$("captionText").value;drawPreview();}});
  $("captionStyle").addEventListener("change",()=>{const c=activeClip();if(c){c.style=$("captionStyle").value;drawPreview();}});
  video.addEventListener("seeked",drawPreview);
  enableEditor(false);
})();