
/* TaskFlow 2.1 · navigation, notes and per-account personalisation. */
(function(){
'use strict';
const header=document.querySelector('header'), oldNav=document.querySelector('header .nav');
if(!header||!oldNav)return;
const menu=document.createElement('div');
menu.className='tfMenuWrap';
menu.innerHTML='<button type="button" id="tfMenuToggle" class="tfMenuToggle" aria-expanded="false" aria-controls="tfFlyout">☰ Menu <span aria-hidden="true">⌄</span></button>'+
'<nav id="tfFlyout" class="tfFlyout" aria-label="Hlavní nabídka" hidden>'+
'<span class="tfMenuCaption">TASKFLOW</span>'+
'<button type="button" data-section="home"><span class="tfIco">⌂</span>Přehled</button>'+
'<button type="button" data-section="tasks"><span class="tfIco">✓</span>Úkoly</button>'+
'<button type="button" data-section="calendar"><span class="tfIco">▦</span>Kalendář</button>'+
'<button type="button" data-section="notes"><span class="tfIco">▤</span>Poznámky</button>'+
'<button type="button" data-section="focus"><span class="tfIco">◎</span>Focus Mode</button>'+
'<button type="button" data-section="progress"><span class="tfIco">↗</span>Statistiky</button>'+
'<span class="tfDivider"></span>'+
'<button type="button" data-section="settings"><span class="tfIco">⚙</span>Nastavení</button>'+
'</nav>';
oldNav.replaceWith(menu);header.appendChild(menu);
document.getElementById('progress').insertAdjacentHTML('afterend',
'<section class="view" id="tasks"><div class="intro"><div><div class="eyebrow">TVŮJ PLÁN</div><h1>Úkoly</h1><p>Přehled dnešních i nadcházejících questů.</p></div><button type="button" class="primary" id="tfNewTask">+ Úkol</button></div><div class="panel"><div class="panel-top"><h2>Dnes</h2><span id="tfTodayCount" class="small"></span></div><div id="tfTodayTasks"></div><div class="line"></div><h2>Nadcházející</h2><div id="tfUpcomingTasks" style="margin-top:14px"></div></div></section>'+
'<section class="view" id="notes"><div class="intro"><div><div class="eyebrow">TVŮJ PROSTOR</div><h1>Poznámky</h1><p>Nápady a myšlenky uložené ve tvém účtu.</p></div></div><div class="panel" style="margin-bottom:17px"><h2 id="tfNoteFormTitle">Nová poznámka</h2><form id="tfNoteForm" class="tfNoteEditor" style="margin-top:16px"><input type="hidden" id="tfNoteId"><div><label for="tfNoteTitle">Název poznámky</label><input id="tfNoteTitle" required maxlength="100" placeholder="Např. Nápady na víkend"></div><div><label for="tfNoteBody">Obsah</label><textarea id="tfNoteBody" maxlength="15000" placeholder="Zapiš si, co nechceš zapomenout…"></textarea></div><div class="toolbar"><button type="submit" class="primary">Uložit poznámku</button><button type="button" id="tfCancelEdit" class="secondary" hidden>Zrušit úpravy</button></div></form></div><div class="tfNoteGrid" id="tfNotesList"></div></section>'+
'<section class="view" id="settings"><div class="intro"><div><div class="eyebrow">TVŮJ TASKFLOW</div><h1>Nastavení</h1><p>Postupně tu přibudou další možnosti přizpůsobení.</p></div></div><div class="tfSettingsGrid"><div class="panel"><h2>👤 Můj profil</h2><p class="tfProfileHint">Nastav své jméno a TaskFlow tě bude osobně zdravit.</p><form id="tfProfileForm"><label for="tfProfileName">Jméno</label><input id="tfProfileName" maxlength="50" autocomplete="nickname" placeholder="Např. David"><p class="small">Jméno se uloží k tvému účtu a přenese se mezi zařízeními.</p><button class="primary" type="submit">Uložit jméno</button></form><div class="line"></div><span class="small">Přihlášený účet</span><div id="tfProfileEmail" style="overflow-wrap:anywhere;margin-top:7px">—</div></div><div class="panel"><h2>🎨 Vzhled</h2><p>Vyber si pozadí, které se hodí k tvému stylu. Změní se také barvy panelů.</p><div id="tfThemeGrid" class="tfThemeGrid" role="group" aria-label="Výběr vzhledu"><button class="tfTheme" type="button" data-appearance="calm" aria-pressed="false"><span class="tfThemePreview calm" aria-hidden="true"></span><strong>Klidný</strong><span class="small">Příroda</span></button><button class="tfTheme" type="button" data-appearance="space" aria-pressed="false"><span class="tfThemePreview space" aria-hidden="true"></span><strong>Vesmír</strong><span class="small">Tmavý</span></button><button class="tfTheme" type="button" data-appearance="modern" aria-pressed="false"><span class="tfThemePreview modern" aria-hidden="true"></span><strong>Moderní</strong><span class="small">Jemné vlny</span></button></div><p class="small" style="margin-top:15px">Vzhled se ukládá automaticky po výběru.</p></div></div></section>'
);
const menuToggle=document.getElementById('tfMenuToggle'),flyout=document.getElementById('tfFlyout');
function closeMenu(){flyout.hidden=true;menuToggle.setAttribute('aria-expanded','false')}
function showSection(section){
  if(!document.getElementById(section)||!['home','tasks','calendar','notes','focus','progress','settings'].includes(section))return;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===section));
  flyout.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
  menuToggle.innerHTML='☰ '+({'home':'Přehled','tasks':'Úkoly','calendar':'Kalendář','notes':'Poznámky','focus':'Focus Mode','progress':'Statistiky','settings':'Nastavení'}[section])+' <span aria-hidden="true">⌄</span>';
  closeMenu(); window.scrollTo({top:0,behavior:'instant'});
}
menuToggle.addEventListener('click',()=>{flyout.hidden=!flyout.hidden;menuToggle.setAttribute('aria-expanded',String(!flyout.hidden))});
flyout.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.section)));
document.addEventListener('click',e=>{if(!menu.contains(e.target))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function extras(){
  if(!Array.isArray(data.notes))data.notes=[];
  if(!data.profile||typeof data.profile!=='object'||Array.isArray(data.profile))data.profile={};
  if(!['calm','space','modern'].includes(data.appearance))data.appearance='space';
}
function setAppearance(value){
  let theme=['calm','space','modern'].includes(value)?value:'space';
  document.body.classList.remove('theme-calm','theme-space','theme-modern');
  document.body.classList.add('theme-'+theme);
  document.querySelectorAll('[data-appearance]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.appearance===theme)));
  const color=theme==='calm'?'#e8ddcb':theme==='modern'?'#d9edfb':'#10172c';
  document.querySelector('meta[name="theme-color"]').setAttribute('content',color);
}
function greet(){
  let h=new Date().getHours();
  let greeting=h>=5&&h<10?'Dobré ráno':h>=10&&h<12?'Dobré dopoledne':h>=12&&h<18?'Dobré odpoledne':h>=18&&h<23?'Dobrý večer':'Dobrou noc';
  let name=String(data.profile.name||'').trim();
  if(name.toLowerCase()==='david')name='Davide';
  document.getElementById('welcome').textContent=greeting+(name?', '+name:'')+'!';
}
function paintTasks(){
  const now=today(),todays=data.quests.filter(q=>q.date===now),upcoming=data.quests.filter(q=>q.date>now).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,20);
  document.getElementById('tfTodayCount').textContent=todays.filter(q=>q.done).length+' / '+todays.length+' hotovo';
  const card=q=>'<div class="tfTaskItem"><input type="checkbox" class="tfTaskCheck" data-id="'+esc(q.id)+'" aria-label="Splněno: '+esc(q.title)+'" '+(q.done?'checked':'')+'><div style="flex:1"><strong style="'+(q.done?'text-decoration:line-through;opacity:.65':'')+'">'+esc(q.title)+'</strong><span class="small">'+esc(q.date)+' · '+(q.locked?'+'+Number(q.xp||0)+' XP':'bez XP')+'</span></div></div>';
  document.getElementById('tfTodayTasks').innerHTML=todays.length?todays.map(card).join(''):'<p>Na dnešek zatím nemáš úkoly.</p>';
  document.getElementById('tfUpcomingTasks').innerHTML=upcoming.length?upcoming.map(card).join(''):'<p>Žádné naplánované úkoly. Připrav si je v Daily Ahead.</p>';
}
function paintNotes(){
  const notes=data.notes.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  document.getElementById('tfNotesList').innerHTML=notes.length?notes.map(n=>'<article class="tfNoteCard"><div><h3>'+esc(n.title||'Bez názvu')+'</h3><span class="small">'+esc((n.updatedAt||'').slice(0,10))+'</span></div><div class="tfNoteBody">'+esc(n.body||'').replace(/\n/g,'<br>')+'</div><div class="tfNoteActions"><button type="button" data-note-action="edit" data-id="'+esc(n.id)+'">Upravit</button><button type="button" data-note-action="delete" data-id="'+esc(n.id)+'">Smazat</button></div></article>').join(''):'<div class="panel"><p>Ještě tu nemáš žádné poznámky. Vytvoř první výše.</p></div>';
}
function paintSettings(){
  let nameInput=document.getElementById('tfProfileName');
  if(document.activeElement!==nameInput)nameInput.value=String(data.profile.name||'');
  document.getElementById('tfProfileEmail').textContent=(typeof activeUser!=='undefined'&&activeUser&&activeUser.email)||'—';
  setAppearance(data.appearance);
}
function paintAll(){extras();greet();paintTasks();paintNotes();paintSettings()}
const baseRender=window.render;
if(typeof baseRender==='function'){
  window.render=function(){baseRender();paintAll()};
}
function clearNoteForm(){document.getElementById('tfNoteForm').reset();document.getElementById('tfNoteId').value='';document.getElementById('tfNoteFormTitle').textContent='Nová poznámka';document.getElementById('tfCancelEdit').hidden=true}
document.getElementById('tfNewTask').addEventListener('click',()=>openQuest());
document.getElementById('tasks').addEventListener('change',e=>{if(e.target.classList.contains('tfTaskCheck'))toggleQuest(e.target.dataset.id)});
document.getElementById('tfProfileForm').addEventListener('submit',e=>{e.preventDefault();extras();data.profile.name=document.getElementById('tfProfileName').value.trim().slice(0,50);save();paintAll()});
document.getElementById('tfThemeGrid').addEventListener('click',e=>{let b=e.target.closest('[data-appearance]');if(!b)return;extras();data.appearance=b.dataset.appearance;setAppearance(data.appearance);save()});
document.getElementById('tfNoteForm').addEventListener('submit',e=>{
  e.preventDefault();extras();
  const title=document.getElementById('tfNoteTitle').value.trim(),body=document.getElementById('tfNoteBody').value.trim(),nid=document.getElementById('tfNoteId').value;
  if(!title)return;
  const stamp=new Date().toISOString(),existing=nid&&data.notes.find(n=>n.id===nid);
  if(existing){existing.title=title;existing.body=body;existing.updatedAt=stamp}
  else data.notes.push({id:id(),title,body,updatedAt:stamp});
  clearNoteForm();save();paintNotes();
});
document.getElementById('tfCancelEdit').addEventListener('click',clearNoteForm);
document.getElementById('tfNotesList').addEventListener('click',e=>{
  const b=e.target.closest('[data-note-action]');if(!b)return;
  const note=data.notes.find(n=>n.id===b.dataset.id);if(!note)return;
  if(b.dataset.noteAction==='delete'){
    if(!confirm('Opravdu smazat poznámku „'+note.title+'“?'))return;
    data.notes=data.notes.filter(n=>n.id!==note.id);save();paintNotes();if(document.getElementById('tfNoteId').value===note.id)clearNoteForm();
  } else {
    document.getElementById('tfNoteId').value=note.id;
    document.getElementById('tfNoteTitle').value=note.title||'';
    document.getElementById('tfNoteBody').value=note.body||'';
    document.getElementById('tfNoteFormTitle').textContent='Upravit poznámku';
    document.getElementById('tfCancelEdit').hidden=false;
    document.getElementById('tfNoteForm').scrollIntoView({behavior:'smooth',block:'center'});
  }
});
showSection('home');paintAll();
})();
