import { auth, db } from "./firebase-config.js";
const U = "https://www.gstatic.com/firebasejs/10.12.2/";
const { createUserWithEmailAndPassword: cu, signInWithEmailAndPassword: si, signOut, onAuthStateChanged } = await import(U + "firebase-auth.js");
const { collection, addDoc, setDoc, doc, getDoc, getDocs, deleteDoc, query, where, serverTimestamp } = await import(U + "firebase-firestore.js");

const $ = i => document.getElementById(i);
const e = s => String(s ?? "").replace(/[&<>"]/g, c => `&#${c.charCodeAt()};`);
const D = ["Accountancy","International Relations","Biology","Computer Studies","Engineering","Criminology","Education"].map(x => "Department of " + x);
const T = ["1st Trimester", "2nd Trimester", "3rd Trimester"];
const ROLES = ["pending","student","faculty","chair","registrar","cashier","dean","hr","scholarship","adviser","admin","superadmin"];
const F = (k, l, t = "text") => ({ k, l, t });
const dep = F("dept", "Department", D), term = F("term", "Term", T), stu = F("student", "Student", "stu"), fac = F("faculty", "Faculty", "fac");
const act = [F("title","Title"),F("date","Date","date"),F("venue","Venue"),F("status","Status",["Planned","Ongoing","Done"])];

// ---- Module registry: r = who can view, w = who can edit, c = Firestore collection, sc = row-scoped by role
const M = [
 {id:"dash",t:"Dashboard",i:"📊",r:["admin"],x:"dash"},
 {id:"curr",t:"Curriculum",i:"🎓",r:["student"],x:"curr"},
 {id:"enrollments",t:"Enrollment",i:"📚",r:["registrar","chair","student","dean"],w:["registrar"],c:"enrollments",sc:1,f:[stu,F("code","Subject Code"),F("title","Subject"),term,dep,F("status","Status",["Enrolled","Dropped","Completed"])]},
 {id:"grades",t:"Grades",i:"📝",r:["dean","chair","faculty","student","scholarship"],w:["faculty"],c:"grades",sc:1,f:[stu,F("code","Subject Code"),F("title","Subject"),term,F("grade","Grade","num"),dep]},
 {id:"billing",t:"Billing",i:"🧾",r:["cashier","student","scholarship"],w:["cashier"],c:"billing",sc:1,f:[stu,term,F("amount","Amount","num"),F("status","Status",["Unpaid","Partial","Paid"])]},
 {id:"admissions",t:"Admissions",i:"🧑‍🎓",r:["registrar"],w:["registrar"],c:"admissions",f:[F("name","Applicant"),F("program","Program"),dep,F("status","Status",["Pending","Admitted","Rejected"])]},
 {id:"records",t:"Records",i:"🗂️",r:["registrar"],w:["registrar"],c:"records",f:[stu,F("doc","Record / Document"),F("remarks","Remarks")]},
 {id:"payments",t:"Payments",i:"💳",r:["cashier"],w:["cashier"],c:"payments",f:[stu,F("or","OR No."),F("amount","Amount","num"),F("method","Method",["Cash","GCash","Bank","Check"]),F("date","Date","date")]},
 {id:"cashouts",t:"Cash Out",i:"💸",r:["cashier"],w:["cashier"],c:"cashouts",f:[F("payee","Payee"),F("purpose","Purpose"),F("amount","Amount","num"),F("date","Date","date")]},
 {id:"cash",t:"Cash Reports",i:"📈",r:["cashier"],x:"cash"},
 {id:"payroll",t:"Payroll",i:"💰",r:["hr","cashier"],w:["hr"],c:"payroll",calc:d=>({net:(d.gross||0)-(d.deductions||0)}),f:[F("employee","Employee"),F("period","Period"),F("gross","Gross","num"),F("deductions","Deductions","num"),F("net","Net Pay (auto)","auto")]},
 {id:"employees",t:"Employees",i:"👥",r:["hr"],w:["hr"],c:"employees",f:[F("name","Name"),F("position","Position"),F("office","Office"),F("status","Status",["Active","On Leave","Resigned"]),F("hired","Date Hired","date")]},
 {id:"attendance",t:"Attendance",i:"⏱️",r:["hr"],w:["hr"],c:"attendance",f:[F("employee","Employee"),F("date","Date","date"),F("tin","Time In","time"),F("tout","Time Out","time"),F("remarks","Remarks")]},
 {id:"leaves",t:"Leave",i:"🏖️",r:["hr"],w:["hr"],c:"leaves",f:[F("employee","Employee"),F("type","Type",["Vacation","Sick","Emergency","Maternity/Paternity"]),F("from","From","date"),F("to","To","date"),F("status","Status",["Pending","Approved","Denied"])]},
 {id:"offerings",t:"Course Offering",i:"📖",r:["dean","chair"],w:["dean"],c:"offerings",sc:1,f:[F("code","Code"),F("title","Title"),F("units","Units","num"),term,dep]},
 {id:"schedules",t:"Class Schedule",i:"🗓️",r:["dean","chair"],w:["dean"],c:"schedules",sc:1,f:[F("code","Subject Code"),F("day","Day",["Mon","Tue","Wed","Thu","Fri","Sat"]),F("time","Time"),F("room","Room"),fac,dep]},
 {id:"handling",t:"Course Handling",i:"👩‍🏫",r:["dean","chair","faculty"],w:["dean"],c:"handling",sc:1,f:[fac,F("code","Subject Code"),F("title","Subject"),term,dep]},
 {id:"lessonplans",t:"Lesson Plans",i:"🧠",r:["faculty"],w:["faculty"],c:"lessonplans",sc:1,f:[F("code","Subject Code"),F("title","Topic"),F("week","Week","num"),F("objectives","Objectives")]},
 {id:"prospectus",t:"Prospectus",i:"📘",r:["faculty","dean","chair","registrar"],w:["dean","registrar"],c:"prospectus",f:[F("program","Program"),F("year","Year",["1","2","3","4"]),term,F("code","Code"),F("title","Title"),F("units","Units","num")]},
 {id:"deptact",t:"Dept. Activities",i:"🏛️",r:["chair"],w:["chair"],c:"deptActivities",sc:1,f:act},
 {id:"scholar",t:"Scholarships",i:"🏅",r:["scholarship"],w:["scholarship"],c:"scholarships",f:[stu,F("type","Scholarship"),F("discount","Discount %","num"),F("deductions","Deductions","num"),F("status","Status",["Active","Probation","Lapsed"])]},
 {id:"clubact",t:"Club Activities",i:"🎯",r:["adviser"],w:["adviser"],c:"clubActivities",sc:1,f:act},
 {id:"clubann",t:"Announcements",i:"📣",r:["adviser"],w:["adviser"],c:"clubAnnouncements",sc:1,f:[F("title","Title"),F("message","Message")]},
 {id:"clubmem",t:"Members",i:"🧑‍🤝‍🧑",r:["adviser"],w:["adviser"],c:"clubMembers",sc:1,f:[F("name","Name"),F("position","Position"),F("status","Status",["Active","Inactive"])]},
 {id:"clubexp",t:"Budget & Expenses",i:"🪙",r:["adviser"],w:["adviser"],c:"clubExpenses",sc:1,f:[F("item","Item"),F("type","Type",["Budget","Expense"]),F("amount","Amount","num"),F("date","Date","date")]},
 {id:"users",t:"Users & Access",i:"🔐",r:[],x:"users"}
];

let me, mods, cur;
const isSuper = () => me.role === "superadmin";
const can = m => isSuper() || (m.w || []).includes(me.role);
const tbl = (h, rows) => `<div class="tw"><table><thead><tr>${h.map(x=>`<th>${e(x)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
const val = (r, f) => f.t === "stu" ? r.studentName : f.t === "fac" ? r.facultyName : r[f.k];
const money = n => "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const stat = (l, v) => `<div class="card stat"><b>${e(v)}</b><span>${e(l)}</span></div>`;

async function list(m) {
  const k = [], r = me.role;
  if (m.sc) {
    if (r === "chair") k.push(where("dept", "==", me.department || "-"));
    if (r === "faculty") k.push(where("facultyUid", "==", me.id));
    if (r === "adviser") k.push(where("clubId", "==", me.clubId || "-"));
    if (r === "student") k.push(where("studentUid", "==", me.id));
  }
  const s = await getDocs(query(collection(db, m.c), ...k));
  return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}
const all = async c => (await getDocs(collection(db, c))).docs.map(d => d.data());
const sum = (a, k) => a.reduce((t, x) => t + (+x[k] || 0), 0);

// ---- Views
async function grid(m) {
  const rows = await list(m), w = can(m);
  $("view").innerHTML = `<div class="bar"><input id="q" placeholder="Search…">${w ? '<button class="pri" id="add">＋ Add</button>' : ""}</div>` +
    tbl(m.f.map(f => f.l), "") ;
  const draw = q => {
    $("view").querySelector("tbody").innerHTML = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q)).map(r =>
      `<tr data-id="${r.id}">${m.f.map(f => `<td data-l="${e(f.l)}">${e(val(r, f))}</td>`).join("")}</tr>`).join("") ||
      `<tr><td class="mu">No records yet.</td></tr>`;
  };
  draw(""); $("q").oninput = ev => draw(ev.target.value.toLowerCase());
  if (w) {
    $("add").onclick = () => form(m);
    $("view").querySelector("tbody").onclick = ev => { const tr = ev.target.closest("tr[data-id]"); if (tr) form(m, rows.find(r => r.id === tr.dataset.id)); };
  }
}

async function form(m, row) {
  const pick = {};
  for (const f of m.f) if (f.t === "stu" || f.t === "fac") {
    const s = await getDocs(query(collection(db, "users"), where("role", "==", f.t === "stu" ? "student" : "faculty")));
    pick[f.k] = s.docs.map(d => `<option value="${d.id}" ${row && row[f.k + "Uid"] === d.id ? "selected" : ""}>${e(d.data().name || d.data().email)}</option>`).join("");
  }
  const inp = f => {
    if (f.t === "auto") return "";
    const v = row ? e(row[f.k]) : "";
    const ctl = f.t === "stu" || f.t === "fac" ? `<select name="${f.k}">${pick[f.k]}</select>`
      : Array.isArray(f.t) ? `<select name="${f.k}">${f.t.map(o => `<option ${row && row[f.k] === o ? "selected" : ""}>${e(o)}</option>`).join("")}</select>`
      : `<input name="${f.k}" type="${f.t === "num" ? "number" : f.t}" step="any" value="${v}" required>`;
    return `<div><label>${e(f.l)}</label>${ctl}</div>`;
  };
  const md = $("modal"); md.hidden = false;
  md.innerHTML = `<form class="card"><h3>${row ? "Edit" : "Add"} ${e(m.t)}</h3>${m.f.map(inp).join("")}
   <div class="row"><button type="button" id="cx">Cancel</button>${row ? '<button type="button" id="del" class="danger">Delete</button>' : ""}<button class="pri">Save</button></div></form>`;
  $("cx").onclick = () => md.hidden = true;
  if (row) $("del").onclick = async () => { if (confirm("Delete this record?")) { await deleteDoc(doc(db, m.c, row.id)); md.hidden = true; show(cur); } };
  md.firstChild.onsubmit = async ev => {
    ev.preventDefault();
    const d = {};
    for (const f of m.f) {
      if (f.t === "auto") continue;
      const el = ev.target.elements[f.k];
      if (f.t === "stu" || f.t === "fac") { d[f.k + "Uid"] = el.value; d[f.k + "Name"] = el.selectedOptions[0]?.text || ""; }
      else d[f.k] = f.t === "num" ? +el.value : el.value;
    }
    if (me.role === "chair") d.dept = me.department;
    if (me.role === "faculty") { d.facultyUid = me.id; d.facultyName = me.name; if (me.department) d.dept = me.department; }
    if (me.role === "adviser") d.clubId = me.clubId;
    if (m.calc) Object.assign(d, m.calc(d));
    try {
      if (row) await setDoc(doc(db, m.c, row.id), d, { merge: true });
      else await addDoc(collection(db, m.c), { ...d, createdAt: serverTimestamp(), by: me.id });
      md.hidden = true; show(cur);
    } catch (x) { alert("Not allowed or failed: " + x.message); }
  };
}

async function dash() {
  const C = ["admissions","enrollments","employees","offerings","grades","scholarships","clubActivities"];
  const [a, en, em, of, gr, sch, ca, bl, pay, co, pr] = await Promise.all([...C.map(all), all("billing"), all("payments"), all("cashouts"), all("payroll")]);
  $("view").innerHTML = `<div class="stats">${stat("Applicants", a.length)}${stat("Enrollment records", en.length)}${stat("Employees", em.length)}${stat("Courses offered", of.length)}${stat("Grades submitted", gr.length)}${stat("Scholars", sch.length)}${stat("Club activities", ca.length)}${stat("Total billed", money(sum(bl, "amount")))}${stat("Collected", money(sum(pay, "amount")))}${stat("Cash-outs", money(sum(co, "amount")))}${stat("Payroll (net)", money(sum(pr, "net")))}</div>`;
}
async function cash() {
  const [bl, pay, co] = await Promise.all([all("billing"), all("payments"), all("cashouts")]);
  const p = sum(pay, "amount"), o = sum(co, "amount");
  $("view").innerHTML = `<div class="stats">${stat("Total billed", money(sum(bl, "amount")))}${stat("Collections", money(p))}${stat("Cash-outs", money(o))}${stat("Net cash", money(p - o))}${stat("Receivable", money(sum(bl, "amount") - p))}</div>`;
}
async function curr() {
  const [p, en, gr] = await Promise.all([getDocs(query(collection(db, "prospectus"), where("program", "==", me.program || "-"))), list({ c: "enrollments", sc: 1 }), list({ c: "grades", sc: 1 })]);
  const g = {}; gr.forEach(x => g[x.code] = x);
  const enr = new Set(en.filter(x => x.status === "Enrolled").map(x => x.code));
  const rows = p.docs.map(d => d.data()).sort((a, b) => (a.year + a.term).localeCompare(b.year + b.term)).map(s => ({ ...s,
    st: g[s.code] ? (g[s.code].grade > 0 && g[s.code].grade <= 3 ? "Passed" : "Failed") : enr.has(s.code) ? "Enrolled" : "Remaining", gr: g[s.code]?.grade ?? "" }));
  const n = s => rows.filter(r => r.st === s).length;
  $("view").innerHTML = `<div class="stats">${stat("Passed", n("Passed"))}${stat("Enrolled", n("Enrolled"))}${stat("Remaining", n("Remaining"))}${stat("Failed", n("Failed"))}</div>` +
    tbl(["Year","Term","Code","Title","Units","Grade","Status"], rows.map(r => `<tr>${[r.year,r.term,r.code,r.title,r.units,r.gr,r.st].map((x,i)=>`<td data-l="${["Year","Term","Code","Title","Units","Grade","Status"][i]}">${e(x)}</td>`).join("")}</tr>`).join("") || `<tr><td class="mu">No prospectus found for your program.</td></tr>`);
}
async function users() {
  const us = (await getDocs(collection(db, "users"))).docs.map(d => ({ id: d.id, ...d.data() }));
  const sel = (id, k, opts, v) => `<select data-id="${id}" data-k="${k}">${opts.map(o => `<option ${o === (v || "") ? "selected" : ""}>${e(o)}</option>`).join("")}</select>`;
  $("view").innerHTML = tbl(["Name","Email","Role","Status","Department","Program","Club ID"], us.map(u => `<tr><td data-l="Name">${e(u.name)}</td><td data-l="Email">${e(u.email)}</td>
   <td data-l="Role">${sel(u.id,"role",ROLES,u.role)}</td><td data-l="Status">${sel(u.id,"status",["active","disabled"],u.status)}</td>
   <td data-l="Department">${sel(u.id,"department",["", ...D],u.department)}</td>
   <td data-l="Program"><input data-id="${u.id}" data-k="program" value="${e(u.program)}"></td><td data-l="Club ID"><input data-id="${u.id}" data-k="clubId" value="${e(u.clubId)}"></td></tr>`).join(""));
  $("view").onchange = async ev => { const t = ev.target; if (t.dataset.id) { await setDoc(doc(db, "users", t.dataset.id), { [t.dataset.k]: t.value }, { merge: true }); } };
}

const X = { dash, curr, cash, users };
async function show(id) {
  const m = mods.find(x => x.id === id) || mods[0]; cur = m?.id;
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.id === cur));
  if (!m) { $("title").textContent = "Awaiting access"; $("view").innerHTML = `<div class="card stat"><b>Account pending</b><span>A Super Admin must assign your role before you can use ONE-AKIC.</span></div>`; return; }
  $("title").textContent = m.t; $("view").onchange = null; $("view").innerHTML = '<p class="mu">Loading…</p>';
  try { await (m.x ? X[m.x]() : grid(m)); } catch (x) { $("view").innerHTML = `<p class="danger">Error: ${e(x.message)}</p>`; }
}

