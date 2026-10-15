const initialListings = [
  {id: 1, name: "Fresh vegetable meal boxes", category: "Prepared meals", routing: "Human", qty: 12, servings: 30, location: "Madhapur, Hyderabad", donor: "Green Leaf Kitchen", hours: 2.0, created: Date.now() - 18 * 60000, emoji: "🍱", pickup: "18:30", notes: "Packed meal boxes. Keep cool."},
  {id: 2, name: "Assorted bakery items", category: "Bakery", routing: "Human", qty: 6, servings: 24, location: "Kondapur, Hyderabad", donor: "Daily Rise Bakery", hours: 3.5, created: Date.now() - 40 * 60000, emoji: "🥐", pickup: "19:00", notes: "Bread and pastries."},
  {id: 3, name: "Vegetable & Peel Scraps", category: "Farm Scraps", routing: "Animal", qty: 22, servings: 40, location: "Gachibowli, Hyderabad", donor: "Sunshine Grocers", hours: 8.0, created: Date.now() - 25 * 60000, emoji: "🐄", pickup: "20:00", notes: "Sorted organic vegetable trimmings for cattle/pig feed."},
  {id: 4, name: "Community dinner surplus", category: "Prepared meals", routing: "Human", qty: 18, servings: 45, location: "Kukatpally, Hyderabad", donor: "Annapurna Community Hall", hours: 2.5, created: Date.now() - 30 * 60000, emoji: "🍛", pickup: "18:45", notes: "Vegetarian meals; collect in reusable crates."},
  {id: 5, name: "Day-old bruised produce", category: "Farm Scraps", routing: "Animal", qty: 15, servings: 30, location: "Begumpet, Hyderabad", donor: "Farm Basket Store", hours: 12.0, created: Date.now() - 20 * 60000, emoji: "🥬", pickup: "20:30", notes: "Not fit for human sale, ideal for local animal sanctuaries."}
];

const KEY = "foodbridge_listings_v2";
const CLAIMS = "foodbridge_claims_v2";

let listings;
try { listings = JSON.parse(localStorage.getItem(KEY)) || initialListings; } catch (e) { listings = initialListings; }
let claims;
try { claims = JSON.parse(localStorage.getItem(CLAIMS)) || {}; } catch (e) { claims = {}; }

let currentFilter = "all";
let barChartInstance, pieChartInstance, lineChartInstance;

const $ = id => document.getElementById(id);
if ($("year")) $("year").textContent = new Date().getFullYear();

// Multi-Page Navigation
function switchPage(pageId) {
  document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(a => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });
  const target = $("page-" + pageId);
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (pageId === "dashboard") updateCharts();
  if (pageId === "db") renderDatabaseTable();
}
window.switchPage = switchPage;

document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    switchPage(link.dataset.page);
  });
});

// Filter Tabs
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(listings));
    localStorage.setItem(CLAIMS, JSON.stringify(claims));
  } catch (e) {}
}

function remaining(item) {
  return Math.max(0, item.hours * 3600000 - (Date.now() - item.created));
}

