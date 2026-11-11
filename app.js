/* DeutschStart — frases para llegar y trabajar en Alemania */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const MIN = 60e3, DAY = 864e5;
const KEY = 'deutschstart_v1';
const byId = Object.fromEntries(FRASES.map(f => [f.id, f]));

/* ---------- estado ---------- */
const today = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const defArrival = () => '2026-11-27';
let S;
function load(){
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch(e) { S = null; }
  if (!S || !S.cards) S = { cards:{}, log:{}, start: today(), settings:{} };
  S.settings = Object.assign({ newPerDay:15, rate:0.9, arrival:defArrival(), autoplay:true, remOn:true, remTime:'08:30' }, S.settings);
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }
function logDay(kind){ const t=today(); S.log[t]=S.log[t]||{rev:0,new:0}; S.log[t][kind]++; }
function streak(){
  let n=0, d=new Date();
  const k = x => x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
  if (!S.log[k(d)]) d = new Date(d.getTime()-DAY);
  while (S.log[k(d)]) { n++; d = new Date(d.getTime()-DAY); }
  return n;
}

/* ---------- repetición espaciada (estilo Anki / SM-2) ---------- */
function schedule(id, grade){ // 1 otra vez, 2 difícil, 3 bien, 4 fácil
  const now = Date.now();
  let c = S.cards[id];
  const isNew = !c;
  if (!c) c = S.cards[id] = { ease:2.5, ivl:0, reps:0, lapses:0, learn:0, due:now };
  if (isNew) logDay('new'); else logDay('rev');
  if (c.ivl === 0) { // aprendiendo
    if (grade===1){ c.learn=0; c.due=now+1*MIN; }
    else if (grade===2){ c.due=now+6*MIN; }
    else if (grade===3){ if (c.learn>=1){ c.ivl=1; c.due=now+DAY; } else { c.learn=1; c.due=now+10*MIN; } }
    else { c.ivl=4; c.due=now+4*DAY; }
  } else { // repaso
    if (grade===1){ c.lapses++; c.ease=Math.max(1.3,c.ease-.2); c.ivl=0; c.learn=0; c.due=now+10*MIN; c.relearn=1; }
    else if (grade===2){ c.ease=Math.max(1.3,c.ease-.15); c.ivl=Math.max(1,Math.round(c.ivl*1.2)); c.due=now+c.ivl*DAY; }
    else if (grade===3){ c.ivl=Math.max(c.ivl+1,Math.round(c.ivl*c.ease)); c.due=now+c.ivl*DAY; }
    else { c.ease+=.15; c.ivl=Math.max(c.ivl+2,Math.round(c.ivl*c.ease*1.3)); c.due=now+c.ivl*DAY; }
  }
  if (c.relearn && c.ivl===0 && grade>=3 && c.learn>=1){ c.ivl=1; c.due=now+DAY; c.relearn=0; }
  c.reps++; save();
}
function preview(id, grade){
  const c = S.cards[id];
  const f = ms => ms<60*MIN ? Math.round(ms/MIN)+' min' : ms<DAY ? Math.round(ms/36e5)+' h' : Math.round(ms/DAY)+' d';
  if (!c || c.ivl===0){
    const learn = c ? c.learn : 0;
    return [null,'1 min','6 min', learn>=1?'1 d':'10 min','4 d'][grade];
  }
  const e=c.ease, i=c.ivl;
  return [null,'10 min', f(Math.max(1,Math.round(i*1.2))*DAY), f(Math.max(i+1,Math.round(i*e))*DAY), f(Math.max(i+2,Math.round(i*(e+.15)*1.3))*DAY)][grade];
}
const newToday = () => (S.log[today()]||{}).new || 0;
function dueIds(){ const now=Date.now(); return Object.keys(S.cards).map(Number).filter(id=>S.cards[id].due<=now).sort((a,b)=>S.cards[a].due-S.cards[b].due); }
function newIds(n){ const out=[]; for (const f of FRASES){ if(out.length>=n) break; if(!S.cards[f.id]) out.push(f.id); } return out; }
const learned = () => Object.values(S.cards).filter(c=>c.ivl>=7).length;
const level = id => { const c=S.cards[id]; if(!c) return 0; if(c.ivl>=7) return 3; if(c.ivl>=1) return 2; return 1; };

/* ---------- voz ---------- */
const NATIVE = !!window.Android;
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const STANDALONE = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
let deVoice = null;
function pickVoice(){ if(!window.speechSynthesis) return; const v=speechSynthesis.getVoices().filter(x=>/^de/i.test(x.lang));
  const pref=['Anna','Markus','Petra','Yannick','Helena','Viktor','Martin'];
  deVoice = v.find(x=>/premium|enhanced|mejorada|erweitert/i.test(x.name)) || pref.map(n=>v.find(x=>x.name.startsWith(n))).find(Boolean) || v.find(x=>/de[-_]DE/i.test(x.lang)) || v[0] || null; }
