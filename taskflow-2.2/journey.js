
/* TaskFlow Journey 2.2 — independent per-user storage; never writes Journey into 2.1 user_data. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isoDate=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const shift=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return isoDate(x)};
const between=(start,end)=>Math.round((new Date(end+'T12:00:00')-new Date(start+'T12:00:00'))/86400000);
const daysOfWeek=[1,2,3,4,5,6,0],weekday=['Po','Út','St','Čt','Pá','So','Ne'];
const uid=()=>typeof activeUser!=='undefined'&&activeUser?activeUser.id:null;
const storageKey=user=>'taskflow_journey_22_'+user;
const areaPalette=['#70D7C2','#B9A3FF','#82BDFB','#F2C28D','#F08FB9','#90D7EB'];
let journey=null,owner=null,cloudReady=false,cloudText='Čeká na přihlášení',loading=false,loadVersion=0,writeQueue=Promise.resolve(),writeFailure=false;
let selectedArea=null,areaEditing=null,habitEditing=null,planSelections={},activeTab='today';
const newId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function clean(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const j={title:String(raw.title||'Moje Journey').slice(0,100),start:/^\d{4}-\d{2}-\d{2}$/.test(raw.start||'')?raw.start:isoDate(new Date()),
 areas:Array.isArray(raw.areas)?raw.areas.slice(0,20).map(a=>({id:String(a.id||newId()),name:String(a.name||'Moje oblast').slice(0,50),goal:String(a.goal||'').slice(0,300),why:String(a.why||'').slice(0,300),color:/^#[0-9a-f]{6}$/i.test(a.color||'')?a.color:areaPalette[0],habits:Array.isArray(a.habits)?a.habits.slice(0,25).map(h=>({id:String(h.id||newId()),title:String(h.title||'Nový návyk').slice(0,100),days:Array.isArray(h.days)?h.days.filter(x=>Number.isInteger(x)&&x>=0&&x<=6):daysOfWeek.slice(),time:/^\d{2}:\d{2}$/.test(h.time||'')?h.time:'',xp:[5,15,30].includes(Number(h.xp))?Number(h.xp):15,metric:h.metric==='minutes'?'minutes':'check',target:Math.min(480,Math.max(1,Number(h.target)||20))})):[]})):[],
 logs:raw.logs&&typeof raw.logs==='object'&&!Array.isArray(raw.logs)?raw.logs:{},
 reflections:raw.reflections&&typeof raw.reflections==='object'&&!Array.isArray(raw.reflections)?raw.reflections:{},
 plans:raw.plans&&typeof raw.plans==='object'&&!Array.isArray(raw.plans)?raw.plans:{}};
 return j;
}
function areaFor(hid){for(const a of journey?.areas||[]){const h=a.habits.find(x=>x.id===hid);if(h)return {a,h}}return null}
function allHabits(){return (journey?.areas||[]).flatMap(a=>a.habits.map(h=>({a,h})))}
function due(date){if(!journey)return[];const day=between(journey.start,date);if(day<0||day>89)return[];return allHabits().filter(x=>x.h.days.includes(new Date(date+'T12:00:00').getDay()))}
function questFor(h,date){return (data.quests||[]).find(q=>q.journeyHabitId===h.id&&q.date===date)}
function focusMins(h,date){return (data.focus||[]).filter(f=>f.journeyHabitId===h.id&&f.date===date).reduce((n,f)=>n+(Number(f.minutes)||0),0)}
function done(h,date){const q=questFor(h,date);if(q)return !!q.done;return !!journey?.logs?.[date]?.[h.id]||(h.metric==='minutes'&&focusMins(h,date)>=h.target)}
function dayInfo(date){const list=due(date),count=list.filter(x=>done(x.h,date)).length;return {count,total:list.length,ratio:list.length?count/list.length:0}}
function dayNumber(){return journey?between(journey.start,isoDate(new Date()))+1:0}
function saveLocal(){const user=uid();if(!user||owner!==user||!journey)return;try{localStorage.setItem(storageKey(user),JSON.stringify(journey))}catch(e){cloudText='Chyba úložiště — exportuj zálohu'}}
function setStatus(s){cloudText=s;const el=$('tfjCloudStatus');if(el)el.textContent=s}
function saveJourney(){
 if(!owner||owner!==uid()||!journey)return;
 saveLocal();
 if(!cloudReady||loading){setStatus('Jen v tomto zařízení · cloud Journey ještě není zapnutý');return}
 const current=owner,snapshot=JSON.parse(JSON.stringify(journey));
 setStatus('Ukládám Journey…');
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
  if(uid()!==current)return;
  const {error}=await authClient.from('journey_data').upsert({user_id:current,data:snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error){writeFailure=true;setStatus('Chyba synchronizace · data jsou na zařízení')}else{writeFailure=false;setStatus('Journey synchronizována')}
 });
}
async function ensure(){
 const user=uid();
 if(!user){owner=null;journey=null;cloudReady=false;setStatus('Přihlas se k TaskFlow');draw();return}
 if(owner===user)return;
 owner=user;journey=null;cloudReady=false;loading=true;
 const version=++loadVersion;
 try{journey=clean(JSON.parse(localStorage.getItem(storageKey(user))))}catch(e){journey=null}
 setStatus('Načítám Journey…');draw();
 try{
  const {data:row,error}=await authClient.from('journey_data').select('data').eq('user_id',user).maybeSingle();
  if(version!==loadVersion||uid()!==user)return;
  if(error){cloudReady=false;setStatus('Jen na tomto zařízení · pro cloud zapni Journey databázi')}
  else{
   cloudReady=true;
   if(row&&row.data){journey=clean(row.data);saveLocal()}
   else if(journey){saveJourney()}
   setStatus(row?'Journey synchronizována':'Cloud Journey připraven');
  }
 }catch(e){cloudReady=false;setStatus('Jen na tomto zařízení · bez spojení s cloudem')}
 finally{if(version===loadVersion){loading=false;draw()}}
}
function cardHabit(a,h,date){const finished=done(h,date),m=focusMins(h,date);
 return '<div class="tfj-habit '+(finished?'tfj-done':'')+'"><button type="button" class="tfj-check" data-tfj-check="'+esc(h.id)+'" data-date="'+date+'" aria-label="'+(finished?'Označit jako nesplněné: ':'Splnit: ')+esc(h.title)+'">'+(finished?'✓':'○')+'</button><div class="tfj-habit-body"><strong>'+esc(h.title)+'</strong><span class="small">'+esc(a.name)+' · '+(h.time?esc(h.time)+' · ':'Bez času · ')+(h.metric==='minutes'?m+'/'+h.target+' min Focus':'Návyk')+'</span></div><span class="tfj-chip" style="--area:'+esc(a.color)+'">'+(questFor(h,date)?.locked?h.xp+' XP':'Journey')+'</span></div>';
}
function homeDraw(){
 const el=$('tfjHomeCard');if(!el)return;
 if(!uid()){el.innerHTML='<div class="tfj-home-content"><span class="eyebrow">MY JOURNEY</span><strong>90 dní k cíli</strong><p>Po přihlášení si můžeš vytvořit svoji Journey.</p><button class="secondary" type="button" data-tfj-open>Otevřít Journey →</button></div>';return}
 const n=dayNumber(),today=isoDate(new Date()),inf=dayInfo(today);
 el.innerHTML='<div class="tfj-home-content"><div><span class="eyebrow">✦ MY JOURNEY · 90 DNÍ</span><h2>'+(journey?esc(journey.title):'Tvoje 90denní cesta')+'</h2><p>'+(journey?'Den '+Math.max(0,Math.min(n,90))+' / 90 · Dnes '+inf.count+'/'+inf.total+' návyků':'Vytvoř si několik oblastí a začni pracovat na svých cílech.')+'</p></div><div class="tfj-home-side"><div class="tfj-home-bar"><span style="width:'+(journey?Math.max(0,Math.min(n/90*100,100)):0)+'%"></span></div><button type="button" class="secondary" data-tfj-open>'+(journey?'Otevřít Journey':'Začít Journey')+' →</button></div></div>';
}
function draw(){
 homeDraw();const root=$('tfjContent');if(!root)return;
 const status=esc(cloudText);
 if(!uid()){root.innerHTML='<div class="panel"><h2>Nejdřív se přihlas</h2><p>Journey se vytvoří pro tvůj TaskFlow účet.</p></div>';return}
 if(!journey){
  root.innerHTML='<div class="tfj-hero panel"><span class="eyebrow">YOUR 90-DAY JOURNEY</span><h2>Devadesát dní. Tvoje cesta.</h2><p>Stanov si vlastní oblasti, cíle a návyky. Pravidelnost je důležitější než dokonalost.</p><button class="primary" type="button" data-tfj-start>✦ Založit Journey</button><p class="small">'+status+'</p></div>';return
 }
 const n=dayNumber(),date=isoDate(new Date()),info=dayInfo(date),start=journey.start,progress=Math.max(0,Math.min(n/90*100,100));
 let html='<div class="tfj-title-line"><div><span class="eyebrow">90 DAY JOURNEY</span><h1>'+esc(journey.title)+'</h1><p>Den '+Math.max(0,Math.min(n,90))+' / 90 · '+esc(start)+' — '+shift(start,89)+'</p></div><button class="secondary" type="button" data-tfj-export>Export Journey</button></div>';
 html+='<div class="tfj-hero panel"><div class="tfj-kpi-row"><div><span class="small">TVŮJ POKROK</span><strong>'+Math.max(0,Math.min(n,90))+' <small>/ 90 dní</small></strong></div><div><span class="small">DNEŠNÍ NÁVYKY</span><strong>'+info.count+' <small>/ '+info.total+'</small></strong></div></div><div class="tfj-progress"><span style="width:'+progress+'%"></span></div><p class="small">'+status+'</p></div>';
 if(selectedArea){
  const a=journey.areas.find(x=>x.id===selectedArea);if(!a)selectedArea=null;
  else{html+='<div class="tfj-topline"><button class="secondary" type="button" data-tfj-back>← Všechny oblasti</button><button class="secondary" type="button" data-tfj-edit-area="'+esc(a.id)+'">Upravit oblast</button></div><div class="panel tfj-area-detail" style="--area:'+esc(a.color)+'"><h2>'+esc(a.name)+'</h2><p><strong>Můj cíl:</strong> '+esc(a.goal||'Zatím není vyplněn')+'</p><p><strong>Moje proč:</strong> '+esc(a.why||'Zatím není vyplněno')+'</p><div class="line"></div><div class="tfj-topline"><h3>Návyky</h3><button type="button" class="primary" data-tfj-new-habit="'+esc(a.id)+'">+ Přidat návyk</button></div>'+a.habits.map(h=>'<div class="tfj-area-habit"><div><strong>'+esc(h.title)+'</strong><p class="small">'+(h.days.length===7?'Denně':h.days.map(d=>weekday[(d+6)%7]).join(', '))+' · '+(h.time?esc(h.time):'Bez času')+' · '+h.xp+' XP'+(h.metric==='minutes'?' · Focus '+h.target+' min':'')+'</p></div><button class="secondary" type="button" data-tfj-edit-habit="'+esc(h.id)+'">Upravit</button></div>').join('')+'<button class="tfj-danger" data-tfj-del-area="'+esc(a.id)+'" type="button">Smazat oblast</button></div>';root.innerHTML=html;return;}
 }
 html+='<div class="tfj-subnav"><button type="button" data-tfj-tab="today" class="'+(activeTab==='today'?'active':'')+'">Dnes</button><button type="button" data-tfj-tab="map" class="'+(activeTab==='map'?'active':'')+'">Mapa 90 dní</button><button type="button" data-tfj-tab="reflect" class="'+(activeTab==='reflect'?'active':'')+'">Reflexe</button></div>';
 if(activeTab==='today'){
  html+='<div class="tfj-topline"><h2>Moje oblasti</h2><button type="button" class="secondary" data-tfj-add-area>+ Oblast</button></div>';
  html+='<div class="tfj-areas">'+journey.areas.map(a=>{const list=due(date).filter(x=>x.a.id===a.id),c=list.filter(x=>done(x.h,date)).length;return '<button type="button" data-tfj-area="'+esc(a.id)+'" class="tfj-area-card" style="--area:'+esc(a.color)+'"><span class="tfj-color-dot"></span><strong>'+esc(a.name)+'</strong><small>'+c+'/'+list.length+' dnes · '+a.habits.length+' návyků</small><span class="tfj-area-meter"><i style="width:'+(list.length?c/list.length*100:0)+'%"></i></span></button>'}).join('')+'</div>';
  if(!journey.areas.length)html+='<div class="panel"><p>Zatím nemáš žádné oblasti. Přidej například Tělo, Mysl nebo Studium.</p><button class="primary" data-tfj-add-area type="button">+ Moje první oblast</button></div>';
  html+='<section class="panel tfj-panel"><div class="tfj-topline"><h2>Dnešní závazky</h2><span class="small">'+info.count+' / '+info.total+' hotovo</span></div>';
  const hs=due(date);
  html+=hs.length?hs.map(x=>cardHabit(x.a,x.h,date)).join(''):'<p>Dnes nejsou žádné návyky. Přidej je do jednotlivých oblastí.</p>';
  html+='</section>';
  html+='<section class="panel tfj-panel"><h2>Krátké dnešní zamyšlení</h2><p>Jaký krok tě dnes posunul dopředu?</p><textarea id="tfjQuickReflection" maxlength="1000" placeholder="Co se mi dnes povedlo?">'+esc(journey.reflections[date]?.win||'')+'</textarea><button class="secondary" type="button" data-tfj-save-reflect>Uložit reflexi</button></section>';
 }else if(activeTab==='map'){
  html+='<section class="panel tfj-panel"><h2>Tvoje mapa 90 dní</h2><p>Každé políčko představuje jeden den. Vynechaný den neresetuje výzvu.</p><div class="tfj-map">';
  for(let i=0;i<90;i++){const dt=shift(start,i),p=dayInfo(dt),future=dt>date,state=future?'future':!p.total?'none':p.count===p.total?'full':p.count?'part':'miss';html+='<button type="button" class="tfj-map-cell '+state+(dt===date?' now':'')+'" data-tfj-map-date="'+dt+'" aria-label="Den '+(i+1)+': '+p.count+' z '+p.total+' splněno" title="'+dt+' · '+p.count+'/'+p.total+'">'+(i+1)+'</button>'}
  html+='</div><p class="small">Zelená = vše splněno · Zlatá = částečně · Šedá = vynecháno · Tmavá = budoucnost</p></section><div class="tfj-milestones">'+[30,60,90].map(n=>'<div class="panel"><strong>Den '+n+'</strong><p>'+(dayNumber()>=n?'Milník dosažen':'Milník před tebou')+'</p></div>').join('')+'</div>';
 }else{
  const reflection=journey.reflections[date]||{};
  html+='<section class="panel tfj-panel"><h2>Journey Reflection</h2><p>Každý den se můžeš ohlédnout. Nejde o perfektní výsledek.</p><label for="tfjWin">Co se mi dnes povedlo?</label><textarea id="tfjWin" maxlength="1000" placeholder="Můj dnešní úspěch…">'+esc(reflection.win||'')+'</textarea><label for="tfjImprove">Co zítra zlepším?</label><textarea id="tfjImprove" maxlength="1000" placeholder="Jeden malý krok…">'+esc(reflection.improve||'')+'</textarea><button class="primary" type="button" data-tfj-save-reflect>Uložit dnešní reflexi</button></section>';
 }
 root.innerHTML=html;
}
function navigate(){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='journey'));const fly=$('tfFlyout');if(fly){fly.hidden=true;fly.querySelectorAll('[data-section]').forEach(x=>x.classList.remove('active'))}const menu=$('tfMenuToggle');if(menu){menu.innerHTML='☰ Journey <span aria-hidden="true">⌄</span>';menu.setAttribute('aria-expanded','false')}activeTab='today';selectedArea=null;ensure();draw();window.scrollTo({top:0,behavior:'instant'})}
function openPopup(name){$(name).classList.add('show')}
function closePopup(name){$(name).classList.remove('show')}
function createJourney(){const f=$('tfjStartForm');const title=f.elements.title.value.trim(),start=f.elements.start.value;if(!title||!start)return;journey=clean({title,start,areas:[],logs:{},reflections:{},plans:{}});saveJourney();closePopup('tfjStartModal');draw();openArea()}
function openArea(id){
 areaEditing=id||null;const a=journey?.areas.find(x=>x.id===id),f=$('tfjAreaForm');f.reset();
 f.elements.name.value=a?.name||'';f.elements.goal.value=a?.goal||'';f.elements.why.value=a?.why||'';
 f.elements.color.value=a?.color||areaPalette[journey.areas.length%areaPalette.length];
 $('tfjAreaHeading').textContent=a?'Upravit oblast':'Nová oblast';openPopup('tfjAreaModal');
}
function saveArea(){const f=$('tfjAreaForm'),name=f.elements.name.value.trim();if(!name)return;let a=journey.areas.find(x=>x.id===areaEditing);if(a){a.name=name;a.goal=f.elements.goal.value.trim();a.why=f.elements.why.value.trim();a.color=f.elements.color.value}
 else{a={id:newId(),name,goal:f.elements.goal.value.trim(),why:f.elements.why.value.trim(),color:f.elements.color.value,habits:[]};journey.areas.push(a)}
 saveJourney();closePopup('tfjAreaModal');selectedArea=a.id;draw();
}
function openHabit(areaId,hid){
 const a=journey?.areas.find(x=>x.id===areaId),h=a?.habits.find(x=>x.id===hid);if(!a)return;
 habitEditing={areaId:a.id,habitId:hid||null};
 const f=$('tfjHabitForm');f.reset();f.elements.title.value=h?.title||'';
 f.elements.time.value=h?.time||'';f.elements.xp.value=String(h?.xp||15);f.elements.metric.value=h?.metric||'check';f.elements.target.value=h?.target||20;
 document.querySelectorAll('.tfj-days input').forEach(i=>i.checked=h?h.days.includes(Number(i.value)):true);
 $('tfjHabitHeading').textContent=h?'Upravit návyk':'Nový návyk';$('tfjDeleteHabit').hidden=!h;
 revealTarget();openPopup('tfjHabitModal');
}
function revealTarget(){$('tfjTargetRow').hidden=$('tfjHabitForm').elements.metric.value!=='minutes'}
function saveHabit(){
 const f=$('tfjHabitForm'),a=journey.areas.find(x=>x.id===habitEditing.areaId),days=Array.from(document.querySelectorAll('.tfj-days input:checked')).map(x=>Number(x.value)),title=f.elements.title.value.trim();
 if(!title||!days.length){alert('Zadej název a vyber alespoň jeden den.');return}
 let h=a.habits.find(x=>x.id===habitEditing.habitId);if(!h){h={id:newId()};a.habits.push(h)}
 Object.assign(h,{title,days,time:f.elements.time.value||'',xp:Number(f.elements.xp.value)||15,metric:f.elements.metric.value,target:Math.max(1,Math.min(480,Number(f.elements.target.value)||20))});
 saveJourney();closePopup('tfjHabitModal');draw();
}
function toggleHabit(hid,date){
 const found=areaFor(hid);if(!found||!journey||!uid())return;
 const {h}=found;const q=questFor(h,date);const value=!done(h,date);
 journey.logs[date]??={};
 if(q){if(q.done!==value)window.toggleQuest(q.id);journey.logs[date][h.id]=value}
 else if(date===isoDate(new Date())){
  const item={id:newId(),journeyHabitId:h.id,title:h.title,date,xp:h.xp,xpToday:h.xp===5?2:h.xp===15?10:20,locked:false,done:value,completedOn:value?date:null,time:h.time||''};
  data.quests.push(item);save();journey.logs[date][h.id]=value;
 }else{journey.logs[date][h.id]=value}
 saveJourney();render();
}
function exportJourney(){const blob=new Blob([JSON.stringify(journey,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='taskflow-journey-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function saveReflection(){
 const d=isoDate(new Date());journey.reflections[d]={win:($('tfjWin')?.value||$('tfjQuickReflection')?.value||'').slice(0,1000),improve:($('tfjImprove')?.value||'').slice(0,1000)};
 saveJourney();draw();alert('Reflexe uložena.');
}
function planCollect(){const root=$('tfjPlanChoices');if(!root)return;root.querySelectorAll('[data-plan-habit]').forEach(x=>{const id=x.dataset.planHabit;planSelections[id]={include:x.checked,time:root.querySelector('[data-plan-time="'+id+'"]')?.value||''}})}
function planSection(){
 if(!journey||!uid()||!$('planContent'))return;
 const next=shift(isoDate(new Date()),1),list=due(next);if(!list.length)return;
 const plan=journey.plans[next];
 let html='<div class="line"></div><div class="tfj-plan"><h3>✦ Journey závazky na zítřek</h3><p class="small">Vyber návyky, které chceš zařadit do Next Day. Čas můžeš upravit.</p><div id="tfjPlanChoices">';
 for(const {a,h} of list){const choice=planSelections[h.id]||{include:plan?plan.included.includes(h.id):true,time:plan?.times?.[h.id]??h.time??''};html+='<div class="tfj-plan-row"><label><input type="checkbox" data-plan-habit="'+esc(h.id)+'" '+(choice.include?'checked':'')+'><span>'+esc(h.title)+'<small>'+esc(a.name)+'</small></span></label><input type="time" data-plan-time="'+esc(h.id)+'" value="'+esc(choice.time||'')+'" aria-label="Volitelný čas '+esc(h.title)+'"></div>'}
 html+='</div></div>';$('planContent').insertAdjacentHTML('beforeend',html)
}
function planReview(){
 if(!journey||!uid()||!$('planContent'))return;const next=shift(isoDate(new Date()),1),list=due(next).filter(x=>planSelections[x.h.id]?.include!==false);
 if(list.length)$('planContent').insertAdjacentHTML('beforeend','<div class="line"></div><h3>✦ Journey</h3>'+list.map(x=>'<div class="tf21-draft-card">'+esc(x.h.title)+' <span class="small">'+esc(planSelections[x.h.id]?.time||'Bez času')+'</span></div>').join(''));
}
function storePlan(){
 if(!journey)return;
 const next=shift(isoDate(new Date()),1),list=due(next);const included=list.filter(x=>planSelections[x.h.id]?.include!==false),times={};
 included.forEach(x=>times[x.h.id]=planSelections[x.h.id]?.time||x.h.time||'');
 journey.plans[next]={included:included.map(x=>x.h.id),times};
 included.forEach(({h})=>{
  if(!questFor(h,next))data.quests.push({id:newId(),journeyHabitId:h.id,title:h.title,xp:h.xp,date:next,time:times[h.id],locked:true,done:false});
 });
 saveJourney();save();render();
}
function hookPlanning(){
 const oldStep=window.planStep,oldNext=window.planNext;
 window.planStep=function(n){if(currentStep===1)planCollect();const ret=oldStep(n);if(currentStep===1)planSection();if(currentStep===2)planReview();return ret};
 window.planNext=function(){
  if(currentStep!==2)return oldNext();
  if(!journey)return oldNext();
  const date=shift(isoDate(new Date()),1),hasJourney=due(date).some(x=>planSelections[x.h.id]?.include!==false);
  if(!hasJourney)return oldNext();
  const normal=((window.onDate?.(date)||[]).some(e=>planChoices[e.id]===true))||planDraft.length>0;
  if(normal){oldNext();if(!$('planModal').classList.contains('show'))storePlan()}
  else{data.locks[date]=true;closeModal('planModal');storePlan();alert('Tomorrow is ready! Journey závazky jsou v zítřejším plánu.')}
 };
 const oldOpen=window.openPlanning;
 window.openPlanning=function(){planSelections={};return oldOpen()}
}
function hookFocus(){
 const node=document.querySelector('#focus .focusActions');if(!node)return;
 node.insertAdjacentHTML('beforebegin','<div id="tfjFocusLink"><label for="tfjFocusSelect">Přiřadit Focus k Journey návyku (volitelné)</label><select id="tfjFocusSelect"><option value="">Bez přiřazení</option></select></div>');
 const oldEnd=window.focusEnd;
 window.focusEnd=function(){
  const previous=data.focus.length,habit=$('tfjFocusSelect')?.value||'';
  oldEnd();
  if(data.focus.length<=previous||!habit||!journey||!areaFor(habit))return;
  const session=data.focus[data.focus.length-1];session.journeyHabitId=habit;save();
  const h=areaFor(habit).h;
  if(h.metric==='minutes'&&focusMins(h,session.date)>=h.target){journey.logs[session.date]??={};journey.logs[session.date][habit]=true;saveJourney()}
  render();
 };
}
function populateFocus(){const el=$('tfjFocusSelect');if(!el)return;const selection=el.value,items=allHabits().filter(x=>x.h.metric==='minutes');el.innerHTML='<option value="">Bez přiřazení</option>'+items.map(x=>'<option value="'+esc(x.h.id)+'">'+esc(x.a.name)+' · '+esc(x.h.title)+'</option>').join('');el.value=items.some(x=>x.h.id===selection)?selection:''}
function bind(){
 $('tfjContent').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-tfj-start')){$('tfjStartForm').elements.start.value=isoDate(new Date());openPopup('tfjStartModal')}
  else if(b.hasAttribute('data-tfj-add-area'))openArea();
  else if(b.hasAttribute('data-tfj-area')){selectedArea=b.dataset.tfjArea;draw()}
  else if(b.hasAttribute('data-tfj-back')){selectedArea=null;draw()}
  else if(b.hasAttribute('data-tfj-edit-area'))openArea(b.dataset.tfjEditArea);
  else if(b.hasAttribute('data-tfj-new-habit'))openHabit(b.dataset.tfjNewHabit);
  else if(b.hasAttribute('data-tfj-edit-habit')){const f=areaFor(b.dataset.tfjEditHabit);if(f)openHabit(f.a.id,f.h.id)}
  else if(b.hasAttribute('data-tfj-del-area')){const a=journey.areas.find(x=>x.id===b.dataset.tfjDelArea);if(a&&confirm('Opravdu smazat oblast „'+a.name+'“ a její návyky?')){journey.areas=journey.areas.filter(x=>x!==a);selectedArea=null;saveJourney();draw()}}
  else if(b.hasAttribute('data-tfj-check'))toggleHabit(b.dataset.tfjCheck,b.dataset.date);
  else if(b.hasAttribute('data-tfj-tab')){activeTab=b.dataset.tfjTab;draw()}
  else if(b.hasAttribute('data-tfj-map-date')){const d=b.dataset.tfjMapDate,i=dayInfo(d);alert(d+': '+i.count+' z '+i.total+' naplánovaných návyků splněno.')}
  else if(b.hasAttribute('data-tfj-save-reflect'))saveReflection();
  else if(b.hasAttribute('data-tfj-export'))exportJourney();
 });
 document.body.addEventListener('click',e=>{if(e.target.closest('[data-tfj-open]'))navigate()});
 $('tfjStartForm').addEventListener('submit',e=>{e.preventDefault();createJourney()});
 $('tfjAreaForm').addEventListener('submit',e=>{e.preventDefault();saveArea()});
 $('tfjHabitForm').addEventListener('submit',e=>{e.preventDefault();saveHabit()});
 $('tfjHabitForm').elements.metric.addEventListener('change',revealTarget);
 $('tfjDeleteHabit').onclick=()=>{const {areaId,habitId}=habitEditing||{};const a=journey.areas.find(x=>x.id===areaId);if(!a)return;const h=a.habits.find(x=>x.id===habitId);if(h&&confirm('Smazat návyk „'+h.title+'“?')){a.habits=a.habits.filter(x=>x!==h);saveJourney();closePopup('tfjHabitModal');draw()}};
 document.querySelectorAll('[data-tfj-close]').forEach(b=>b.onclick=()=>closePopup(b.dataset.tfjClose));
 const nav=$('tfFlyout'),item=document.createElement('button');item.type='button';item.innerHTML='<span class="tfIco">✦</span>Journey <span class="tfj-new">NEW</span>';
 const next=nav.querySelector('[data-section="focus"]');nav.insertBefore(item,next);item.addEventListener('click',e=>{e.stopPropagation();navigate()});
 hookPlanning();hookFocus();
}
function init(){
 const home=$('home');if(!home||!$('tfFlyout'))return;
 const panel=document.createElement('div');panel.id='tfjHomeCard';panel.className='panel tfj-home';home.insertBefore(panel,$('tf21Home'));
 const view=document.createElement('section');view.id='journey';view.className='view';
 view.innerHTML='<div id="tfjContent"></div>';
 $('settings').insertAdjacentElement('afterend',view);
 const modals=document.createElement('div');modals.innerHTML=
 '<div class="modal" id="tfjStartModal"><div class="dialog"><div class="dialog-head"><h2>Založit 90denní Journey</h2><button type="button" class="x" data-tfj-close="tfjStartModal">×</button></div><form id="tfjStartForm"><div class="formrow"><label>Název tvé cesty</label><input name="title" maxlength="100" placeholder="Např. Moje nejlepší verze" required></div><div class="formrow"><label>Datum začátku</label><input name="start" type="date" required></div><p>Po založení přidáš vlastní oblasti a návyky. Stávající úkoly a data se nezmění.</p><button type="submit" class="primary">Začít Journey →</button></form></div></div>'+
 '<div class="modal" id="tfjAreaModal"><div class="dialog"><div class="dialog-head"><h2 id="tfjAreaHeading">Nová oblast</h2><button type="button" class="x" data-tfj-close="tfjAreaModal">×</button></div><form id="tfjAreaForm"><div class="formrow"><label>Název oblasti</label><input name="name" maxlength="50" placeholder="Tělo, Mysl, Studium…" required></div><div class="formrow"><label>Cíl na 90 dní</label><textarea name="goal" maxlength="300" placeholder="Čeho chci dosáhnout?"></textarea></div><div class="formrow"><label>Proč na tom záleží?</label><textarea name="why" maxlength="300"></textarea></div><div class="formrow"><label>Barva oblasti</label><input name="color" type="color" value="#70d7c2"></div><button type="submit" class="primary">Uložit oblast</button></form></div></div>'+
 '<div class="modal" id="tfjHabitModal"><div class="dialog"><div class="dialog-head"><h2 id="tfjHabitHeading">Nový návyk</h2><button type="button" class="x" data-tfj-close="tfjHabitModal">×</button></div><form id="tfjHabitForm"><div class="formrow"><label>Název návyku</label><input name="title" maxlength="100" required placeholder="Např. Číst 15 minut"></div><div class="formrow"><label>Dny opakování</label><div class="tfj-days">'+daysOfWeek.map((d,i)=>'<label><input type="checkbox" value="'+d+'" checked>'+weekday[i]+'</label>').join('')+'</div></div><div class="formgrid"><div class="formrow"><label>Čas (nepovinný)</label><input type="time" name="time"></div><div class="formrow"><label>Obtížnost</label><select name="xp"><option value="5">Lehký · 5 XP</option><option value="15" selected>Střední · 15 XP</option><option value="30">Náročný · 30 XP</option></select></div></div><div class="formrow"><label>Způsob splnění</label><select name="metric"><option value="check">Ručně odškrtnout</option><option value="minutes">Minuty ve Focus Mode</option></select></div><div class="formrow" id="tfjTargetRow" hidden><label>Cíl ve Focus Mode (minuty)</label><input type="number" min="1" max="480" name="target" value="20"></div><div class="tfj-form-actions"><button class="primary" type="submit">Uložit návyk</button><button class="tfj-danger" type="button" id="tfjDeleteHabit" hidden>Smazat návyk</button></div></form></div></div>';
 document.body.appendChild(modals);
 bind();
 const previousRender=window.render;
 window.render=function(){previousRender();ensure();draw();populateFocus()};
 ensure();draw();
}
init();
})();