function timeText(ms) {
  if (ms <= 0) return "Window ended";
  let m = Math.floor(ms / 60000), h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m left` : `${m}m left`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function googleMapsSearchUrl(loc) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(String(loc || ""));
}

function googleMapsDirectionsUrl(loc) {
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(String(loc || "")) + "&travelmode=driving";
}

function updateDonationMap() {
  if (!$("location") \vert{}\vert{} !$("donationMap")) return;
  const loc = $("location").value.trim() || "Hyderabad, India";
  $("donationMap").src = "https://maps.google.com/maps?q=" + encodeURIComponent(loc) + "&t=&z=14&ie=UTF8&iwloc=&output=embed";
  if ($("openLocationMap")) $("openLocationMap").href = googleMapsSearchUrl(loc);
}

// Render Listings
function render() {
  if (!$("foodGrid")) return;
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const visible = listings.filter(x => {
    const matchesSearch = `${x.name} ${x.location} ${x.donor} ${x.category}`.toLowerCase().includes(q);
    const matchesRouting = currentFilter === "all" || (x.routing || "Human") === currentFilter;
    return matchesSearch && matchesRouting;
  });

  $("foodGrid").innerHTML = visible.length ? visible.map(x => {
    const left = remaining(x), claimed = !!claims[x.id], expired = left <= 0;
    const isAnimal = x.routing === "Animal";
    return `
      <article class="food-card">
        <div class="food-photo">
          <span>${escapeHtml(x.emoji || "🥗")}</span>
          <span class="badge ${isAnimal ? 'animal' : ''}">${isAnimal ? "🐄 Animal Feed" : "🥗 Human Food"}</span>
          <span class="time-badge" style="${expired ? 'background:#fde8e5;color:#a63b30' : ''}">${expired ? "Expired" : `⏱ ${timeText(left)}`}</span>
        </div>
        <div class="card-body">
          <div class="card-title">
            <div>
              <h3>${escapeHtml(x.name)}</h3>
              <p>by ${escapeHtml(x.donor)}</p>
            </div>
            <span class="servings">${escapeHtml(x.qty)} kg</span>
          </div>
          <div class="card-meta">
            <span>📍 ${escapeHtml(x.location)}</span>
            <span>🍽 ${escapeHtml(x.servings)} servings</span>
            <span>🕒 Pickup ${escapeHtml(x.pickup || "Flexible")}</span>
          </div>
          <div class="map-actions" style="margin:-5px 0 14px">
            <a class="btn btn-outline btn-sm" href="${googleMapsDirectionsUrl(x.location)}" target="_blank" rel="noopener noreferrer">📍 Directions</a>
            <a class="btn btn-outline btn-sm" href="${googleMapsSearchUrl(x.location)}" target="_blank" rel="noopener noreferrer">Map ↗</a>
          </div>
          ${x.notes ? `<p style="font-size:.78rem;color:var(--muted);margin:0 0 14px;line-height:1.5">ℹ️ ${escapeHtml(x.notes)}</p>` : ""}
          <div class="card-bottom">
            <span class="freshness">${expired ? "Window ended" : `Freshness: <b>${timeText(left)}</b>`}</span>
            <button class="btn btn-sm ${claimed ? 'claimed' : 'btn-primary'}" ${expired && !claimed ? 'disabled' : ''} onclick="claim(${x.id})">
              ${claimed ? "📲 View Pickup QR" : expired ? "Unavailable" : "Claim & Get QR →"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("") : `<div class="empty"><strong>No matching listings found</strong><p>Try switching the filter or share a new donation.</p></div>`;

  updateStats();
  renderDatabaseTable();
}

function renderDatabaseTable() {
  const tbody = $("dbTableBody");
  if (!tbody) return;
  tbody.innerHTML = listings.map(item => {
    const isClaimed = !!claims[item.id];
    const isExpired = remaining(item) <= 0;
    const statusText = isClaimed
      ? `<span style="color:var(--green);font-weight:800">✓ Claimed (#FB-${String(item.id).slice(-5)})</span>`
      : isExpired
      ? `<span style="color:var(--red)">Expired</span>`
      : `<span style="color:#99601b;font-weight:700">🟢 Available (${timeText(remaining(item))})</span>`;

    return `
      <tr>
        <td><code>#${String(item.id).slice(-5)}</code></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.routing === "Animal" ? "🐄 Animal Feed" : "🥗 Human Food"}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.qty)} kg</td>
        <td>${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.donor)}</td>
        <td>${statusText}</td>
      </tr>
    `;
  }).join("");
}

function exportDbJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(listings, null, 2));
  const a = document.createElement("a");
  a.href = dataStr;
  a.download = "foodbridge_db_export.json";
  a.click();
  toast("Database exported as JSON!");
}
window.exportDbJson = exportDbJson;

function updateStats() {
  const claimedItems = listings.filter(x => claims[x.id]);
  const humanKg = claimedItems.filter(x => x.routing !== "Animal").reduce((s, x) => s + Number(x.qty || 0), 0);
  const animalKg = claimedItems.filter(x => x.routing === "Animal").reduce((s, x) => s + Number(x.qty || 0), 0);

  const totalHumanKg = 486 + Math.round(humanKg);
  const totalScrapsKg = 350 + Math.round(animalKg);
  const totalMeals = 1250 + Math.round(humanKg * 2.5);
  const totalCo2 = 450 + Math.round((humanKg + animalKg) * 1.9);
  const totalPickups = 96 + claimedItems.length;

  if ($("statMeals")) $("statMeals").textContent = totalMeals.toLocaleString("en-IN");
  if ($("statCo2")) $("statCo2").textContent = `${totalCo2} kg`;
  if ($("statScraps")) $("statScraps").textContent = `${totalScrapsKg} kg`;
  if ($("statPickups")) $("statPickups").textContent = totalPickups;

  if ($("impactMeals")) $("impactMeals").textContent = totalMeals.toLocaleString("en-IN");
  if ($("impactCo2")) $("impactCo2").textContent = `${totalCo2} kg`;
  if ($("impactScraps")) $("impactScraps").textContent = `${totalScrapsKg} kg`;
  if ($("impactKg")) $("impactKg").textContent = `${totalHumanKg} kg`;
}