let ttsUnlocked=false;
document.addEventListener('touchend',()=>{ if(ttsUnlocked||!window.speechSynthesis) return; ttsUnlocked=true; try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){} },{once:false,passive:true});
if (window.speechSynthesis){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
const clean = t => t.replace(/…/g,'').replace(/\s+/g,' ').trim();
let esVoice=null;
function speak(text, slow, lang){
  const t = clean(text), rate = S.settings.rate*(slow?.7:1);
  lang = lang || 'de-DE';
  if (NATIVE){ try { if (lang!=='de-DE' && Android.speakLang) Android.speakLang(t, rate, lang); else Android.speak(t, rate); } catch(e){} return; }
  if (!window.speechSynthesis) return toast('Este navegador no tiene voz');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang=lang; u.rate=rate;
  if (lang==='de-DE' && deVoice) u.voice=deVoice;
  if (lang!=='de-DE'){ const v=speechSynthesis.getVoices().find(x=>x.lang.replace('_','-').startsWith(lang.slice(0,2))); if(v) u.voice=v; }
  speechSynthesis.speak(u);
}
let pending = null;
window.onSpeechResult = json => { if(pending){ let a; try{ a=JSON.parse(json);}catch(e){a=[json];} pending.res(a); pending=null; } };
window.onSpeechError = msg => { if(pending){ pending.rej(msg); pending=null; } };
function listen(){
  return new Promise((res, rej) => {
    if (NATIVE){ pending={res,rej}; try{ Android.listen('de-DE'); }catch(e){ pending=null; rej('sin micrófono'); } return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return rej(IOS ? 'Tu iPhone no permite el micrófono aquí. Activa Dictado (Ajustes › General › Teclado) o usa “Elegir”.' : 'Este navegador no reconoce voz (usa Chrome)');
    const r = new R(); r.lang='de-DE'; r.maxAlternatives=5; r.interimResults=false;
    let done=false;
    r.onresult = e => { done=true; res([...e.results[0]].map(a=>a.transcript)); };
    r.onerror = e => { done=true; rej(e.error==='no-speech'?'No escuché nada':e.error); };
    r.onend = () => { if(!done) rej('No escuché nada'); };
    r.start();
  });
}
const norm = s => s.toLowerCase().replace(/ß/g,'ss').replace(/…/g,'').replace(/[.,!?¿¡;:"„“()\-–]/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){ const m=a.length,n=b.length; if(!m) return n; if(!n) return m; let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[n]; }
function similarity(target, heardList){
  const t = norm(target); let best={score:0,text:heardList[0]||''};
  for (const h of heardList){ const n=norm(h); const s=1-lev(t,n)/Math.max(t.length,n.length,1); if(s>best.score) best={score:s,text:h}; }
  best.score=Math.round(best.score*100); return best;
}
function wordDiff(target, heard){
  const hw = new Set(norm(heard).split(' '));
  return clean(target).split(' ').map(w => `<span style="color:${hw.has(norm(w))?'var(--ok)':'var(--amber)'}">${esc(w)}</span>`).join(' ');
}
async function speakTest(btn, target, out){
  btn.classList.add('rec');
  out.innerHTML = 'Escuchando… habla en alemán';
  try{
    const alts = await listen();
    const r = similarity(target, alts);
    const msg = r.score>=85?'¡Excelente!':r.score>=65?'¡Casi! Repite otra vez':'Inténtalo de nuevo';
    out.innerHTML = `<b style="color:var(--amber)">${r.score}%</b> · ${msg}<br>Escuché: “${esc(r.text)}”`;
    return r.score;
  }catch(e){ out.textContent = String(e); return -1; }
  finally{ btn.classList.remove('rec'); }
}

/* ---------- util ---------- */
const chipWords = t => clean(t).replace(/[.,!?¿¡;:„“"]/g,'').split(' ').filter(Boolean);
const MASCOT = `<img class="mascot-img" src="mascota.jpg" alt="Chame">`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const img = f => ''+IMG[f.tema]+'.jpg';
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const ICON = {
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  slow:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 8.6V7h-2v6.4l4.6 2.7 1-1.7z"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"/></svg>'
};
let tt; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('show'),2200); }

/* ---------- navegación ---------- */
function go(name){
  $$('.screen').forEach(s=>s.classList.remove('on'));
  $('#s-'+name).classList.add('on');
  $$('nav button').forEach(b=>b.classList.toggle('on', b.dataset.go===name));
  $('nav').style.display = (name==='study'||name==='practice'||name==='call') ? 'none' : '';
  if (name!=='call') endCallTimer();
  window.scrollTo(0,0);
  if (name==='home') renderHome();
  if (name==='study') startStudy();
  if (name==='practice') startPractice();
  if (name==='list') renderList();
  if (name==='settings') renderSettings();
  if (name==='calls') renderCalls();
}
document.addEventListener('click', e => { const b=e.target.closest('[data-go]'); if(b) go(b.dataset.go); });
$('#goStudy').onclick = () => go('study');
$('#goPractice').onclick = () => go('practice');
$('#goCalls').onclick = () => go('calls');
$('#streakPill').onclick = () => toast('Racha: días seguidos estudiando');

/* ---------- inicio ---------- */
function renderHome(){
  const due = dueIds().length, nw = Math.max(0, Math.min(S.settings.newPerDay-newToday(), newIds(999).length));
  $('#dueNum').textContent = due + nw;
  $('#dueTxt').textContent = `${due} para repasar · ${nw} nuevas`;
  const doneToday = (S.log[today()]||{rev:0,new:0}); const tot = doneToday.rev+doneToday.new;
  $('#dayBar').style.width = Math.min(100, tot/Math.max(1,tot+due+nw)*100)+'%';
  $('#streakPill').textContent = '🔥 '+streak()+(streak()===1?' día':' días');
  $('#stLearned').textContent = learned();
  $('#stSeen').textContent = Object.keys(S.cards).length+'/400';
  const days = Math.ceil((new Date(S.settings.arrival+'T12:00') - new Date())/DAY);
  $('#countdown').textContent = days>0 ? `Faltan ${days} días para llegar a Alemania. 100 frases por semana, ¡tú puedes!` : 'Ya estás en Alemania. ¡Sigue practicando cada día!';
  const wk = Math.min(4, Math.floor((Date.now()-new Date(S.start+'T00:00'))/(7*DAY))+1);
  $('#weekNow').textContent = 'Semana '+wk+' de 4';
  $('#weeks').innerHTML = [1,2,3,4].map(w => {
    const ids = FRASES.filter(f=>f.semana===w); const seen = ids.filter(f=>S.cards[f.id]).length;
    const f0 = ids[0];
    return `<div class="card week" data-week="${w}">
      <img class="thumb" src="${img(f0)}" alt="">
      <div class="grow"><span class="tag">SEMANA ${w}${w===wk?' · AHORA':''}</span>
        <div style="font-weight:700">${esc(SEMANAS[w])}</div>
        <div class="bar"><div style="width:${seen}%"></div></div>
        <div class="small" style="margin-top:6px;color:var(--muted)">${seen}/100 vistas</div></div></div>`;
  }).join('');
  $$('#weeks .week').forEach(el => el.onclick = () => { listWeek = +el.dataset.week; go('list'); });
  updateCallsSub();
  if (NATIVE && Android.setStatus){ try{ Android.setStatus(due+nw, streak()); }catch(e){} }
}

/* ---------- tarjetas ---------- */
let queue=[], qDone=0, qTotal=0, customQueue=null;
function startStudy(){
  const nw = newIds(Math.max(0,S.settings.newPerDay-newToday()));
  queue = customQueue && customQueue.length ? [...customQueue] : [...dueIds(), ...nw]; customQueue=null; qDone=0; qTotal=queue.length;
  showCard();
}
function nextLearning(){ // tarjetas en aprendizaje que vencen pronto
  const soon = Date.now()+20*MIN;
  return Object.keys(S.cards).map(Number).filter(id=>S.cards[id].ivl===0 && S.cards[id].due<=soon).sort((a,b)=>S.cards[a].due-S.cards[b].due)[0];
}
function showCard(){
  $('#studyBar').style.width = (qTotal? qDone/qTotal*100 : 100)+'%';
  $('#studyCount').textContent = queue.length;
  if (!queue.length){ const l=nextLearning(); if(l){ queue.push(l); } }
  if (!queue.length){
    $('#studyBox').innerHTML = `<img class="hero-mascot" src="mascota_full.jpg" alt=""><div class="card amber" style="text-align:center;padding:34px 20px">
      <div class="big">¡Listo por hoy! 🎉</div><p>Repasaste ${qDone} tarjetas. Vuelve mañana para mantener tu racha.</p></div>
      <button class="wide dark" style="margin-top:14px" id="moreNew">Aprender 5 frases más</button>
      <button class="wide" style="margin-top:10px" data-go="practice">Ir a practicar</button>`;
    $('#moreNew').onclick = () => { queue = newIds(5); qTotal+=queue.length; if(!queue.length) toast('¡Ya viste las 400 frases!'); showCard(); };
    return;
  }
  const id = queue[0], f = byId[id], isNew = !S.cards[id];
  $('#studyBox').innerHTML = `
    <div class="card flash">
      <img src="${img(f)}" alt="">
      <div class="in">
        <div><span class="tag">${isNew?'NUEVA · ':''}${esc(f.tema)}</span></div>
        <div class="small" style="color:var(--muted)">¿Cómo se dice en alemán?</div>
        <div class="q">${esc(f.es)}</div>
        <div class="heard" id="heard"></div>
        <div class="actions">
          <button class="iconbtn" id="micBtn" aria-label="Hablar">${ICON.mic}</button>
          <button class="wide" id="reveal">Mostrar respuesta</button>
        </div>
      </div>
    </div>
    <div id="back" class="hide">
      <div class="card white" style="margin-top:12px">
        <div class="row">
          <div class="grow a">${esc(f.de)}</div>
          <button class="iconbtn" id="playBtn">${ICON.play}</button>
        </div>
        <div class="row" style="margin-top:12px;gap:8px">
          <button class="pill dark" id="slowBtn">🐢 Lento</button>
          <button class="pill dark" id="micBtn2">🎤 Repetir y evaluar</button>
        </div>
        <div class="heard" id="heard2" style="color:#555"></div>
      </div>
      <div class="btns">
        ${[1,2,3,4].map(g=>`<button class="b${g}" data-g="${g}">${['','Otra vez','Difícil','Bien','Fácil'][g]}<small>${preview(id,g)}</small></button>`).join('')}
      </div>
    </div>`;
  const reveal = () => { $('#back').classList.remove('hide'); $('#reveal').classList.add('hide'); if(S.settings.autoplay) speak(f.de); };
  $('#reveal').onclick = reveal;
  $('#micBtn').onclick = async e => { const sc = await speakTest(e.currentTarget, f.de, $('#heard')); if(sc>=0) reveal(); };
  $('#studyBox').onclick = async e => {
    if (e.target.closest('#playBtn')) speak(f.de);
    if (e.target.closest('#slowBtn')) speak(f.de, true);
    if (e.target.closest('#micBtn2')) await speakTest(e.target.closest('#micBtn2'), f.de, $('#heard2'));
    const g = e.target.closest('[data-g]');
    if (g){ schedule(id, +g.dataset.g); queue.shift(); qDone++; qTotal=Math.max(qTotal,qDone+queue.length); showCard(); }
  };
}

/* ---------- práctica tipo Duolingo ---------- */
let P = null;
function pool(){
  let ids = Object.keys(S.cards).map(Number);
  if (ids.length < 8) ids = FRASES.slice(0, Math.max(20, ids.length+12)).map(f=>f.id);
  // prioriza las más débiles
  return shuffle(ids).sort((a,b)=>((S.cards[a]||{}).ivl||0)-((S.cards[b]||{}).ivl||0)).slice(0,30);
}
function startPractice(){
  const ids = shuffle(pool()).slice(0,10);
  const types = ['build','listen','build','choose','speak','build','listenOrder','build','speak','build'];
  P = { items: ids.map((id,i)=>({id, type: types[i%types.length]})), i:0, ok:0, combo:0, total:ids.length };
  P.items.forEach(it => { if((it.type==='build'||it.type==='listenOrder') && chipWords(byId[it.id].de).length<2) it.type='choose'; });
  showEx();
}
function distract(id, field, n=3){
  const f = byId[id]; const same = FRASES.filter(x=>x.id!==id && x.tema===f.tema); const other = FRASES.filter(x=>x.id!==id && x.tema!==f.tema);
  return shuffle([...shuffle(same).slice(0,2), ...shuffle(other)]).slice(0,n).map(x=>x[field]);
}
function showEx(){
  const doneN = Math.min(P.i, P.total);
  $('#pracBar').style.width = doneN/P.total*100+'%';
  $('#pracCount').innerHTML = `<span class="combo">⚡ ${P.combo}</span>`;
  if (P.i >= P.items.length){
    const pct = Math.round(P.ok/P.total*100);
    $('#pracBox').innerHTML = `<img class="hero-mascot" src="mascota_full.jpg" alt=""><div class="card amber" style="text-align:center;padding:34px 20px">
      <div class="small" style="font-weight:700">RESULTADO</div><div class="big" style="font-size:56px">${pct}%</div>
      <p>${P.ok} de ${P.total} correctas a la primera. ${pct>=80?'¡Excelente trabajo!':'Repite la práctica para mejorar.'}</p></div>
      <button class="wide" style="margin-top:14px" id="again">Practicar otra vez</button>
      <button class="wide dark" style="margin-top:10px" data-go="home">Volver al inicio</button>`;
    $('#again').onclick = startPractice; return;
  }
  const it = P.items[P.i], f = byId[it.id];
  const box = $('#pracBox');
  if (it.type==='listen'){
    const opts = shuffle([f.es, ...distract(it.id,'es')]);
    box.innerHTML = `<h2>¿Qué significa?</h2><p class="sub">Escucha y elige la traducción</p>
      <div class="row" style="gap:12px;margin-bottom:8px"><button class="iconbtn amber" id="pl">${ICON.play}</button><button class="iconbtn" id="pls">${ICON.slow}</button></div>
      ${opts.map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}`;
    $('#pl').onclick=()=>speak(f.de); $('#pls').onclick=()=>speak(f.de,true); setTimeout(()=>speak(f.de),300);
    box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>judgeOpt(b, b.dataset.o===f.es, f));
  }
  else if (it.type==='choose'){
    const opts = shuffle([f.de, ...distract(it.id,'de')]);
    box.innerHTML = `<h2>Elige la frase en alemán</h2><div class="card white" style="margin:14px 0"><div class="a" style="font-size:20px">${esc(f.es)}</div></div>
      ${opts.map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}`;
    box.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ speak(b.dataset.o); judgeOpt(b, b.dataset.o===f.de, f); });
  }
  else if (it.type==='build'){
    // Estilo Duolingo: frase en español -> armar en alemán con fichas
    const words = chipWords(f.de);
    const extra = shuffle([...new Set(distract(it.id,'de',6).flatMap(chipWords))].filter(w=>!words.some(x=>x.toLowerCase()===w.toLowerCase())))
                    .slice(0, Math.max(3, Math.min(5, 10-words.length)));
    const bank = shuffle([...words, ...extra]);
    box.innerHTML = `${it.retry?'<div class="retry">↻ ERROR ANTERIOR</div>':''}
      <h2 class="extitle">Traduce esta oración</h2>
      <div class="scene">
        ${MASCOT}
        <div class="bubble"><button class="bspk" id="spk" aria-label="Escuchar">${ICON.play}</button><span>${esc(clean(f.es))}</span></div>
      </div>
      <div class="lines" id="ans"></div>
      <div class="bank duo" id="bank">${bank.map((w,i)=>`<button class="chip" data-i="${i}">${esc(w)}</button>`).join('')}</div>
      <div class="checkbar"><button class="wide" id="check" disabled>Comprobar</button></div>`;
    $('#spk').onclick = () => speak(f.es, false, 'es-ES');
    const picked=[];
    const redraw=()=>{ $('#ans').innerHTML = picked.map((i,k)=>`<button class="chip" data-k="${k}">${esc(bank[i])}</button>`).join('');
      box.querySelectorAll('#bank .chip').forEach(c=>c.classList.toggle('used', picked.includes(+c.dataset.i))); $('#check').disabled=!picked.length; };
    $('#bank').onclick = e => { const c=e.target.closest('.chip'); if(c && !c.classList.contains('used')){ picked.push(+c.dataset.i); speak(bank[+c.dataset.i]); redraw(); } };
    $('#ans').onclick = e => { const c=e.target.closest('.chip'); if(c){ picked.splice(+c.dataset.k,1); redraw(); } };
    $('#check').onclick = () => { const said = picked.map(i=>bank[i]).join(' '); feedback(norm(said)===norm(chipWords(f.de).join(' ')), f); };
  }
  else if (it.type==='order' || it.type==='listenOrder'){
    const words = chipWords(f.de);
    const extra = shuffle([...new Set(distract(it.id,'de',6).flatMap(chipWords))].filter(w=>!words.some(x=>x.toLowerCase()===w.toLowerCase()))).slice(0,3);
    const bank = shuffle([...words, ...extra]);
    box.innerHTML = `${it.retry?'<div class="retry">↻ ERROR ANTERIOR</div>':''}
      <h2 class="extitle">Escucha y escribe lo que oyes</h2>
      <div class="row" style="gap:14px;justify-content:center;margin:6px 0 22px">
        <button class="iconbtn amber" id="pl" style="width:84px;height:84px">${ICON.play}</button>
        <button class="iconbtn" id="pls" style="width:60px;height:60px">${ICON.slow}</button></div>
      <div class="lines" id="ans"></div>
      <div class="bank duo" id="bank">${bank.map((w,i)=>`<button class="chip" data-i="${i}">${esc(w)}</button>`).join('')}</div>
      <div class="checkbar"><button class="wide" id="check" disabled>Comprobar</button></div>`;
    $('#pl').onclick=()=>speak(f.de); $('#pls').onclick=()=>speak(f.de,true); setTimeout(()=>speak(f.de),300);
    const picked=[];
    const redraw=()=>{ $('#ans').innerHTML = picked.map((i,k)=>`<button class="chip" data-k="${k}">${esc(bank[i])}</button>`).join('');
      box.querySelectorAll('#bank .chip').forEach(c=>c.classList.toggle('used', picked.includes(+c.dataset.i))); $('#check').disabled=!picked.length; };
    $('#bank').onclick = e => { const c=e.target.closest('.chip'); if(c && !c.classList.contains('used')){ picked.push(+c.dataset.i); redraw(); } };
    $('#ans').onclick = e => { const c=e.target.closest('.chip'); if(c){ picked.splice(+c.dataset.k,1); redraw(); } };
    $('#check').onclick = () => { const said = picked.map(i=>bank[i]).join(' '); feedback(norm(said)===norm(words.join(' ')), f); };
  }
  else if (it.type==='speak'){
    const hard = (S.cards[it.id]||{}).ivl>=3;
    box.innerHTML = `<h2>${hard?'Dilo en alemán':'Lee en voz alta'}</h2>
      <p class="sub">${hard?'Habla sin mirar la respuesta':'Escucha y repite con buena pronunciación'}</p>
      <div class="card ${hard?'white':'amber'}" style="margin-bottom:14px">
        <div class="a" style="font-size:22px">${esc(hard? f.es : f.de)}</div>
        ${hard?'':`<div class="small" style="margin-top:8px">${esc(f.es)}</div>`}
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:20px">
        ${hard?'':`<button class="iconbtn" id="pl" style="width:64px;height:64px">${ICON.play}</button>`}
        <button class="iconbtn amber" id="mic" style="width:84px;height:84px">${ICON.mic}</button>
      </div>
      <div class="heard" id="hd" style="text-align:center"></div>
      <button class="wide dark" style="margin-top:16px" id="skip">No puedo hablar ahora</button>`;
    if (!hard){ $('#pl').onclick=()=>speak(f.de); }
    $('#mic').onclick = async e => { const sc = await speakTest(e.currentTarget, f.de, $('#hd')); if (sc>=0) setTimeout(()=>feedback(sc>=70, f, sc), 700); };
    $('#skip').onclick = () => { P.i++; showEx(); };
  }
}
function judgeOpt(btn, ok, f){
  $$('#pracBox .opt').forEach(b=>{ b.disabled=true; if(b.dataset.o===f.es||b.dataset.o===f.de) b.classList.add('ok'); });
  if(!ok) btn.classList.add('bad');
  setTimeout(()=>feedback(ok,f),400);
}
function feedback(ok, f, score){
  const it = P.items[P.i];
  if (ok){ if(!it.retry) P.ok++; P.combo++; speak(f.de); }
  else { P.combo=0; if(!it.retry) P.items.push({id:it.id, type:it.type, retry:true}); }
  const fb=$('#fb'); fb.className='feedback show '+(ok?'good':'wrong');
  $('#fbTitle').textContent = ok ? (score?`¡Muy bien! ${score}%`:['¡Correcto!','¡Excelente!','¡Muy bien!','¡Perfecto!'][Math.floor(Math.random()*4)]) : 'Respuesta correcta:';
  $('#fbText').innerHTML = `<b>${esc(f.de)}</b><br><span style="color:var(--muted)">${esc(f.es)}</span>`;
  if(!ok) speak(f.de);
  $('#fbNext').onclick = () => { fb.className='feedback'; P.i++; showEx(); };
}


/* ---------- llamadas (conversación) ---------- */
const PHONE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
const callImg = c => ''+c.img+'.jpg';
function callSeen(c){ return c.need.filter(id=>S.cards[id]).length; }
function callOpen(c){ return callSeen(c) >= Math.ceil(c.need.length*0.5); }
function renderCalls(){
  S.callsDone = S.callsDone || {};
  $('#callList').innerHTML = LLAMADAS.map((c,i)=>{
    const seen=callSeen(c), open=callOpen(c), best=S.callsDone[c.id];
    return `<div class="card callitem ${open?'':'locked'}" data-c="${i}">
      <div class="row">
        <div class="avatar" style="background-image:url(${callImg(c)})"><span>${c.icon}</span></div>
        <div class="grow"><span class="tag">SEMANA ${c.week}${best?' · '+'★'.repeat(best)+'☆'.repeat(3-best):''}</span>
          <div style="font-weight:700">${esc(c.title)}</div>
          <div class="small" style="color:var(--muted)">${esc(c.who)} · ${seen}/${c.need.length} frases estudiadas</div>
          <div class="bar"><div style="width:${seen/c.need.length*100}%"></div></div></div>
        ${open?`<button class="circle green" data-call="${i}" aria-label="Llamar">${PHONE}</button>`
              :`<button class="pill dark" data-learn="${i}">🔒 Estudiar</button>`}
      </div></div>`; }).join('');
  $$('#callList [data-call]').forEach(b=>b.onclick=()=>startCall(+b.dataset.call));
  $$('#callList [data-learn]').forEach(b=>b.onclick=()=>{ const c=LLAMADAS[+b.dataset.learn];
    customQueue = c.need.filter(id=>!S.cards[id]);
    toast('Estudia estas '+customQueue.length+' frases para desbloquear la llamada'); go('study'); });
}
function updateCallsSub(){
  const n = LLAMADAS.filter(callOpen).length;
  $('#callsSub').textContent = n ? `${n} de ${LLAMADAS.length} llamadas disponibles` : 'Estudia tus primeras frases para desbloquearlas';
}
let C=null, callTimer=null;
function endCallTimer(){ if(callTimer){ clearInterval(callTimer); callTimer=null; } }
function startCall(i){
  const c = LLAMADAS[i];
  C = { c, i, t:0, results:[], tries:0, start:0 };
  go('call');
  $('#callBox').innerHTML = `<div class="incoming">
      <div class="ring"><div class="avatar xl" style="background-image:url(${callImg(c)})"><span>${c.icon}</span></div></div>
      <div class="callname">${esc(c.who)}</div>
      <div class="small" style="color:var(--muted)">Llamada entrante… · ${esc(c.title)}</div>
      <div class="incoming-btns">
        <button class="hang" id="decline" aria-label="Rechazar">${PHONE}</button>
        <button class="answer" id="accept" aria-label="Contestar">${PHONE}</button>
      </div>
      <p class="small" style="color:var(--muted);text-align:center;margin-top:28px">Escucha a ${esc(c.who.split(',')[0])} y responde hablando en alemán.<br>Si no puedes hablar, usa “Elegir”.</p>
    </div>`;
  $('#decline').onclick = () => go('calls');
  $('#accept').onclick = () => beginCall();
}
function beginCall(){
  const c=C.c; C.start=Date.now();
  $('#callBox').innerHTML = `<div class="callhead">
      <div class="avatar sm" style="background-image:url(${callImg(c)})"><span>${c.icon}</span></div>
      <div class="grow"><div style="font-weight:700">${esc(c.who)}</div><div class="small" style="color:var(--ok)" id="ctime">00:00</div></div>
      <button class="hang small" id="hangup" aria-label="Colgar">${PHONE}</button></div>
    <div class="chat" id="chat"></div>
    <div class="callpanel" id="cpanel"></div>`;
  $('#hangup').onclick = () => { if(confirm('¿Colgar la llamada?')) go('calls'); };
  callTimer = setInterval(()=>{ const s=Math.floor((Date.now()-C.start)/1000); const el=$('#ctime'); if(el) el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); },1000);
  nextTurn();
}
function addBubble(html, me){
  const d=document.createElement('div'); d.className='msg '+(me?'me':'them'); d.innerHTML=html;
  $('#chat').appendChild(d); setTimeout(()=>d.scrollIntoView({behavior:'smooth',block:'end'}),50); return d;
}
function nextTurn(){
  const c=C.c;
  if (C.t >= c.turns.length) return finishCall();
  const turn=c.turns[C.t];
  if (turn.n){
    const d = addBubble(`<div class="de">${esc(turn.n)}</div><div class="es hide">${esc(turn.es)}</div>
      <div class="msgbtns"><button data-a="play">${ICON.play}</button><button data-a="tr">Traducir</button></div>`);
    d.querySelector('[data-a=play]').onclick=()=>speak(turn.n);
    d.querySelector('[data-a=tr]').onclick=e=>{ d.querySelector('.es').classList.toggle('hide'); };
    speak(turn.n);
    C.t++;
    if (C.t >= c.turns.length){ $('#cpanel').innerHTML = `<button class="wide" id="endc">Terminar llamada</button>`; $('#endc').onclick=finishCall; }
    else setTimeout(nextTurn, 500);
    return;
  }
  C.tries=0; userTurn(turn);
}
function userTurn(turn){
  const target = turn.u[0];
  $('#cpanel').innerHTML = `<div class="small" style="color:var(--amber);font-weight:700;letter-spacing:.5px">TU TURNO · DI EN ALEMÁN</div>
    <div class="hint-es">${esc(turn.es)}</div>
    <div class="hint-de hide" id="hintDe">${esc(target)}</div>
    <div class="heard" id="cheard"></div>
    <div class="panelbtns">
      <button class="pill dark" id="hintBtn">💡 Pista</button>
      <button class="iconbtn amber bigmic" id="cmic">${ICON.mic}</button>
      <button class="pill dark" id="optBtn">Elegir</button>
    </div>`;
  let hinted=false;
  $('#hintBtn').onclick=()=>{ hinted=true; $('#hintDe').classList.remove('hide'); speak(target); };
  $('#cmic').onclick=async e=>{
    const btn=e.currentTarget; btn.classList.add('rec'); $('#cheard').textContent='Escuchando…';
    try{
      const alts=await listen();
      let best={score:0,text:alts[0]||'',target};
      for (const t of turn.u){ const r=similarity(t,alts); if(r.score>best.score) best={...r,target:t}; }
      if (best.score>=65){ answer(best.target, best.score, hinted?'pista':'voz'); }
      else { C.tries++; $('#cheard').innerHTML=`<b style="color:var(--amber)">${best.score}%</b> · Escuché: “${esc(best.text)}”. ${C.tries>=2?'Mira la pista o elige.':'Inténtalo otra vez.'}`;
        if(C.tries>=2){ hinted=true; $('#hintDe').classList.remove('hide'); } }
    }catch(err){ $('#cheard').textContent=String(err); }
    finally{ btn.classList.remove('rec'); }
  };
  $('#optBtn').onclick=()=>{
    const others = shuffle(LLAMADAS.flatMap(x=>x.turns.filter(t=>t.u).map(t=>t.u[0])).filter(x=>!turn.u.includes(x))).slice(0,2);
    const opts = shuffle([target,...others]);
    $('#cpanel').innerHTML = `<div class="small" style="color:var(--amber);font-weight:700">ELIGE LA RESPUESTA</div><div class="hint-es">${esc(turn.es)}</div>
      ${opts.map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}`;
    $$('#cpanel .opt').forEach(b=>b.onclick=()=>{
      if (b.dataset.o===target){ b.classList.add('ok'); setTimeout(()=>answer(target,0,'opción'),350); }
      else { b.classList.add('bad'); speak(target); C.tries++; }
    });
  };
}
function answer(text, score, how){
  const turn=C.c.turns[C.t];
  C.results.push({how, score, tries:C.tries});
  addBubble(`<div class="de">${esc(text)}</div><div class="badge">${how==='voz'?'🎤 '+score+'%':how==='pista'?'💡 '+(score?score+'%':''):'☝️ elegida'}</div>`, true);
  $('#cpanel').innerHTML='';
  if (how!=='voz') speak(text);
  C.t++; setTimeout(nextTurn, how==='voz'?400:1400);
}
function finishCall(){
  endCallTimer();
  const r=C.results, n=r.length||1;
  const voice=r.filter(x=>x.how==='voz').length;
  const pts = r.reduce((a,x)=>a+(x.how==='voz'?(x.tries?0.75:1):x.how==='pista'?0.5:0.25),0)/n;
  const stars = pts>=0.9?3:pts>=0.6?2:1;
  S.callsDone=S.callsDone||{}; S.callsDone[C.c.id]=Math.max(S.callsDone[C.c.id]||0,stars); logDay('rev'); save();
  const secs=Math.floor((Date.now()-C.start)/1000);
  $('#cpanel').innerHTML = `<div class="card amber" style="text-align:center">
      <div class="small" style="font-weight:700">LLAMADA TERMINADA · ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</div>
      <div class="big" style="font-size:44px;letter-spacing:4px">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
      <div>${voice} de ${r.length} respuestas habladas sin ayuda</div></div>
    <div class="row" style="gap:10px;margin-top:12px">
      <button class="wide dark" id="again2">Otra vez</button><button class="wide" id="back2">Más llamadas</button></div>`;
  $('#again2').onclick=()=>startCall(C.i); $('#back2').onclick=()=>go('calls');
  $('#chat').lastElementChild && $('#chat').lastElementChild.scrollIntoView({block:'end'});
}

