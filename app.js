const API_URL = "YAHAN_APNA_GOOGLE_APPS_SCRIPT_URL_PASTE_KAREIN";
const DEFAULT_USER = "admin";
const DEFAULT_PASS = "haco@2026";

let DB = { users: [], gifts: [], themes: [], banners: [], store: [], engagement: [], plans: [], settings: [] };

// Auto-check login session
if (localStorage.getItem("haco_admin_auth") === "true") {
  document.getElementById("loginOverlay").style.display = "none";
}

function checkLogin() {
  const u = document.getElementById("adminUser").value.trim();
  const p = document.getElementById("adminPass").value.trim();
  const sheetPassRow = DB.settings ? DB.settings.find(s => s.Key === "AdminPass") : null;
  const activePass = sheetPassRow ? String(sheetPassRow.Value) : DEFAULT_PASS;

  if (u === DEFAULT_USER && p === activePass) {
    localStorage.setItem("haco_admin_auth", "true");
    document.getElementById("loginOverlay").style.display = "none";
  } else {
    document.getElementById("loginErr").style.display = "block";
  }
}

function logoutAdmin() {
  localStorage.removeItem("haco_admin_auth");
  location.reload();
}

function showTab(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}

async function syncDB() {
  try {
    const res = await fetch(API_URL);
    DB = await res.json();
    updateStats();
    renderAll();
  } catch (e) { console.log("API Sync Error:", e); }
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
  const t = document.getElementById('filterType').value;
  const s = document.getElementById('sortCoins').value;

  if (q) list = list.filter(u => String(u.Name).toLowerCase().includes(q) || String(u.UserID).includes(q));
  if (g) list = list.filter(u => u.Gender === g);
  if (t) list = list.filter(u => u.UserType === t);
  if (s === 'asc') list.sort((a,b) => Number(a.Coins) - Number(b.Coins));
  if (s === 'desc') list.sort((a,b) => Number(b.Coins) - Number(a.Coins));

  document.getElementById('userTableBody').innerHTML = list.map(u => `
    <tr>
      <td><img src="${u.Avatar || 'https://placeholder.com'}" class="thumb"></td>
      <td><b>${u.Name}</b><br><small style="color:#64748b">${u.UserType}</small></td>
      <td>${u.UserID}</td>
      <td>${u.Gender}</td>
      <td>🪙 ${u.Coins}</td>
      <td>Lv.${u.Level}</td>
      <td><span class="badge ${u.Status==='Active'?'badge-active':'badge-banned'}">${u.Status}</span></td>
      <td>
        <button class="btn btn-primary" onclick="editUser('${u.UserID}')">Edit</button>
        <button class="btn btn-danger" onclick="delRow('Users','${u.UserID}')">Del</button>
      </td>
    </tr>
  `).join('');
}

function editUser(id) {
  const u = DB.users.find(x => String(x.UserID) === String(id));
  const newCoins = prompt("New Coin Balance:", u.Coins);
  const newStatus = prompt("Status (Active / Banned):", u.Status);
  const newLevel = prompt("VIP Level:", u.Level);
  if (newCoins !== null) {
    apiPost({ action: "update", sheet: "Users", id: id, row: [u.UserID, u.Name, u.Avatar, u.Gender, u.UserType, newCoins, u.Diamonds, newLevel || u.Level, newStatus || u.Status] });
  }
}

function addNewUserPrompt() {
  const id = Math.floor(1000000 + Math.random() * 9000000);
  const name = prompt("User Name:");
  const gender = prompt("Gender (Male / Female):", "Female");
  const type = prompt("Type (Real / Fake):", "Fake");
  const coins = prompt("Starting Coins:", "5000");
  if (name) apiPost({ action: "add", sheet: "Users", row: [id, name, "https://placeholder.com", gender, type, coins, 0, 1, "Active"] });
}

function saveGift() {
  apiPost({ action: "add", sheet: "Gifts", row: [Date.now(), document.getElementById('gCat').value, document.getElementById('gName').value, document.getElementById('gPrice').value, document.getElementById('gIcon').value, document.getElementById('gSvga').value] });
}
function editGift(id) {
  const g = DB.gifts.find(x => String(x.GiftID) === String(id));
  const p = prompt("New Coin Value:", g.CoinValue);
  const ic = prompt("New Icon URL:", g.IconURL);
  if (p !== null) apiPost({ action: "update", sheet: "Gifts", id: id, row: [g.GiftID, g.Category, g.Name, p, ic, g.SvgaURL] });
}

function saveTheme() {
  apiPost({ action: "add", sheet: "Themes", row: [Date.now(), document.getElementById('tName').value, document.getElementById('tImg').value, document.getElementById('tPrice').value] });
}
function saveBanner() {
  apiPost({ action: "add", sheet: "Banners", row: [Date.now(), document.getElementById('bTitle').value, document.getElementById('bImg').value, document.getElementById('bLink').value, "Active"] });
}
function saveStore() {
  apiPost({ action: "add", sheet: "Store", row: [Date.now(), document.getElementById('sType').value, document.getElementById('sName').value, document.getElementById('sImg').value, document.getElementById('sSvga').value, document.getElementById('sPrice').value] });
}
function saveEngagement() {
  apiPost({ action: "add", sheet: "Engagement", row: [Date.now(), document.getElementById('eType').value, document.getElementById('eContent').value] });
}
function savePlan() {
  apiPost({ action: "add", sheet: "Plans", row: [Date.now(), document.getElementById('pCoins').value, document.getElementById('pPrice').value, document.getElementById('pBonus').value] });
}
function saveSetting() {
  apiPost({ action: "add", sheet: "Settings", row: [document.getElementById('setKey').value, document.getElementById('setVal').value] });
}

function delRow(sheet, id) {
  if (confirm("Delete this item permanently?")) apiPost({ action: "delete", sheet: sheet, id: id });
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
