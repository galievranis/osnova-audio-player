// Approved player settings; independent of old prototype preferences.
const waveIntensity=.7;
const waveformHeight=16; // Visible bars; canvas includes 3 px of space on each side.
for(const [name,value] of Object.entries({'--cp-wave-height':`${waveformHeight+6}px`,'--cp-padding-x':'10px','--cp-padding-y':'10px','--cp-control-gap':'12px'}))document.documentElement.style.setProperty(name,value);
document.querySelectorAll('.compact-player').forEach(player=>{player.hidden=player.id!=='compact-player'});
document.querySelectorAll("#compact-player").forEach(root=>{
const plain=root.classList.contains('compact-player--plain')||root.classList.contains('compact-player--metadata')||root.classList.contains('compact-player--inline')||root.classList.contains('compact-player--simple');
const $=s=>root.querySelector(`[data-control="${s.slice(1)}"]`),audio=$('#cp-audio'),play=$('#cp-play'),canvas=$('#cp-canvas'),ctx=canvas.getContext('2d'),seek=$('#cp-seek');
const fmt=t=>Number.isFinite(t)?`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`:'0:00';let samples=Array.from({length:160},(_,i)=>.2+Math.abs(Math.sin(i*1.71)*Math.cos(i*.43))*.8),raf,hover=-1,context,analyser,frequencies;let renderedBars=[],lastWaveFrame=0;
const ring=document.createElement('canvas');ring.className='cp-playing-ring';ring.setAttribute('aria-hidden','true');root.append(ring);const ringCtx=ring.getContext('2d');let ringLevels=[];
function drawRing(dt){const dpr=devicePixelRatio||1;ring.width=60*dpr;ring.height=60*dpr;ringCtx.setTransform(dpr,0,0,dpr,0,0);let changing=false;const active=!audio.paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches;let energyTotal=0;for(let i=0;i<24;i++){const energy=active&&frequencies?Math.min(1,Math.pow(frequencies[2+Math.floor(i/24*60)]/255,.7)*1.4):0;const previous=ringLevels[i]||0;const value=previous+(energy-previous)*(1-Math.exp(-dt/80));ringLevels[i]=value;energyTotal+=value;if(Math.abs(value-energy)>.003)changing=true;const angle=i/24*Math.PI*2-Math.PI/2;const radius=17,length=1+value*8;ringCtx.strokeStyle=`rgba(11,93,215,${.12+value*.88})`;ringCtx.lineWidth=2.2;ringCtx.lineCap='round';ringCtx.beginPath();ringCtx.moveTo(30+Math.cos(angle)*radius,30+Math.sin(angle)*radius);ringCtx.lineTo(30+Math.cos(angle)*(radius+length),30+Math.sin(angle)*(radius+length));ringCtx.stroke()}const level=energyTotal/24;const glow=ringCtx.createRadialGradient(30,30,14,30,30,29);glow.addColorStop(0,`rgba(11,93,215,${level*.24})`);glow.addColorStop(1,'rgba(11,93,215,0)');ringCtx.globalCompositeOperation='destination-over';ringCtx.fillStyle=glow;ringCtx.fillRect(0,0,60,60);ringCtx.globalCompositeOperation='source-over';return changing}
const mobileViewport=matchMedia('(max-width:639px)');audio.volume=mobileViewport.matches?1:.75;
function draw(){cancelAnimationFrame(raf);const now=performance.now(),dt=Math.min(64,Math.max(1,now-(lastWaveFrame||now-16)));lastWaveFrame=now;const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;let settling=false;let w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);let progress=audio.duration?audio.currentTime/audio.duration:0,n=Math.floor(w/4),gap=2,bw=(w-(n-1)*gap)/n;if(plain){ctx.fillStyle='#d2d5da';ctx.beginPath();ctx.roundRect(0,(h-6)/2,w,6,3);ctx.fill();if(progress>0){ctx.fillStyle=root.classList.contains('compact-player--simple-stacked')?'#000':'#0b5dd7';ctx.beginPath();ctx.roundRect(0,(h-6)/2,w*progress,6,3);ctx.fill()}return;}if(analyser)analyser.getByteFrequencyData(frequencies);if(drawRing(dt))settling=true;for(let i=0;i<n;i++){let a=0;const from=Math.floor(i/n*samples.length),to=Math.max(from+1,Math.ceil((i+1)/n*samples.length));for(let sample=from;sample<to;sample++)a=Math.max(a,samples[sample]||0);if(!audio.paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const energy=frequencies?frequencies[Math.floor(i/n*90)]/255:0;const pulse=.5+.5*Math.sin(performance.now()/135+i*.7);const animated=a*.3+Math.pow(energy,1.35)*.85+pulse*energy*.3;a=Math.max(.05,Math.min(1,a+(animated-a)*waveIntensity))};const previous=renderedBars[i]??a;const eased=reducedMotion?a:previous+(a-previous)*(1-Math.exp(-dt/100));if(Math.abs(eased-a)>.001)settling=true;renderedBars[i]=Math.abs(eased-a)<.001?a:eased;let bh=Math.max(3,renderedBars[i]*(h-6));ctx.fillStyle=i/n<progress?'#0b5dd7':i/n<hover?'#a0bce4':'rgba(0,0,0,.15)';ctx.beginPath();ctx.roundRect(i*(bw+gap),(h-bh)/2,bw,bh,1);ctx.fill()}if(!audio.paused||settling)raf=requestAnimationFrame(draw)}
function sync(){root.classList.toggle('cp-audio-playing',!audio.paused);play.innerHTML=`<img src="assets/${audio.paused?'final-play':'pause'}.svg" alt="">`;play.setAttribute('aria-label',audio.paused?'Воспроизвести':'Пауза');cancelAnimationFrame(raf);draw()}
play.onclick=async()=>{try{if(audio.paused){if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=256;frequencies=new Uint8Array(analyser.frequencyBinCount);let source=context.createMediaElementSource(audio);source.connect(analyser);analyser.connect(context.destination)}await context.resume();document.querySelectorAll('.compact-player audio').forEach(other=>{if(other!==audio)other.pause()});await audio.play()}else audio.pause()}catch{$('#cp-error').hidden=false;$('#cp-error').textContent='Не удалось воспроизвести аудио'}};
for(const event of ['play','pause','ended'])audio.addEventListener(event,sync);
function update(){if(Number.isFinite(audio.duration))$('#cp-duration').textContent=fmt(audio.duration);$('#cp-time').textContent=fmt(audio.currentTime);seek.value=audio.duration?audio.currentTime/audio.duration*1000:0;seek.setAttribute('aria-valuetext',`${fmt(audio.currentTime)} из ${fmt(audio.duration)}`);if(audio.paused||plain)draw()}
const timer=root.querySelector('.cp-timers');
timer.setAttribute('aria-pressed','false');
timer.onclick=()=>{const total=timer.classList.toggle('is-total');timer.setAttribute('aria-pressed',String(total));timer.setAttribute('aria-label',total?'Общая длительность. Показать текущее время':'Текущее время. Показать общую длительность')};
for(const event of ['timeupdate','loadedmetadata','durationchange'])audio.addEventListener(event,update);seek.oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=seek.value/1000*audio.duration};
$('#cp-wave').onpointermove=e=>{let r=canvas.getBoundingClientRect();hover=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));const tooltip=$('#cp-tooltip');tooltip.textContent=fmt(hover*audio.duration);const half=tooltip.offsetWidth/2;tooltip.style.left=`${Math.max(half,Math.min(r.width-half,hover*r.width))}px`;if(audio.paused)draw()};$('#cp-wave').onpointerleave=()=>{hover=-1;if(audio.paused)draw()};
const menu=$('#cp-menu'),speed=$('#cp-speed');function close(){menu.hidden=true;speed.setAttribute('aria-expanded','false')}speed.onclick=()=>{menu.hidden=!menu.hidden;speed.setAttribute('aria-expanded',!menu.hidden)};menu.onclick=e=>{let b=e.target.closest('[data-rate]');if(!b)return;audio.playbackRate=+b.dataset.rate;speed.title='Скорость: '+b.dataset.rate+'×';speed.setAttribute('aria-label','Скорость воспроизведения: '+b.dataset.rate+'×');menu.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));close();speed.focus()};document.addEventListener('pointerdown',e=>{if(!e.target.closest('.cp-speed-wrap'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
function volume(){let muted=audio.muted||audio.volume===0;$('#cp-mute').innerHTML=`<img src="assets/${muted?'mute':'final-volume'}.svg" alt="">`;$('#cp-mute').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');$('#cp-volume').value=muted?0:audio.volume;$('#cp-volume').style.background=`linear-gradient(to right,#0b5dd7 ${muted?0:audio.volume*100}%,#d2d5da ${muted?0:audio.volume*100}%)`}$('#cp-mute').onclick=()=>{if(!audio.volume){audio.volume=.75;audio.muted=false}else audio.muted=!audio.muted;volume()};$('#cp-volume').oninput=e=>{audio.volume=+e.target.value;audio.muted=false;volume()};
new ResizeObserver(()=>draw()).observe(canvas);update();if(!plain)fetch(audio.src).then(r=>r.arrayBuffer()).then(async b=>{let offline=new OfflineAudioContext(1,1,44100),decoded=await offline.decodeAudioData(b),channel=decoded.getChannelData(0),stride=Math.floor(channel.length/180);samples=Array.from({length:180},(_,i)=>{let sum=0;for(let j=0;j<stride;j+=64)sum+=channel[i*stride+j]**2;return Math.sqrt(sum/(stride/64))});let max=Math.max(...samples);samples=samples.map(x=>max>0?.1+x/max*.9:.1);draw()}).catch(()=>{});

mobileViewport.addEventListener('change',e=>{if(e.matches){audio.volume=1;audio.muted=false;volume()}});

});


// Pin the same live player without cloning or reparenting its audio element.
const dockedPlayer=document.querySelector('#compact-player');
const dockedAudio=dockedPlayer.querySelector('audio');
const playerAnchor=document.createElement('div');
playerAnchor.className='cp-player-anchor';
dockedPlayer.before(playerAnchor);playerAnchor.append(dockedPlayer);
let inlinePlayerVisible=true,hasPlayed=false;
const returnToTrack=document.createElement('button');
returnToTrack.type='button';returnToTrack.className='cp-icon cp-return-to-track';
returnToTrack.setAttribute('aria-label','Вернуться в пост с треком');returnToTrack.title='Вернуться в пост с треком';
returnToTrack.innerHTML='<img src="assets/back-to-post.svg" alt="">';dockedPlayer.append(returnToTrack);
returnToTrack.addEventListener('click',()=>playerAnchor.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'}));
const closePlayer=document.createElement('button');closePlayer.type='button';closePlayer.className='cp-icon cp-close-player';closePlayer.setAttribute('aria-label','Закрыть плеер');closePlayer.title='Закрыть плеер';closePlayer.innerHTML='<img src="assets/close-player.svg" alt="">';dockedPlayer.append(closePlayer);
closePlayer.addEventListener('click',()=>{hasPlayed=false;dockedAudio.pause();updatePlayerDock()});
function alignPlayerDock(){const bounds=playerAnchor.getBoundingClientRect();dockedPlayer.style.setProperty('--cp-dock-left',`${bounds.left+bounds.width/2}px`);dockedPlayer.style.setProperty('--cp-dock-width',`${bounds.width}px`)}
let dockExitTimer;
function updatePlayerDock(){
 const floating=!inlinePlayerVisible&&hasPlayed;
 alignPlayerDock();
 if(floating){clearTimeout(dockExitTimer);dockedPlayer.classList.remove('cp-is-leaving');dockedPlayer.classList.add('cp-is-floating');playerAnchor.classList.add('cp-holds-floating');return}
 if(!dockedPlayer.classList.contains('cp-is-floating')||dockedPlayer.classList.contains('cp-is-leaving'))return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){finishDockExit();return}
 dockedPlayer.classList.add('cp-is-leaving');dockExitTimer=setTimeout(finishDockExit,180);
}
function finishDockExit(){dockedPlayer.classList.remove('cp-is-floating','cp-is-leaving');playerAnchor.classList.remove('cp-holds-floating')}

const playerVisibility=new IntersectionObserver(entries=>{inlinePlayerVisible=entries[0].isIntersecting;updatePlayerDock()},{rootMargin:'-60px 0px 0px 0px',threshold:0});
playerVisibility.observe(playerAnchor);
dockedAudio.addEventListener('play',()=>{hasPlayed=true;updatePlayerDock()});
for(const event of ['pause','ended'])dockedAudio.addEventListener(event,updatePlayerDock);
new ResizeObserver(alignPlayerDock).observe(playerAnchor);
window.addEventListener('resize',alignPlayerDock);
window.addEventListener('scroll',()=>{if(dockedPlayer.classList.contains('cp-is-floating'))alignPlayerDock()},{passive:true});