/* ---------- lista ---------- */
let listWeek = 1;
function renderList(){
  $('#weekTabs').innerHTML = [0,1,2,3,4].map(w=>`<button data-w="${w}" class="${w===listWeek?'on':''}">${w?'Semana '+w:'Todas'}</button>`).join('');
  $$('#weekTabs button').forEach(b=>b.onclick=()=>{ listWeek=+b.dataset.w; renderList(); });
  const q = norm($('#q').value||'');
  const items = FRASES.filter(f => (!listWeek || f.semana===listWeek) && (!q || norm(f.de+' '+f.es).includes(q)));
  $('#listCount').textContent = items.length+' frases';
  let last=''; let html='';
  for (const f of items){
    if (f.tema!==last){ html+=`<div class="topic">${esc(f.tema)}</div>`; last=f.tema; }
    html+=`<div class="item"><span class="lvl l${level(f.id)}"></span><div class="grow"><div class="de">${esc(f.de)}</div><div class="es">${esc(f.es)}</div></div><button class="play" data-say="${f.id}">${ICON.play}</button></div>`;
  }
  $('#list').innerHTML = html || '<div class="empty">No hay resultados</div>';
}
$('#q').addEventListener('input', renderList);
$('#list').addEventListener('click', e => { const b=e.target.closest('[data-say]'); if(b) speak(byId[b.dataset.say].de); });