function claim(id) {
  const item = listings.find(x => x.id === id);
  if (!item) return;
  if (!claims[id] && remaining(item) <= 0) return toast("This pickup window has ended.");

  claims[id] = true;
  persist();
  render();

  const qrPayload = `FOODBRIDGE-VERIFY|ID:${item.id}|FOOD:${item.name}|DONOR:${item.donor}|KG:${item.qty}`;
  if ($("qrImage")) $("qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;
  if ($("qrDetails")) $("qrDetails").textContent = `${item.name} (${item.qty} kg) — ${item.donor}`;
  if ($("qrCodeId")) $("qrCodeId").textContent = `Verification Token: #FB-${String(item.id).slice(-5)}`;
  $("qrModal")?.classList.add("open");
  toast("Listing claimed! Show the QR code at pickup.");
}
window.claim = claim;

function initCharts() {
  if (!window.Chart || !$("barChart") || !$("pieChart") \vert{}\vert{} !$("lineChart")) return;

  barChartInstance = new Chart($("barChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Jun", "Jul", "Aug", "Sep", "Oct (Current)"],
      datasets: [
        { label: "Meals Saved", data: [420, 610, 840, 1020, 1250], backgroundColor: "#176b4d", borderRadius: 8 },
        { label: "CO₂ Saved (kg)", data: [150, 220, 310, 390, 450], backgroundColor: "#c7f36b", borderRadius: 8 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  pieChartInstance = new Chart($("pieChart").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Human Consumption (Shelters)", "Animal Feed (Local Farms)"],
      datasets: [{
        data: [486, 350],
        backgroundColor: ["#176b4d", "#f2a65a"],
        borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  lineChartInstance = new Chart($("lineChart").getContext("2d"), {
    type: "line",
    data: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        { label: "Prepared Meals (kg)", data: [80, 120, 155, 210], borderColor: "#176b4d", tension: 0.3, fill: false },
        { label: "Farm Scraps Diverted (kg)", data: [50, 75, 105, 140], borderColor: "#f2a65a", tension: 0.3, fill: false }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateCharts() {
  if (!pieChartInstance) return;
  const claimedItems = listings.filter(x => claims[x.id]);
  const humanKg = 486 + claimedItems.filter(x => x.routing !== "Animal").reduce((s, x) => s + Number(x.qty || 0), 0);
  const animalKg = 350 + claimedItems.filter(x => x.routing === "Animal").reduce((s, x) => s + Number(x.qty || 0), 0);
  pieChartInstance.data.datasets[0].data = [humanKg, animalKg];
  pieChartInstance.update();
}

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 3500);
}

function openModal() { $("donateModal")?.classList.add("open"); }
function closeModal() { $("donateModal")?.classList.remove("open"); }

["openDonate", "openDonate2", "openDonate3"].forEach(id => $(id)?.addEventListener("click", openModal));
["closeModal", "cancelModal"].forEach(id => $(id)?.addEventListener("click", closeModal));
["closeQrModal", "doneQrBtn"].forEach(id => $(id)?.addEventListener("click", () => $("qrModal")?.classList.remove("open")));

$("searchInput")?.addEventListener("input", render);
$("clearSearch")?.addEventListener("click", () => { if ($("searchInput")) $("searchInput").value = ""; render(); });

let mapTimer;
$("location")?.addEventListener("input", () => {
  clearTimeout(mapTimer);
  mapTimer = setTimeout(updateDonationMap, 450);
});

$("donateForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const qty = Number(f.get("quantity")), hours = Number(f.get("freshHours"));
  const routing = f.get("routing");
  const emojis = { "Prepared meals": "🍱", "Bakery": "🥐", "Fruits & vegetables": "🥦", "Packaged food": "🥫", "Farm Scraps": "🐄" };

  const item = {
    id: Date.now(),
    name: f.get("foodName").trim(),
    routing,
    category: f.get("category"),
    qty,
    servings: Number(f.get("servings")) || Math.max(1, Math.round(qty * 2.5)),
    location: f.get("location").trim(),
    donor: f.get("donor").trim(),
    hours,
    created: Date.now(),
    emoji: routing === "Animal" ? "🐄" : (emojis[f.get("category")] || "🥗"),
    pickup: f.get("pickup") || "Flexible",
    notes: f.get("notes").trim()
  };

  listings.unshift(item);
  persist();

  e.currentTarget.reset();
  closeModal();
  switchPage("listings");
  render();
  toast(`Donation published under ${routing === 'Animal' ? 'Animal Feed' : 'Human Consumption'}!`);
});

// Annam Dutha AI Chatbot
const annamWindow = $("annamWindow");
const annamMessages = $("annamMessages");

$("annamToggle")?.addEventListener("click", () => annamWindow?.classList.toggle("open"));
$("annamClose")?.addEventListener("click", () => annamWindow?.classList.remove("open"));

function addAnnamMessage(html, sender = "bot") {
  if (!annamMessages) return;
  const div = document.createElement("div");
  div.className = `annam-msg ${sender}`;
  div.innerHTML = html;
  annamMessages.appendChild(div);
  annamMessages.scrollTop = annamMessages.scrollHeight;
}

function generateAnnamReply(query) {
  const q = query.toLowerCase();
  const activeListings = listings.filter(x => !claims[x.id] && remaining(x) > 0);
  const humanActive = activeListings.filter(x => x.routing !== "Animal");
  const animalActive = activeListings.filter(x => x.routing === "Animal");

  if (q.includes("nearby") || q.includes("available") || q.includes("food") || q.includes("pickup")) {
    if (!activeListings.length) return "Right now, all listings have been claimed! Click <b>＋ Donate food</b> to post surplus food.";
    const sample = activeListings.slice(0, 3).map(x => `• <b>${escapeHtml(x.name)}</b> (${x.qty} kg at ${escapeHtml(x.location)})`).join("<br>");
    return `Here are <b>${activeListings.length} active rescues</b> in our database:<br>${sample}<br><small>🥗 ${humanActive.length} for Humans · 🐄 ${animalActive.length} for Animal Farms.</small>`;
  }
  if (q.includes("dual") || q.includes("routing") || q.includes("animal") || q.includes("scrap")) {
    return `<b>Zero-Waste Dual Routing:</b><br>1️⃣ <b>Fresh Food:</b> Routed to NGOs & shelters for human consumption.<br>2️⃣ <b>Spoiled/Scraps:</b> Diverted to local farmers & cattle sanctuaries so zero food hits the landfill!`;
  }
  if (q.includes("impact") || q.includes("stat") || q.includes("co2") || q.includes("metric")) {
    return `📊 <b>Live FoodBridge Impact:</b><br>• Meals Saved: <b>${$("statMeals")?.textContent || "1,250"}</b><br>• CO₂ Prevented: <b>${$("statCo2")?.textContent || "450 kg"}</b><br>• Farm Scraps Diverted: <b>${$("statScraps")?.textContent || "350 kg"}</b>`;
  }
  if (q.includes("qr") || q.includes("verify") || q.includes("token")) {
    return `📲 <b>Secure QR Verification:</b> When an NGO claims a listing, FoodBridge generates a dynamic token (e.g., <code>#FB-00001</code>). The donor scans this QR at handoff to verify safe pickup.`;
  }
  return `I am <b>Annam Dutha</b>! Ask me about:<br>• 📍 <i>Nearby available food</i><br>• 🔀 <i>Zero-Waste Dual Routing</i><br>• 📲 <i>QR Token verification</i><br>• 📊 <i>Live CO₂ & Meal impact</i>`;
}

async function askAnnam(text) {
  annamWindow?.classList.add("open");
  addAnnamMessage(escapeHtml(text), "user");
  setTimeout(() => addAnnamMessage(generateAnnamReply(text), "bot"), 250);
}
window.askAnnam = askAnnam;

$("annamForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const input = $("annamInput");
  const text = input?.value.trim();
  if (!text) return;
  input.value = "";
  askAnnam(text);
});

updateDonationMap();
render();
initCharts();
setInterval(render, 30000);