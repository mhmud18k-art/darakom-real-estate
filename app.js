import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import { firebaseConfig, WHATSAPP, OFFICE_NAME, AREAS } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));

const grid   = document.getElementById("grid");
const state  = document.getElementById("state");
const picker = document.getElementById("picker");
const pBtn   = document.getElementById("pickerBtn");
const pVal   = document.getElementById("pickerVal");
const pOpts  = document.getElementById("pickerOpts");
const pSearch= document.getElementById("pickerSearch");

const ALL = "كل المناطق";
let all = [];
let active = ALL;

/* ---------- روابط واتساب العامة ---------- */
const generalMsg = encodeURIComponent(`مرحباً ${OFFICE_NAME}، بدي استفسر عن العقارات المتاحة.`);
document.getElementById("topWa").href  = `https://wa.me/${WHATSAPP}?text=${generalMsg}`;
document.getElementById("footWa").href = `https://wa.me/${WHATSAPP}?text=${generalMsg}`;

/* ---------- أنميشن الظهور ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add("in"), (i % 3) * 90);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

/* ---------- أدوات ---------- */
const fmtPrice = (p, c) => p
  ? `${Number(p).toLocaleString("en-US")} <small>${c || "$"}</small>`
  : `<small>السعر عند الاتصال</small>`;

function waLink(p) {
  const lines = [
    `مرحباً ${OFFICE_NAME}،`,
    `بهمّني هالعرض:`,
    `🏠 ${p.title}`,
    `📍 المنطقة: ${p.area}`,
    p.price ? `💰 السعر: ${Number(p.price).toLocaleString("en-US")} ${p.currency || "$"}` : null,
    p.rooms ? `🛏 الغرف: ${p.rooms}` : null,
    p.size ? `📐 المساحة: ${p.size} م²` : null,
    ``,
    `بحب احجز موعد للمعاينة، شو الأوقات المتاحة؟`
  ].filter(Boolean).join("\n");
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines)}`;
}

const WA_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 2 .9 2.1c.1.2.1.3 0 .5s-.1.3-.3.5l-.4.5c-.1.1-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.2 2.1 1.3.3.1.4.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1s1.5.7 1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.5z"/></svg>`;

/* ---------- بناء الكرت ---------- */
function cardHTML(p) {
  const img = p.thumb
    ? `<img src="${p.thumb}" alt="${p.title}" loading="lazy">`
    : `<div class="card__noimg"><span>د</span>لا يوجد صور — احجز موعد معاينة</div>`;

  const tags = [
    p.rooms ? `${p.rooms} غرف` : null,
    p.size ? `${p.size} م²` : null,
    p.floor ? `طابق ${p.floor}` : null
  ].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join("");

  return `
  <article class="card reveal" data-id="${p.id}">
    <div class="card__media">
      ${img}
      <div class="pill">${p.area}</div>
      ${p.type ? `<div class="pill pill--type">${p.type}</div>` : ""}
      ${p.photoCount > 1 ? `<div class="pill pill--count">📷 ${p.photoCount} صور</div>` : ""}
      ${p.video ? `<div class="pill pill--video">▶ فيديو</div>` : ""}
    </div>
    <div class="card__body">
      <h2 class="card__title">${p.title}</h2>
      ${tags ? `<div class="card__meta">${tags}</div>` : ""}
      <p class="card__desc">${p.description || ""}</p>
      <div class="card__foot">
        <div class="price">${fmtPrice(p.price, p.currency)}</div>
        <a class="wa" href="${waLink(p)}" target="_blank" rel="noopener" data-stop>${WA_ICON} تواصل</a>
      </div>
    </div>
  </article>`;
}

/* ---------- العرض ---------- */
function render() {
  const list = active === ALL ? all : all.filter(p => p.area === active);

  if (!list.length) {
    grid.innerHTML = "";
    state.style.display = "block";
    state.innerHTML = `<b>ما في عقارات بهي المنطقة حالياً</b>جرّب منطقة تانية، أو تواصل معنا وبنأمّنلك المطلوب.`;
    return;
  }

  state.style.display = "none";
  grid.innerHTML = list.map(cardHTML).join("");
  grid.querySelectorAll(".reveal").forEach(el => io.observe(el));

  grid.querySelectorAll(".card").forEach(card => {
    card.onclick = e => {
      if (e.target.closest("[data-stop]")) return;
      openDetail(card.dataset.id);
    };
  });
}

