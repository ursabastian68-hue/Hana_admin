const API_URL = "YAHAN_APNA_GOOGLE_APPS_SCRIPT_URL_PASTE_KAREIN";

const DEFAULT_USER = "hana_master";
const DEFAULT_PASS = "HanaAdmin@9988";

let DB = { users: [], gifts: [], themes: [], banners: [], store: [], engagement: [], plans: [], settings: [] };
let currentUserFilter = "all";
let currentGenericCat = "";

function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  const tb = document.getElementById("topbar");
  const mn = document.getElementById("main");
  if (window.innerWidth <= 768) {
    sb.classList.toggle("open");
  } else {
    sb.classList.toggle("closed");
    tb.classList.toggle("full");
    mn.classList.toggle("full");
  }
}

function openSection(secId, subFilter, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
  if (el) {
    el.classList.add('active');
    document.getElementById('pageTitle').innerText = el.innerText;
  }
  if (window.innerWidth <= 768) document.getElementById("sidebar").classList.remove("open");

  if (secId === 'users') {
    currentUserFilter = subFilter || 'all';
    renderUsers();
  } else if (secId === 'store' && subFilter) {
    document.getElementById('sType').value = subFilter;
  } else if (secId === 'engagement' && subFilter) {
    document.getElementById('eType').value = subFilter;
  } else if (secId === 'generic') {
    currentGenericCat = subFilter;
    document.getElementById('genHeading').innerText = subFilter + " Management";
    renderGeneric();
  }
}

if (localStorage.getItem("hana_master_session") === "true") {
  document.getElementById("loginOverlay").style.display = "none";
}

function checkLogin() {
  const u = document.getElementById("adminUser").value.trim();
  const p = document.getElementById("adminPass").value.trim();
  const dbUser = DB.settings ? DB.settings.find(s => s.Key === "AdminUser") : null;
  const dbPass = DB.settings ? DB.settings.find(s => s.Key === "AdminPass") : null;

  const validUser = dbUser ? String(dbUser.Value) : DEFAULT_USER;
  const validPass = dbPass ? String(dbPass.Value) : DEFAULT_PASS;

  if (u === validUser && p === validPass) {
    localStorage.setItem("hana_master_session", "true");
    document.getElementById("loginOverlay").style.display = "none";
  } else {
    document.getElementById("loginErr").style.display = "block";
  }
}

function logoutAdmin() {
  localStorage.removeItem("hana_master_session");
  location.reload();
}

async function syncDB() {
  try {
    const res = await fetch(API_URL);
    DB = await res.json();
    updateStats();
    renderAll();
  } catch (e) { console.log("Syncing..."); }
}

async function apiPost(payload) {
  await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
  syncDB();
}

function updateStats() {
  document.getElementById('statTotal').innerText = DB.users.length;
  document.getElementById('statMale').innerText = DB.users.filter(u => u.Gender === 'Male').length;
  document.getElementById('statFemale').innerText = DB.users.filter(u => u.Gender === 'Female').length;
  document.getElementById('statActive').innerText = DB.users.filter(u => u.Status === 'Active').length;
}
function renderUsers() {
  let list = [...DB.users];
  const q = document.getElementById('userSearch').value.toLowerCase();
  const g = document.getElementById('filterGender').value;
  const st = document.getElementById('filterStatus').value;
  const s = document.getElementById('sortCoins').value;

  if (currentUserFilter === 'Real' || currentUserFilter === 'Fake') list = list.filter(u => u.UserType === currentUserFilter);
  if (currentUserFilter === 'Banned') list = list.filter(u => u.Status === 'Banned');
  if (currentUserFilter === 'Blacklist') list = list.filter(u => u.Status === 'Blacklist');

  if (q) list = list.filter(u => String(u.Name).toLowerCase().includes(q) || String(u.UserID).includes(q));
  if (g) list = list.filter(u => u.Gender === g);
  if (st) list = list.filter(u => u.Status === st);
  if (s === 'asc') list.sort((a,b) => Number(a.Coins) - Number(b.Coins));
  if (s === 'desc') list.sort((a,b) => Number(b.Coins) - Number(a.Coins));

  document.getElementById('userTableBody').innerHTML = list.map(u => {
    let badgeClass = u.Status === 'Active' ? 'badge-active' : (u.Status === 'Banned' ? 'badge-banned' : 'badge-black');
    return `
    <tr>
      <td><img src="${u.Avatar || 'https://placeholder.com'}" class="thumb"></td>
      <td><b>${u.Name}</b><br><small style="color:#64748b">${u.UserType}</small></td>
      <td>${u.UserID}</td>
      <td>${u.Gender}</td>
      <td>🪙 ${u.Coins}</td>
      <td>Lv.${u.Level}</td>
      <td><span class="badge ${badgeClass}">${u.Status}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-primary" onclick="viewUserInfo('${u.UserID}')">Info</button>
        <button class="btn btn-warn" onclick="editUser('${u.UserID}')">Edit/Ban</button>
        <button class="btn btn-danger" onclick="delRow('Users','${u.UserID}')">Del</button>
      </td>
    </tr>`;
  }).join('');
}

