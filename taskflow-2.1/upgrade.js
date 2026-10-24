
/* TaskFlow 2.1 — additive upgrade of Beta 2, preserving the authenticated app. */
(function(){
'use strict';
const Q=(s,root=document)=>root.querySelector(s),QA=(s,root=document)=>Array.from(root.querySelectorAll(s));
const safe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const add=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const weekOf=s=>{const d=new Date(s+'T12:00:00');return add(s,-(d.getDay()+6)%7)};
const fmt=s=>new Date(s+'T12:00:00').toLocaleDateString('cs-CZ',{day:'numeric',month:'short'});
const mins=t=>{const a=String(t||'00:00').split(':');return (Number(a[0])||0)*60+(Number(a[1])||0)};
const time=m=>{m=Math.max(0,Math.min(1439,Math.round(m)));return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const keys=['home','tasks','calendar','notes','focus','progress','settings'];
let shownWeek=weekOf(today()),didIntro=false,search='',filter='all',expandedNotes=new Set(),focusedDay=null;
let focusSession=null,focusInterval=null,focusMinute=-1,welcomeDone=false;
let lastLevel=0;
function preferences(){
 if(!data||typeof data!=='object')return {accent:'#8d82f2',background:'default',transparency:.76,sound:true,motion:true};
 if(!data.preferences||typeof data.preferences!=='object')data.preferences={};
 const p=data.preferences;
 if(!/^#[0-9a-f]{6}$/i.test(p.accent||''))p.accent='#8d82f2';
 if(!['default','clean','glow'].includes(p.background))p.background='default';
 p.transparency=clamp(Number(p.transparency)||.76,.4,.95);
 p.sound=p.sound!==false;p.motion=p.motion!==false;
 return p;
}
function audible(freq=450,duration=.09,volume=.025){
 if(!preferences().sound)return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 const c=audible.context||(audible.context=new C());if(c.state==='suspended')c.resume().catch(()=>{});
 const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);
 o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration+.01);
 }catch(e){}
}
function award(q){
 if(!q||q.canceled||q.movedTo)return 0;
 if(q.locked)return Number(q.xp)||0;
 if(typeof q.xpToday==='number')return Number(q.xpToday)||0;
 return suggestedDayXp(q);
}
function suggestedDayXp(q){const x=Number(q.xp);return x<=5?2:x<=15?10:20}
function totalXp21(){return data.quests.reduce((t,q)=>t+(q.done?award(q):0),0)+data.focus.reduce((t,f)=>t+(Number(f.xp)||0),0)}
function level21(){return Math.floor(totalXp21()/250)+1}
function doneDate(q){return q.completedOn||q.date}
function xpForDate(s){return data.quests.filter(q=>q.done&&doneDate(q)===s).reduce((t,q)=>t+award(q),0)+data.focus.filter(f=>f.date===s).reduce((t,f)=>t+(Number(f.xp)||0),0)}
function focusForDate(s){return data.focus.filter(f=>f.date===s).reduce((t,f)=>t+(Number(f.minutes)||0),0)}
function save21(){save()}
function setTheme(){
 const p=preferences();
 document.documentElement.style.setProperty('--tf-accent',p.accent);
 document.documentElement.style.setProperty('--tf-surface-alpha',String(p.transparency));
 document.body.dataset.tfBackground=p.background;
 document.body.dataset.tfReduceMotion=p.motion?'false':'true';
}
function streak21(){let d=today(),sum=0;if(!data.locks[add(d,1)])d=add(d,-1);while(data.locks[add(d,1)]){sum++;d=add(d,-1)}return sum}
window.streak=streak21;
function initDom(){
 const home=$('home');const original=Q('.grid',home);if(original)original.classList.add('tf21-hidden');
 const week=document.createElement('div');week.id='tf21Home';week.innerHTML='<section class="panel tf21-week-panel"><div class="tf21-toolbar"><div><h2>Tvůj týden</h2><p id="tf21WeekLabel"></p></div><div class="toolbar"><button type="button" class="secondary" id="tf21PrevWeek" aria-label="Předchozí týden">‹</button><button type="button" class="secondary" id="tf21ThisWeek">This Week</button><button type="button" class="secondary" id="tf21NextWeek" aria-label="Další týden">›</button><button type="button" class="primary" id="tf21AddEvent">+ Událost</button></div></div><div class="tf21-week-viewport" id="tf21Scroll"><div class="tf21-week-width" id="tf21WeekCanvas"></div></div><p class="small" style="margin-top:9px">Klepni do rozvrhu pro přidání události. Přesuň kartu za ↔, uprav délku za spodní okraj.</p></section><div class="tf21-home-cols"><section class="panel"><div class="panel-top"><h2>Dnešní úkoly</h2><span class="small" id="tf21TodayCount"></span><button class="primary" id="tf21NewTask">+ Úkol</button></div><div id="tf21TodayTasks"></div></section><section class="panel"><h2>Tvůj progres</h2><p id="tf21XpSummary"></p><div class="progress" style="margin-top:14px"><div id="tf21XpBar"></div></div><div class="statgrid" style="margin-top:20px"><div class="stat"><span class="small">🔥 Planning Streak</span><strong id="tf21HomeStreak">0</strong></div><div class="stat"><span class="small">Focus dnes</span><strong id="tf21HomeFocus">0 min</strong></div></div><div class="line"></div><button type="button" class="primary" id="tf21PlanButton">☾ Next Day</button></section></div>';
 home.insertBefore(week,original);
 const tasks=$('tasks');const taskPanel=Q('.panel',tasks);
 taskPanel.insertAdjacentHTML('afterbegin','<div class="tf21-filters"><select id="tf21TaskFilter" aria-label="Stav úkolů"><option value="all">Všechny</option><option value="active">Rozpracované</option><option value="done">Hotové</option></select><input id="tf21TaskSearch" type="search" placeholder="Hledat úkol…" aria-label="Hledat úkol"></div>');
 const notes=$('notes');Q('.intro p',notes).textContent='Všechny poznámky přehledně na jednom místě.';
 const noteObserver=new MutationObserver(()=>{if(Q('.tfNoteCard',$('tfNotesList')))drawNotes()});noteObserver.observe($('tfNotesList'),{childList:true});
 const progress=$('progress');progress.insertAdjacentHTML('beforeend','<div class="tf21-home-cols" style="margin-top:18px"><section class="panel"><h2>XP za posledních 7 dní</h2><div id="tf21XpChart"></div><p class="small" id="tf21XpDetail">Klepni na den pro detail.</p></section><section class="panel"><h2>🔥 Planning Streak</h2><div id="tf21StreakStats"></div><div id="tf21StreakDays"></div></section></div><section class="panel" style="margin-top:18px"><h2>Focus Mode – statistiky</h2><div class="statgrid" id="tf21FocusStats" style="margin-top:13px"></div><div id="tf21FocusChart"></div></section>');
 const settings=$('settings'),appearance=Q('#tfThemeGrid',settings);
 const advanced=document.createElement('div');advanced.className='tf21-setting-panel';advanced.innerHTML='<h3>Vlastní přizpůsobení</h3><div class="tf21-settings-flex" style="margin-top:13px"><div><label for="tf21Accent">Hlavní barva</label><input type="color" id="tf21Accent" value="#8d82f2"></div><div><label for="tf21Transparency">Průhlednost karet</label><input id="tf21Transparency" type="range" min="40" max="95" step="5" value="76"></div><div><label for="tf21Background">Pozadí</label><select id="tf21Background"><option value="default">Podle motivu</option><option value="glow">Jemná záře</option><option value="clean">Jednobarevné</option></select></div><div><label>Zvuky a animace</label><label class="tf21-check"><input type="checkbox" id="tf21Sounds" checked> Jemné zvuky</label><label class="tf21-check"><input type="checkbox" id="tf21Motion" checked> Plynulé animace</label></div></div><p class="small" style="margin-top:12px">Změny se zobrazují ihned a automaticky se ukládají do účtu.</p>';
 appearance.parentNode.appendChild(advanced);
 const focus=$('focus');
 const circle=Q('.focusCircle',focus);circle.classList.add('tf21-focus-dial');
 Q('#focusStart',focus).textContent='▶ Start';
 $('focusEnd').textContent='■ Finish';
 Q('.focusActions',focus).insertAdjacentHTML('afterend','<div class="tf21-focus-actions-extra"><button class="secondary" id="tf21FocusPause" disabled>⏸ Pause</button></div>');
 focus.insertAdjacentHTML('beforeend','<div id="tf21FocusSessionEnd"></div>');
 const body=document.body;
 body.addEventListener('click',handleClick,true);
 body.addEventListener('change',handleChange,true);
 body.addEventListener('input',handleInput,true);
 document.addEventListener('pointerdown',pointerStart,true);
 document.addEventListener('pointermove',pointerMove,true);
 document.addEventListener('pointerup',pointerEnd,true);
 $('tf21PrevWeek').onclick=()=>navigateWeek(-1);
 $('tf21NextWeek').onclick=()=>navigateWeek(1);
 $('tf21ThisWeek').onclick=()=>{shownWeek=weekOf(today());drawWeek(true)};
 $('tf21AddEvent').onclick=()=>openCalendarEvent({date:today(),time:time(new Date().getHours()*60+new Date().getMinutes())});
 $('tf21NewTask').onclick=()=>openQuest();
 $('tf21PlanButton').onclick=()=>openPlanning();
 $('tf21FocusPause').onclick=toggleFocusPause;
 $('tf21TaskFilter').onchange=e=>{filter=e.target.value;drawTasks()};
 $('tf21TaskSearch').oninput=e=>{search=e.target.value.trim().toLocaleLowerCase('cs');drawTasks()};
 const viewport=$('tf21Scroll');let touch=null;
 viewport.addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY,scroll:viewport.scrollLeft}},{passive:true});
 viewport.addEventListener('touchend',e=>{if(!touch||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>115&&Math.abs(dy)<45&&Math.abs(viewport.scrollLeft-touch.scroll)<12)navigateWeek(dx>0?-1:1);touch=null},{passive:true});
 Q('[name="allDay"]',$('eventForm')).addEventListener('change',eventAllDay);
 QA('.tfFlyout [data-section]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.section==='home')setTimeout(()=>drawWeek(true),30)}));
}
function eventAllDay(){
 const f=$('eventForm'),all=f.elements.allDay.checked;
 f.elements.time.disabled=all;
 f.elements.time.required=!all;
 f.elements.duration.disabled=all;
}
function dateEvents(date){
 const list=[];
 for(const e of data.events){
  const start=e.date||today();const end=(e.endDate&&e.endDate>=start)?e.endDate:start;
  const days=Math.max(0,Math.round((new Date(end+'T12:00')-new Date(start+'T12:00'))/864e5));
  let applicable=false;
  if(!e.repeat||e.repeat==='none')applicable=date>=start&&date<=end;
  else{const dd=Math.round((new Date(date+'T12:00')-new Date(start+'T12:00'))/864e5);const every=e.repeat==='weekly'?7:14;applicable=dd>=0&&(dd%every)<=days;}
  if(applicable)list.push(e);
 }
 return list.sort((a,b)=>String(a.time||'00:00').localeCompare(String(b.time||'00:00')));
}
function navigateWeek(n){shownWeek=add(shownWeek,7*n);drawWeek(false)}
function drawWeek(scrollNow){
 const root=$('tf21WeekCanvas');if(!root)return;
 const dates=Array.from({length:7},(_,i)=>add(shownWeek,i));
 $('tf21WeekLabel').textContent=fmt(dates[0])+' – '+fmt(dates[6]);
 const weekHeads=['Po','Út','St','Čt','Pá','So','Ne'];
 let html='<div class="tf21-week-days"><span></span>';
 dates.forEach((d,i)=>{const day=Number(d.slice(-2));html+='<span class="'+(d===today()?'tf21-current':'')+'">'+weekHeads[i]+'<b>'+day+'</b></span>'});
 html+='</div><div class="tf21-allday"><span class="tf21-allday-label">Celý den</span>';
 dates.forEach(d=>{
  html+='<div class="tf21-allday-cell">';
  for(const e of dateEvents(d).filter(x=>x.allDay||x.allDay==='yes')){
   const category=e.kind==='quest'?'quest':e.category||'personal';
   html+='<button type="button" data-tf-event="'+safe(e.id)+'" class="tf21-allday-chip" data-category="'+safe(category)+'" title="Otevřít událost">'+safe(e.title)+'</button>';
  }
  html+='</div>';
 });
 html+='</div><div class="tf21-week-timed"><div class="tf21-hours">';
 for(let h=0;h<24;h++)html+='<span style="top:'+(h*52+1)+'px">'+String(h).padStart(2,'0')+':00</span>';
 html+='</div>';
 dates.forEach(d=>{
  html+='<div class="tf21-column" data-day="'+d+'">';
  const entries=dateEvents(d).filter(e=>!(e.allDay||e.allDay==='yes')).map(e=>{
   const start=mins(e.time),dur=clamp(Number(e.duration)||60,15,1440-start);
   return {e:e,start:start,end:start+dur,duration:dur};
  });
  // Concurrent events are assigned independent lanes to avoid overlap.
  entries.sort((a,b)=>a.start-b.start||a.end-b.end);
  const groups=[];
  entries.forEach(item=>{let g=groups[groups.length-1];if(!g||item.start>=g.end){g={end:item.end,items:[]};groups.push(g)}else g.end=Math.max(g.end,item.end);g.items.push(item)});
  groups.forEach(g=>{
   const lanes=[];
   g.items.forEach(item=>{let l=lanes.findIndex(end=>end<=item.start);if(l===-1){l=lanes.length;lanes.push(item.end)}else lanes[l]=item.end;item.lane=l});
   const count=lanes.length;
   g.items.forEach(item=>{
    const e=item.e,cat=e.kind==='quest'?'quest':e.category||'personal';
    const height=Math.max(21,Math.min(item.duration,1440-item.start)*52/60-2);
    const width=100/count;
    html+='<div tabindex="0" role="button" aria-label="'+safe(e.title)+': upravit" data-tf-event="'+safe(e.id)+'" class="tf21-event" data-category="'+safe(cat)+'" style="top:'+(item.start*52/60)+'px;height:'+height+'px;left:calc('+width*item.lane+'% + 2px);width:calc('+width+'% - 4px)"><b>'+safe(e.title)+'</b><small>'+safe(e.time)+' · '+item.duration+' min</small><span class="tf21-move" data-tf-move="'+safe(e.id)+'" title="Přesunout">↔</span><span class="tf21-resize" data-tf-resize="'+safe(e.id)+'" title="Změnit délku">•••</span></div>';
   });
  });
  html+='</div>';
 });
 html+='<div class="tf21-now" id="tf21NowLine" hidden></div></div>';
 root.innerHTML=html;
 updateNowLine();
 if(scrollNow){requestAnimationFrame(()=>{const sc=$('tf21Scroll');if(sc)sc.scrollTop=clamp(new Date().getHours()*52-135,0,sc.scrollHeight-sc.clientHeight)})}
}
function updateNowLine(){
 const line=$('tf21NowLine');if(!line)return;
 const n=new Date(),now=today();
 const start=shownWeek,end=add(shownWeek,6);
 line.hidden=now<start||now>end;
 if(!line.hidden)line.style.top=((n.getHours()*60+n.getMinutes())*52/60)+'px';
}
function openCalendarEvent(input){
 const f=$('eventForm');f.reset();f.dataset.editId=input&&input.id||'';
 const e=f.dataset.editId&&data.events.find(x=>x.id===f.dataset.editId);
 if(e){Object.keys(e).forEach(k=>{if(!f.elements[k])return;if(f.elements[k].type==='checkbox')f.elements[k].checked=!!e[k];else f.elements[k].value=e[k]});}
 else{f.elements.date.value=input&&input.date||data.selected||today();f.elements.time.value=input&&input.time||'09:00';}
 eventAllDay();Q('.dialog-head h2',$('eventModal')).textContent=e?'Upravit událost':'Nová položka kalendáře';
 openModal('eventModal');
}
const oldOpenEvent=window.openEvent;
window.openEvent=function(){openCalendarEvent({date:data.selected||today()})};
function eventSubmit(e){
 e.preventDefault();e.stopImmediatePropagation();
 const f=e.currentTarget,old=data.events.find(x=>x.id===f.dataset.editId);
 const fields=Object.fromEntries(new FormData(f));
 const item={...old,...fields,id:old?.id||id(),allDay:f.elements.allDay.checked,endDate:fields.endDate||'',time:fields.time||'00:00',duration:f.elements.allDay.checked?0:clamp(Number(fields.duration)||60,15,1440),difficulty:Number(fields.difficulty)||15};
 if(item.endDate&&item.endDate<item.date)item.endDate=item.date;
 if(old)Object.assign(old,item);else data.events.push(item);
 closeModal('eventModal');save21();render();
}
function drawTasks(){
 const todayTasks=data.quests.filter(q=>q.date===today()&&!q.canceled&&!q.movedTo);
 const completed=todayTasks.filter(q=>q.done);
 const home=$('tf21TodayTasks');
 if(home){
  $('tf21TodayCount').textContent=completed.length+' / '+todayTasks.length+' hotovo';
  const active=todayTasks.filter(q=>!q.done),done=todayTasks.filter(q=>q.done);
  home.innerHTML=[...active,...done].map(renderTaskCard).join('')||'<p>Na dnešek zatím nemáš úkoly.</p>';
 }
 const a=$('tfTodayTasks'),b=$('tfUpcomingTasks');
 if(!a||!b)return;
 const valid=q=>!q.canceled&&!q.movedTo&&(filter==='all'||(filter==='done'?q.done:!q.done))&&String(q.title||'').toLocaleLowerCase('cs').includes(search);
 const upcoming=data.quests.filter(q=>q.date>today()&&valid(q)).sort((x,y)=>x.date.localeCompare(y.date));
 a.innerHTML=todayTasks.filter(valid).sort((x,y)=>Number(x.done)-Number(y.done)).map(renderTaskCard).join('')||'<p>Žádné odpovídající úkoly.</p>';
 b.innerHTML=upcoming.map(renderTaskCard).join('')||'<p>Žádné nadcházející úkoly.</p>';
}
function renderTaskCard(q){
 const xp=award(q);
 return '<div class="tf21-task-row'+(q.done?' done':'')+'" data-task-id="'+safe(q.id)+'"><input type="checkbox" class="tfTaskCheck" data-id="'+safe(q.id)+'" aria-label="Splněno: '+safe(q.title)+'" '+(q.done?'checked':'')+'><div class="tf21-task-name"><strong>'+safe(q.title)+'</strong><span class="small">'+safe(q.date)+(q.time?' · '+safe(q.time):'')+' · '+xp+' XP</span></div><div class="tf21-task-actions"><button type="button" title="Upravit úkol" data-tf-edit-task="'+safe(q.id)+'">✎</button><button type="button" title="Smazat úkol" data-tf-delete-task="'+safe(q.id)+'">🗑</button></div></div>';
}
function taskEdit(id){
 const q=data.quests.find(x=>x.id===id),el=Q('[data-task-id="'+id+'"]');if(!q||!el)return;
 const orig=Q('.tf21-task-name',el),acts=Q('.tf21-task-actions',el);if(!orig)return;
 orig.innerHTML='<div class="tf21-task-editor"><input type="text" maxlength="100" aria-label="Název úkolu" value="'+safe(q.title)+'"><input type="time" aria-label="Čas" value="'+safe(q.time||'')+'"><button type="button" data-tf-save-task="'+safe(id)+'">Uložit</button></div>';
 if(acts)acts.hidden=true;Q('input',orig).focus();
}
function taskSaved(id){
 const q=data.quests.find(x=>x.id===id),el=Q('[data-task-id="'+id+'"]');if(!q||!el)return;
 const fields=QA('.tf21-task-editor input',el);const title=fields[0]?.value.trim();
 if(!title)return;
 q.title=title;q.time=fields[1]?.value||'';save21();render();
}
function todayNewTask(){
 const f=$('questForm');f.reset();openModal('questModal');
}
window.openQuest=todayNewTask;
function taskSubmit(e){
 e.preventDefault();e.stopImmediatePropagation();const fields=Object.fromEntries(new FormData(e.currentTarget));
 const difficulty=Number(fields.xp)||15;
 data.quests.push({id:id(),title:String(fields.title||'').trim(),xp:difficulty,xpToday:difficulty===5?2:difficulty===15?10:20,date:today(),time:fields.time||'',done:false,locked:false});
 closeModal('questModal');save21();render();
}
const baseToggle=window.toggleQuest;
window.toggleQuest=function(qid){
 const q=data.quests.find(x=>x.id===qid);if(!q||q.canceled)return;
 const was=q.done,prior=level21(),gain=award(q);
 q.done=!was;q.completedOn=q.done?today():null;
 save21();render();
 if(!was&&q.done){showXp(gain);if(level21()>prior)showLevelUp(level21())}
};
function showXp(xp){
 if(!xp)return;
 const src=$('tf21XpSummary')||Q('[data-task-id]');
 const rect=src?.getBoundingClientRect()||{x:innerWidth/2,y:innerHeight/2};
 const span=document.createElement('span');span.className='tf21-xp-beam';span.textContent='+'+xp+' XP';span.style.left=Math.min(innerWidth-90,rect.x+20)+'px';span.style.top=Math.max(20,rect.y)+'px';document.body.appendChild(span);setTimeout(()=>span.remove(),950);
 audible(630,.10,.024);
}
function showLevelUp(newLevel){
 const d=document.createElement('div');d.className='tf21-levelup';d.innerHTML='<div>✦ LEVEL UP! ✦<div style="font-size:24px;margin-top:15px">Level '+newLevel+'</div></div>';document.body.appendChild(d);audible(660,.20,.04);setTimeout(()=>{audible(880,.22,.035)},120);setTimeout(()=>d.remove(),2400);
}
function drawHomeStats(){
 const xp=totalXp21(),lvl=level21();
 $('tf21XpSummary').textContent='Level '+lvl+' · '+xp+' XP celkem · '+(xp%250)+'/250 XP';
 $('tf21XpBar').style.width=xp%250/250*100+'%';
 $('tf21HomeStreak').textContent=streak()+' dní';
 $('tf21HomeFocus').textContent=focusForDate(today())+' min';
 $('progressXp').textContent=xp+' celkových XP · '+(xp%250)+' / 250 XP do dalšího levelu';
 $('progressLevel').textContent='Level '+lvl;
 $('topLevel').textContent='✦ Level '+lvl;
 $('levelBar').style.width=(xp%250)/250*100+'%';
 $('totalXp').textContent=xp;
 $('todayXp').textContent='+'+xpForDate(today())+' XP';
 $('questList').innerHTML=data.quests.filter(q=>q.date===today()&&!q.canceled&&!q.movedTo).map(q=>'<div class="task"><input type="checkbox" aria-label="Splněno: '+safe(q.title)+'" '+(q.done?'checked':'')+' onchange="toggleQuest(\''+safe(q.id)+'\')"><main><strong>'+safe(q.title)+'</strong><span class="small">'+(q.locked?'Naplánováno předem':'Přidáno dnes')+'</span></main><span class="tag">'+award(q)+' XP</span></div>').join('')||'<p>Na dnešek zatím nemáš úkoly.</p>';
 const qs=data.quests.filter(q=>q.date===today()&&!q.canceled&&!q.movedTo);
 const pct=qs.length?Math.round(qs.filter(q=>q.done).length/qs.length*100):0;
 $('todayPercent').textContent=pct+' %';$('dailyBar').style.width=pct+'%';
}
function renderStatistics(){
 const end=today(),dates=Array.from({length:7},(_,i)=>add(end,i-6));
 const highest=Math.max(1,...dates.map(x=>xpForDate(x)));
 const chart=$('tf21XpChart');chart.innerHTML='<div class="tf21-weekly-bars">'+dates.map(d=>'<button class="tf21-bar-button'+(focusedDay===d?' selected':'')+'" data-stat-day="'+d+'" type="button"><span class="small">'+xpForDate(d)+'</span><span class="tf21-bar" style="height:'+Math.max(3,Math.round(xpForDate(d)/highest*115))+'px"></span><span class="small">'+new Date(d+'T12:00:00').toLocaleDateString('cs-CZ',{weekday:'short'})+'</span></button>').join('')+'</div>';
 if(focusedDay){
  const count=data.quests.filter(q=>q.done&&doneDate(q)===focusedDay).length;
  $('tf21XpDetail').textContent=fmt(focusedDay)+': '+count+' dokončených úkolů · '+xpForDate(focusedDay)+' XP';
 }
 const planned=Object.keys(data.locks).filter(k=>data.locks[k]).sort().map(k=>add(k,-1));
 let longest=0,current=0,prev=null;
 for(const d of planned){current=prev&&add(prev,1)===d?current+1:1;longest=Math.max(longest,current);prev=d}
 $('tf21StreakStats').innerHTML='<p>Aktuální řada: <strong>'+streak()+' dní</strong> · Rekord: <strong>'+longest+' dní</strong></p>';
 const days=Array.from({length:28},(_,i)=>add(today(),i-27));
 $('tf21StreakDays').innerHTML='<div class="tf21-streak-grid">'+days.map(d=>'<span class="'+(planned.includes(d)?'planned':'')+'" title="'+d+(planned.includes(d)?': dokončeno plánování':'')+'">'+Number(d.slice(-2))+'</span>').join('')+'</div><p class="small">Zvýrazněny jsou dny, kdy bylo naplánováno následující ráno.</p>';
 const focused=data.focus.map(f=>Number(f.minutes)||0),record=Math.max(0,...focused);
 const weekDates=Array.from({length:7},(_,i)=>add(today(),i-6));
 const sum=arr=>arr.reduce((x,y)=>x+y,0);
 const week=sum(weekDates.map(focusForDate)),monthStart=today().slice(0,7);
 const month=data.focus.filter(f=>String(f.date).startsWith(monthStart)).reduce((t,f)=>t+(Number(f.minutes)||0),0);
 $('tf21FocusStats').innerHTML=[['Dnes',focusForDate(today())+' min'],['7 dní',week+' min'],['Tento měsíc',month+' min'],['Nejdelší session',record+' min']].map(row=>'<div class="stat"><span class="small">'+row[0]+'</span><strong>'+row[1]+'</strong></div>').join('');
 const top=Math.max(1,...weekDates.map(focusForDate));
 $('tf21FocusChart').innerHTML='<div class="tf21-weekly-bars">'+weekDates.map(d=>'<div class="tf21-bar-button"><span class="small">'+focusForDate(d)+'</span><span class="tf21-bar" style="height:'+Math.max(3,focusForDate(d)/top*115)+'px"></span><span class="small">'+new Date(d+'T12:00:00').toLocaleDateString('cs-CZ',{weekday:'short'})+'</span></div>').join('')+'</div>';
}
function drawNotes(){
 const grid=$('tfNotesList');if(!grid)return;
 const notes=(data.notes||[]).slice().sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 grid.innerHTML=notes.map(n=>{
  const expanded=expandedNotes.has(n.id);
  return '<article class="tf21-notecard'+(expanded?' expanded':'')+'" data-note-id="'+safe(n.id)+'"><header><div style="flex:1;min-width:0"><h3>'+safe(n.title)+'</h3><span class="small">'+safe(String(n.updatedAt||'').slice(0,10))+'</span></div><button type="button" data-tf-pin-note="'+safe(n.id)+'" title="'+(n.pinned?'Odepnout':'Připnout')+'">'+(n.pinned?'📌':'📍')+'</button></header><button type="button" style="border:0;width:100%;padding:0;text-align:left;margin-top:14px" data-tf-expand-note="'+safe(n.id)+'"><div class="tf21-preview">'+safe(n.body||'').replace(/\n/g,'<br>')+'</div><span class="small">'+(expanded?'Sbalit ↑':'Zobrazit celé ↓')+'</span></button><div class="tf21-note-actions"><button type="button" data-note-action="edit" data-id="'+safe(n.id)+'">Upravit</button><button type="button" data-note-action="delete" data-id="'+safe(n.id)+'">Smazat</button></div></article>';
 }).join('')||'<div class="panel"><p>Ještě nemáš žádné poznámky.</p></div>';
}
function updateSettingFields(){
 const p=preferences();if(!$('tf21Accent'))return;
 $('tf21Accent').value=p.accent;$('tf21Transparency').value=Math.round(p.transparency*100);
 $('tf21Background').value=p.background;$('tf21Sounds').checked=p.sound;$('tf21Motion').checked=p.motion;
}
function doIntro(){
 if(didIntro||!activeUser||!data.profile||!$('home').classList.contains('active'))return;
 didIntro=true;
 const name=String(data.profile.name||'').trim();
 const welcome='Welcome back'+(name?', '+name:'')+'!';
 const overlay=document.createElement('div');overlay.className='tf21-welcome';overlay.innerHTML='<div class="tf21-welcome-center"><span class="tf21-type" id="tf21WelcomeText"></span><span class="tf21-intro-mark" id="tf21IntroMark" aria-hidden="true">✦</span></div>';document.body.appendChild(overlay);
 let i=0;const timer=setInterval(()=>{
  if(i>=welcome.length){clearInterval(timer);return}
  $('tf21WelcomeText').textContent+=welcome[i++];
  if(i%3===0)audible(350+Math.random()*70,.025,.006);
 },45);
 setTimeout(()=>{
  const mark=$('tf21IntroMark'),target=Q('header .mark');if(!mark||!target)return;
  mark.classList.add('visible');audible(800,.18,.036);
  if(mark.animate&&preferences().motion){const a=mark.getBoundingClientRect(),b=target.getBoundingClientRect();
   mark.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(b.left-a.left)+'px,'+(b.top-a.top)+'px) scale(.45)',opacity:1}],{duration:850,delay:180,easing:'cubic-bezier(.22,.8,.25,1)',fill:'forwards'});
  }
  setTimeout(()=>audible(240,.19,.009),310);
 },1400);
 setTimeout(()=>{overlay.remove();clearInterval(timer)},3100);
}
function refreshAll(){
 if(!data||!data.quests||!data.focus)return;
 setTheme();drawWeek(false);drawTasks();drawHomeStats();renderStatistics();drawNotes();updateSettingFields();doIntro();
}
function handleClick(e){
 const t=e.target;
 const event=t.closest('[data-tf-event]');
 if(event&&!t.closest('[data-tf-move],[data-tf-resize]')){e.stopImmediatePropagation();openCalendarEvent({id:event.dataset.tfEvent});return}
 const move=t.closest('[data-stat-day]');if(move){focusedDay=move.dataset.statDay;renderStatistics();return}
 const pin=t.closest('[data-tf-pin-note]');if(pin){e.stopImmediatePropagation();const n=data.notes.find(x=>x.id===pin.dataset.tfPinNote);if(n){n.pinned=!n.pinned;save21();drawNotes();audible(500,.05)}return}
 const expand=t.closest('[data-tf-expand-note]');if(expand){e.stopImmediatePropagation();const id=expand.dataset.tfExpandNote;if(expandedNotes.has(id))expandedNotes.delete(id);else expandedNotes.add(id);drawNotes();return}
 const edit=t.closest('[data-tf-edit-task]');if(edit){taskEdit(edit.dataset.tfEditTask);return}
 const del=t.closest('[data-tf-delete-task]');if(del){const q=data.quests.find(x=>x.id===del.dataset.tfDeleteTask);if(q&&confirm('Opravdu smazat úkol „'+q.title+'“?')){data.quests=data.quests.filter(x=>x.id!==q.id);save21();render()}return}
 const s=t.closest('[data-tf-save-task]');if(s){taskSaved(s.dataset.tfSaveTask);return}
 const col=t.closest('.tf21-column');
 if(col&&!t.closest('[data-tf-event]')){
  const r=col.getBoundingClientRect(),fraction=clamp((e.clientY-r.top)/52*60,0,1439);
  openCalendarEvent({date:col.dataset.day,time:time(Math.round(fraction/15)*15)});return;
 }
}
function handleChange(e){
 const t=e.target;
 if(t.matches('#tf21Accent,#tf21Transparency,#tf21Background,#tf21Sounds,#tf21Motion')){updatePreferences();return}
 const c=t.closest('#tf21TodayTasks .tfTaskCheck');
 if(c){e.stopImmediatePropagation();window.toggleQuest(c.dataset.id)}
 // Existing Tasks change handler delegates to the upgraded global toggleQuest.
}
function handleInput(e){const t=e.target;if(t.matches('#tf21Accent,#tf21Transparency')){updatePreferences()}}
function updatePreferences(){
 const p=preferences();p.accent=$('tf21Accent').value;p.transparency=Number($('tf21Transparency').value)/100;p.background=$('tf21Background').value;
 p.sound=$('tf21Sounds').checked;p.motion=$('tf21Motion').checked;
 setTheme();save21();
}
let dragged=null;
function pointerStart(e){
 const mover=e.target.closest('[data-tf-move],[data-tf-resize]');if(!mover)return;
 const edit=!!e.target.closest('[data-tf-resize]');
 const id=e.target.dataset.tfMove||e.target.dataset.tfResize;
 if(!id)return;e.preventDefault();e.stopPropagation();
 dragged={id:id,mode:edit?'resize':'move',x:e.clientX,y:e.clientY,element:e.target.closest('.tf21-event'),target:e.target};
 try{e.target.setPointerCapture(e.pointerId)}catch(_){}
}
function pointerMove(e){
 if(!dragged)return;
 const dx=e.clientX-dragged.x,dy=e.clientY-dragged.y;
 if(dragged.element)dragged.element.style.transform='translate('+dx+'px,'+dy+'px)';
}
function pointerEnd(e){
 if(!dragged)return;
 const obj=dragged;dragged=null;
 const event=data.events.find(x=>x.id===obj.id);if(!event)return;
 const dx=e.clientX-obj.x,dy=e.clientY-obj.y;
 const col=Q('.tf21-column');const cw=col?.getBoundingClientRect().width||100;
 if(obj.mode==='resize')event.duration=clamp(Math.round(((Number(event.duration)||60)+(dy/52)*60)/15)*15,15,1440-mins(event.time));
 else{
  let dayDelta=Math.round(dx/cw),timeDelta=Math.round(((dy/52)*60)/15)*15;
  event.date=add(event.date,dayDelta);
  if(event.endDate)event.endDate=add(event.endDate,dayDelta);
  event.time=time(clamp(mins(event.time)+timeDelta,0,1439));
 }
 save21();render();
}
function bindCaptures(){
 $('eventForm').addEventListener('submit',eventSubmit,true);
 $('questForm').addEventListener('submit',taskSubmit,true);
}
function applyPlanning(){
 const f=$('planModal');if(!f)return;
 window.openPlanning=function(){
  planChoices={...(data.dayChoices?.[add(today(),1)]||{})};
  dateEvents(add(today(),1)).forEach(e=>{if(typeof planChoices[e.id]!=='boolean')planChoices[e.id]=true});
  planDraft=data.quests.filter(q=>q.date===add(today(),1)&&q.locked&&!q.done&&!q.fromEvent).map(q=>({title:q.title,xp:q.xp,time:q.time||'',existingId:q.id}));
  planStep(0);openModal('planModal');
 };
 window.planStep=function(n){
  currentStep=clamp(n,0,2);
  QA('[data-step]',f).forEach(b=>b.classList.toggle('active',Number(b.dataset.step)===currentStep));
  $('planTitle').textContent=['Daily Recap','Day Ahead','Lock It In'][currentStep];
  $('planBack').disabled=currentStep===0;$('planNext').textContent=currentStep===2?'🔒 Lock It In':'Pokračovat →';
  const next=add(today(),1),tod=data.quests.filter(q=>q.date===today()&&!q.canceled&&!q.movedTo);
  if(currentStep===0){
   let completed=tod.filter(q=>q.done),remaining=tod.filter(q=>!q.done);
   $('planContent').innerHTML='<div class="statgrid"><div class="stat"><span class="small">Splněné úkoly</span><strong>'+completed.length+'/'+tod.length+'</strong></div><div class="stat"><span class="small">Dnešní XP</span><strong>+'+xpForDate(today())+'</strong></div></div><h3 style="margin:20px 0 12px">Hotovo dnes</h3>'+
    (completed.map(q=>'<div class="tf21-draft-card">✓ '+safe(q.title)+' <span class="tag">+'+award(q)+' XP</span></div>').join('')||'<p>Zatím nic.</p>')+
    '<h3 style="margin:20px 0 10px">Nedokončené úkoly</h3>'+
    (remaining.map(q=>'<div class="tf21-draft-card"><span>'+safe(q.title)+'</span><div class="toolbar"><button type="button" onclick="tf21Carry(\''+safe(q.id)+'\')">'+(planDraft.some(t=>t.carry===q.id)?'✓ Připraveno':'→ Zítra')+'</button><button type="button" onclick="tf21Cancel(\''+safe(q.id)+'\')">Zrušit</button></div></div>').join('')||'<p>Vše hotovo!</p>');
  }
  if(currentStep===1){
   const ev=dateEvents(next);ev.forEach(e=>{if(typeof planChoices[e.id]!=='boolean')planChoices[e.id]=true});
   $('planContent').innerHTML='<p>Zítřek: <strong>'+safe(fmt(next))+'</strong>. Události se načítají ze Smart Calendar.</p><h3 style="margin:17px 0 8px">Zítřejší kalendář</h3>'+
    (ev.map(e=>'<div class="tf21-draft-card"><span><strong>'+safe(e.title)+'</strong><span class="small" style="display:block">'+(e.allDay?'Celý den':safe(e.time))+'</span></span><div class="toolbar"><button class="'+(planChoices[e.id]===true?'chosen':'')+'" onclick="tf21Choice(\''+safe(e.id)+'\',true)">✓</button><button onclick="tf21Choice(\''+safe(e.id)+'\',false)">×</button></div></div>').join('')||'<p>Žádné události.</p>')+
    '<div class="line"></div><h3>To Do Tomorrow</h3><div id="tf21DraftList"></div>'+
    '<div class="formrow"><label for="tf21NewPlanTitle">Nový úkol</label><input maxlength="100" id="tf21NewPlanTitle" placeholder="Co zítra uděláš?"></div>'+
    '<div class="formgrid"><div class="formrow"><label>Obtížnost</label><select id="tf21NewPlanXp"><option value="5">Lehký · 5 XP</option><option value="15" selected>Střední · 15 XP</option><option value="30">Náročný · 30 XP</option></select></div><div class="formrow"><label>Čas (volitelně)</label><input type="time" id="tf21NewPlanTime"></div></div><button type="button" class="secondary" onclick="tf21AddPlanTask()">+ Přidat úkol</button>';
   renderPlannedDrafts();
  }
  if(currentStep===2){
   const chosen=dateEvents(next).filter(e=>planChoices[e.id]===true);
   const list=[...chosen.map(e=>({title:e.title,time:e.allDay?'Celý den':e.time,xp:e.kind==='quest'?e.difficulty:0})),...planDraft];
   list.sort((a,b)=>!a.time?1:!b.time?-1:String(a.time).localeCompare(String(b.time)));
   $('planContent').innerHTML='<p>Poslední kontrola plánu na zítřek. Vrať se na Day Ahead, pokud chceš něco upravit.</p><h3 style="margin:17px 0 10px">'+safe(fmt(next))+'</h3>'+
     list.map(q=>'<div class="tf21-draft-card"><span>'+safe(q.title)+'<small class="small" style="display:block">'+safe(q.time||'To Do Tomorrow')+'</small></span><span class="tag">'+(Number(q.xp)||0)+' XP</span></div>').join('')+
     '<p style="margin-top:14px">Možné XP: <strong>+'+list.reduce((a,q)=>a+(Number(q.xp)||0),0)+' XP</strong></p>';
  }
 };
 window.tf21Carry=function(id){
  const q=data.quests.find(x=>x.id===id);
  if(q&&!planDraft.some(x=>x.carry===id))planDraft.push({title:q.title,xp:Number(q.xp)||15,time:q.time||'',carry:id});
  planStep(0);audible(520,.05);
 };
 window.tf21Cancel=function(id){
  const q=data.quests.find(x=>x.id===id);
  if(!q||!confirm('Opravdu zrušit úkol „'+q.title+'“?'))return;
  q.canceled=true;planDraft=planDraft.filter(x=>x.carry!==id);save21();planStep(0);render();
 };
 window.tf21Choice=function(id,val){planChoices[id]=val;planStep(1)};
 window.tf21AddPlanTask=function(){
  const title=$('tf21NewPlanTitle')?.value.trim();if(!title)return;
  planDraft.push({title:title,xp:Number($('tf21NewPlanXp').value)||15,time:$('tf21NewPlanTime').value||''});
  $('tf21NewPlanTitle').value='';renderPlannedDrafts();audible(540,.05);
 };
 window.tf21RemoveDraft=function(i){planDraft.splice(i,1);renderPlannedDrafts()};
 window.planNext=function(){
  if(currentStep<2){planStep(currentStep+1);return}
  const next=add(today(),1),chosen=dateEvents(next).filter(e=>planChoices[e.id]===true);
  if(!chosen.length&&!planDraft.length){alert('Přidej alespoň jednu událost nebo úkol.');return}
  const existingIds=new Set(planDraft.map(x=>x.existingId).filter(Boolean));
  data.quests=data.quests.filter(q=>!(q.date===next&&q.locked&&!q.done&&!q.fromEvent&&!existingIds.has(q.id)) && !(q.date===next&&q.fromEvent&&!q.done));
  chosen.filter(e=>e.kind==='quest').forEach(e=>data.quests.push({id:id(),date:next,title:e.title,xp:Number(e.difficulty)||15,locked:true,done:false,fromEvent:e.id,time:e.time||''}));
  planDraft.forEach(q=>{
   if(q.carry){const original=data.quests.find(x=>x.id===q.carry);if(original){original.movedFrom=original.date;original.date=next;original.time=q.time||'';original.locked=true;original.done=false;original.xp=Number(q.xp)||15;original.xpToday=undefined;}}
   else if(q.existingId){const original=data.quests.find(x=>x.id===q.existingId);if(original){original.title=q.title;original.xp=q.xp;original.time=q.time||''}}
   else data.quests.push({id:id(),date:next,title:q.title,xp:Number(q.xp)||15,time:q.time||'',done:false,locked:true});
  });
  const was=!!data.locks[next];data.locks[next]=true;
  data.dayChoices??={};data.dayChoices[next]=planChoices;
  closeModal('planModal');save21();render();showPlanningResult(!was);
 };
 function renderPlannedDrafts(){
  const target=$('tf21DraftList');if(!target)return;
  const items=planDraft.map((q,i)=>({...q,idx:i})).sort((a,b)=>!a.time?1:!b.time?-1:a.time.localeCompare(b.time));
  target.innerHTML=items.map(q=>'<div class="tf21-draft-card"><span>'+safe(q.title)+'<span class="small" style="display:block">'+safe(q.time||'To Do Tomorrow')+' · '+q.xp+' XP</span></span><button type="button" onclick="tf21RemoveDraft('+q.idx+')">×</button></div>').join('')||'<p class="small">Můžeš přidat úkol s časem nebo bez něj.</p>';
 }
 function showPlanningResult(first){
  const d=document.createElement('div');d.className='tf21-result';
  d.innerHTML='<div class="panel"><div class="tf21-checkmark">✓</div><h2>Tomorrow is ready!</h2><p>Plán na zítřek je uložený.</p><div style="font-size:40px;margin:20px" class="'+(first?'tf21-streak-flame':'')+'">🔥 '+streak()+(first?' · +1 den':'')+'</div><div class="toolbar"><button class="primary" id="tf21PlanDone">Done</button></div></div>';
  document.body.appendChild(d);Q('#tf21PlanDone',d).onclick=()=>d.remove();audible(700,.17,.028);
 }
}
function startFocus21(){
 if(focusSession&&focusSession.paused){toggleFocusPause();return}
 if(focusSession)return;
 focusSession={since:performance.now(),elapsed:0,paused:false};
 focusSince=Date.now();focusMinute=-1;
 $('focusStart').disabled=true;$('focusEnd').disabled=false;
 $('tf21FocusPause').disabled=false;$('tf21FocusPause').textContent='⏸ Pause';
 document.body.classList.add('tf21-focus-active');
 if(focusInterval)clearInterval(focusInterval);
 focusInterval=setInterval(tickFocus21,100);
 tickFocus21();
}
function elapsedFocus(){
 if(!focusSession)return 0;
 return Math.max(0,focusSession.elapsed+(focusSession.paused?0:performance.now()-focusSession.since));
}
function tickFocus21(){
 if(!focusSession)return;
 const ms=elapsedFocus(),secs=Math.floor(ms/1000),minute=Math.floor(secs/60);
 $('focusClock').textContent=String(minute).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
 $('focusPreview').textContent=focusXp(minute)+' XP při ukončení';
 const dial=Q('.focusCircle',$('focus'));dial.style.setProperty('--tf21-progress',String((ms%60000)/600)+'%');
 if(minute>focusMinute&&focusMinute>=0){dial.classList.add('minute');setTimeout(()=>dial.classList.remove('minute'),250)}
 focusMinute=minute;
}
function toggleFocusPause(){
 if(!focusSession)return;
 if(!focusSession.paused){focusSession.elapsed=elapsedFocus();focusSession.paused=true;focusSince=null;$('tf21FocusPause').textContent='▶ Resume';}
 else{focusSession.since=performance.now();focusSession.paused=false;focusSince=Date.now();$('tf21FocusPause').textContent='⏸ Pause';}
 tickFocus21();
}
function finishFocus21(){
 if(!focusSession)return;
 const duration=elapsedFocus(),minutes=Math.floor(duration/60000),xp=focusXp(minutes),before=level21();
 clearInterval(focusInterval);focusInterval=null;focusSession=null;focusSince=null;
 data.focus.push({id:id(),date:today(),minutes:minutes,xp:xp});
 $('focusStart').disabled=false;$('focusEnd').disabled=true;$('tf21FocusPause').disabled=true;
 $('focusStart').textContent='▶ Start';$('tf21FocusPause').textContent='⏸ Pause';
 $('focusClock').textContent='00:00';$('focusPreview').textContent='0 XP při ukončení';
 Q('.focusCircle',$('focus')).style.setProperty('--tf21-progress','0%');
 document.body.classList.remove('tf21-focus-active');save21();render();
 const d=document.createElement('div');d.className='tf21-result';d.innerHTML='<div class="panel"><div class="tf21-checkmark">✓</div><h2>Focus Complete!</h2><p>Soustředění: <strong>'+minutes+' min</strong></p><p>Získané zkušenosti: <strong>+'+xp+' XP</strong></p><div class="toolbar"><button class="primary" id="tf21FocusDone">Done</button><button class="secondary" id="tf21Again">Focus Again</button></div></div>';document.body.appendChild(d);
 Q('#tf21FocusDone',d).onclick=()=>d.remove();
 Q('#tf21Again',d).onclick=()=>{d.remove();startFocus21()};
 audible(760,.19,.029);
 if(xp){showXp(xp);if(level21()>before)showLevelUp(level21())}
}
window.focusStart=startFocus21;window.focusEnd=finishFocus21;window.drawFocus=tickFocus21;
document.addEventListener('keydown',e=>{if(e.target.matches('.tf21-event')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCalendarEvent({id:e.target.dataset.tfEvent})}});
function runClock(){updateNowLine()}
function init(){
 if(!$('home')||!$('settings'))return;
 initDom();bindCaptures();applyPlanning();
 const oldRender=window.render;
 window.render=function(){oldRender();refreshAll()};
 setTheme();refreshAll();
 setInterval(runClock,15000);
}
init();
})();