/* ---------- تحويل رابط يوتيوب لتضمين ---------- */
function ytEmbed(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

/* ---------- نافذة العرض الكبيرة ---------- */
const modal = document.getElementById("modal");
const photoCache = {};

async function openDetail(id) {
  const p = all.find(x => x.id === id);
  if (!p) return;

  const tags = [
    p.type, p.rooms ? `${p.rooms} غرف` : null,
    p.size ? `${p.size} م²` : null, p.floor ? `طابق ${p.floor}` : null
  ].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join("");

  const embed = ytEmbed(p.video);

  modal.innerHTML = `
    <div class="modal__box" role="dialog" aria-modal="true">
      <button class="modal__x" id="modalX" aria-label="إغلاق">×</button>
      ${embed ? `<div class="modal__video"><iframe src="${embed}" title="فيديو العقار" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : ""}
      <div class="modal__gallery" id="gal">
        ${p.photoCount ? `<div class="gal__loading">عم نحمّل الصور…</div>`
                       : (embed ? "" : `<div class="gal__empty"><span>د</span>ما في صور لهاد العقار<br>احجز موعد معاينة ونفرجيك ياه على الطبيعة</div>`)}
      </div>
      <div class="modal__info">
        <div class="pill pill--static">${p.area}</div>
        <h2>${p.title}</h2>
        <div class="card__meta">${tags}</div>
        ${p.description ? `<p class="modal__desc">${p.description}</p>` : ""}
        <div class="modal__foot">
          <div class="price">${fmtPrice(p.price, p.currency)}</div>
          <a class="wa" href="${waLink(p)}" target="_blank" rel="noopener">${WA_ICON} تواصل واحجز معاينة</a>
        </div>
      </div>
    </div>`;

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  document.getElementById("modalX").onclick = closeDetail;

  if (!p.photoCount) return;

  try {
    if (!photoCache[id]) {
      const snap = await getDocs(query(collection(db, "photos"), where("propertyId", "==", id)));
      photoCache[id] = snap.docs
        .map(d => ({ data: d.data().data, i: d.data().i ?? 0 }))
        .sort((a, b) => a.i - b.i);
    }
    const gal = document.getElementById("gal");
    if (!gal) return;
    gal.innerHTML = photoCache[id].length
      ? photoCache[id].map((ph, n) => `<img src="${ph.data}" alt="صورة ${n + 1}" loading="lazy">`).join("")
      : `<div class="gal__empty"><span>د</span>ما في صور لهاد العقار</div>`;

    gal.querySelectorAll("img").forEach(im => {
      im.onclick = () => openLightbox(im.src);
    });
  } catch (err) {
    console.error(err);
    const gal = document.getElementById("gal");
    if (gal) gal.innerHTML = `<div class="gal__empty">ما قدرنا نحمّل الصور</div>`;
  }
}

/* ---------- تكبير صورة ---------- */
const lightbox = document.getElementById("lightbox");

function openLightbox(src) {
  lightbox.innerHTML = `<button aria-label="إغلاق">×</button><img src="${src}" alt="">`;
  lightbox.classList.add("show");
  lightbox.querySelector("button").onclick = closeLightbox;
}
function closeLightbox() {
  lightbox.classList.remove("show");
  setTimeout(() => { if (!lightbox.classList.contains("show")) lightbox.innerHTML = ""; }, 300);
}
lightbox.onclick = e => { if (e.target === lightbox) closeLightbox(); };

function closeDetail() {
  modal.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => { if (!modal.classList.contains("show")) modal.innerHTML = ""; }, 350);
}

modal.onclick = e => { if (e.target === modal) closeDetail(); };
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (lightbox.classList.contains("show")) return closeLightbox();
  if (modal.classList.contains("show")) closeDetail();
});

/* ---------- القائمة المنسدلة ---------- */
function countIn(area) {
  return area === ALL ? all.length : all.filter(p => p.area === area).length;
}

function optionsList() {
  const used = [...new Set(all.map(p => p.area))];
  const extra = used.filter(a => !AREAS.includes(a));
  return [ALL, ...AREAS, ...extra];
}

function renderOptions(filterText = "") {
  const t = filterText.trim();
  const items = optionsList().filter(a => !t || a.includes(t));

  pOpts.innerHTML = items.length
    ? items.map(a => {
        const n = countIn(a);
        return `
        <button class="opt${n ? "" : " opt--empty"}" role="option" data-area="${a}" aria-selected="${a === active}">
          ${a}<span>${n ? n : "—"}</span>
        </button>`;
      }).join("")
    : `<div style="padding:16px;text-align:center;color:var(--stone);font-size:14px">ما في نتيجة</div>`;

  pOpts.querySelectorAll(".opt").forEach(btn => {
    btn.onclick = () => {
      active = btn.dataset.area;
      pVal.textContent = active;
      closeMenu();
      render();
    };
  });
}

function openMenu() {
  picker.classList.add("open");
  pBtn.setAttribute("aria-expanded", "true");
  pSearch.value = "";
  renderOptions();
  setTimeout(() => pSearch.focus(), 120);
}
function closeMenu() {
  picker.classList.remove("open");
  pBtn.setAttribute("aria-expanded", "false");
}

pBtn.onclick = () => picker.classList.contains("open") ? closeMenu() : openMenu();
pSearch.oninput = () => renderOptions(pSearch.value);
document.addEventListener("click", e => { if (!picker.contains(e.target)) closeMenu(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

/* ---------- تحميل البيانات ---------- */
async function load() {
  try {
    const q = query(collection(db, "properties"), where("published", "==", true));
    const snap = await getDocs(q);
    all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    document.getElementById("statCount").textContent = all.length;
    document.getElementById("statAreas").textContent = new Set(all.map(p => p.area)).size;

    renderOptions();
    render();
  } catch (err) {
    console.error(err);
    state.innerHTML = `<b>ما قدرنا نحمّل العقارات</b>تأكد من إعدادات Firebase، أو حدّث الصفحة.`;
  }
}

load();