function viewUserInfo(id) {
  const u = DB.users.find(x => String(x.UserID) === String(id));
  alert(`=== HANA USER FULL INFO ===\nName: ${u.Name}\nUnique ID: ${u.UserID}\nType: ${u.UserType}\nGender: ${u.Gender}\nCoins: ${u.Coins}\nDiamonds: ${u.Diamonds || 0}\nVIP Level: ${u.Level}\nAccount Status: ${u.Status}`);
}

function editUser(id) {
  const u = DB.users.find(x => String(x.UserID) === String(id));
  const newCoins = prompt("Update Coins:", u.Coins);
  const newStatus = prompt("Account Status (Active / Banned / Blacklist):", u.Status);
  const newLevel = prompt("VIP Level:", u.Level);
  if (newCoins !== null) {
    apiPost({ action: "update", sheet: "Users", id: id, row: [u.UserID, u.Name, u.Avatar, u.Gender, u.UserType, newCoins, u.Diamonds || 0, newLevel || u.Level, newStatus || u.Status] });
  }
}

function addNewUserPrompt() {
  const id = Math.floor(1000000 + Math.random() * 9000000);
  const name = prompt("User Name:");
  const gender = prompt("Gender (Male / Female):", "Female");
  const type = prompt("User Type (Real / Fake):", "Real");
  const coins = prompt("Coins:", "1000");
  if (name) apiPost({ action: "add", sheet: "Users", row: [id, name, "https://placeholder.com", gender, type, coins, 0, 1, "Active"] });
}

function saveGift() {
  apiPost({ action: "add", sheet: "Gifts", row: [Date.now(), document.getElementById('gCat').value, document.getElementById('gName').value, document.getElementById('gPrice').value, document.getElementById('gIcon').value, document.getElementById('gSvga').value] });
}
function editGift(id) {
  const g = DB.gifts.find(x => String(x.GiftID) === String(id));
  const p = prompt("New Coin Value:", g.CoinValue);
  if (p !== null) apiPost({ action: "update", sheet: "Gifts", id: id, row: [g.GiftID, g.Category, g.Name, p, g.IconURL, g.SvgaURL] });
}
function saveTheme() { apiPost({ action: "add", sheet: "Themes", row: [Date.now(), document.getElementById('tName').value, document.getElementById('tImg').value, document.getElementById('tPrice').value] }); }
function saveBanner() { apiPost({ action: "add", sheet: "Banners", row: [Date.now(), document.getElementById('bTitle').value, document.getElementById('bImg').value, document.getElementById('bLink').value, "Active"] }); }
function saveStore() { apiPost({ action: "add", sheet: "Store", row: [Date.now(), document.getElementById('sType').value, document.getElementById('sName').value, document.getElementById('sImg').value, document.getElementById('sSvga').value, document.getElementById('sPrice').value] }); }
function saveEngagement() { apiPost({ action: "add", sheet: "Engagement", row: [Date.now(), document.getElementById('eType').value, document.getElementById('eContent').value] }); }
function savePlan() { apiPost({ action: "add", sheet: "Plans", row: [Date.now(), document.getElementById('pCoins').value, document.getElementById('pPrice').value, document.getElementById('pBonus').value] }); }
function saveGeneric() { apiPost({ action: "add", sheet: "Engagement", row: [Date.now(), currentGenericCat, document.getElementById('genTitle').value + " | " + document.getElementById('genValue').value] }); }
function saveSetting() { apiPost({ action: "add", sheet: "Settings", row: [document.getElementById('setKey').value, document.getElementById('setVal').value] }); }
function delRow(sheet, id) { if (confirm("Delete permanently?")) apiPost({ action: "delete", sheet: sheet, id: id }); }