/* ---------- ajustes ---------- */
function renderSettings(){
  $('#vNew').textContent=S.settings.newPerDay; $('#vRate').textContent=S.settings.rate.toFixed(1);
  $('#arrival').value=S.settings.arrival; $('#autoplay').textContent=S.settings.autoplay?'Sí':'No';
  $('#remTime').value=S.settings.remTime; $('#remOn').textContent=S.settings.remOn?'Sí':'No';
}
$$('[data-step]').forEach(b=>b.onclick=()=>{ const [k,d]=b.dataset.step.split(':');
  if(k==='newPerDay') S.settings.newPerDay=Math.min(40,Math.max(5,S.settings.newPerDay+(+d)));
  else S.settings.rate=Math.round(Math.min(1.3,Math.max(.5,S.settings.rate+(+d)))*10)/10;
  save(); renderSettings(); if(k==='rate') speak('Guten Morgen! Wie geht es Ihnen?'); });
function applyReminder(){ if(!(NATIVE && Android.setReminder)) return; const [h,m]=S.settings.remTime.split(':').map(Number); try{ Android.setReminder(!!S.settings.remOn,h,m); }catch(e){} }
$('#remTime').onchange=e=>{ if(!e.target.value) return; S.settings.remTime=e.target.value; save(); applyReminder(); toast('Recordatorio a las '+e.target.value); };
$('#remOn').onclick=()=>{ S.settings.remOn=!S.settings.remOn; save(); applyReminder(); renderSettings(); toast(S.settings.remOn?'Recordatorio activado':'Recordatorio desactivado'); };
$('#remTest').onclick=()=>{ if(NATIVE && Android.testReminder) Android.testReminder(); else if(IOS) toast('En iPhone el aviso diario se hace con la app Atajos (mira la guía)'); else toast('La notificación funciona solo en la app de Android'); };
if(!NATIVE && IOS){ const h=$('#remHint'); if(h) h.textContent='En iPhone: app Atajos › Automatización › Hora del día'; }
(function(){ const c=$('#installCard'); let seen=false; try{seen=localStorage.getItem('ds_install_seen')==='1';}catch(e){}
  if(c && IOS && !STANDALONE && !seen) c.classList.remove('hide');
  const b=$('#installClose'); if(b) b.onclick=()=>{ c.classList.add('hide'); try{localStorage.setItem('ds_install_seen','1');}catch(e){} }; })();
