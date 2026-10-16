(() => {
  const $ = id => document.getElementById(id);
  const MODEL = 'gemini-3.8-live';
  const KEY_STORE = 'aika_gemini_key_v1';
  let ws = null, audioCtx = null, micStream = null, processor = null, source = null;
  let connected = false, ready = false, playbackTime = 0, playbackSources = [], userBubble = null, partialUser = '', partialAika = '';
  const status = (message, error=false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
  const addBubble = (who, text) => {
    $('empty')?.remove(); const node = document.createElement('div'); node.className = `bubble ${who}`; node.textContent = text; $('chat').appendChild(node); $('chat').scrollTop = $('chat').scrollHeight; return node;
  };
  const appendText = (who, text) => {
    if (!text) return;
    if (who === 'you') { if (!userBubble) userBubble = addBubble('you', ''); userBubble.textContent += text; }
    else { if (!window.__aikaBubble) window.__aikaBubble = addBubble('aika', ''); window.__aikaBubble.textContent += text; }
    $('chat').scrollTop = $('chat').scrollHeight;
  };
  const setMode = mode => { $('orb').className = 'orb' + (mode ? ` ${mode}` : ''); if(mode==='listening') $('headline').textContent='I’m listening…'; else if(mode==='speaking') $('headline').textContent='I’m here with you 💗'; else $('headline').textContent='Hi, I’m Aika 💗'; };
  function b64(bytes) { let s=''; const step=0x8000; for(let i=0;i<bytes.length;i+=step) s+=String.fromCharCode(...bytes.subarray(i,i+step)); return btoa(s); }
  function fromB64(str) { const bin=atob(str); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
  function pcm16ToFloat(bytes) { const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); const f=new Float32Array(bytes.byteLength/2); for(let i=0;i<f.length;i++) f[i]=view.getInt16(i*2,true)/32768; return f; }
  function downsampleTo16k(input, rate) {
    if (rate === 16000) { const out=new Int16Array(input.length); for(let i=0;i<input.length;i++) out[i]=Math.max(-1,Math.min(1,input[i]))*32767; return out; }
    const ratio=rate/16000, length=Math.floor(input.length/ratio), out=new Int16Array(length);
    for(let i=0;i<length;i++){ const start=Math.floor(i*ratio), end=Math.min(Math.floor((i+1)*ratio),input.length); let sum=0; for(let j=start;j<end;j++) sum+=input[j]; const sample=sum/Math.max(1,end-start); out[i]=Math.max(-1,Math.min(1,sample))*32767; }
    return out;
  }
  function playPcm24k(base64) {
    if(!audioCtx) return; const bytes=fromB64(base64), floats=pcm16ToFloat(bytes); const buffer=audioCtx.createBuffer(1,floats.length,24000); buffer.copyToChannel(floats,0);
    const node=audioCtx.createBufferSource(); node.buffer=buffer; node.connect(audioCtx.destination); const now=audioCtx.currentTime; playbackTime=Math.max(playbackTime,now); node.start(playbackTime); playbackTime+=buffer.duration; playbackSources.push(node); node.onended=()=>{playbackSources=playbackSources.filter(n=>n!==node); if(ready && playbackSources.length===0) setMode('listening');}; setMode('speaking');
  }
  function sendAudio(samples) {
    if(!ws || ws.readyState!==WebSocket.OPEN || !ready) return;
    ws.send(JSON.stringify({realtimeInput:{audio:{data:b64(new Uint8Array(samples.buffer)),mimeType:'audio/pcm;rate=16000'}}}));
  }
  async function start() {
    const key=$('apiKey').value.trim() || localStorage.getItem(KEY_STORE);
    if(!key){$('settings').open=true;status('Add your Gemini API key in Settings first.',true);return;}
    if(!navigator.mediaDevices?.getUserMedia){status('Microphone access needs HTTPS. Open the deployed app in Chrome.',true);return;}
    $('connect').disabled=true; status('Requesting microphone permission…');
    try {
      audioCtx = new (window.AudioContext||window.webkitAudioContext)(); await audioCtx.resume();
      micStream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      const url='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key);
      ws = new WebSocket(url);
      ws.onopen = () => {
        const style=$('language').value;
        const instructions = `You are Aika, a warm, caring, playful AI companion. Be emotionally attentive and conversational, not robotic. Be honest that you are an AI; never claim to be a human. Speak naturally and concisely, usually 1–3 sentences, and ask gentle follow-up questions. Match the user's language: Hindi, Hinglish, or English. ${style==='hi'?'Prefer natural Hindi/Hinglish unless the user uses English.':style==='en'?'Prefer English unless the user clearly speaks another language.':'Follow the language the user speaks.'} Offer supportive listening without pretending to replace professional help. Never claim you completed real-world actions unless you actually did. Do not sing copyrighted song lyrics on request; you may hum or create a short original melody if the model supports it. Avoid overly formal language.`;
        ws.send(JSON.stringify({setup:{model:`models/${MODEL}`,generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:$('voice').value}}}},systemInstruction:{parts:[{text:instructions}]},inputAudioTranscription:{},outputAudioTranscription:{}}}));
      };
      ws.onmessage = async ev => {
        let msg; try { msg=JSON.parse(ev.data); } catch { return; }
        if(msg.error){status(msg.error.message || 'The AI service returned an error.',true);return;}
        if(msg.setupComplete){ready=true;connected=true;$('disconnect').disabled=false;status('Connected — talk naturally.');setMode('listening');source=audioCtx.createMediaStreamSource(micStream);processor=audioCtx.createScriptProcessor(4096,1,1);processor.onaudioprocess=e=>{if(ready&&ws?.readyState===WebSocket.OPEN){const pcm=downsampleTo16k(e.inputBuffer.getChannelData(0),audioCtx.sampleRate);sendAudio(pcm);}};source.connect(processor);processor.connect(audioCtx.destination);return;}
        const sc=msg.serverContent;
        if(sc){
          if(sc.inputTranscription?.text){appendText('you',sc.inputTranscription.text);}
          if(sc.outputTranscription?.text){appendText('aika',sc.outputTranscription.text);}
          if(sc.modelTurn?.parts){for(const part of sc.modelTurn.parts){if(part.inlineData?.data && (part.inlineData.mimeType||'').startsWith('audio/')) playPcm24k(part.inlineData.data); if(part.text) appendText('aika',part.text);}}
          if(sc.turnComplete){userBubble=null;window.__aikaBubble=null;partialUser='';partialAika='';if(ready)status('Connected — you can keep talking.');}
          if(sc.interrupted){playbackSources.forEach(n=>{try{n.stop()}catch{}});playbackSources=[];playbackTime=audioCtx?.currentTime||0;setMode('listening');}
        }
      };
      ws.onerror=()=>status('Connection error. Check your key, internet, and model access.',true);
      ws.onclose=()=>{if(connected) status('Voice chat ended.'); cleanup(false);};
    } catch(err){status(err?.message?.includes('Permission')?'Microphone permission was denied. Allow it in Chrome settings.':`Could not start: ${err.message||err}`,true);cleanup(true);}
  }
  function cleanup(showReady=true){ready=false;connected=false;try{processor?.disconnect()}catch{}try{source?.disconnect()}catch{}processor=null;source=null;if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}playbackSources.forEach(n=>{try{n.stop()}catch{}});playbackSources=[];playbackTime=0;if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null;}const old=ws;ws=null;if(old&&old.readyState===WebSocket.OPEN)old.close();$('connect').disabled=false;$('disconnect').disabled=true;setMode('');if(showReady)status('Ready when you are.');}
  $('connect').addEventListener('click',start);$('disconnect').addEventListener('click',()=>cleanup());
  $('saveKey').addEventListener('click',()=>{const key=$('apiKey').value.trim();if(!key){status('Paste an API key first.',true);return;}localStorage.setItem(KEY_STORE,key);status('Key saved on this device.');});
  $('forgetKey').addEventListener('click',()=>{localStorage.removeItem(KEY_STORE);$('apiKey').value='';status('Saved key removed from this browser.');});
  $('clear').addEventListener('click',()=>{$('chat').innerHTML='<div class="empty" id="empty">Your conversation will appear here.</div>';userBubble=null;window.__aikaBubble=null;});
  const saved=localStorage.getItem(KEY_STORE);if(saved)$('apiKey').value=saved;
  window.addEventListener('beforeunload',()=>cleanup(false));
  if('serviceWorker' in navigator && location.protocol.startsWith('https')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
