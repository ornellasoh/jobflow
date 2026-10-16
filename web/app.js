'use strict';
const $ = s => document.querySelector(s);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses = ['À préparer','Documents prêts','Envoyée','Entretien','Offre','Refusée'];
const labels = {today:'Aujourd’hui',prepare:'Préparer une candidature',applications:'Mes candidatures',profile:'Mon parcours'};
let records = [], profile = {}, draft = {}, currentTab = 'cv';
const dateISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
function notify(message) { $('#notice').textContent = message; $('#notice').hidden = false; }
async function request(path, data) {
  const response = await fetch(path, data === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Action impossible. Réessaie.'); }
  return response.json();
}
function field(label, name, value='', type='text') { return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHTML(value)}"></div>`; }
function due() { return records.filter(r => r.follow_up_date && r.follow_up_date <= dateISO() && !['Offre','Refusée'].includes(r.status)); }
function updateGoal() {
  const goal = Math.min(30,Math.max(1,Number(localStorage.getItem('jobflow-goal')) || 3));
  $('#goal').value = goal;
  const now = new Date(dateISO()+'T12:00:00Z'); now.setUTCDate(now.getUTCDate() - (now.getUTCDay()+6)%7);
  const start = now.toISOString().slice(0,10);
  const count = records.filter(r => r.applied_date >= start && r.applied_date <= dateISO()).length;
  $('#weekly').textContent = `${count} / ${goal}`; $('#progress').max = goal; $('#progress').value = Math.min(count,goal);
}
function route() { const key = location.hash.slice(1); return key in labels ? key : 'today'; }
function row(r) { return `<div class="row"><div class="row-main"><strong>${escapeHTML(r.company)}</strong><small>${escapeHTML(r.role)}</small>${r.follow_up_date ? `<small>Relance : ${escapeHTML(r.follow_up_date)}</small>`:''}</div><span class="status">${escapeHTML(r.status)}</span><button data-open="${escapeHTML(r.id)}" aria-label="Ouvrir ${escapeHTML(r.company)}">Ouvrir</button></div>`; }
function render() {
  const view = route();
  document.querySelectorAll('[data-view]').forEach(a => { a.classList.toggle('active',a.dataset.view===view); if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
  $('#breadcrumb').textContent = `Mon espace / ${labels[view]}`;
  $('#account').textContent = profile.candidate_name && profile.candidate_name !== 'Prénom Nom' ? profile.candidate_name.split(' ')[0] : 'Mon espace';
  updateGoal();
  if(view === 'today') home();
  if(view === 'prepare') prepare();
  if(view === 'applications') applications();
  if(view === 'profile') renderProfile();
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {draft = structuredClone(records.find(r=>r.id===b.dataset.open));location.hash='prepare';if(route()==='prepare')render();});
}
function home() {
  const drafts = records.filter(r=>['À préparer','Documents prêts'].includes(r.status));
  $('#main').innerHTML = `<section class="intro"><div><h1>Une action à la fois.</h1><p>Ton parcours, tes candidatures et tes prochaines relances au même endroit.</p></div><button class="primary" id="new">＋ Préparer une candidature</button></section>
  <section class="stats" aria-label="Ton activité">${[['▤','À préparer',drafts.length],['◷','Relances dues',due().length],['◎','Entretiens',records.filter(r=>r.status==='Entretien').length]].map(([icon,label,count])=>`<article class="stat"><div class="stat-icon" aria-hidden="true">${icon}</div><div><span>${label}</span><strong>${count}</strong></div></article>`).join('')}</section>
  <div class="grid"><section class="panel"><div class="panel-head"><h2>À faire aujourd’hui</h2><p>La prochaine action suffit pour avancer.</p></div>${due().length?due().map(row).join(''):'<div class="empty"><div class="empty-icon" aria-hidden="true">✓</div><h3>Aucune relance due</h3><p>Tu peux avancer sur ta prochaine candidature à ton rythme.</p></div>'}</section><section class="panel"><div class="panel-head"><h2>Reprendre un brouillon</h2><p>Continue là où tu en étais.</p></div>${drafts.length?drafts.map(row).join(''):'<div class="empty"><div class="empty-icon" aria-hidden="true">▤</div><h3>Ta prochaine candidature commence ici</h3><p>Ajoute une offre pour préparer tes documents et conserver ton suivi.</p></div>'}</section></div>`;
  $('#new').onclick=()=>{draft={};location.hash='prepare';};
}
function collect() {
  for(const key of ['company','role','offer_url','offer_text','letter_text','follow_up_date','notes']) if($('#'+key))draft[key]=$('#'+key).value;
  if(draft.cv){ draft.cv.cv_title=$('#cv_title')?.value || draft.cv.cv_title; draft.cv.seo_title=draft.cv.cv_title; draft.cv.accroche_objective=$('#summary')?.value ?? draft.cv.accroche_objective; }
}
async function persist(status, collectFields = true) {
  if(collectFields)collect();
  if(!draft.company?.trim() || !draft.role?.trim())throw new Error('Renseigne l’entreprise et le poste.');
  if(status)draft.status=status;
  const saved=await request('/api/applications',draft);draft=saved;records=await request('/api/applications');updateGoal();return saved;
}
function preview() {
  if(!draft.cv)return '<div class="empty"><div class="empty-icon" aria-hidden="true">▤</div><h3>Tes documents apparaîtront ici</h3><p>Colle une offre puis prépare ton CV et ta lettre à partir de ton parcours.</p></div>';
  if(currentTab==='letter')return `<div class="sheet"><h2>Lettre de motivation</h2>${(draft.letter_text||'').split('\n\n').map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</div>`;
  return `<div class="sheet"><h2>${escapeHTML(profile.candidate_name)}</h2><p>${escapeHTML(draft.cv.cv_title)}</p><h3>Profil</h3><p>${escapeHTML(draft.cv.accroche_objective)}</p><h3>Expériences</h3>${(draft.cv.experiences||[]).map(e=>`<p><strong>${escapeHTML(e.role)}</strong><br>${escapeHTML(e.company)}<br>${escapeHTML(e.period)}</p><ul>${(e.bullets||[]).map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul>`).join('')}<h3>Compétences</h3><p>${escapeHTML((draft.cv.skills||[]).join(' · '))}</p></div>`;
}
function prepare() {
  $('#main').innerHTML=`<section class="intro"><div><h1>Préparer une candidature</h1><p>Une offre, tes preuves, des documents prêts à relire.</p></div><span class="save-state">${draft.id?'Brouillon enregistré sur cet appareil':'Nouveau brouillon'}</span></section>
  <ol class="stepper" aria-label="Étapes"><li class="${!draft.cv?'current':''}"><b>1</b>Offre</li><li class="${draft.cv?'current':''}"><b>2</b>CV & lettre</li><li><b>3</b>Envoi & suivi</li></ol>
  <div class="grid"><div class="stack"><section class="panel"><div class="panel-head"><h2>L’offre sélectionnée</h2><p>Ajoute les informations utiles à ta candidature.</p></div><div class="panel-body"><div class="fields">${field('Entreprise *','company',draft.company)}${field('Poste *','role',draft.role)}</div>${field('Lien de l’offre','offer_url',draft.offer_url,'url')}<div class="field"><label for="offer_text">Texte de l’offre</label><textarea id="offer_text" rows="6" placeholder="Colle ici le texte de l’offre…">${escapeHTML(draft.offer_text)}</textarea><p class="hint">Le lien est conservé pour le suivi. Colle le texte pour l’analyse.</p></div><details><summary>Réglages de génération</summary><div class="fields"><div class="field"><label for="provider">Moteur IA</label><select id="provider"><option>Gemini</option><option>DeepSeek</option></select></div>${field('Clé API · non enregistrée','api_key','','password')}</div><p class="hint">La génération transmet ton CV source et le texte de l’offre au fournisseur choisi.</p></details><div class="actions"><button class="primary" id="generate">Préparer mon CV et ma lettre</button><button id="save">Enregistrer le brouillon</button></div></div></section>
  ${draft.cv?`<section class="panel"><div class="panel-head"><h2>Documents à relire</h2><p>Vérifie les propositions avant de les utiliser.</p></div><div class="panel-body">${field('Titre du CV','cv_title',draft.cv.cv_title)}<div class="field"><label for="summary">Résumé professionnel</label><textarea id="summary">${escapeHTML(draft.cv.accroche_objective)}</textarea></div><div class="field"><label for="letter_text">Lettre de motivation</label><textarea id="letter_text" rows="9">${escapeHTML(draft.letter_text)}</textarea></div><p class="hint">Expériences, dates, formations et compétences conservées depuis ton CV source.</p><button class="primary" id="validate">Valider les documents</button></div></section>`:''}
  <section class="panel"><div class="panel-head"><h2>Envoi & suivi</h2><p>Confirme l’envoi une fois ta candidature déposée.</p></div><div class="panel-body">${field('Date de relance','follow_up_date',draft.follow_up_date,'date')}<div class="field"><label for="notes">Notes</label><textarea id="notes" rows="3">${escapeHTML(draft.notes)}</textarea></div><label class="check"><input id="sent" type="checkbox">J’ai envoyé cette candidature aujourd’hui</label><button id="confirm" class="secondary">Enregistrer l’envoi</button></div></section></div>
  <aside class="preview panel"><div class="panel-head"><h2>Aperçu des documents</h2><p>Le contenu avant téléchargement.</p></div><div class="panel-body"><div class="tabs" role="tablist" aria-label="Document à prévisualiser"><button id="tab-cv" role="tab" aria-selected="${currentTab==='cv'}">CV adapté</button><button id="tab-letter" role="tab" aria-selected="${currentTab==='letter'}">Lettre</button></div><div id="preview">${preview()}</div>${draft.cv?'<div class="actions" style="margin-top:18px"><button id="download-cv" class="secondary">↓ CV Word</button><button id="download-letter" class="secondary">↓ Lettre Word</button></div>':''}<p class="source-note">Stockage local · Notion non connecté</p></div></aside></div>`;
  const bind=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=()=>Promise.resolve().then(fn).catch(e=>notify(e.message));};
  bind('save',async()=>{await persist();notify('Brouillon enregistré.');render();});
  bind('validate',async()=>{await persist(draft.status && draft.status!=='À préparer'?draft.status:'Documents prêts');notify('Documents validés. Tu peux postuler, puis confirmer l’envoi.');render();});
  bind('confirm',async()=>{if(!$('#sent').checked)throw new Error('Confirme l’envoi après avoir postulé.');collect();if(draft.follow_up_date && draft.follow_up_date<dateISO())throw new Error('Choisis une date de relance à partir d’aujourd’hui.');draft.applied_date=dateISO();await persist('Envoyée');notify('Envoi et relance enregistrés.');render();});
  bind('generate',async()=>{collect();if(!draft.company?.trim()||!draft.role?.trim())throw new Error('Renseigne l’entreprise et le poste.');const button=$('#generate');button.disabled=true;button.textContent='Préparation en cours…';try{const result=await request('/api/generate',{offer_text:draft.offer_text,provider:$('#provider').value,api_key:$('#api_key').value});draft={...draft,...result};await persist(undefined,false);render();notify('Documents préparés. Relis-les avant de postuler.');}finally{if(button.isConnected){button.disabled=false;button.textContent='Préparer mon CV et ma lettre';}}});
  for(const tab of ['cv','letter'])bind('tab-'+tab,()=>{collect();currentTab=tab;$('#preview').innerHTML=preview();document.querySelectorAll('[role="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.id==='tab-'+tab)));});
  for(const kind of ['cv','letter'])bind('download-'+kind,async()=>{collect();const response=await fetch('/api/document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,kind})});if(!response.ok)throw new Error('Export impossible. Vérifie le document et réessaie.');download(await response.blob(),kind==='cv'?'CV.docx':'Lettre.docx');});
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function applications(){
  $('#main').innerHTML=`<section class="intro"><div><h1>Mes candidatures</h1><p>Retrouve tes documents et ta prochaine action.</p></div><button id="export">Exporter mes données</button></section><div class="searchbar"><input id="search" aria-label="Rechercher une entreprise ou un poste" placeholder="Rechercher une entreprise ou un poste"><select id="filter" aria-label="Filtrer par statut"><option>Tous les statuts</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select></div><section class="panel" id="results"></section>`;
  function filter(){const query=$('#search').value.toLocaleLowerCase('fr'),status=$('#filter').value;const list=records.filter(r=>(r.company+' '+r.role).toLocaleLowerCase('fr').includes(query)&&(status==='Tous les statuts'||r.status===status));$('#results').innerHTML=list.length?list.map(row).join(''):'<div class="empty"><h2>Aucune candidature à afficher</h2><p>Prépare ta première candidature ou modifie tes filtres.</p></div>';document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{draft=structuredClone(records.find(r=>r.id===b.dataset.open));location.hash='prepare';});}
  $('#search').oninput=filter;$('#filter').onchange=filter;$('#export').onclick=()=>download(new Blob([JSON.stringify(records,null,2)],{type:'application/json'}),'jobflow.json');filter();
}
function renderProfile(){
  $('#main').innerHTML=`<section class="intro"><div><h1>Mon parcours</h1><p>La source de référence de tes candidatures.</p></div></section><section class="panel"><div class="panel-head"><h2>${escapeHTML(profile.candidate_name||'Mon profil')}</h2><p>${escapeHTML(profile.default_title)}</p></div><div class="panel-body">${(profile.experiences||[]).length?(profile.experiences||[]).map(e=>`<details open><summary>${escapeHTML(e.role)} · ${escapeHTML(e.company)}</summary><p>${escapeHTML(e.period)}</p><ul>${(e.bullets||[]).map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul></details>`).join(''):'<p>Ajoute ton profil dans le fichier local data/profile.json pour personnaliser les documents. Un modèle est fourni dans profile.example.json.</p>'}<p class="source-note">Le profil réel reste sur cet appareil et n’est pas publié dans le dépôt GitHub.</p></div></section>`;
}
$('#goal').onchange=()=>{localStorage.setItem('jobflow-goal',String(Math.min(30,Math.max(1,Number($('#goal').value)||3))));updateGoal();};
window.addEventListener('hashchange',()=>{collect();render();});
window.addEventListener('beforeunload',e=>{if(route()==='prepare' && $('#company')?.value && !draft.id){e.preventDefault();e.returnValue='';}});
Promise.all([request('/api/applications'),request('/api/profile')]).then(([a,p])=>{records=a;profile=p;render();}).catch(e=>{$('#main').innerHTML='<h1>Connexion indisponible</h1><p>Lance le serveur local JobFlow puis recharge cette page.</p>';notify(e.message);});
