import { createClient } from "@supabase/supabase-js";

import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const app = document.querySelector("#app");
let currentUser = null;

const sections = [
  ["🍚", "식단 & 급식표", "이번 달 식단과 급식표"],
  ["🛒", "장보기 / 냉장고 재료", "재료와 장보기 목록"],
  ["📏", "아이들 성장", "아이들의 키와 몸무게"],
  ["📅", "가족 일정", "우리 가족의 중요한 일정"],
  ["💰", "가계부", "가족의 수입과 지출"],
  ["🏡", "집안 관리", "우리 집 할 일과 관리"]
];

const institutionTypes = ["어린이집", "유치원", "초등학교", "중학교", "고등학교", "기타"];

function defaultFamilySettings() {
  return {
    institutions: [
      { id: "kindergarten", name: "유치원", type: "유치원" },
      { id: "daycare", name: "어린이집", type: "어린이집" }
    ],
    children: [
      { id: "eden", name: "이든이", birthYear: 2021, institutionId: "kindergarten" },
      { id: "gaon", name: "가온이", birthYear: 2023, institutionId: "daycare" },
      { id: "gyeoun", name: "겨운이", birthYear: 2024, institutionId: "daycare" }
    ]
  };
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function showMessage(message) {
  alert(message);
}

function renderLogin() {
  app.innerHTML = `
    <main class="shell">
      <section class="card login-card">
        <div class="eyebrow">OUR FAMILY SPACE</div>
        <h1>우리집 다섯식구</h1>
        <p>우리 가족의 일상과 기록을 한곳에 모아요.</p>
        <button id="google-login" class="primary-button">Google 계정으로 시작하기</button>
      </section>
    </main>`;
  document.querySelector("#google-login").addEventListener("click", async () => {
    if (!supabase) return showMessage("Supabase 환경변수를 먼저 확인해줘.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) showMessage("로그인 오류: " + error.message);
  });
}

async function saveSection(key, value) {
  if (!supabase || !currentUser) {
    showMessage("로그인이 필요해.");
    return false;
  }
  const { error } = await supabase.from("family_data").upsert({
    user_id: currentUser.id,
    key,
    value,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,key" });

  if (error) {
    showMessage("저장하지 못했어요: " + error.message);
    return false;
  }
  return true;
}

// null은 아직 저장된 자료가 없다는 뜻, undefined는 불러오기 오류야.
async function loadSection(key) {
  if (!supabase || !currentUser) return undefined;
  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", currentUser.id)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    showMessage("불러오지 못했어요: " + error.message);
    return undefined;
  }
  return data?.value ?? null;
}

async function loadFamilySettings() {
  const saved = await loadSection("아이들 프로필 설정");
  if (saved === undefined) return null;
  if (!saved || !Array.isArray(saved.children) || !Array.isArray(saved.institutions)) {
    return defaultFamilySettings();
  }
  return saved;
}

async function renderHome() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <div class="eyebrow">OUR FAMILY SPACE</div>
          <h1>우리집 다섯식구</h1>
          <p>오늘도 우리 가족답게, 건강하고 행복하게</p>
        </div>
        <button id="logout" class="soft-button">로그아웃</button>
      </header>
      <section class="menu-grid">
        ${sections.map(([icon, title, desc]) => `
          <button class="menu-card" data-section="${esc(title)}">
            <span class="menu-icon">${icon}</span>
            <strong>${esc(title)}</strong>
            <small>${esc(desc)}</small>
          </button>`).join("")}
      </section>
      <p class="home-note">우리 가족의 기록은 로그인한 계정의 클라우드에 안전하게 저장돼.</p>
    </main>`;

  document.querySelector("#logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => openSection(button.dataset.section));
  });
}

async function openSection(title) {
  if (title === "식단 & 급식표") return openMealPlan();
  if (title === "아이들 성장") return openChildrenGrowth();

  const data = await loadSection(title);
  if (data === undefined) return;

  app.innerHTML = `
    <main class="shell">
      <button class="back-button" id="back">← 홈으로</button>
      <section class="card">
        <div class="eyebrow">OUR FAMILY SPACE</div>
        <h2>${esc(title)}</h2>
        <p>${esc(sections.find(item => item[1] === title)?.[2] || "")}</p>
        <textarea id="section-note" rows="8" placeholder="우리 가족의 내용을 자유롭게 적어줘.">${esc(data?.note || "")}</textarea>
        <button id="save-note" class="primary-button">클라우드에 저장하기</button>
      </section>
    </main>`;
  document.querySelector("#back").addEventListener("click", renderHome);
  document.querySelector("#save-note").addEventListener("click", async () => {
    const ok = await saveSection(title, { note: document.querySelector("#section-note").value });
    if (ok) showMessage("클라우드에 저장했어요!");
  });
}

async function openChildrenSettings() {
  const settings = await loadFamilySettings();
  if (!settings) return;

  const institutionOptions = settings.institutions.map(item =>
    `<option value="${esc(item.id)}">${esc(item.name || item.type)}</option>`
  ).join("");

  app.innerHTML = `
    <main class="shell">
      <button class="back-button" id="back">← 홈으로</button>
      <section class="card">
        <div class="eyebrow">OUR FAMILY</div>
        <h2>아이들 프로필 & 기관 설정</h2>
        <p>아이마다 다니는 기관을 연결해두면 급식표를 기관별로 볼 수 있어.</p>
        <div class="settings-list">
          ${settings.children.map((child, index) => `
            <article class="setting-item">
              <h3>${esc(child.name)}</h3>
              <label>이름
                <input data-child-name="${index}" value="${esc(child.name)}">
              </label>
              <label>출생 연도
                <input data-child-year="${index}" type="number" min="2000" max="2035" value="${esc(child.birthYear)}">
              </label>
              <label>다니는 기관
                <select data-child-institution="${index}">
                  ${settings.institutions.map(inst => `
                    <option value="${esc(inst.id)}" ${child.institutionId === inst.id ? "selected" : ""}>
                      ${esc(inst.name || inst.type)}
                    </option>`).join("")}
                </select>
              </label>
            </article>`).join("")}
        </div>
        <h3>기관 목록</h3>
        <div class="settings-list">
          ${settings.institutions.map((inst, index) => `
            <article class="setting-item">
              <label>기관 이름
                <input data-inst-name="${index}" value="${esc(inst.name)}">
              </label>
              <label>기관 종류
                <select data-inst-type="${index}">
                  ${institutionTypes.map(type => `<option ${inst.type === type ? "selected" : ""}>${type}</option>`).join("")}
                </select>
              </label>
            </article>`).join("")}
        </div>
        <button id="add-institution" class="soft-button">＋ 기관 추가</button>
        <button id="save-settings" class="primary-button">프로필 저장하기</button>
      </section>
    </main>`;

  document.querySelector("#back").addEventListener("click", renderHome);
  document.querySelector("#add-institution").addEventListener("click", async () => {
    const id = `inst-${Date.now()}`;
    settings.institutions.push({ id, name: "새 기관", type: "기타" });
    const ok = await saveSection("아이들 프로필 설정", settings);
    if (ok) openChildrenSettings();
  });
  document.querySelector("#save-settings").addEventListener("click", async () => {
    settings.children.forEach((child, i) => {
      child.name = document.querySelector(`[data-child-name="${i}"]`).value.trim() || child.name;
      child.birthYear = Number(document.querySelector(`[data-child-year="${i}"]`).value) || child.birthYear;
      child.institutionId = document.querySelector(`[data-child-institution="${i}"]`).value;
    });
    settings.institutions.forEach((inst, i) => {
      inst.name = document.querySelector(`[data-inst-name="${i}"]`).value.trim() || inst.name;
      inst.type = document.querySelector(`[data-inst-type="${i}"]`).value;
    });
    const ok = await saveSection("아이들 프로필 설정", settings);
    if (ok) showMessage("아이들 프로필을 저장했어!");
  });
}

async function openMealPlan(selectedInstitutionId = null) {
  const settings = await loadFamilySettings();
  if (!settings) return;
  if (!settings.institutions.length) {
    showMessage("먼저 아이들 성장 메뉴에서 기관을 추가해줘.");
    return openChildrenSettings();
  }

  const institution = settings.institutions.find(item => item.id === selectedInstitutionId)
    || settings.institutions[0];
  const month = monthKey();
  const storageKey = `meal-${institution.id}-${month}`;
  const saved = await loadSection(storageKey);
  const legacy = await loadSection(`식단 & 급식표-${month}`);
  if (saved === undefined || legacy === undefined) return;

  const children = settings.children.filter(child => child.institutionId === institution.id);
  const childNames = children.length ? children.map(child => child.name).join(", ") : "아직 연결된 아이가 없어";
  const preview = saved?.photo
    ? `<img class="meal-preview" src="${esc(saved.photo)}" alt="이번 달 급식표">`
    : `<div class="empty-preview">이번 달 급식표 사진을 올려줘 📷</div>`;

  app.innerHTML = `
    <main class="shell">
      <button class="back-button" id="back">← 홈으로</button>
      <section class="card">
        <div class="eyebrow">MEAL CALENDAR</div>
        <h2>식단 & 급식표</h2>
        <p>${month} · ${esc(childNames)}</p>
        <label>기관 선택
          <select id="institution-select">
            ${settings.institutions.map(inst => `
              <option value="${esc(inst.id)}" ${inst.id === institution.id ? "selected" : ""}>
                ${esc(inst.name)} (${esc(inst.type)})
              </option>`).join("")}
          </select>
        </label>
        <div class="meal-image-area">${preview}</div>
        <label>이번 달 급식표 사진
          <input id="meal-photo" type="file" accept="image/*">
        </label>
        <label>메모
          <textarea id="meal-note" rows="3" placeholder="알레르기, 특별식 등 메모">${esc(saved?.note || "")}</textarea>
        </label>
        <button id="save-meal" class="primary-button">급식표 저장하기</button>
        ${legacy?.photo ? `
          <div class="legacy-box">
            <h3>이전에 올린 급식표 사진</h3>
            <p>기존에 저장했던 사진이야. 어느 기관의 급식표인지 확인한 뒤 아래 버튼으로 옮겨줘.</p>
            <img class="meal-preview" src="${esc(legacy.photo)}" alt="이전 급식표">
            <button id="import-legacy" class="soft-button">이 사진을 ${esc(institution.name)} 급식표로 가져오기</button>
          </div>` : ""}
        <button id="manage-children" class="soft-button">아이들 / 기관 설정</button>
      </section>
    </main>`;

  document.querySelector("#back").addEventListener("click", renderHome);
  document.querySelector("#institution-select").addEventListener("change", event => openMealPlan(event.target.value));
  document.querySelector("#manage-children").addEventListener("click", openChildrenSettings);

  document.querySelector("#save-meal").addEventListener("click", async () => {
    const file = document.querySelector("#meal-photo").files[0];
    let photo = saved?.photo || null;
    if (file) {
      try {
        photo = await compressImage(file);
      } catch {
        return showMessage("사진을 읽지 못했어. 다른 사진으로 다시 시도해줘.");
      }
    }
    if (!photo && !document.querySelector("#meal-note").value.trim()) {
      return showMessage("사진을 올리거나 메모를 적어줘.");
    }
    const ok = await saveSection(storageKey, {
      photo,
      note: document.querySelector("#meal-note").value,
      month,
      institutionId: institution.id,
      institutionName: institution.name
    });
    if (ok) showMessage("급식표를 클라우드에 저장했어!");
  });

  const importButton = document.querySelector("#import-legacy");
  if (importButton) {
    importButton.addEventListener("click", async () => {
      const ok = await saveSection(storageKey, {
        photo: legacy.photo,
        note: legacy.note || "",
        month,
        institutionId: institution.id,
        institutionName: institution.name
      });
      if (ok) {
        showMessage(`${institution.name} 급식표로 가져왔어!`);
        openMealPlan(institution.id);
      }
    });
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function start() {
  if (!supabase) return renderLogin();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    showMessage("로그인 정보를 확인하지 못했어: " + error.message);
    return renderLogin();
  }
  currentUser = session?.user || null;
  if (currentUser) await renderHome();
  else renderLogin();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) await renderHome();
    else renderLogin();
  });
}

// ===== 삼형제 성장 기록 화면 =====

async function openChildrenGrowth() {
  const settings = await loadFamilySettings();

  if (!settings) {
    alert("아이들 정보를 불러오지 못했어요.");
    return;
  }

  const children = settings.children || [
    { id: "eden", name: "이든이" },
    { id: "gaon", name: "가온이" },
    { id: "gyeoun", name: "겨운이" }
  ];

  const defaults = {
    eden: { height: 110, weight: 18 },
    gaon: { height: 95, weight: 14.7 },
    gyeoun: { height: 87, weight: 12 }
  };

  app.innerHTML = `
    <main class="shell">
      <button class="back-button" id="growthBack">← 홈으로</button>
      <header class="page-header">
        <div class="eyebrow">OUR FAMILY GROWTH</div>
        <h1>🌱 우리 삼형제 쑥쑥 기록</h1>
        <p>아이를 선택해서 성장 기록을 확인해 봐!</p>
      </header>
      <section class="menu-grid" id="growthChildren">
        ${children.map(child => `
          <button class="menu-card" data-growth-id="${child.id}">
            <span class="menu-icon">🌱</span>
            <strong>${child.name}</strong>
            <small>성장 기록 보기 →</small>
          </button>
        `).join("")}
      </section>
    </main>
  `;

  document.querySelector("#growthBack").onclick = renderHome;

  document.querySelectorAll("[data-growth-id]").forEach(button => {
    button.onclick = () => openGrowthDetail(
      children.find(child => child.id === button.dataset.growthId),
      defaults
    );
  });
}

async function openGrowthDetail(child, defaults) {
  const key = "growth-" + child.id;

  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", currentUser.id)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    alert("성장 기록을 불러오지 못했어요.");
    return;
  }

  let records = data?.value?.records || [];

  if (records.length === 0 && defaults[child.id]) {
    records = [{
      date: "",
      height: defaults[child.id].height,
      weight: defaults[child.id].weight,
      baseline: true
    }];
  }

    function makeGrowthChart(field, unit, title) {
    const items = [...records]
      .filter(r => r.date && Number(r[field]) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (items.length < 2) {
      return `
        <div class="growth-empty">
          <div style="font-size:28px">🌱</div>
          <p>기록이 2개 이상 쌓이면</p>
          <p>${title} 그래프가 나타나!</p>
        </div>
      `;
    }

    const values = items.map(r => Number(r[field]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const width = 320;
    const height = 145;
    const points = values.map((value, index) => {
      const x = 20 + index * (280 / (values.length - 1));
      const y = 15 + (max - value) / range * 95;
      return `${x},${y}`;
    });

    return `
      <div style="overflow-x:auto">
        <svg viewBox="0 0 320 165"
          style="width:100%;min-width:260px">
          <polyline
            points="${points.join(" ")}"
            fill="none"
            stroke="#69b99b"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"/>
          ${items.map((item, index) => {
            const [x, y] = points[index].split(",");
            return `
              <circle cx="${x}" cy="${y}" r="5"
                fill="#69b99b" stroke="white" stroke-width="2"/>
              <text x="${x}" y="${Number(y) - 12}"
                text-anchor="middle" font-size="10"
                fill="#555">${item[field]}${unit}</text>
              <text x="${x}" y="135"
                text-anchor="middle" font-size="9"
                fill="#888">${item.date.slice(5)}</text>
            `;
          }).join("")}
        </svg>
      </div>
    `;
  }
  function showRecords() {
    const sorted = [...records].sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );

    app.innerHTML = `
      <main class="shell">
        <button class="back-button" id="growthBack">← 아이 선택</button>
        <header class="page-header">
          <div class="eyebrow">MY GROWTH RECORD</div>
          <h1>🌱 ${child.name}의 성장 기록</h1>
          <p>차곡차곡 기록하면서 변화를 살펴보자!</p>
        </header>

        <section class="card">
          <h2>새로운 성장 기록</h2>
          <form id="growthForm">
            <label>측정 날짜</label>
            <input name="date" type="date" required />
            <label>키 (cm)</label>
            <input name="height" type="number" step="0.1"
              min="30" max="220" required placeholder="예: 110" />
            <label>몸무게 (kg)</label>
            <input name="weight" type="number" step="0.1"
              min="1" max="150" required placeholder="예: 18" />
            <button class="primary-button" type="submit">기록 저장하기 ❤️</button>
          </form>
        </section>

<section class="card">
  <h2>📏 키 성장 그래프</h2>
  ${makeGrowthChart("height", "cm", "키")}
</section>

<section class="card">
  <h2>⚖️ 몸무게 변화 그래프</h2>
  ${makeGrowthChart("weight", "kg", "몸무게")}
</section>

<section class="card">
  <h2>📈 성장 기록 모아보기</h2>
  ${sorted.map(record => `
    <div class="growth-record">
      <strong>${record.date || "첫 기준 기록 · 날짜 미정"}</strong>
      <p>키 ${record.height}cm　몸무게 ${record.weight}kg</p>
    </div>
  `).join("")}
</section>
      </main>
    `;

    document.querySelector("#growthBack").onclick = openChildrenGrowth;

    document.querySelector("#growthForm").onsubmit = async event => {
      event.preventDefault();

      const form = new FormData(event.target);
      const newRecord = {
        date: form.get("date"),
        height: Number(form.get("height")),
        weight: Number(form.get("weight"))
      };

      const updated = records.filter(record =>
        record.date !== newRecord.date
      );

      updated.push(newRecord);

      const { error } = await supabase
        .from("family_data")
        .upsert({
          user_id: currentUser.id,
          key,
          value: { records: updated },
          updated_at: new Date().toISOString()
        });

      if (error) {
        alert("저장하지 못했어요: " + error.message);
        return;
      }

      records = updated;
      alert("성장 기록을 클라우드에 저장했어요! ❤️");
      showRecords();
    };
  }

  showRecords();
}

start();
