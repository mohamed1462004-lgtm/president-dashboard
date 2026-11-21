(() => {
'use strict';

/* ================= Helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const T = () => fmt(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d); };
const diff = s => Math.round((new Date(s + 'T00:00:00') - new Date(T() + 'T00:00:00')) / 864e5);
const nice = s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const SESSION = 'enactus_hub_session';

const I = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>'
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24">${I[n]}</svg>`;

const DEFAULT_LEGEND = [
  { id: 'c1', color: '#e5484d', name: 'Very urgent' },
  { id: 'c2', color: '#3b82f6', name: 'Finance' },
  { id: 'c3', color: '#2e9e5b', name: 'Reports' },
  { id: 'c4', color: '#8b5cf6', name: 'Events' },
  { id: 'c5', color: '#f97316', name: 'Waiting for reply' }
];

/* ================= State ================= */
let DB = { people: [], tasks: [], links: [], legend: [] };
let S = { view: 'home', pid: null, tab: 'tasks', month: T().slice(0, 7), day: T() };
let M = null;
let photoTmp = null;

const persist = () => Storage.save(DB);
const person = id => DB.people.find(p => p.id === id);
const colorOf = id => DB.legend.find(l => l.id === id) || { color: '#9a9a9a', name: '' };
const emailOf = p => (p && (p.email || CONFIG.HEAD_EMAILS[p.name])) || '';
const openTasks = pid => DB.tasks.filter(t => t.status === 'open' && (!pid || t.pid === pid));

function toast(m) {
  const t = $('#toast'); t.textContent = m; t.style.display = 'block';
  clearTimeout(toast.k); toast.k = setTimeout(() => t.style.display = 'none', 2600);
}
const avatar = (p, cls = '') => p.photo
  ? `<img class="av ${cls}" src="${p.photo}" alt="">`
  : `<span class="av ${cls}">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`;

/* ================= Views ================= */
function vHome() {
  if (!DB.people.length) return `<div class="card" style="margin-top:12px"><b>Welcome 👋</b><p class="mut">Start by adding your Heads and Vices, then give each one tasks.</p><button class="btn pri" data-act="addp">${ic('plus')} Add first person</button></div>`;
  const open = openTasks();
  const tm = open.filter(t => t.due && diff(t.due) === 1 && person(t.pid));
  let h = '';
  if (tm.length) h += `<div class="alert">${ic('bell')}<span>Due tomorrow: ${tm.map(t => esc(t.title) + ' – ' + esc(person(t.pid).name)).join(' · ')}</span></div>`;
  const card = p => {
    const ts = openTasks(p.id), od = ts.filter(t => t.due && diff(t.due) < 0).length;
    const up = ts.filter(t => t.due && diff(t.due) >= 0).map(t => t.due).sort()[0];
    return `<button class="card pc" data-act="open" data-id="${p.id}">${avatar(p)}<div class="pi"><b dir="auto">${esc(p.name)}</b><span dir="auto">${esc(p.committee || p.role)}</span><span>${ts.length} open</span>${up ? `<span>${nice(up)}</span>` : ''}${od ? `<span class="pill">${od} overdue</span>` : ''}</div></button>`;
  };
  const sec = (title, role, cls) => {
    const l = DB.people.filter(p => p.role === role).sort((a, b) => a.name.localeCompare(b.name));
    return `<h2 class="sec">${title} (${l.length})</h2>` + (l.length ? `<div class="grid ${cls}">${l.map(card).join('')}</div>` : '<div class="card mut">No one yet.</div>');
  };
  return h + sec('Vices', 'Vice', 'v') + sec('Heads', 'Head', 'h') +
    `<div class="bar" style="margin-top:18px"><span></span><button class="btn pri" data-act="addp">${ic('plus')} Add person</button></div>`;
}

function taskCard(t) {
  const c = colorOf(t.color), n = t.due ? diff(t.due) : null;
  return `<div class="task" style="--c:${t.color ? c.color : 'transparent'}">
    <div class="th"><b dir="auto">${esc(t.title)}</b>${n !== null && n < 0 ? `<span class="pill">Overdue ${-n}d</span>` : ''}<button class="ico" data-act="editt" data-id="${t.id}" title="Edit">${ic('edit')}</button></div>
    <div class="mut">${t.due ? 'Due: ' + nice(t.due) : 'No date'}${t.color && c.name ? ' · ' + esc(c.name) : ''}</div>
    ${t.note ? `<div class="nt" dir="auto">${esc(t.note)}</div>` : ''}
    ${t.privateNote ? `<div class="nt pv" dir="auto">🔒 ${esc(t.privateNote)}</div>` : ''}
    <div class="acts"><button class="btn sm" data-act="done" data-id="${t.id}">${ic('check')} Done</button><button class="btn sm" data-act="post" data-id="${t.id}">${ic('clock')} Postponed</button></div></div>`;
}

function doneRow(t) {
  return `<div class="card drow"><span class="ok">${ic('check')}</span>
    <div class="grow"><b dir="auto">${esc(t.title)}</b><div class="mut">Completed: ${t.doneAt ? nice(fmt(new Date(t.doneAt))) : '—'}</div>
    ${t.note ? `<div class="mut" dir="auto">${esc(t.note)}</div>` : ''}${t.privateNote ? `<div class="mut" dir="auto">🔒 ${esc(t.privateNote)}</div>` : ''}</div>
    <button class="btn sm" data-act="restore" data-id="${t.id}">Restore</button>
    <button class="ico" data-act="editt" data-id="${t.id}" title="Edit">${ic('edit')}</button></div>`;
}

function vProf() {
  const p = person(S.pid);
  if (!p) { S.view = 'home'; return vHome(); }
  const ts = DB.tasks.filter(t => t.pid === p.id);
  const open = ts.filter(t => t.status === 'open').sort((a, b) => b.created - a.created);          // newest first
  const done = ts.filter(t => t.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const links = DB.links.filter(l => l.pid === p.id).sort((a, b) => b.created - a.created);
  let body = '';
  if (S.tab === 'tasks') body = `<button class="btn pri block" data-act="addt">${ic('plus')} Task</button>` + (open.map(taskCard).join('') || '<div class="card mut" style="margin-top:10px">No tasks yet.</div>');
  if (S.tab === 'done') body = done.map(doneRow).join('') || '<div class="card mut">Nothing finished yet.</div>';
  if (S.tab === 'links') body = `<button class="btn pri block" data-act="addl">${ic('plus')} Add link</button>` +
    (links.map(l => `<div class="card lrow">${ic('link', 'lk')}<div class="grow"><a href="${esc(l.url)}" target="_blank" rel="noopener" dir="auto"><b>${esc(l.name)}</b></a><div class="mut">${esc(l.url.length > 46 ? l.url.slice(0, 46) + '…' : l.url)}</div><div class="mut">Added: ${nice(fmt(new Date(l.created)))}</div></div><button class="ico" data-act="editl" data-id="${l.id}">${ic('edit')}</button><button class="ico red" data-act="dellink" data-id="${l.id}">${ic('trash')}</button></div>`).join('') || '<div class="card mut" style="margin-top:10px">No links yet. Add the links they send you.</div>');
  return `<div class="narrow"><button class="lnk" data-act="back" style="margin-top:6px">${ic('back')} All people</button>
  <div class="phead">${avatar(p, 'lg')}<div class="grow"><h1 dir="auto">${esc(p.name)}</h1><div><span class="chip y">${esc(p.role)}</span> ${p.committee ? `<span class="chip" dir="auto">${esc(p.committee)}</span>` : ''}</div></div><button class="btn sm" data-act="editp" data-id="${p.id}">Edit</button></div>
  <div class="seg">${[['tasks', 'Tasks'], ['links', 'Important Links'], ['done', 'Done']].map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}

function vCal() {
  const [y, m] = S.month.split('-').map(Number);
  const off = (new Date(y, m - 1, 1).getDay() + 1) % 7, dim = new Date(y, m, 0).getDate();   // week starts Saturday
  let c = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(x => `<div class="h">${x}</div>`).join('');
  for (let i = 0; i < off; i++) c += '<div class="d e"></div>';
  for (let d = 1; d <= dim; d++) {
    const s = `${y}-${pad(m)}-${pad(d)}`, ts = openTasks().filter(t => t.due === s);
    c += `<button class="d ${s === T() ? 'td' : ''} ${s === S.day ? 'sel' : ''}" data-act="day" data-id="${s}">${d}<div class="dots">${ts.slice(0, 3).map(t => `<i style="background:${colorOf(t.color).color}"></i>`).join('')}</div></button>`;
  }
  const list = DB.tasks.filter(t => t.due === S.day && person(t.pid));
  return `<div class="narrow"><div class="mhead"><button class="ico" data-act="mo" data-id="-1">${ic('left')}</button><span>${new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span><button class="ico" data-act="mo" data-id="1">${ic('right')}</button></div>
  <div class="card"><div class="cal">${c}</div></div>
  <div class="bar" style="margin-top:18px"><h2 class="sec" style="margin:0">${nice(S.day)}</h2><button class="btn pri sm" data-act="addt" data-due="${S.day}">${ic('plus')} Task</button></div>
  <div class="card">${list.length ? list.map(t => `<div class="crow">${avatar(person(t.pid), 'sm')}<div class="grow ${t.status === 'done' ? 'mut' : ''}"><b dir="auto">${esc(t.title)}</b><div class="mut">${esc(person(t.pid).name)}${t.status === 'done' ? ' · done' : ''}</div></div><i class="dot" style="background:${t.color ? colorOf(t.color).color : '#d8d4ca'}"></i><button class="ico" data-act="editt" data-id="${t.id}">${ic('edit')}</button></div>`).join('') : '<span class="mut">Nothing on this day.</span>'}</div></div>`;
}

function vSet() {
  return `<div class="narrow"><h1 style="text-align:center;margin-top:10px">Color Legend</h1><p class="mut" style="text-align:center">You decide what each color means</p>
  <div class="card">${DB.legend.map(l => `<div class="lg-row"><input type="color" data-chg="lc" data-id="${l.id}" value="${l.color}"><input type="text" dir="auto" data-chg="ln" data-id="${l.id}" value="${esc(l.name)}"><button class="ico red" data-act="delc" data-id="${l.id}">${ic('trash')}</button></div>`).join('')}</div>
  <button class="btn pri block" style="margin-top:12px" data-act="addc">${ic('plus')} Add color</button>
  <h2 class="sec">Backup</h2><div class="acts"><button class="btn" data-act="export">Download backup</button><button class="btn" data-act="import">Restore from backup</button></div>
  <p class="mut">Your data is saved in this browser only. Download a backup from time to time, and use it to move your data to another device.</p>
  <h2 class="sec">Account</h2><button class="btn red" data-act="logout">Log out</button></div>`;
}

function render() {
  document.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === (S.view === 'prof' ? 'home' : S.view)));
  $('#view').innerHTML = S.view === 'home' ? vHome() : S.view === 'prof' ? vProf() : S.view === 'cal' ? vCal() : vSet();
}

/* ================= Modals ================= */
const openModal = h => {
  $('#box').innerHTML = '<div class="handle"></div>' + h;
  $('#modal').classList.add('on');
  setTimeout(() => { const f = $('#box input[type=text]'); f && f.focus(); }, 60);
};
const closeModal = () => { $('#modal').classList.remove('on'); M = null; };
const fld = (l, i) => `<label class="f">${l}</label>${i}`;
const btns = (id, save, del) => `<div class="btns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn pri" data-act="${save}">Save</button></div>${id ? `<button class="lnk red" style="margin-top:14px" data-act="${del}">Delete</button>` : ''}`;
const val = id => ($(id) || {}).value || '';

function personModal(p) {
  p = p || {}; M = { id: p.id }; photoTmp = p.photo || null;
  const coms = [...new Set(['Project', 'HR', 'PR', 'Media', 'Finance', ...DB.people.map(x => x.committee).filter(Boolean)])];
  openModal(`<h1>${p.id ? 'Edit person' : 'Add person'}</h1>
  <label class="photo"><input type="file" id="pPhoto" accept="image/*" hidden><span id="pPrev">${p.photo ? avatar(p, 'lg') : `<span class="av lg">${ic('cam')}</span>`}</span><span class="mut">Add photo</span></label>
  ${fld('Name', `<input type="text" id="pName" dir="auto" placeholder="Enter full name" value="${esc(p.name)}">`)}
  ${fld('Role', `<div class="segrole"><label><input type="radio" name="pRole" value="Head" ${p.role === 'Vice' ? '' : 'checked'}><span>Head</span></label><label><input type="radio" name="pRole" value="Vice" ${p.role === 'Vice' ? 'checked' : ''}><span>Vice</span></label></div>`)}
  ${fld('Committee', `<input type="text" id="pCom" dir="auto" list="comList" placeholder="Select or type committee" value="${esc(p.committee)}"><datalist id="comList">${coms.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`)}
  ${fld('Email (for v2 / email notifications)', `<input type="email" id="pMail" value="${esc(p.email)}">`)}
  ${btns(p.id, 'savep', 'delp')}`);
}

function taskModal(o) {
  if (!DB.people.length) return toast('Add a person first');
  o = o || {}; M = { id: o.id };
  const pidv = o.pid || S.pid || DB.people[0].id, cur = DB.legend.find(l => l.id === o.color);
  openModal(`<h1>${o.id ? 'Edit task' : 'New task'}</h1>
  ${fld('Person', `<select id="tPid">${DB.people.map(p => `<option value="${p.id}" ${p.id === pidv ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`)}
  ${fld('Task title', `<input type="text" id="tTitle" dir="auto" placeholder="Enter task title" value="${esc(o.title)}">`)}
  ${fld('Due date', `<input type="date" id="tDue" value="${esc(o.due)}">`)}
  ${fld('Color', `<div class="colors"><label class="cc"><input type="radio" name="tc" value="" data-n="No color" ${o.color ? '' : 'checked'}><span class="none"></span></label>${DB.legend.map(l => `<label class="cc"><input type="radio" name="tc" value="${l.id}" data-n="${esc(l.name)}" ${o.color === l.id ? 'checked' : ''}><span style="background:${l.color}"></span></label>`).join('')}</div><div class="mut" id="cname" style="margin-top:6px">${cur ? esc(cur.name) : 'No color'}</div>`)}
  ${fld('Notes', `<textarea id="tNote" dir="auto" placeholder="Add notes...">${esc(o.note)}</textarea>`)}
  ${fld('🔒 My private notes (never shown to anyone)', `<textarea id="tPriv" dir="auto">${esc(o.privateNote)}</textarea>`)}
  ${!o.id && CONFIG.EMAILJS.ENABLED ? `<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="tMail"> Send email to this person</label>` : ''}
  ${btns(o.id, 'savet', 'delt')}`);
}

function linkModal(l) {
  l = l || {}; M = { id: l.id };
  openModal(`<h1>${l.id ? 'Edit link' : 'Add link'}</h1>
  ${fld('Name (you choose)', `<input type="text" id="lName" dir="auto" value="${esc(l.name)}">`)}
  ${fld('Link', `<input type="text" id="lUrl" value="${esc(l.url)}" placeholder="https://...">`)}
  ${btns(l.id, 'savel', 'dell')}`);
}

function postModal(t) {
  M = { id: t.id };
  openModal(`<h1 style="text-align:center">Postpone task</h1><p dir="auto" style="text-align:center;margin:6px 0"><b>${esc(t.title)}</b></p><p class="mut" style="text-align:center;margin:0">Current date: ${t.due ? nice(t.due) : 'No date'}</p>
  ${fld('New date', `<input type="date" id="pDue" value="${esc(t.due)}">`)}
  <p class="mut" style="text-align:center">Same task, only the date changes</p>
  <div class="btns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn pri" data-act="postok">Confirm new date</button></div>`);
}

/* ================= Actions ================= */
function resizeImg(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = 160, c = document.createElement('canvas'); c.width = c.height = s;
        const m = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s);
        res(c.toDataURL('image/jpeg', .8));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

async function savePerson() {
  const name = val('#pName').trim();
  if (!name) return toast('Write the name');
  const role = (document.querySelector('input[name=pRole]:checked') || {}).value || 'Head';
  const data = { name, role, committee: val('#pCom').trim(), email: val('#pMail').trim(), photo: photoTmp };
  if (M.id) Object.assign(person(M.id), data); else DB.people.push({ id: uid(), ...data });
  await persist(); closeModal(); render();
}

async function deletePerson() {
  if (!confirm('Delete this person with all their tasks and links?')) return;
  DB.tasks = DB.tasks.filter(t => t.pid !== M.id); DB.links = DB.links.filter(l => l.pid !== M.id);
  DB.people = DB.people.filter(p => p.id !== M.id);
  S.view = 'home'; await persist(); closeModal(); render();
}

async function sendTaskEmail(p, t) {
  const E = CONFIG.EMAILJS;
  if (!E.ENABLED || typeof emailjs === 'undefined') return toast('EmailJS is not set up');
  if (!emailOf(p)) return toast('No email saved for ' + p.name);
  try {
    await emailjs.send(E.SERVICE_ID, E.TEMPLATE_ID, { to_email: emailOf(p), to_name: p.name, task_title: t.title, due_date: t.due ? nice(t.due) : 'No date', message: t.note || '' });
    toast('Email sent to ' + p.name);
  } catch (e) { toast('Email failed — check EmailJS settings'); }
}

async function saveTask() {
  const title = val('#tTitle').trim();
  if (!title) return toast('Write the task title');
  const data = { pid: val('#tPid'), title, due: val('#tDue'), color: (document.querySelector('input[name=tc]:checked') || {}).value || '', note: val('#tNote').trim(), privateNote: val('#tPriv').trim() };
  const wantMail = $('#tMail') && $('#tMail').checked;
  let t;
  if (M.id) { t = DB.tasks.find(x => x.id === M.id); Object.assign(t, data); }
  else { t = { id: uid(), status: 'open', created: Date.now(), ...data }; DB.tasks.push(t); }
  await persist(); closeModal(); render();
  if (wantMail) sendTaskEmail(person(t.pid), t);
}

async function saveLink() {
  const name = val('#lName').trim(); let url = val('#lUrl').trim();
  if (!name || !url) return toast('Write the name and the link');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (M.id) Object.assign(DB.links.find(l => l.id === M.id), { name, url });
  else DB.links.push({ id: uid(), pid: S.pid, name, url, created: Date.now() });
  await persist(); closeModal(); render();
}

/* ================= Events ================= */
document.addEventListener('click', async e => {
  if (e.target.id === 'modal') return closeModal();
  const nb = e.target.closest('[data-v]');
  if (nb) { S.view = nb.dataset.v; return render(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  const task = DB.tasks.find(t => t.id === id);

  switch (a) {
    case 'open': S.pid = id; S.view = 'prof'; S.tab = 'tasks'; render(); scrollTo(0, 0); break;
    case 'back': S.view = 'home'; render(); break;
    case 'tab': S.tab = id; render(); break;
    case 'close': closeModal(); break;
    case 'addp': personModal(); break;
    case 'editp': personModal(person(id)); break;
    case 'savep': savePerson(); break;
    case 'delp': deletePerson(); break;
    case 'addt': taskModal({ pid: S.view === 'prof' ? S.pid : '', due: el.dataset.due || '' }); break;
    case 'editt': taskModal(task); break;
    case 'savet': saveTask(); break;
    case 'delt': if (confirm('Delete this task?')) { DB.tasks = DB.tasks.filter(t => t.id !== M.id); await persist(); closeModal(); render(); } break;
    case 'done': task.status = 'done'; task.doneAt = Date.now(); await persist(); render(); toast('Moved to Done'); break;
    case 'restore': task.status = 'open'; task.doneAt = null; await persist(); render(); toast('Task restored'); break;
    case 'post': postModal(task); break;
    case 'postok': { const d = val('#pDue'); if (!d) return toast('Pick a date'); DB.tasks.find(t => t.id === M.id).due = d; await persist(); closeModal(); render(); toast('Date updated'); break; }
    case 'addl': linkModal(); break;
    case 'editl': linkModal(DB.links.find(l => l.id === id)); break;
    case 'savel': saveLink(); break;
    case 'dell': if (confirm('Delete this link?')) { DB.links = DB.links.filter(l => l.id !== M.id); await persist(); closeModal(); render(); } break;
    case 'dellink': if (confirm('Delete this link?')) { DB.links = DB.links.filter(l => l.id !== id); await persist(); render(); } break;
    case 'day': S.day = id; render(); break;
    case 'mo': { const [y, m] = S.month.split('-').map(Number); S.month = fmt(new Date(y, m - 1 + Number(id), 1)).slice(0, 7); render(); break; }
    case 'addc': DB.legend.push({ id: uid(), color: '#888888', name: 'New color' }); await persist(); render(); break;
    case 'delc': if (confirm('Delete this color? Tasks using it will show no color.')) { DB.legend = DB.legend.filter(l => l.id !== id); await persist(); render(); } break;
    case 'export': Storage.exportJSON(DB); break;
    case 'import': $('#importFile').click(); break;
    case 'logout': localStorage.removeItem(SESSION); showLogin(); break;
  }
});

document.addEventListener('change', async e => {
  const t = e.target;
  // Legend edits
  if (t.dataset && t.dataset.chg) {
    const l = DB.legend.find(x => x.id === t.dataset.id); if (!l) return;
    if (t.dataset.chg === 'lc') l.color = t.value; else l.name = t.value;
    await persist(); return;
  }
  // Color caption in task modal
  if (t.name === 'tc') { const c = $('#cname'); if (c) c.textContent = t.dataset.n || ''; return; }
  // Photo chosen in person modal
  if (t.id === 'pPhoto' && t.files[0]) {
    photoTmp = await resizeImg(t.files[0]);
    $('#pPrev').innerHTML = `<img class="av lg" src="${photoTmp}" alt="">`;
  }
});

// Restore backup
$('#importFile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.people) || !Array.isArray(d.tasks)) throw 0;
      if (!confirm('This replaces everything in this browser with the backup. Continue?')) return;
      DB = Object.assign({ people: [], tasks: [], links: [], legend: [] }, d);
      await persist(); render(); toast('Backup restored');
    } catch (x) { toast('Not a valid backup file'); }
  };
  r.readAsText(f); e.target.value = '';
});

/* ================= Login & boot ================= */
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#loginEmail').value = ''; }
function showApp() { $('#login').hidden = true; $('#app').hidden = false; render(); }

function tryLogin() {
  const em = $('#loginEmail').value.trim().toLowerCase();
  if (em && em === CONFIG.OWNER_EMAIL.trim().toLowerCase()) {
    localStorage.setItem(SESSION, em); $('#loginErr').hidden = true; showApp();
  } else $('#loginErr').hidden = false;
}
$('#loginBtn').addEventListener('click', tryLogin);
$('#loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

(async function boot() {
  const d = await Storage.load();
  DB = Object.assign({ people: [], tasks: [], links: [], legend: [] }, d || {});
  if (!DB.legend.length) { DB.legend = DEFAULT_LEGEND.map(x => ({ ...x })); await persist(); }
  if (CONFIG.EMAILJS.ENABLED && typeof emailjs !== 'undefined') emailjs.init({ publicKey: CONFIG.EMAILJS.PUBLIC_KEY });
  if (localStorage.getItem(SESSION) === CONFIG.OWNER_EMAIL.trim().toLowerCase()) showApp(); else showLogin();
})();
})();