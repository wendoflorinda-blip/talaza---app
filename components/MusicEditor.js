import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

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
 .publishForm{display:flex;flex-direction:column;gap:16px}.publishForm label{display:flex;flex-direction:column;gap:8px;color:#e9eee9;font-size:13px;font-weight:750}.publishForm input,.publishForm textarea{width:100%;border:1px solid #3a4a3e;border-radius:12px;background:#151e19;color:#fff;padding:14px;font:inherit;font-size:15px;outline:none}.publishForm textarea{resize:vertical;min-height:100px}
.soundChoice{position:relative;z-index:2;pointer-events:auto;touch-action:manipulation;cursor:pointer;width:100%;display:flex;align-items:center;gap:15px;padding:19px;margin:10px 0;border:1px solid #314238;border-radius:17px;background:#151e19;color:white;text-align:left;min-height:86px}.soundChoice:disabled{opacity:.65;cursor:wait}.soundChoice.selectedChoice{border:2px solid #d4af37;box-shadow:0 0 0 2px #d4af3722}.sourcePreview{margin-top:16px;padding:14px;background:#151e19;border:1px solid #26352b;border-radius:15px}.sourcePreview>b{display:block;margin-bottom:10px;font-size:14px}.sourcePreview video{width:100%;max-height:300px;object-fit:contain;background:#000;border-radius:10px}.sourcePreview .thumbs{margin-bottom:0}.soundChoice>span{font-size:28px}.soundChoice div{display:flex;flex-direction:column;gap:5px;flex:1}.soundChoice b{font-size:18px}.soundChoice small{color:#aab5ad;font-size:12px}.soundChoice i{font-style:normal;font-size:22px;color:#c9a84c}.soundChoice.gold{border-color:#a98a35;background:linear-gradient(110deg,#1b241c,#292315)}
.library{background:#0a0e0c}.search{height:50px;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:14px;background:#1a231e;border:1px solid #2a382f}.search span{font-size:24px;color:#c9a84c}.search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:15px}
.sectionTitle{display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px}.sectionTitle b{font-size:16px}.sectionTitle small{color:#9ca99f;font-size:12px}
.genres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.genre{border:1px solid #354439;border-radius:12px;padding:13px 7px;color:#f5f4ee;font-weight:700;font-size:12px;background:linear-gradient(135deg,#203b2b,#17231c);min-height:48px}.genre:nth-child(6n+2){background:linear-gradient(135deg,#45351d,#282116)}.genre:nth-child(6n+3){background:linear-gradient(135deg,#332644,#201b2c)}.genre:nth-child(6n+4){background:linear-gradient(135deg,#1c3942,#17252b)}.genre:nth-child(6n+5){background:linear-gradient(135deg,#49302c,#291e1b)}.genre.active{border:2px solid #d4af37;color:#f5d979}
.tracks{display:flex;flex-direction:column;gap:7px}.track{display:flex;align-items:center;gap:10px;padding:10px 9px;background:#141c17;border:1px solid #222f26;border-radius:13px;min-width:0}.cover{width:43px;height:43px;flex:none;display:grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,#234b31,#9a762b);color:#f8e8a7;font-size:22px}.trackName{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}.trackName b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trackName small{font-size:11px;color:#a7b1a9}.round,.heart,.add{border:0;flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center}.round{background:#29362d;color:white}.heart{background:transparent;color:#c7cfc8;font-size:22px}.heart.liked{color:#ef6d7c}.add{background:#168347;color:white;font-size:25px;font-weight:700}
.preview{position:sticky;bottom:0;margin-top:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;background:#202b23;border:1px solid #405443;border-radius:12px}.preview b,.preview small{font-size:11px}.preview div{height:4px;background:#46564a;border-radius:5px;flex:1;overflow:hidden}.preview i{display:block;height:100%;background:#d4af37}.preview small{color:#d5dcd6}
.chosen{display:flex;align-items:center;gap:12px}.chosen>div:nth-child(2){display:flex;flex-direction:column;gap:5px;flex:1}.chosen small{color:#aab5ad}.chosen button{border:1px solid #b99739;background:transparent;color:#e4c65f;border-radius:10px;padding:9px 12px}.cover.big{width:54px;height:54px}.screen audio{width:100%;margin:18px 0;filter:invert(.88) hue-rotate(90deg)}
.volumePresets{display:flex;flex-direction:column;gap:9px;margin-top:12px}.volumePreset{width:100%;min-height:66px;display:flex;align-items:center;gap:13px;padding:12px 14px;text-align:left;border:1px solid #34443a;border-radius:14px;background:#151e19;color:#fff}.volumePreset.active{border:2px solid #d4af37;background:linear-gradient(110deg,#1b3022,#2b2718)}.volumePreset>span:last-child{display:flex;flex-direction:column;gap:5px}.volumePreset b{font-size:15px}.volumePreset small{font-size:12px;color:#aab5ad}.presetRadio{width:26px;height:26px;flex:none;display:grid;place-items:center;border:1px solid #839087;border-radius:50%;color:#d4af37}.volumePreset.active .presetRadio{border-color:#d4af37}.adjust{padding:17px 0;border-bottom:1px solid #26332a}.adjust>div:first-child{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.adjust b{font-size:14px}.adjust strong{color:#d9bc58;font-size:13px}.adjust input[type=range]{width:100%;accent-color:#d4af37}.durations{display:flex;gap:9px}.durations button{flex:1;min-height:44px;border:1px solid #3a4b3e;border-radius:11px;background:#18221b;color:white}.durations button.active{border-color:#d4af37;color:#f0d36c;background:#302a18}.durations button:disabled{opacity:.35}
.error,.progressMsg{margin:10px 18px;padding:12px;border-radius:10px;background:#321d1d;color:#ffb9b9;font-size:13px}.progressMsg{background:#1b2b20;color:#d6e8d9}.empty{color:#9da99f;text-align:center;padding:24px}
@media(min-width:700px){.musicOverlay{align-items:center;padding:24px}.musicPanel{height:min(900px,94vh);border:1px solid #26352b;border-radius:22px;box-shadow:0 25px 90px #000b}.screen{padding:26px 30px 38px}.genres{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;

export default function MusicEditor({ onExport, onClose, initialMediaFile = null, initialMediaUrl = '', initialMediaName = 'video-original.mp4', videoOnly = false }) {
  const router = useRouter();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [musicTracks, setMusicTracks] = useState([]);
  const [selectedMusicId, setSelectedMusicId] = useState('');
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicStart, setMusicStart] = useState(0);
  const [segmentDuration, setSegmentDuration] = useState(30);
  const [volumePreset, setVolumePreset] = useState('low');
  const volumePresets = {
    video: { music: 0, original: 1 },
    low: { music: 0.25, original: 1 },
    balanced: { music: 0.60, original: 0.70 },
    high: { music: 1, original: 0.20 }
  };
  const activeVolume = volumePresets[volumePreset] || volumePresets.low;
  const musicVolume = activeVolume.music;
  const originalVolume = activeVolume.original;
  const [photoDuration, setPhotoDuration] = useState(4);
  const [ratio, setRatio] = useState('9:16');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [publishFile, setPublishFile] = useState(null);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishPrice, setPublishPrice] = useState('');
  const [publishDescription, setPublishDescription] = useState('');

  const [screen,setScreen]=useState('media'),[soundMode,setSoundMode]=useState(''),[search,setSearch]=useState(''),[genre,setGenre]=useState('Todos'),[favorites,setFavorites]=useState([]),[previewId,setPreviewId]=useState(''),[previewTime,setPreviewTime]=useState(0); const previewRef=useRef(null); const sourceVideoPreviewRef=useRef(null); const selectedMusicPreviewRef=useRef(null); const previewMixRef=useRef(null); const previewTimerRef=useRef(null);
  const isVideo = mediaFiles.length === 1 && mediaFiles[0]?.type.startsWith('video/');
  const isPhotos = mediaFiles.length > 0 && mediaFiles.every(file => file.type.startsWith('image/'));


  useEffect(() => {
    // Evita que vídeos da galeria continuem a tocar por trás do editor.
    document.querySelectorAll('video, audio').forEach(media => {
      try { media.pause(); } catch (_) {}
    });
  }, []);

  function stopMixedPreview() {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    const mix = previewMixRef.current;
    if (mix) {
      try { mix.video.pause(); mix.music.pause(); } catch (_) {}
    }
  }

  useEffect(() => {
    const stop = () => stopMixedPreview();
    const onVisibility = () => { if (document.visibilityState !== 'visible') stop(); };
    window.addEventListener('pagehide', stop);
    window.addEventListener('beforeunload', stop);
    document.addEventListener('visibilitychange', onVisibility);
    router.events?.on('routeChangeStart', stop);
    return () => {
      stop();
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('beforeunload', stop);
      document.removeEventListener('visibilitychange', onVisibility);
      router.events?.off('routeChangeStart', stop);
    };
  }, [router.events]);

  // Pré-visualização real da mistura: áudio da galeria e faixa escolhida
  // passam por controlos de ganho independentes, tal como na exportação.
  useEffect(() => {
    if (screen !== 'adjust' || !isVideo || !sourceVideoPreviewRef.current || !selectedMusicPreviewRef.current) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const video = sourceVideoPreviewRef.current;
    const music = selectedMusicPreviewRef.current;
    try {
      const videoGain = context.createGain();
      const musicGain = context.createGain();
      const videoSource = context.createMediaElementSource(video);
      const musicSource = context.createMediaElementSource(music);
      videoGain.gain.value = originalVolume;
      musicGain.gain.value = musicVolume;
      videoSource.connect(videoGain).connect(context.destination);
      musicSource.connect(musicGain).connect(context.destination);
      previewMixRef.current = { context, videoGain, musicGain, video, music };
    } catch (err) {
      console.error('Não foi possível preparar a pré-visualização de áudio:', err);
      context.close().catch(() => {});
    }
    return () => {
      try { video.pause(); music.pause(); } catch (_) {}
      previewMixRef.current = null;
      context.close().catch(() => {});
    };
  }, [screen, isVideo, musicUrl]);

  useEffect(() => {
    if (!previewMixRef.current) return;
    previewMixRef.current.videoGain.gain.setTargetAtTime(originalVolume, previewMixRef.current.context.currentTime, 0.015);
    previewMixRef.current.musicGain.gain.setTargetAtTime(musicVolume, previewMixRef.current.context.currentTime, 0.015);
  }, [originalVolume, musicVolume]);

  async function playMixedPreview() {
    const mix = previewMixRef.current;
    if (!mix) {
      setError('A pré-visualização ainda está a preparar o áudio. Aguarda um instante e tenta novamente.');
      return;
    }
    if (!mix.video.paused || !mix.music.paused) {
      stopMixedPreview();
      return;
    }
    try {
      await mix.context.resume();
      mix.video.currentTime = 0;
      mix.music.currentTime = Math.min(musicStart, Math.max(0, musicDuration - 0.1));
      await Promise.all([mix.video.play(), mix.music.play()]);
      previewTimerRef.current = window.setTimeout(stopMixedPreview, segmentDuration * 1000);
    } catch (err) {
      stopMixedPreview();
      setError('Não foi possível iniciar a pré-visualização. Toca novamente em Reproduzir.');
    }
  }

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
  async function createSilentVideo(){if(!mediaFiles.length||busy)return;if(isVideo){setPublishFile(mediaFiles[0]);setScreen('publish');return;}setBusy(true);setError('');setProgress('A criar vídeo sem som…');let stream,recorder,frame;try{const canvas=document.createElement('canvas'),size=ratio==='1:1'?[720,720]:[720,1280];canvas.width=size[0];canvas.height=size[1];const ctx=canvas.getContext('2d');if(!ctx||!canvas.captureStream||typeof MediaRecorder==='undefined')throw new Error('Este navegador não suporta a criação de vídeo.');const images=await Promise.all(mediaFiles.map(file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível abrir uma fotografia.'));img.src=file._previewUrl;})));stream=canvas.captureStream(30);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw new Error('Formato de vídeo não suportado.');const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime});const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onerror=()=>reject(new Error('Falha ao criar vídeo.'));recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));});const total=images.length*photoDuration*1000;let start=0;const render=now=>{if(!start)start=now;const elapsed=now-start,index=Math.min(images.length-1,Math.floor(elapsed/(photoDuration*1000)));drawCover(ctx,images[index],canvas.width,canvas.height);if(elapsed<total&&recorder.state==='recording')frame=requestAnimationFrame(render);else if(recorder.state==='recording')recorder.stop();};recorder.start(500);frame=requestAnimationFrame(render);const blob=await done;if(!blob.size)throw new Error('O vídeo ficou vazio.');const type=mime.split(';')[0];setPublishFile(new File([blob],type==='video/mp4'?'talaza-sem-som.mp4':'talaza-sem-som.webm',{type}));setScreen('publish');}catch(e){setError(e.message||'Não foi possível criar o vídeo sem som.');}finally{if(frame)cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());setBusy(false);setProgress('');}}

  async function publishVideo(event) {
    event.preventDefault();
    if (!publishFile || busy) return;
    const rawPrice = publishPrice.trim().replace(/\s/g, '').replace(',', '.');
    let price = null;
    if (rawPrice) {
      price = Number(rawPrice);
      if (!Number.isFinite(price) || price < 0) {
        setError('Indica um preço válido em Kz.');
        return;
      }
    }
    const metadata = { name: publishTitle.trim(), description: publishDescription.trim(), price };
    if (!publishFile && soundMode === 'music' && musicUrl) {
      await createVideo(metadata);
      return;
    }
    setBusy(true); setError(''); setProgress('A publicar no painel…');
    try {
      await onExport(publishFile, metadata);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Não foi possível publicar o vídeo. Os dados continuam preenchidos.');
    } finally { setBusy(false); setProgress(''); }
  }

  async function createVideo(metadata) {
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
    let progressTimer;
    let startedAt = 0;
    let startPhotoRender = () => {};
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const music = new Audio();
      // O atributo CORS tem de ser definido antes do src; caso contrário,
      // o Web Audio pode receber silêncio ao misturar faixas do Storage.
      music.crossOrigin = 'anonymous';
      music.preload = 'auto';
      music.src = musicUrl;
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
      startedAt = Date.now();
      progressTimer = window.setInterval(() => {
        const pct = Math.min(99, Math.floor(((Date.now() - startedAt) / (segmentDuration * 1000)) * 100));
        setProgress('A misturar… ' + pct + '%');
      }, 250);
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
      if (progressTimer) window.clearInterval(progressTimer);
      progressTimer = null;
      setProgress('A misturar… 100% · A guardar o vídeo na galeria…');
      await onExport(output, metadata);
      onClose?.();
    } catch (err) {
      console.error('Erro no editor de música:', err);
      setError(err.message || 'Não foi possível criar o vídeo.');
    } finally {
      try { if (maxDurationTimer) window.clearTimeout(maxDurationTimer); } catch (_) {}
      try { if (progressTimer) window.clearInterval(progressTimer); } catch (_) {}
      try { recorder?.stream?.getTracks().forEach(track => track.stop()); } catch (_) {}
      try { await audioContext?.close(); } catch (_) {}
      setBusy(false); setProgress('');
    }
  }


  return (
    <div className="musicOverlay" role="dialog" aria-modal="true" aria-label="Editor de música TALAZA">
      <section className="musicPanel">
        <header className="topbar"><button className="back" onClick={()=>screen==='media'?onClose?.():setScreen(screen==='publish'?(soundMode==='silent'?'sound':'adjust'):screen==='sound'?'media':screen==='library'?'sound':'library')} disabled={busy}>‹</button><div className="brand"><small>TALAZA STUDIO</small><b>{screen==='library'?'Music':screen==='adjust'?'Ajustar música':screen==='sound'?'Som do vídeo':'Criar vídeo'}</b></div><button className="close" onClick={onClose} disabled={busy}>×</button></header>
        {screen==='media'&&<main className="screen"><div className="intro"><small>PASSO 01</small><h1>Escolhe o teu conteúdo</h1><p>Começa por selecionar um vídeo ou fotografias.</p></div><label className="upload"><span>＋</span><b>Escolher {videoOnly?'vídeo':'vídeo ou fotografias'}</b><small>Um vídeo ou várias fotografias</small><input type="file" accept={videoOnly?'video/mp4,video/webm,video/quicktime':'image/*,video/mp4,video/webm,video/quicktime'} multiple={!videoOnly} onChange={e=>{chooseMedia(e.target.files);e.target.value='';}} disabled={busy}/></label>{mediaFiles.length>0&&<div className="selected"><b>{isVideo?'Vídeo selecionado':mediaFiles.length+' fotografias selecionadas'}</b>{isVideo&&<video src={mediaFiles[0]._previewUrl} controls playsInline/>}{isPhotos&&<div className="thumbs">{mediaFiles.slice(0,6).map((f,i)=><img key={i} src={f._previewUrl} alt={'Foto '+(i+1)}/>)}</div>}<button className="primary" onClick={()=>setScreen('sound')}>Continuar →</button></div>}{isPhotos&&<div className="photoOptions"><label>Tempo por foto<select value={photoDuration} onChange={e=>setPhotoDuration(Number(e.target.value))}><option value={3}>3 segundos</option><option value={4}>4 segundos</option><option value={5}>5 segundos</option><option value={7}>7 segundos</option></select></label><label>Formato<select value={ratio} onChange={e=>setRatio(e.target.value)}><option value="9:16">Vertical 9:16</option><option value="1:1">Quadrado 1:1</option></select></label></div>}</main>}
        {screen==='sound'&&<main className="screen"><div className="intro"><small>PASSO 02</small><h1>Como queres o teu vídeo?</h1><p>Mantém o áudio original do ficheiro escolhido, sem alterações, ou acrescenta uma música de fundo.</p></div><button type="button" className={'soundChoice'+(soundMode==='silent'?' selectedChoice':'')} onClick={() => { if (!busy) setSoundMode('silent'); }} disabled={busy} aria-pressed={soundMode==='silent'}><span>🔇</span><div><b>Sem som</b><small>{isVideo?'Mantém o áudio original do vídeo escolhido na galeria, sem adicionar música nem alterar o som.':'Mantém as fotografias originais e cria um vídeo sem música adicionada.'}</small></div><i>{soundMode==='silent'?'✓':'○'}</i></button><button type="button" className={'soundChoice gold'+(soundMode==='music'?' selectedChoice':'')} onClick={() => { if (!busy) { setSoundMode('music'); if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0; } setPreviewId(''); setScreen('library'); } }} disabled={busy} aria-pressed={soundMode==='music'}><span>🔊</span><div><b>Com som</b><small>Escolher música para acompanhar a foto ou o vídeo</small></div><i>→</i></button>{soundMode==='silent'&&<button type="button" className="primary" onClick={createSilentVideo} disabled={busy}>{busy?'A preparar vídeo…':'Seguinte →'}</button>}<p className="note">«Sem som» mantém o áudio original do vídeo ou, no caso de fotografias, cria a apresentação sem música. «Com som» permite escolher uma faixa para acompanhar o vídeo ou as fotografias.</p></main>}
        {screen==='library'&&<main className="screen library"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar músicas..."/></div><div className="sectionTitle"><b>Géneros</b><small>{musicTracks.length} músicas</small></div><div className="genres">{genreOptions.map((g,i)=><button key={g} className={'genre g'+(i%6)+(genre===g?' active':'')} onClick={()=>setGenre(g)}>{g}</button>)}</div><div className="sectionTitle"><b>{genre==='Todos'?'Todas as músicas':genre}</b><small>{visibleTracks.length} faixas</small></div>{musicLoading&&<p className="empty">A carregar biblioteca…</p>}{!musicLoading&&!visibleTracks.length&&<p className="empty">Nenhuma música encontrada.</p>}<div className="tracks">{visibleTracks.map(track=><article className="track" key={track.id}><div className="cover">♫</div><div className="trackName"><b>{track.titulo}</b><small>{track.genero} · {formatTime(track.duracao_seg||0)}</small></div><button className="round" onClick={()=>playTrack(track)}>{previewId===track.id&&previewRef.current&&!previewRef.current.paused?'Ⅱ':'▶'}</button><button className={'heart'+(favorites.includes(track.id)?' liked':'')} onClick={()=>setFavorites(v=>v.includes(track.id)?v.filter(id=>id!==track.id):[...v,track.id])}>{favorites.includes(track.id)?'♥':'♡'}</button><button className="add" onClick={()=>useTrack(track)}>＋</button></article>)}</div><audio ref={previewRef} preload="none" onTimeUpdate={e=>setPreviewTime(e.currentTarget.currentTime||0)} onEnded={()=>{setPreviewId('');setPreviewTime(0);}}/>{previewId&&<div className="preview"><b>Prévia</b><div><i style={{width:Math.min(100,previewTime/Math.max(1,musicTracks.find(t=>t.id===previewId)?.duracao_seg||150)*100)+'%'}}/></div><small>{formatTime(previewTime)}</small></div>}</main>}
        {screen==='adjust'&&<main className="screen"><div className="intro"><small>PASSO 03</small><h1>Ajusta a tua música</h1><p>Escolhe o trecho e controla o volume.</p></div><div className="chosen"><div className="cover big">♫</div><div><b>{musicTracks.find(t=>t.id===selectedMusicId)?.titulo}</b><small>{musicTracks.find(t=>t.id===selectedMusicId)?.genero} · {formatTime(musicDuration)}</small></div><button type="button" onClick={()=>setScreen('library')}>Alterar</button></div>{isVideo&&<div className="sourcePreview"><b>Vídeo original</b><video ref={sourceVideoPreviewRef} src={mediaFiles[0]._previewUrl} controls playsInline preload="metadata" onEnded={stopMixedPreview} onPause={()=>{if(selectedMusicPreviewRef.current&&!sourceVideoPreviewRef.current?.ended)selectedMusicPreviewRef.current.pause();}}/></div>}{isPhotos&&<div className="sourcePreview"><b>Fotografias selecionadas</b><div className="thumbs">{mediaFiles.slice(0,8).map((f,i)=><img key={i} src={f._previewUrl} alt={'Foto '+(i+1)}/>)}</div></div>}<audio ref={selectedMusicPreviewRef} crossOrigin="anonymous" preload="metadata" src={musicUrl} onEnded={stopMixedPreview} style={{display:'none'}} onLoadedMetadata={e=>{setMusicDuration(e.currentTarget.duration||musicDuration);setSegmentDuration(Math.min(30,e.currentTarget.duration||30));}}/><div className="adjust"><div><b>Início do trecho</b><strong>{formatTime(musicStart)}</strong></div><input type="range" min="0" max={Math.max(0,musicDuration-segmentDuration)} value={Math.min(musicStart,Math.max(0,musicDuration-segmentDuration))} onChange={e=>setMusicStart(Number(e.target.value))}/></div><div className="adjust"><b>Duração</b><div className="durations">{[15,30,60].map(n=><button key={n} className={segmentDuration===n?'active':''} disabled={musicDuration>0&&musicDuration<n} onClick={()=>setSegmentDuration(Math.min(n,musicDuration||n))}>{n}s</button>)}</div></div><div className="adjust"><b>Volume do vídeo e da música</b><p className="note">Escolhe uma mistura pronta. Podes mudar a qualquer momento durante a pré-visualização.</p><div className="volumePresets">{[{id:'video',label:'Só vídeo',desc:'Música 0% · Original 100%'},{id:'low',label:'Música Baixa',desc:'Música 25% · Original 100%'},{id:'balanced',label:'Equilibrado',desc:'Música 60% · Original 70%'},{id:'high',label:'Música Alta',desc:'Música 100% · Original 20%'}].map(p=><button type="button" key={p.id} className={'volumePreset'+(volumePreset===p.id?' active':'')} aria-pressed={volumePreset===p.id} onClick={()=>setVolumePreset(p.id)}><span className="presetRadio">{volumePreset===p.id?'●':'○'}</span><span><b>{p.label}</b><small>{p.desc}</small></span></button>)}</div></div><button type="button" className="primary" onClick={playMixedPreview}>▶ Pré-visualizar / Parar</button><button type="button" className="primary" onClick={()=>setScreen('publish')} disabled={busy||!musicUrl}>Seguinte →</button></main>}
        {screen==='publish'&&<main className="screen"><div className="intro"><small>PASSO FINAL</small><h1>Detalhes da publicação</h1><p>O mesmo formulário para vídeos com som e sem som.</p></div><form onSubmit={publishVideo} className="publishForm"><label>Título<input value={publishTitle} onChange={e=>setPublishTitle(e.target.value)} maxLength={80} placeholder="Título do vídeo"/></label><label>Preço em Kz (opcional)<input type="number" min="0" step="any" inputMode="decimal" value={publishPrice} onChange={e=>setPublishPrice(e.target.value)} placeholder="Ex.: 15000"/></label><label>Descrição<textarea value={publishDescription} onChange={e=>setPublishDescription(e.target.value)} maxLength={500} rows={4} placeholder="Descreve o produto ou serviço"/></label><button type="submit" className="primary" disabled={busy||(!publishFile && !(soundMode==='music' && musicUrl))}>{busy?'A publicar…':'Publicar'}</button></form></main>}
        {error&&<p className="error" role="alert">{error}</p>}{progress&&<p className="progressMsg" role="status">{progress}</p>}<style jsx>{css}</style>
      </section>
    </div>
  );
}
