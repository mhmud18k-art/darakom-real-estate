import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
         getDocs, query, orderBy, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, AREAS } from "./firebase-config.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const $ = id => document.getElementById(id);
const show = (el, on) => el.classList.toggle("hidden", !on);
const msg = (el, text, ok = true) => {
  el.textContent = text;
  el.className = "msg " + (ok ? "msg--ok" : "msg--err");
  if (ok) setTimeout(() => (el.className = "msg"), 4000);
};

/* photos: [{ data, id? }] — id موجود يعني محفوظة مسبقاً */
let photos = [];

/* ---------- مناطق ---------- */
$("f_area").innerHTML = AREAS.map(a => `<option>${a}</option>`).join("");

/* ---------- دخول ---------- */
$("loginBtn").onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("pass").value);
  } catch {
    msg($("loginMsg"), "البريد أو كلمة المرور غير صحيحة", false);
  }
};
$("logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  show($("loginView"), !user);
  show($("panelView"), !!user);
  if (user) loadList();
});

/* ---------- ضغط الصور ---------- */
function compress(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width  = Math.round(img.width  * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const kb = s => Math.round(s.length * 0.75 / 1024);

/* ---------- اختيار الصور ---------- */
const drop = $("drop");
drop.onclick = () => $("f_files").click();
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => {
  e.preventDefault(); drop.classList.remove("over");
  handleFiles([...e.dataTransfer.files].filter(f => f.type.startsWith("image/")));
};
$("f_files").onchange = () => handleFiles([...$("f_files").files]);

async function handleFiles(files) {
  if (!files.length) return;
  drop.querySelector("b").textContent = "عم نضغط الصور…";
  for (const f of files) {
    try {
      const data = await compress(f, 1280, 0.68);
      photos.push({ data });
    } catch { /* تجاهل الملف التالف */ }
  }
  drop.querySelector("b").textContent = "اختر الصور من جهازك";
  $("f_files").value = "";
  renderThumbs();
}

function renderThumbs() {
  $("thumbs").innerHTML = photos.map((p, i) => `
    <div class="thumb">
      <img src="${p.data}">
      <button type="button" data-rm="${i}">×</button>
      <i>${kb(p.data)} ك.ب</i>
    </div>`).join("");

  $("thumbs").querySelectorAll("[data-rm]").forEach(btn => {
    btn.onclick = () => { photos.splice(Number(btn.dataset.rm), 1); renderThumbs(); };
  });
}

/* ---------- صور العقار من قاعدة البيانات ---------- */
async function fetchPhotos(propertyId) {
  const snap = await getDocs(query(collection(db, "photos"), where("propertyId", "==", propertyId)));
  return snap.docs
    .map(d => ({ id: d.id, data: d.data().data, i: d.data().i ?? 0 }))
    .sort((a, b) => a.i - b.i);
}

async function deletePhotos(propertyId, keepIds = []) {
  const snap = await getDocs(query(collection(db, "photos"), where("propertyId", "==", propertyId)));
  await Promise.all(
    snap.docs.filter(d => !keepIds.includes(d.id)).map(d => deleteDoc(doc(db, "photos", d.id)))
  );
}

/* ---------- حفظ ---------- */
$("saveBtn").onclick = async () => {
  const title = $("f_title").value.trim();
  if (!title) return msg($("formMsg"), "لازم تكتب عنوان للعقار", false);

  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "عم نحفظ…";

  try {
    // صورة مصغّرة للكرت
    let thumb = null;
    if (photos.length) {
      thumb = photos[0].thumb || await shrinkFromDataURL(photos[0].data, 520, 0.6);
    }

    const data = {
      title,
      area: $("f_area").value,
      type: $("f_type").value,
      price: $("f_price").value ? Number($("f_price").value) : null,
      currency: $("f_currency").value,
      rooms: $("f_rooms").value || null,
      size: $("f_size").value || null,
      floor: $("f_floor").value || null,
      description: $("f_desc").value.trim(),
      video: $("f_video").value.trim() || null,
      thumb,
      photoCount: photos.length,
      published: true
    };

    let id = $("editId").value;
    if (id) {
      await updateDoc(doc(db, "properties", id), data);
    } else {
      const ref = await addDoc(collection(db, "properties"), { ...data, createdAt: serverTimestamp() });
      id = ref.id;
    }

    // احذف الصور المشالة، وارفع الجديدة
    await deletePhotos(id, photos.filter(p => p.id).map(p => p.id));
    for (let i = 0; i < photos.length; i++) {
      if (photos[i].id) {
        await updateDoc(doc(db, "photos", photos[i].id), { i });
      } else {
        await addDoc(collection(db, "photos"), { propertyId: id, data: photos[i].data, i });
      }
    }

    msg($("formMsg"), $("editId").value ? "تم تعديل العقار ✅" : "تمت إضافة العقار ✅");
    resetForm();
    loadList();
  } catch (e) {
    console.error(e);
    msg($("formMsg"), "صار خطأ أثناء الحفظ — جرّب صور أقل أو تأكد من قواعد Firebase", false);
  } finally {
    $("saveBtn").disabled = false;
    $("saveBtn").textContent = "حفظ العقار";
  }
};

function shrinkFromDataURL(dataURL, maxW, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.src = dataURL;
  });
}