// ---- Auth & boot
const go = (fn) => { $("msg").textContent = "Please wait…"; fn(auth, $("email").value.trim(), $("password").value).then(() => $("msg").textContent = "").catch(x => { $("msg").textContent = x.code + " – " + x.message; alert(x.message); }); };
$("login").onclick = () => go(si);
$("signup").onclick = () => { if (!$("name").value) return $("msg").textContent = "Enter your full name."; go(cu); };
$("logout").onclick = () => signOut(auth);
const setTheme = t => { document.documentElement.dataset.theme = t; localStorage.th = t; };
setTheme(localStorage.th || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"));
$("theme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
$("modal").onclick = ev => { if (ev.target.id === "modal") $("modal").hidden = true; };
window.onhashchange = () => me && show(location.hash.slice(1));

onAuthStateChanged(auth, async u => { try {
  $("auth").hidden = !!u; $("app").hidden = !u;
  if (!u) { me = null; return; }
  const ref = doc(db, "users", u.uid);
  let s = await getDoc(ref);
  if (!s.exists()) { await setDoc(ref, { name: $("name").value || u.email, email: u.email, role: "pending", status: "active", createdAt: serverTimestamp() }); s = await getDoc(ref); }
  me = { id: u.uid, ...s.data() };
  if (me.status === "disabled") { alert("Your account is disabled."); return signOut(auth); }
  if (me.role === "pending") { alert("Registration received. Please wait for the Super Admin to approve your account, then log in again."); return signOut(auth); }
  mods = M.filter(m => isSuper() || m.r.includes(me.role));
  $("who").textContent = `${me.name} · ${me.role}`;
  $("nav").innerHTML = `<h1>ONE-<b>AKIC</b></h1>` + mods.map(m => `<a href="#${m.id}" data-id="${m.id}"><span>${m.i}</span>${e(m.t)}</a>`).join("");
  show(location.hash.slice(1));
} catch (x) { alert("Startup error: " + x.message); console.error(x); } });