function renderGeneric() {
  const items = DB.engagement.filter(e => e.Type === currentGenericCat);
  document.getElementById('genTableBody').innerHTML = items.map(e => {
    const parts = String(e.Content).split(" | ");
    return `<tr><td>${e.ID}</td><td>${e.Type}</td><td>${parts[0] || ''}</td><td>${parts[1] || ''}</td><td><button class="btn btn-danger" onclick="delRow('Engagement','${e.ID}')">Del</button></td></tr>`;
  }).join('');
}

function renderAll() {
  renderUsers();
  document.getElementById('giftTableBody').innerHTML = DB.gifts.map(g => `<tr><td><img src="${g.IconURL}" class="thumb"></td><td>${g.Category}</td><td>${g.Name}</td><td>🪙 ${g.CoinValue}</td><td><button class="btn btn-primary" onclick="editGift('${g.GiftID}')">Edit</button> <button class="btn btn-danger" onclick="delRow('Gifts','${g.GiftID}')">Del</button></td></tr>`).join('');
  document.getElementById('themeTableBody').innerHTML = DB.themes.map(t => `<tr><td><img src="${t.WallpaperURL}" class="thumb"></td><td>${t.Name}</td><td>🪙 ${t.CoinPrice}</td><td><button class="btn btn-danger" onclick="delRow('Themes','${t.ThemeID}')">Del</button></td></tr>`).join('');
  document.getElementById('bannerTableBody').innerHTML = DB.banners.map(b => `<tr><td><img src="${b.ImageURL}" class="thumb" style="width:80px;"></td><td>${b.Title}</td><td>${b.ActionLink}</td><td><button class="btn btn-danger" onclick="delRow('Banners','${b.BannerID}')">Del</button></td></tr>`).join('');
  document.getElementById('storeTableBody').innerHTML = DB.store.map(s => `<tr><td><img src="${s.ImageURL}" class="thumb"></td><td>${s.Type}</td><td>${s.Name}</td><td>🪙 ${s.CoinPrice}</td><td><button class="btn btn-danger" onclick="delRow('Store','${s.ItemID}')">Del</button></td></tr>`).join('');
  document.getElementById('engTableBody').innerHTML = DB.engagement.map(e => `<tr><td>${e.Type}</td><td>${e.Content}</td><td><button class="btn btn-danger" onclick="delRow('Engagement','${e.ID}')">Del</button></td></tr>`).join('');
  document.getElementById('planTableBody').innerHTML = DB.plans.map(p => `<tr><td>🪙 ${p.Coins}</td><td>₹${p.PriceINR}</td><td>+${p.BonusCoins}</td><td><button class="btn btn-danger" onclick="delRow('Plans','${p.PlanID}')">Del</button></td></tr>`).join('');
  document.getElementById('setTableBody').innerHTML = DB.settings.map(s => `<tr><td>${s.Key}</td><td>${s.Value}</td><td><button class="btn btn-danger" onclick="delRow('Settings','${s.Key}')">Del</button></td></tr>`).join('');
}

syncDB();
