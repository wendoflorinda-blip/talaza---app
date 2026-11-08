import { useEffect, useState } from 'react';
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
    setError('');
  }

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
    let startPhotoRender = () => {};
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const music = new Audio(musicUrl);
      music.preload = 'auto';
      music.loop = false;
      music.onended = () => { music.currentTime = musicStart; music.play().catch(() => {}); };
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
      musicGain.connect(audioContext.destination);
      music.ontimeupdate = () => {
        if (music.currentTime >= musicStart + segmentDuration) music.currentTime = musicStart;
      };

      let videoTracks = [];
      let stopPlayback = () => {};
      if (isVideo) {
        videoElement = document.createElement('video');
        videoElement.src = mediaFiles[0]._previewUrl;
        videoElement.playsInline = true;
        videoElement.preload = 'auto';
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
        originalGain.connect(audioContext.destination);
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
        const durationMs = mediaFiles.length * photoDuration * 1000;
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
      if (isVideo) {
        setProgress('A misturar o som original com a música…');
        await videoElement.play();
        videoElement.onended = () => { if (recorder.state === 'recording') recorder.stop(); };
        videoElement.onerror = () => { if (recorder.state === 'recording') recorder.stop(); };
      } else {
        setProgress('A criar a apresentação de fotografias…');
      }
      const blob = await completed;
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
      try { recorder?.stream?.getTracks().forEach(track => track.stop()); } catch (_) {}
      try { await audioContext?.close(); } catch (_) {}
      setBusy(false); setProgress('');
    }
  }

  return (
    <div className="musicOverlay" role="dialog" aria-modal="true" aria-label="Editor de música Talaza">
      <section className="musicPanel">
        <header><div><strong>Editor de música TALAZA</strong><small>Cria vídeos com a tua música e controla o som</small></div><button type="button" onClick={onClose} disabled={busy} aria-label="Fechar">×</button></header>
        <label className="field">Vídeo ou fotografias
          <input type="file" accept={videoOnly ? "video/mp4,video/webm,video/quicktime" : "image/*,video/mp4,video/webm,video/quicktime"} multiple={!videoOnly} onChange={event => { chooseMedia(event.target.files); event.target.value=''; }} disabled={busy}/>
        </label>
        {mediaFiles.length > 0 && <><p className="hint">{isVideo ? '1 vídeo seleccionado' : mediaFiles.length + ' fotografias para apresentação'}</p>{isVideo && <video src={mediaFiles[0]._previewUrl} controls playsInline style={{width:'100%',maxHeight:240,background:'#111',borderRadius:10}} />}</>}
        {isPhotos && <div className="controls"><label>Tempo por fotografia<select value={photoDuration} onChange={event=>setPhotoDuration(Number(event.target.value))}><option value={3}>3 segundos</option><option value={4}>4 segundos</option><option value={5}>5 segundos</option><option value={7}>7 segundos</option></select></label><label>Formato<select value={ratio} onChange={event=>setRatio(event.target.value)}><option value="9:16">Vertical 9:16</option><option value="1:1">Quadrado 1:1</option></select></label></div>}
        <label className="field">Biblioteca de músicas TALAZA
          <select value={selectedMusicId} onChange={event=>setSelectedMusicId(event.target.value)} disabled={busy || musicLoading || !musicTracks.length}>
            {musicLoading && <option value="">A carregar músicas…</option>}
            {!musicLoading && !musicTracks.length && <option value="">Nenhuma música disponível</option>}
            {musicTracks.map(track=><option key={track.id} value={track.id}>{track.titulo} — {track.genero} · {track.humor}</option>)}
          </select>
        </label>
        {musicUrl && <audio controls preload="metadata" src={musicUrl} onLoadedMetadata={event=>{const duration=event.currentTarget.duration||0;setMusicDuration(duration);setSegmentDuration(Math.min(30,duration));}} style={{width:'100%'}}/>}
        {!musicLoading && !musicTracks.length && <p className="hint">A biblioteca ainda não tem músicas disponíveis.</p>}
        {musicDuration>0 && <div className="controls"><label>Início do trecho: {formatTime(musicStart)}<input type="range" min="0" max={Math.max(0,musicDuration-1)} step="1" value={Math.min(musicStart,Math.max(0,musicDuration-1))} onChange={event=>setMusicStart(Number(event.target.value))}/></label><label>Duração do trecho<select value={segmentDuration} onChange={event=>setSegmentDuration(Number(event.target.value))}>{[10,15,20,30,45,60].filter(value=>value<=musicDuration).map(value=><option key={value} value={value}>{value} segundos</option>)}</select></label></div>}
        <div className="controls"><label>Volume da música: {Math.round(musicVolume*100)}%<input type="range" min="0" max="1" step=".05" value={musicVolume} onChange={event=>setMusicVolume(Number(event.target.value))}/></label>{isVideo && <label>Som original: {Math.round(originalVolume*100)}%<input type="range" min="0" max="1" step=".05" value={originalVolume} onChange={event=>setOriginalVolume(Number(event.target.value))}/></label>}</div>
        {error && <p className="error" role="alert">{error}</p>}
        {progress && <p className="progress" role="status">{progress}</p>}
        <footer><button type="button" onClick={onClose} disabled={busy}>Cancelar</button><button type="button" onClick={createVideo} disabled={busy || !mediaFiles.length || !musicUrl}>{busy?'A criar…':'Criar vídeo com música'}</button></footer>
      </section>
      <style jsx>{`
        .musicOverlay{position:fixed;inset:0;z-index:500;background:rgba(5,17,13,.72);display:flex;align-items:center;justify-content:center;padding:12px}
        .musicPanel{width:min(100%,560px);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;color:#17211f;font-family:Arial,sans-serif}
        header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}header strong{display:block;color:#075B4E;font-size:18px}header small{display:block;color:#65756E;font-size:12px;margin-top:4px}header button{border:0;background:#EDF2EF;border-radius:50%;width:34px;height:34px;font-size:23px}
        .field{display:grid;gap:7px;font-size:12px;font-weight:800;margin:13px 0;color:#284B40}.field input{font:inherit;font-weight:500}
        .hint{font-size:12px;color:#08745F;font-weight:800}.controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:13px 0}.controls label{display:grid;gap:7px;font-size:12px;color:#35564B;font-weight:750}.controls select{padding:9px;border:1px solid #D7E3DD;border-radius:9px;background:#fff}.controls input{width:100%;accent-color:#08745F}
        .license{display:flex;align-items:flex-start;gap:9px;padding:12px;background:#F2F7F4;border-radius:10px;font-size:12px;line-height:1.5;color:#35564B}.license input{margin-top:2px}.error{color:#A12626;font-size:12px}.progress{color:#08745F;font-size:12px;font-weight:800}
        footer{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}footer button{border:0;border-radius:10px;padding:12px 14px;font-weight:800;background:#EAF0EC;color:#23463B}footer button:last-child{background:#08745F;color:#fff}footer button:disabled{opacity:.55}
      `}</style>
    </div>
  );
}
