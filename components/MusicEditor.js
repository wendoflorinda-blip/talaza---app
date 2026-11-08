import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

function drawCover(context, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale, sh = height / scale;
  context.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, width, height);
}


const css = `
:global(*){box-sizing:border-box}
.musicOverlay{position:fixed;inset:0;z-index:9999;background:#050807;color:#f5f3ec;display:flex;align-items:stretch;justify-content:center;font-family:Arial,sans-serif}
.musicPanel{width:100%;height:100%;max-width:760px;background:#0b100e;display:flex;flex-direction:column;overflow:hidden;position:relative}
.topbar{height:68px;flex:none;display:flex;align-items:center;gap:14px;padding:0 18px;border-bottom:1px solid #202923;background:#0b100e}
.topbar button{border:0;background:#18221c;color:#fff;border-radius:50%;width:40px;height:40px;font-size:25px}
.topbar .brand{display:flex;flex-direction:column;flex:1;gap:3px}.brand small,.intro small{font-size:10px;letter-spacing:2px;color:#c9a84c}.brand b{font-size:19px}.topbar .close{font-size:27px}
.screen{padding:22px 18px 36px;overflow-y:auto;flex:1;overscroll-behavior:contain}
.intro{margin:8px 0 25px}.intro h1{font-size:27px;line-height:1.15;margin:9px 0;color:#fff}.intro p,.note{color:#a8b2aa;font-size:14px;line-height:1.5;margin:8px 0}
.upload{min-height:190px;border:1px dashed #55705c;border-radius:20px;background:linear-gradient(145deg,#15231a,#101713);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;position:relative;color:#fff}.upload span{font-size:38px;color:#d4af37}.upload b{font-size:17px}.upload small{color:#9eaaa0}.upload input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.selected,.photoOptions,.chosen{margin-top:18px;padding:15px;background:#151e19;border:1px solid #26352b;border-radius:16px}.selected video{width:100%;max-height:260px;margin-top:12px;border-radius:12px}.thumbs{display:flex;gap:8px;overflow:auto;margin:12px 0}.thumbs img{width:72px;height:72px;object-fit:cover;border-radius:10px}
.photoOptions{display:flex;gap:12px}.photoOptions label{flex:1;color:#b9c2bb;font-size:12px}.photoOptions select{display:block;width:100%;margin-top:8px;background:#0c120e;color:white;border:1px solid #3b4b40;padding:12px;border-radius:10px}
.primary{width:100%;min-height:54px;margin-top:20px;border:0;border-radius:14px;background:linear-gradient(110deg,#0c6b3b,#16834a);color:white;font-size:16px;font-weight:700}
.soundChoice{position:relative;z-index:2;pointer-events:auto;touch-action:manipulation;cursor:pointer;width:100%;display:flex;align-items:center;gap:15px;padding:19px;margin:10px 0;border:1px solid #314238;border-radius:17px;background:#151e19;color:white;text-align:left;min-height:86px}.soundChoice:disabled{opacity:.65;cursor:wait}.soundChoice>span{font-size:28px}.soundChoice div{display:flex;flex-direction:column;gap:5px;flex:1}.soundChoice b{font-size:18px}.soundChoice small{color:#aab5ad;font-size:12px}.soundChoice i{font-style:normal;font-size:22px;color:#c9a84c}.soundChoice.gold{border-color:#a98a35;background:linear-gradient(110deg,#1b241c,#292315)}
.library{background:#0a0e0c}.search{height:50px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:14px;background:#1a231e;border:1px solid #2a382f}.search span{font-size:24px;color:#c9a84c}.search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:15px}
.sectionTitle{display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px}.sectionTitle b{font-size:16px}.sectionTitle small{color:#9ca99f;font-size:12px}
.genres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.genre{border:1px solid #354439;border-radius:12px;padding:13px 7px;color:#f5f4ee;font-weight:700;font-size:12px;background:linear-gradient(135deg,#203b2b,#17231c);min-height:48px}.genre:nth-child(6n+2){background:linear-gradient(135deg,#45351d,#282116)}.genre:nth-child(6n+3){background:linear-gradient(135deg,#332644,#201b2c)}.genre:nth-child(6n+4){background:linear-gradient(135deg,#1c3942,#17252b)}.genre:nth-child(6n+5){background:linear-gradient(135deg,#49302c,#291e1b)}.genre.active{border:2px solid #d4af37;color:#f5d979}
.tracks{display:flex;flex-direction:column;gap:7px}.track{display:flex;align-items:center;gap:10px;padding:10px 9px;background:#141c17;border:1px solid #222f26;border-radius:13px;min-width:0}.cover{width:43px;height:43px;flex:none;display:grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,#234b31,#9a762b);color:#f8e8a7;font-size:22px}.trackName{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}.trackName b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trackName small{font-size:11px;color:#a7b1a9}.round,.heart,.add{border:0;flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center}.round{background:#29362d;color:white}.heart{background:transparent;color:#c7cfc8;font-size:22px}.heart.liked{color:#ef6d7c}.add{background:#168347;color:white;font-size:25px;font-weight:700}
.preview{position:sticky;bottom:0;margin-top:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;background:#202b23;border:1px solid #405443;border-radius:12px}.preview b,.preview small{font-size:11px}.preview div{height:4px;background:#46564a;border-radius:5px;flex:1;overflow:hidden}.preview i{display:block;height:100%;background:#d4af37}.preview small{color:#d5dcd6}
.chosen{display:flex;align-items:center;gap:12px}.chosen>div:nth-child(2){display:flex;flex-direction:column;gap:5px;flex:1}.chosen small{color:#aab5ad}.chosen button{border:1px solid #b99739;background:transparent;color:#e4c65f;border-radius:10px;padding:9px 12px}.cover.big{width:54px;height:54px}.screen audio{width:100%;margin:18px 0;filter:invert(.88) hue-rotate(90deg)}
.adjust{padding:17px 0;border-bottom:1px solid #26332a}.adjust>div:first-child{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.adjust b{font-size:14px}.adjust strong{color:#d9bc58;font-size:13px}.adjust input[type=range]{width:100%;accent-color:#d4af37}.durations{display:flex;gap:9px}.durations button{flex:1;min-height:44px;border:1px solid #3a4b3e;border-radius:11px;background:#18221b;color:white}.durations button.active{border-color:#d4af37;color:#f0d36c;background:#302a18}.durations button:disabled{opacity:.35}
.error,.progressMsg{margin:10px 18px;padding:12px;border-radius:10px;background:#321d1d;color:#ffb9b9;font-size:13px}.progressMsg{background:#1b2b20;color:#d6e8d9}.empty{color:#9da99f;text-align:center;padding:24px}
@media(min-width:700px){.musicOverlay{align-items:center;padding:24px}.musicPanel{height:min(900px,94vh);border:1px solid #26352b;border-radius:22px;box-shadow:0 25px 90px #000b}.screen{padding:26px 30px 38px}.genres{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;

export default function MusicEditor({ onExport, onClose, initialMediaFile = null, initialMediaUrl = '', initialMediaName = 'video-original.mp4', videoOnly = false }) {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [musicTracks, setMusicTracks] = useState([]);
  const [selectedMusicId, setSelectedMusicId] = useState('');
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicStart, setMusicStart] = useState(0);
  const [segmentDuration, setSegmentDuration] = useState(30);
  const [musicVolume, setMusicVolume] = useState(0.65);
  const [originalVolume, setOriginalVolume] = useState(0.8);
  const [photoDuration, setPhotoDuration] = useState(4);
  const [ratio, setRatio] = useState('9:16');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [screen,setScreen]=useState('media'),[search,setSearch]=useState(''),[genre,setGenre]=useState('Todos'),[favorites,setFavorites]=useState([]),[previewId,setPreviewId]=useState(''),[previewTime,setPreviewTime]=useState(0); const previewRef=useRef(null);

  useEffect(() => {
    // Evita que vídeos da galeria continuem a tocar por trás do editor.
    document.querySelectorAll('video, audio').forEach(media => {
      try { media.pause(); } catch (_) {}
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMusicCatalog() {
      setMusicLoading(true);
      try {
        const response = await fetch('/sounds/catalogo.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível carregar a biblioteca de músicas.');
        const catalog = await response.json();
        const tracks = (Array.isArray(catalog) ? catalog : [catalog]).map(track => {
          const path = String(track.ficheiro || '').startsWith('/') ? String(track.ficheiro || '').slice(1) : String(track.ficheiro || '');
          const { data } = supabase.storage.from('sounds').getPublicUrl(path);
          return { ...track, audioUrl: data?.publicUrl || '' };
        }).filter(track => track.audioUrl);
        if (!cancelled) {
          setMusicTracks(tracks);
          setSelectedMusicId(current => tracks.some(track => track.id === current) ? current : (tracks[0]?.id || ''));
        }
      } catch (catalogError) {
        if (!cancelled) setError(catalogError.message || 'Não foi possível carregar a biblioteca de músicas.');
      } finally {
        if (!cancelled) setMusicLoading(false);
      }
    }
    loadMusicCatalog();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const selected = musicTracks.find(track => track.id === selectedMusicId);
    setMusicUrl(selected?.audioUrl || '');
    setMusicDuration(0);
    setMusicStart(0);
  }, [musicTracks, selectedMusicId]);

  useEffect(() => () => mediaFiles.forEach(file => { if (file._previewUrl) URL.revokeObjectURL(file._previewUrl); }), [mediaFiles]);

  useEffect(() => {
    if (initialMediaFile) chooseMedia([initialMediaFile]);
  }, [initialMediaFile, videoOnly]);

  useEffect(() => {
    if (!initialMediaUrl || initialMediaFile) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(initialMediaUrl, { credentials: 'omit', cache: 'no-store' });
        if (!response.ok) throw new Error('Não foi possível carregar o vídeo original.');
        const blob = await response.blob();
        if (!blob.type.startsWith('video/') && !blob.type.startsWith('image/')) throw new Error('O ficheiro seleccionado não é uma imagem ou vídeo válido.');
        if (videoOnly && !blob.type.startsWith('video/')) throw new Error('Nesta opção só pode adicionar música a um vídeo.');
        const file = new File([blob], initialMediaName, { type: blob.type });
        if (!cancelled) chooseMedia([file]);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Não foi possível carregar o vídeo original.');
      }
    })();
    return () => { cancelled = true; };
  }, [initialMediaUrl, initialMediaFile, initialMediaName]);

  const isVideo = mediaFiles.length === 1 && mediaFiles[0]?.type.startsWith('video/');
  const isPhotos = mediaFiles.length > 0 && mediaFiles.every(file => file.type.startsWith('image/'));

  function chooseMedia(files) {
    const chosen = Array.from(files || []);
    if (!chosen.length) return;
    const hasVideo = chosen.some(file => file.type.startsWith('video/'));
    if (videoOnly && chosen.some(file => !file.type.startsWith('video/'))) {
      setError('Nesta opção só pode adicionar música a um vídeo.');
      return;
    }
    if (hasVideo && (chosen.length !== 1 || !chosen[0].type.startsWith('video/'))) {
      setError('Escolha um único vídeo ou seleccione apenas fotografias para a apresentação.');
      return;
    }
    if (chosen.some(file => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
      setError('Escolha fotografias ou um vídeo compatível.');
      return;
    }
    if (chosen.some(file => file.size > 100 * 1024 * 1024)) {
      setError('Cada ficheiro deve ter no máximo 100 MB.');
      return;
    }
    setMediaFiles(chosen.map(file => Object.assign(file, { _previewUrl: URL.createObjectURL(file) })));
    setScreen('sound'); setError('');
  }


  const genreOptions=['Todos','Afrobeat','Amapiano','Gospel','Zouk','House','Ambiente','Romântica','Instrumental','Motivacional',...musicTracks.map(t=>t.genero).filter(Boolean)].filter((v,i,a)=>a.indexOf(v)===i);
  const visibleTracks=musicTracks.filter(t=>(genre==='Todos'||t.genero===genre)&&[t.titulo,t.artista,t.genero,t.humor].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())));
  function playTrack(track){const a=previewRef.current;if(!a)return;if(previewId===track.id&&!a.paused){a.pause();return;}setPreviewId(track.id);a.src=track.audioUrl;a.currentTime=0;a.play().catch(()=>setError('Não foi possível reproduzir a prévia.'));}
  function useTrack(track){setSelectedMusicId(track.id);setMusicUrl(track.audioUrl);setMusicDuration(Number(track.duracao_seg)||0);setMusicStart(0);setSegmentDuration(Math.min(30,Number(track.duracao_seg)||30));if(previewRef.current){previewRef.current.pause();previewRef.current.currentTime=0;}setPreviewId('');setPreviewTime(0);setScreen('adjust');}
  async function createSilentVideo(){if(!mediaFiles.length||busy)return;if(isVideo){setBusy(true);try{await onExport(mediaFiles[0]);onClose?.();}catch(e){setError(e.message||'Não foi possível guardar o vídeo.');}finally{setBusy(false);}return;}setBusy(true);setError('');setProgress('A criar vídeo sem som…');let stream,recorder,frame;try{const canvas=document.createElement('canvas'),size=ratio==='1:1'?[720,720]:[720,1280];canvas.width=size[0];canvas.height=size[1];const ctx=canvas.getContext('2d');if(!ctx||!canvas.captureStream||typeof MediaRecorder==='undefined')throw new Error('Este navegador não suporta a criação de vídeo.');const images=await Promise.all(mediaFiles.map(file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível abrir uma fotografia.'));img.src=file._previewUrl;})));stream=canvas.captureStream(30);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw new Error('Formato de vídeo não suportado.');const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime});const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=()=>reject(new Error('Falha ao criar vídeo.'));recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));});const total=images.length*photoDuration*1000;let start=0;const render=now=>{if(!start)start=now;const elapsed=now-start,index=Math.min(images.length-1,Math.floor(elapsed/(photoDuration*1000)));drawCover(ctx,images[index],canvas.width,canvas.height);if(elapsed<total&&recorder.state==='recording')frame=requestAnimationFrame(render);else if(recorder.state==='recording')recorder.stop();};recorder.start(500);frame=requestAnimationFrame(render);const blob=await done;if(!blob.size)throw new Error('O vídeo ficou vazio.');const type=mime.split(';')[0];await onExport(new File([blob],type==='video/mp4'?'talaza-sem-som.mp4':'talaza-sem-som.webm',{type}));onClose?.();}catch(e){setError(e.message||'Não foi possível criar o vídeo sem som.');}finally{if(frame)cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());setBusy(false);setProgress('');}}

  async function createVideo() {
    if (!mediaFiles.length || !musicUrl || busy) return;
    if (typeof MediaRecorder === 'undefined' || !window.AudioContext && !window.webkitAudioContext) {
      setError('Este navegador não suporta a criação de vídeos com mistura de áudio. Experimente Chrome ou Edge actualizado.');
      return;
    }
    setBusy(true); setError(''); setProgress('A preparar o editor…');
    let audioContext;
    let recorder;
    let videoElement;
    let animationFrame;
    let maxDurationTimer;
    let startPhotoRender = () => {};
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const music = new Audio(musicUrl);
      music.preload = 'auto';
      music.loop = false;
      music.onended = () => {};
      await new Promise((resolve, reject) => {
        music.oncanplay = resolve;
        music.onerror = () => reject(new Error('Não foi possível abrir a faixa de música.'));
        music.load();
      });
      music.currentTime = Math.min(musicStart, Math.max(0, musicDuration - 0.1));
      const musicSource = audioContext.createMediaElementSource(music);
      const musicGain = audioContext.createGain();
      musicGain.gain.value = musicVolume;
      const mixedAudio = audioContext.createMediaStreamDestination();
      musicSource.connect(musicGain);
      musicGain.connect(mixedAudio);
      music.ontimeupdate = () => {
        if (music.currentTime >= musicStart + segmentDuration) music.pause();
      };

      let videoTracks = [];
      let stopPlayback = () => {};
      if (isVideo) {
        videoElement = document.createElement('video');
        videoElement.src = mediaFiles[0]._previewUrl;
        videoElement.playsInline = true;
        videoElement.preload = 'auto';
        videoElement.controls = false;
        await new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = resolve;
          videoElement.onerror = () => reject(new Error('Não foi possível abrir o vídeo escolhido.'));
          videoElement.load();
        });
        const capture = videoElement.captureStream || videoElement.mozCaptureStream;
        if (!capture) throw new Error('Este navegador não permite capturar o vídeo para misturar o áudio.');
        const captured = capture.call(videoElement);
        videoTracks = captured.getVideoTracks();
        const originalSource = audioContext.createMediaElementSource(videoElement);
        const originalGain = audioContext.createGain();
        originalGain.gain.value = originalVolume;
        originalSource.connect(originalGain);
        originalGain.connect(mixedAudio);
        stopPlayback = () => videoElement.pause();
      } else {
        const canvas = document.createElement('canvas');
        const [width, height] = ratio === '1:1' ? [720, 720] : [720, 1280];
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Não foi possível preparar a apresentação.');
        const photos = await Promise.all(mediaFiles.map(file => new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('Uma das fotografias não pôde ser carregada.'));
          image.src = file._previewUrl;
        })));
        videoTracks = canvas.captureStream(30).getVideoTracks();
        let startedAt = 0;
        const durationMs = Math.min(mediaFiles.length * photoDuration * 1000, segmentDuration * 1000);
        const render = now => {
          if (!startedAt) startedAt = now;
          const elapsed = now - startedAt;
          const index = Math.min(photos.length - 1, Math.floor(elapsed / (photoDuration * 1000)));
          drawCover(context, photos[index], width, height);
          if (elapsed < durationMs && recorder?.state === 'recording') animationFrame = requestAnimationFrame(render);
          else if (recorder?.state === 'recording') recorder.stop();
        };
        stopPlayback = () => cancelAnimationFrame(animationFrame);
        startPhotoRender = () => { animationFrame = requestAnimationFrame(render); };
      }

      const stream = new MediaStream([...videoTracks, ...mixedAudio.stream.getAudioTracks()]);
      const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Este navegador não consegue exportar vídeo WebM.');
      const chunks = [];
      recorder = new MediaRecorder(stream, { mimeType });
      const completed = new Promise((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error('Ocorreu um erro durante a criação do vídeo.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.start(500);
      if (!isVideo) startPhotoRender();
      music.currentTime = Math.min(musicStart, Math.max(0, musicDuration - 0.1));
      await music.play();
      maxDurationTimer = window.setTimeout(() => {
        if (recorder?.state === 'recording') recorder.stop();
        videoElement?.pause();
        music.pause();
      }, segmentDuration * 1000);
      if (isVideo) {
        setProgress('A misturar o som original com a música…');
        videoElement.currentTime = 0;
        await videoElement.play();
        videoElement.onended = () => { if (recorder.state === 'recording') recorder.stop(); };
        videoElement.onerror = () => { if (recorder.state === 'recording') recorder.stop(); };
      } else {
        setProgress('A criar a apresentação de fotografias…');
      }
      const blob = await completed;
      window.clearTimeout(maxDurationTimer);
      stopPlayback();
      music.pause();
      if (!blob?.size) throw new Error('O vídeo foi criado sem conteúdo.');
      const outputMime = mimeType.split(';')[0];
      const output = new File([blob], outputMime === 'video/mp4' ? 'talaza-com-musica.mp4' : 'talaza-com-musica.webm', { type: outputMime });
      setProgress('A guardar o vídeo na galeria…');
      await onExport(output);
      onClose?.();
    } catch (err) {
      console.error('Erro no editor de música:', err);
      setError(err.message || 'Não foi possível criar o vídeo.');
    } finally {
      try { if (maxDurationTimer) window.clearTimeout(maxDurationTimer); } catch (_) {}
      try { recorder?.stream?.getTracks().forEach(track => track.stop()); } catch (_) {}
      try { await audioContext?.close(); } catch (_) {}
      setBusy(false); setProgress('');
    }
  }


  return (
    <div className="musicOverlay" role="dialog" aria-modal="true" aria-label="Editor de música TALAZA">
      <section className="musicPanel">
        <header className="topbar"><button className="back" onClick={()=>screen==='media'?onClose?.():setScreen(screen==='sound'?'media':screen==='library'?'sound':'library')} disabled={busy}>‹</button><div className="brand"><small>TALAZA STUDIO</small><b>{screen==='library'?'Music':screen==='adjust'?'Ajustar música':screen==='sound'?'Som do vídeo':'Criar vídeo'}</b></div><button className="close" onClick={onClose} disabled={busy}>×</button></header>
        {screen==='media'&&<main className="screen"><div className="intro"><small>PASSO 01</small><h1>Escolhe o teu conteúdo</h1><p>Começa por selecionar um vídeo ou fotografias.</p></div><label className="upload"><span>＋</span><b>Escolher {videoOnly?'vídeo':'vídeo ou fotografias'}</b><small>Um vídeo ou várias fotografias</small><input type="file" accept={videoOnly?'video/mp4,video/webm,video/quicktime':'image/*,video/mp4,video/webm,video/quicktime'} multiple={!videoOnly} onChange={e=>{chooseMedia(e.target.files);e.target.value='';}} disabled={busy}/></label>{mediaFiles.length>0&&<div className="selected"><b>{isVideo?'Vídeo selecionado':mediaFiles.length+' fotografias selecionadas'}</b>{isVideo&&<video src={mediaFiles[0]._previewUrl} controls playsInline/>}{isPhotos&&<div className="thumbs">{mediaFiles.slice(0,6).map((f,i)=><img key={i} src={f._previewUrl} alt={'Foto '+(i+1)}/>)}</div>}<button className="primary" onClick={()=>setScreen('sound')}>Continuar →</button></div>}{isPhotos&&<div className="photoOptions"><label>Tempo por foto<select value={photoDuration} onChange={e=>setPhotoDuration(Number(e.target.value))}><option value={3}>3 segundos</option><option value={4}>4 segundos</option><option value={5}>5 segundos</option><option value={7}>7 segundos</option></select></label><label>Formato<select value={ratio} onChange={e=>setRatio(e.target.value)}><option value="9:16">Vertical 9:16</option><option value="1:1">Quadrado 1:1</option></select></label></div>}</main>}
        {screen==='sound'&&<main className="screen"><div className="intro"><small>PASSO 02</small><h1>Como queres o teu vídeo?</h1><p>Escolhe se queres manter apenas o som original ou adicionar música.</p></div><button type="button" className="soundChoice" onClick={() => { if (!busy) createSilentVideo(); }} disabled={busy} aria-label="Criar vídeo sem som"><span>🔇</span><div><b>Sem som</b><small>{isVideo?'Guardar o vídeo sem adicionar música':'Criar apresentação sem música'}</small></div><i>→</i></button><button type="button" className="soundChoice gold" onClick={() => { if (!busy) { if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0; } setPreviewId(''); setScreen('library'); } }} disabled={busy} aria-label="Abrir biblioteca de músicas"><span>🔊</span><div><b>Com som</b><small>Abrir a Biblioteca de músicas TALAZA</small></div><i>→</i></button>{isVideo&&<p className="note">O som original do vídeo será mantido. Na opção Com som, poderás ajustar o volume original e da música.</p>}</main>}
        {screen==='library'&&<main className="screen library"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar músicas..."/></div><div className="sectionTitle"><b>Géneros</b><small>{musicTracks.length} músicas</small></div><div className="genres">{genreOptions.map((g,i)=><button key={g} className={'genre g'+(i%6)+(genre===g?' active':'')} onClick={()=>setGenre(g)}>{g}</button>)}</div><div className="sectionTitle"><b>{genre==='Todos'?'Todas as músicas':genre}</b><small>{visibleTracks.length} faixas</small></div>{musicLoading&&<p className="empty">A carregar biblioteca…</p>}{!musicLoading&&!visibleTracks.length&&<p className="empty">Nenhuma música encontrada.</p>}<div className="tracks">{visibleTracks.map(track=><article className="track" key={track.id}><div className="cover">♫</div><div className="trackName"><b>{track.titulo}</b><small>{track.genero} · {formatTime(track.duracao_seg||0)}</small></div><button className="round" onClick={()=>playTrack(track)}>{previewId===track.id&&previewRef.current&&!previewRef.current.paused?'Ⅱ':'▶'}</button><button className={'heart'+(favorites.includes(track.id)?' liked':'')} onClick={()=>setFavorites(v=>v.includes(track.id)?v.filter(id=>id!==track.id):[...v,track.id])}>{favorites.includes(track.id)?'♥':'♡'}</button><button className="add" onClick={()=>useTrack(track)}>＋</button></article>)}</div><audio ref={previewRef} preload="none" onTimeUpdate={e=>setPreviewTime(e.currentTarget.currentTime||0)} onEnded={()=>{setPreviewId('');setPreviewTime(0);}}/>{previewId&&<div className="preview"><b>Prévia</b><div><i style={{width:Math.min(100,previewTime/Math.max(1,musicTracks.find(t=>t.id===previewId)?.duracao_seg||150)*100)+'%'}}/></div><small>{formatTime(previewTime)}</small></div>}</main>}
        {screen==='adjust'&&<main className="screen"><div className="intro"><small>PASSO 03</small><h1>Ajusta a tua música</h1><p>Escolhe o trecho e controla o volume.</p></div><div className="chosen"><div className="cover big">♫</div><div><b>{musicTracks.find(t=>t.id===selectedMusicId)?.titulo}</b><small>{musicTracks.find(t=>t.id===selectedMusicId)?.genero} · {formatTime(musicDuration)}</small></div><button onClick={()=>setScreen('library')}>Alterar</button></div><audio controls preload="metadata" src={musicUrl} onLoadedMetadata={e=>{setMusicDuration(e.currentTarget.duration||musicDuration);setSegmentDuration(Math.min(30,e.currentTarget.duration||30));}}/><div className="adjust"><div><b>Início do trecho</b><strong>{formatTime(musicStart)}</strong></div><input type="range" min="0" max={Math.max(0,musicDuration-segmentDuration)} value={Math.min(musicStart,Math.max(0,musicDuration-segmentDuration))} onChange={e=>setMusicStart(Number(e.target.value))}/></div><div className="adjust"><b>Duração</b><div className="durations">{[15,30,60].map(n=><button key={n} className={segmentDuration===n?'active':''} disabled={musicDuration>0&&musicDuration<n} onClick={()=>setSegmentDuration(Math.min(n,musicDuration||n))}>{n}s</button>)}</div></div><div className="adjust"><div><b>Volume da música</b><strong>{Math.round(musicVolume*100)}%</strong></div><input type="range" min="0" max="1" step=".05" value={musicVolume} onChange={e=>setMusicVolume(Number(e.target.value))}/></div>{isVideo&&<div className="adjust"><div><b>Som original</b><strong>{Math.round(originalVolume*100)}%</strong></div><input type="range" min="0" max="1" step=".05" value={originalVolume} onChange={e=>setOriginalVolume(Number(e.target.value))}/></div>}<button className="primary" onClick={createVideo} disabled={busy||!musicUrl}>{busy?'A criar…':'Usar música e criar vídeo →'}</button></main>}
        {error&&<p className="error" role="alert">{error}</p>}{progress&&<p className="progressMsg" role="status">{progress}</p>}<style jsx>{css}</style>
      </section>
    </div>
  );
}