if('serviceWorker' in navigator && location.protocol==='https:'){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
$('#arrival').onchange=e=>{ S.settings.arrival=e.target.value; save(); };
$('#autoplay').onclick=()=>{ S.settings.autoplay=!S.settings.autoplay; save(); renderSettings(); };
$('#testVoice').onclick=async e=>{ speak('Hallo Milton! Willkommen in Deutschland.'); };
$('#exp').onclick=()=>{
  const data = JSON.stringify(S);
  if (NATIVE && Android.shareText){ Android.shareText('deutschstart-progreso.json', data); return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download='deutschstart-progreso-'+today()+'.json'; a.click();
};
$('#imp').onclick=()=>$('#impFile').click();
$('#impFile').onchange=e=>{ const file=e.target.files[0]; if(!file) return; const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result); if(!d.cards) throw 0; localStorage.setItem(KEY,r.result); load(); toast('Progreso importado'); renderSettings(); }catch(x){ toast('Archivo no válido'); } };
  r.readAsText(file); };
$('#reset').onclick=()=>{ if(confirm('¿Borrar todo el progreso?')){ S={cards:{},log:{},start:today(),settings:S.settings}; save(); toast('Progreso borrado'); } };

/* ---------- inicio ---------- */
load(); save(); renderHome(); applyReminder();
setTimeout(()=>{ const sp=$('#splash'); if(sp){ sp.classList.add('out'); setTimeout(()=>sp.remove(),500); } }, 1100);
window.addEventListener('pageshow', renderHome);
})();