$("cancelBtn").onclick = resetForm;

function resetForm() {
  ["f_title","f_price","f_rooms","f_size","f_floor","f_desc","f_video"].forEach(i => $(i).value = "");
  $("f_files").value = "";
  $("thumbs").innerHTML = "";
  $("editId").value = "";
  photos = [];
  $("formTitle").textContent = "إضافة عقار جديد";
  show($("cancelBtn"), false);
}

/* ---------- القائمة ---------- */
async function loadList() {
  const snap = await getDocs(query(collection(db, "properties"), orderBy("createdAt", "desc")));
  const list = $("list");

  if (snap.empty) {
    list.innerHTML = `<p style="color:var(--stone)">ما في عقارات بعد — ضيف أول عقار من فوق.</p>`;
    return;
  }

  list.innerHTML = "";
  snap.forEach(d => {
    const p = d.data();
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      ${p.thumb ? `<img src="${p.thumb}" alt="">` : `<div style="width:78px;height:58px;background:var(--parchment-2);border-radius:12px"></div>`}
      <div class="item__t">
        <b>${p.title}</b>
        <span>${p.area} · ${p.type} · ${p.price ? p.price + " " + (p.currency||"") : "بدون سعر"} · ${p.photoCount || 0} صورة</span>
      </div>
      <button class="btn btn--ghost" data-edit="${d.id}">تعديل</button>
      <button class="btn btn--danger" data-del="${d.id}">حذف</button>`;
    list.appendChild(row);

    row.querySelector("[data-edit]").onclick = async () => {
      $("editId").value = d.id;
      $("f_title").value = p.title || "";
      $("f_area").value = p.area || AREAS[0];
      $("f_type").value = p.type || "للبيع";
      $("f_price").value = p.price ?? "";
      $("f_currency").value = p.currency || "$";
      $("f_rooms").value = p.rooms || "";
      $("f_size").value = p.size || "";
      $("f_floor").value = p.floor || "";
      $("f_desc").value = p.description || "";
      $("f_video").value = p.video || "";
      $("formTitle").textContent = "تعديل العقار — عم نجيب الصور…";
      show($("cancelBtn"), true);
      window.scrollTo({ top: 0, behavior: "smooth" });

      photos = await fetchPhotos(d.id);
      renderThumbs();
      $("formTitle").textContent = "تعديل العقار";
    };

    row.querySelector("[data-del]").onclick = async () => {
      if (!confirm(`متأكد بدك تحذف "${p.title}"؟`)) return;
      await deletePhotos(d.id);
      await deleteDoc(doc(db, "properties", d.id));
      loadList();
    };
  });
}
