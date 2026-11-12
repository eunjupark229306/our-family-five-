import { createClient } from "@supabase/supabase-js";
import "./style.css";
import brothersImage from "./assets/brothers.png";

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
  ["🔥", "핫딜정리", "우리 가족 알뜰 쇼핑 기록"],
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
       <div class="eyebrow">JEONG FAMILY</div>
<h1>정가네</h1>
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
  <img
    src="${brothersImage}"
    alt="우리 삼형제"
    class="brothers-home-image"
  />
  <div>
    <div class="eyebrow">OUR FAMILY SPACE</div>
    <h1>정가네</h1>
    <p>우리 가족의 하루를 담는 작은 공간</p>
        </div>
       <button id="logout" class="logout-button">
  로그아웃
</button>
      </header>
<section class="menu-grid">
  ${sections.map(([icon, title, desc], index) => `
    <button class="menu-card menu-card-${index + 1}" data-section="${esc(title)}">
      <span class="menu-icon">${icon}</span>
      <strong>${esc(title)}</strong>
      <small>${esc(desc)}</small>
      <span class="menu-arrow">→</span>
    </button>
  `).join("")}
</section>

<p class="home-note">
  우리 가족의 소중한 기록을 한곳에 모아요 ♡
</p>
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
  if (title === "장보기 / 냉장고 재료") return openShoppingFridge();
  if (title === "집안 관리") return openHouseholdManagement();
  if (title === "핫딜정리") return openHotDeals();

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


async function openMealPlan() {
  const settings = await loadFamilySettings();
  if (!settings) return;

  if (!settings.institutions.length) {
    showMessage("먼저 아이들 성장 메뉴에서 기관을 추가해줘.");
    return openChildrenSettings();
  }

  const month = monthKey();

  const mealData = await Promise.all(
    settings.institutions.map(async institution => {
      const storageKey = `meal-${institution.id}-${month}`;
      const saved = await loadSection(storageKey);

      return { institution, storageKey, saved };
    })
  );

  if (mealData.some(item => item.saved === undefined)) return;

  app.innerHTML = `
    <main class="shell">
      <button class="back-button" id="back">← 홈으로</button>

      <section class="card">
        <div class="eyebrow">OUR FAMILY MEAL PLAN</div>
        <h2>우리집 급식표</h2>
        <p>${month} · 모든 기관의 급식표를 한눈에 확인해봐 ❤️</p>

        ${mealData.map(({ institution, saved }) => `
          <div class="meal-institution-card"
            data-institution-id="${esc(institution.id)}"
            style="border:1px solid #eee; border-radius:16px; padding:16px; margin:20px 0;">

            <h3>${esc(institution.name)}</h3>
            <p style="color:#888; font-size:13px;">${esc(institution.type)}</p>

            <div class="meal-image-area">
              ${saved?.photo
                ? `<img class="meal-preview" data-enlarge-meal
                    src="${esc(saved.photo)}" alt="${esc(institution.name)} 급식표"
                    style="cursor:zoom-in;">`
                : `<div class="empty-preview">이번 달 급식표 사진을 올려줘 📷</div>`
              }
            </div>

            <label>급식표 사진
              <input type="file" data-meal-photo accept="image/*">
            </label>

            <label>메모
              <textarea data-meal-note rows="2"
                placeholder="알레르기, 특별식 등 메모">${esc(saved?.note || "")}</textarea>
            </label>

            <button type="button" data-save-meal class="primary-button">
              ${saved?.photo ? "급식표 사진 교체하기" : "급식표 사진 저장하기"}
            </button>

            <button type="button" data-open-calendar class="soft-button">
              📅 날짜별 식단 달력
            </button>
          </div>
        `).join("")}

        <button class="soft-button" id="manage-children">
          아이들 / 기관 설정
        </button>
      </section>
    </main>`;

  document.querySelector("#back").addEventListener("click", renderHome);
  document.querySelector("#manage-children").addEventListener("click", openChildrenSettings);

  document.querySelectorAll(".meal-institution-card").forEach(card => {
    const institutionId = card.dataset.institutionId;
    const item = mealData.find(data => data.institution.id === institutionId);

    card.querySelector("[data-open-calendar]").addEventListener("click", () => {
      openMealCalendar(institutionId);
    });

    card.querySelector("[data-save-meal]").addEventListener("click", async () => {
      const file = card.querySelector("[data-meal-photo]").files[0];
      let photo = item.saved?.photo || null;

      if (file) {
        try {
          photo = await compressImage(file);
        } catch {
          return showMessage("사진을 읽지 못했어. 다른 사진으로 다시 시도해줘.");
        }
      }

      const note = card.querySelector("[data-meal-note]").value;

      if (!photo && !note.trim()) {
        return showMessage("사진을 올리거나 메모를 적어줘.");
      }

      const ok = await saveSection(item.storageKey, {
        photo,
        note,
        month,
        institutionId,
        institutionName: item.institution.name
      });

      if (ok) {
        showMessage(`${item.institution.name} 급식표를 저장했어! ❤️`);
        openMealPlan();
      }
    });
  });

  document.querySelectorAll("[data-enlarge-meal]").forEach(img => {
    img.addEventListener("click", () => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:9999;
        background:rgba(0,0,0,0.85);
        display:flex; align-items:center; justify-content:center;
        padding:20px; cursor:zoom-out;
      `;

      overlay.innerHTML = `
        <img src="${esc(img.src)}"
          style="max-width:100%; max-height:90vh; object-fit:contain; border-radius:12px;">
      `;

      overlay.addEventListener("click", () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}



async function openMealCalendar(institutionId) {
  const today = new Date();
  let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  let records = {};

  async function loadMonth() {
    const key = `meal-calendar-${institutionId}-${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
    const data = await loadSection(key);
    if (data === undefined) return false;
    records = data?.records || {};
    return true;
  }

  function render() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    let days = "";
    for (let i = 0; i < firstDay; i++) {
      days += `<div></div>`;
    }

    for (let day = 1; day <= lastDate; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasMeal = records[dateKey] &&
        (records[dateKey].breakfast || records[dateKey].lunch || records[dateKey].dinner);
      const selected = dateKey === selectedDate;

      days += `
        <button type="button" data-meal-day="${dateKey}"
          style="min-height:62px; border:1px solid ${selected ? "#8da99a" : "#eee"}; border-radius:12px; background:${selected ? "#e8f1eb" : "#fff"}; color:#444; padding:6px;">
          <strong>${day}</strong>
          <div style="font-size:11px; color:#789b83;">${hasMeal ? "● 기록 있음" : ""}</div>
        </button>`;
    }

    const meal = records[selectedDate] || {};

    app.innerHTML = `
      <main class="shell">
        <button class="back-button" id="calendar-back">← 급식표로</button>
        <section class="card">
          <div class="eyebrow">OUR MEAL CALENDAR</div>
          <h2>날짜별 식단 달력</h2>

          <div style="display:flex; justify-content:space-between; align-items:center; margin:20px 0;">
            <button type="button" id="prev-month" class="soft-button">← 이전 달</button>
            <strong>${year}년 ${month + 1}월</strong>
            <button type="button" id="next-month" class="soft-button">다음 달 →</button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:5px; text-align:center; margin-bottom:8px;">
            ${["일", "월", "화", "수", "목", "금", "토"].map(day => `<strong>${day}</strong>`).join("")}
          </div>

          <div style="display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:5px;">
            ${days}
          </div>

          <div style="border-top:1px solid #eee; margin-top:22px; padding-top:18px;">
            <h3>${selectedDate} 식단 입력</h3>

            <label>🌅 아침
              <textarea id="meal-breakfast" rows="2" placeholder="아침 메뉴를 입력해줘">${esc(meal.breakfast || "")}</textarea>
            </label>

            <label>☀️ 점심
              <textarea id="meal-lunch" rows="2" placeholder="점심 메뉴를 입력해줘">${esc(meal.lunch || "")}</textarea>
            </label>

            <label>🌙 저녁
              <textarea id="meal-dinner" rows="2" placeholder="저녁 메뉴를 입력해줘">${esc(meal.dinner || "")}</textarea>
            </label>

            <button id="save-calendar-meal" class="primary-button">이 날짜 식단 저장하기</button>
          </div>
        </section>
      </main>`;

    document.querySelector("#calendar-back").onclick = () => openMealPlan(institutionId);

    document.querySelector("#prev-month").onclick = async () => {
      viewDate = new Date(year, month - 1, 1);
      selectedDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-01`;
      if (await loadMonth()) render();
    };

    document.querySelector("#next-month").onclick = async () => {
      viewDate = new Date(year, month + 1, 1);
      selectedDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-01`;
      if (await loadMonth()) render();
    };

    document.querySelectorAll("[data-meal-day]").forEach(button => {
      button.onclick = () => {
        selectedDate = button.dataset.mealDay;
        render();
      };
    });

    document.querySelector("#save-calendar-meal").onclick = async () => {
      const breakfast = document.querySelector("#meal-breakfast").value.trim();
      const lunch = document.querySelector("#meal-lunch").value.trim();
      const dinner = document.querySelector("#meal-dinner").value.trim();

      if (!breakfast && !lunch && !dinner) {
        delete records[selectedDate];
      } else {
        records[selectedDate] = { breakfast, lunch, dinner };
      }

      const key = `meal-calendar-${institutionId}-${year}-${String(month + 1).padStart(2, "0")}`;
      const ok = await saveSection(key, { records });

      if (ok) {
        showMessage("날짜별 식단을 저장했어! ❤️");
        render();
      }
    };
  }

  if (await loadMonth()) render();
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
     <img
  src="${brothersImage}"
  alt="우리 삼형제"
  style="width:100%; max-width:340px; display:block; margin:10px auto 24px; border-radius:24px;"
/>
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

async function openShoppingFridge() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("로그인이 필요해요.");
    return;
  }

  const key = "shopping-fridge";

  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    alert("데이터를 불러오지 못했어요: " + error.message);
    return;
  }

  let items = data?.value || { shopping: [], fridge: [] };
  let activeTab = "shopping";
  items.events = items.events || [];

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  async function saveItems() {
    const { error } = await supabase
      .from("family_data")
      .upsert({
        user_id: user.id,
        key,
        value: items,
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert("저장하지 못했어요: " + error.message);
      return false;
    }

    return true;
  }

  function render() {
    app.innerHTML = `
      <main class="shell">
        <button class="back-button" id="shoppingBack">← 홈으로</button>

        <header class="page-header">
          <div class="eyebrow">OUR FAMILY KITCHEN</div>
          <h1>🛒 장보기 & 냉장고</h1>
          <div class="tab-menu" style="display:flex; gap:8px; margin:16px 0;">
  <button type="button" class="soft-button" id="shoppingTab">🛒 장보기</button>
  <button type="button" class="soft-button" id="fridgeTab">🧊 냉장고</button>
  <button type="button" class="soft-button" id="eventTab">🏷️ 이번 주 마트 행사</button>
</div>
          <p>우리 가족의 식재료를 한곳에서 관리해요.</p>
        </header>

        <section class="card" id="shoppingSection">
          <h2>🛒 장보기 목록</h2>
          <form id="shoppingForm">
            <input id="shoppingName" placeholder="살 물건을 입력해 줘" required />
            <button class="primary-button" type="submit">+ 장보기 추가</button>
          </form>

          <div id="shoppingList">
            ${items.shopping.map((item, index) => `
              <div class="growth-record">
                <label>
                  <input type="checkbox" data-check-shopping="${index}"
                    ${item.done ? "checked" : ""}>
                  <span style="${item.done ? "text-decoration:line-through;color:#999" : ""}">
                    ${escapeText(item.name)}
                  </span>
                </label>
                <button class="soft-button" data-delete-shopping="${index}">삭제</button>
              </div>
            `).join("") || "<p>아직 장보기 목록이 없어요.</p>"}
          </div>
        </section>

        <section class="card" id="fridgeSection">
          <h2>🧊 냉장고 식재료</h2>
          <form id="fridgeForm">
            <input id="fridgeName" placeholder="식재료 이름" required />
            <button class="primary-button" type="submit">+ 식재료 등록</button>
          </form>

          <div id="fridgeList">
            ${items.fridge.map((item, index) => `
              <div class="growth-record">
                <strong>${escapeText(item.name)}</strong>
                <button class="soft-button" data-delete-fridge="${index}">삭제</button>
              </div>
            `).join("") || "<p>등록된 식재료가 없어요.</p>"}
          </div>
        </section>
        <section class="card" id="eventSection">
  <h2>🏷️ 이번 주 마트 행사</h2>
  <p>놓치고 싶지 않은 할인 상품과 쿠폰을 기록해 둬.</p>

  <form id="eventForm">
    <label>마트 이름
      <input id="eventShop" placeholder="예: 이마트, 홈플러스" required>
    </label>

    <label>행사 상품
      <input id="eventName" placeholder="예: 계란 30구" required>
    </label>

    <label>할인 가격 (원)
      <input id="eventPrice" type="number" min="0" placeholder="예: 5980" required>
    </label>

    <label>행사 기간
      <input id="eventDate" placeholder="예: 11/12~11/18">
    </label>

    <label>쿠폰 및 메모
      <textarea id="eventMemo" rows="2" placeholder="쿠폰 사용 조건이나 할인 정보"></textarea>
    </label>

    <button class="primary-button" type="submit">+ 행사 기록 저장</button>
  </form>

  <div id="eventList"></div>
</section>
      </main>
    `;

    document.querySelector("#shoppingBack").onclick = renderHome;
    document.querySelector("#eventList").innerHTML =
  items.events.map((item, index) => `
    <div class="growth-record" style="margin-top:12px;">
      <strong>${escapeText(item.shop)} · ${escapeText(item.name)}</strong>
      <p>할인 가격: ${Number(item.price).toLocaleString("ko-KR")}원</p>
      ${item.date ? `<p>행사 기간: ${escapeText(item.date)}</p>` : ""}
      ${item.memo ? `<p>메모: ${escapeText(item.memo)}</p>` : ""}
      <button class="soft-button" data-delete-event="${index}">삭제</button>
    </div>
  `).join("") || "<p>아직 등록된 행사가 없어.</p>";

// 탭 전환
const shoppingSection = document.querySelector("#shoppingSection");
const fridgeSection = document.querySelector("#fridgeSection");
const eventSection = document.querySelector("#eventSection");

function showTab(section) {
  shoppingSection.style.display = section === "shopping" ? "" : "none";
  fridgeSection.style.display = section === "fridge" ? "" : "none";
  eventSection.style.display = section === "event" ? "" : "none";
}

document.querySelector("#shoppingTab").onclick = () => {
  activeTab = "shopping";
  showTab("shopping");
};

document.querySelector("#fridgeTab").onclick = () => {
  activeTab = "fridge";
  showTab("fridge");
};

document.querySelector("#eventTab").onclick = () => {
  activeTab = "event";
  showTab("event");
};
    
    // 마트 행사 저장
document.querySelector("#eventForm").onsubmit = async event => {
  event.preventDefault();

  const shop = document.querySelector("#eventShop").value.trim();
  const name = document.querySelector("#eventName").value.trim();
  const price = Number(document.querySelector("#eventPrice").value);
  const date = document.querySelector("#eventDate").value.trim();
  const memo = document.querySelector("#eventMemo").value.trim();

  if (!shop || !name || document.querySelector("#eventPrice").value === "") {
    return alert("마트 이름, 상품명, 가격을 입력해 줘.");
  }

  items.events.unshift({ shop, name, price, date, memo });

  if (await saveItems()) {
    alert("마트 행사 기록을 저장했어! ❤️");
    render();
  }
};

// 마트 행사 삭제
document.querySelectorAll("[data-delete-event]").forEach(button => {
  button.onclick = async () => {
    items.events.splice(Number(button.dataset.deleteEvent), 1);

    if (await saveItems()) {
      render();
    }
  };
});
document.querySelector("#fridgeTab").onclick = () => showTab("fridge");
document.querySelector("#eventTab").onclick = () => showTab("event");

showTab(activeTab);

    document.querySelector("#shoppingForm").onsubmit = async event => {
      event.preventDefault();
      const name = document.querySelector("#shoppingName").value.trim();
      if (!name) return;

      items.shopping.push({ name, done: false });
      if (await saveItems()) render();
    };

    document.querySelector("#fridgeForm").onsubmit = async event => {
      event.preventDefault();
      const name = document.querySelector("#fridgeName").value.trim();
      if (!name) return;

      items.fridge.push({ name });
      if (await saveItems()) render();
    };

    document.querySelectorAll("[data-check-shopping]").forEach(button => {
      button.onchange = async () => {
        const index = Number(button.dataset.checkShopping);
        items.shopping[index].done = button.checked;
        if (await saveItems()) render();
      };
    });

    document.querySelectorAll("[data-delete-shopping]").forEach(button => {
      button.onclick = async () => {
        items.shopping.splice(Number(button.dataset.deleteShopping), 1);
        if (await saveItems()) render();
      };
    });

    document.querySelectorAll("[data-delete-fridge]").forEach(button => {
      button.onclick = async () => {
        items.fridge.splice(Number(button.dataset.deleteFridge), 1);
        if (await saveItems()) render();
      };
    });
  }

  render();
}


async function openHouseholdManagement() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("로그인이 필요해요.");
    return;
  }

  const key = "household-management";

  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    alert("집안일을 불러오지 못했어요: " + error.message);
    return;
  }

  let tasks = data?.value?.tasks || [];

  async function saveTasks() {
    const { error } = await supabase
      .from("family_data")
      .upsert({
        user_id: user.id,
        key,
        value: { tasks },
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert("저장하지 못했어요: " + error.message);
      return false;
    }

    return true;
  }

  function render() {
    app.innerHTML = `
      <main class="shell">
        <button class="back-button" id="houseBack">← 홈으로</button>

        <header class="page-header">
          <div class="eyebrow">OUR FAMILY HOME</div>
          <h1>🏡 우리집 집안 관리</h1>
          <p>오늘 할 일을 하나씩 정리해 봐요.</p>
        </header>

        <section class="card">
          <h2>✨ 집안일 추가하기</h2>
          <form id="houseForm">
            <input
              id="houseTask"
              placeholder="예: 거실 청소하기"
              required
            />
            <button class="primary-button" type="submit">
              + 할 일 추가
            </button>
          </form>
        </section>

        <section class="card">
          <h2>🧹 우리집 할 일</h2>
          <p id="houseProgress"></p>

          <div id="houseTaskList">
            ${tasks.map((task, index) => `
              <div class="growth-record">
                <label>
                  <input
                    type="checkbox"
                    data-house-check="${index}"
                    ${task.done ? "checked" : ""}
                  />
                  <span style="${task.done ? "text-decoration:line-through;color:#999" : ""}">
                    ${esc(task.name)}
                  </span>
                </label>
                <button
                  class="soft-button"
                  data-house-delete="${index}"
                >삭제</button>
              </div>
            `).join("") || "<p>아직 등록된 집안일이 없어요. 하나 추가해 볼까요? ♡</p>"}
          </div>
        </section>
      </main>
    `;

    const completed = tasks.filter(task => task.done).length;
    document.querySelector("#houseProgress").textContent =
      `전체 ${tasks.length}개 중 ${completed}개 완료했어요 ❤️`;

    document.querySelector("#houseBack").onclick = renderHome;

    document.querySelector("#houseForm").onsubmit = async event => {
      event.preventDefault();

      const name = document.querySelector("#houseTask").value.trim();
      if (!name) return;

      tasks.push({
        id: Date.now().toString(),
        name,
        done: false
      });

      if (await saveTasks()) render();
    };

    document.querySelectorAll("[data-house-check]").forEach(input => {
      input.onchange = async () => {
        const index = Number(input.dataset.houseCheck);
        tasks[index].done = input.checked;

        if (await saveTasks()) render();
      };
    });

    document.querySelectorAll("[data-house-delete]").forEach(button => {
      button.onclick = async () => {
        tasks.splice(Number(button.dataset.houseDelete), 1);

        if (await saveTasks()) render();
      };
    });
  }

  render();
}


async function openHotDeals() {
  const key = "hot-deals";
  const data = await loadSection(key);
  if (data === undefined) return;

  let records = data?.records || [];
  let searchText = "";

  function calculate(price, quantity, unit) {
    if (unit === "kg") return {
      value: Math.round(price / (quantity * 10)),
      label: "100g당"
    };
    if (unit === "g") return {
      value: Math.round(price / quantity * 100),
      label: "100g당"
    };
    if (unit === "L") return {
      value: Math.round(price / (quantity * 10)),
      label: "100ml당"
    };
    if (unit === "ml") return {
      value: Math.round(price / quantity * 100),
      label: "100ml당"
    };

    return {
      value: Math.round(price / quantity),
      label: `1${unit}당`
    };
  }

  function render() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    app.innerHTML = `
      <main class="shell">
        <button class="back-button" id="hot-deals-back">← 홈으로</button>

        <section class="card">
          <div class="eyebrow">OUR FAMILY HOT DEALS</div>
          <h2>🔥 핫딜정리</h2>
          <p>우리 가족 알뜰 쇼핑 기록</p>

          <form id="hot-deal-form">
            <label>쇼핑몰
              <input id="deal-shop" placeholder="예: G마켓, 쿠팡, 네이버" required>
            </label>

            <label>상품명
              <input id="deal-name" placeholder="예: 고춧가루" required>
            </label>

            <label>구매 가격 (원)
              <input id="deal-price" type="number" min="0" step="1" placeholder="15000" required>
            </label>

            <label>총 수량
              <input id="deal-quantity" type="number" min="0.01" step="any" placeholder="예: 1" required>
            </label>

            <label>단위
              <select id="deal-unit">
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
                <option value="개">개</option>
                <option value="팩">팩</option>
                <option value="봉">봉</option>
                <option value="롤">롤</option>
                <option value="세트">세트</option>
              </select>
            </label>

            <p style="font-size:12px; color:#888;">
              묶음 상품은 전체 용량이나 전체 개수를 입력해 줘.
              예: 2L 생수 6병은 12L
            </p>

            <label>구매일
              <input id="deal-date" type="date" value="${today}" required>
            </label>

            <label>메모
              <textarea id="deal-memo" rows="2" placeholder="쿠폰, 할인 정보 등을 기록해 줘."></textarea>
            </label>

            <div id="deal-unit-preview" style="padding:14px; background:#e8f2ec; border-radius:12px; margin:14px 0;">
              가격을 입력하면 단위당 가격이 계산돼.
            </div>

            <button type="submit" class="primary-button">+ 핫딜 기록 저장하기</button>
          </form>
        </section>

        <section class="card">
        <div style="margin:14px 0;">
  <input
    id="deal-search"
    type="search"
    placeholder="🔍 상품명 검색 (예: 고춧가루)"
    value="${esc(searchText)}"
  >
</div>
          <h2>🛍️ 구매 기록</h2>
          <p>총 ${records.length}개</p>

         ${records
  .map((item, index) => ({ item, index }))
  .filter(({ item }) =>
    `${item.name} ${item.shop}`.toLowerCase().includes(searchText.toLowerCase())
  )
  .map(({ item, index }) => `
            <div class="growth-record" style="margin-bottom:12px;">
              <strong>${esc(item.shop)} · ${esc(item.name)}</strong>
              <p>구매 가격: ${Number(item.price).toLocaleString("ko-KR")}원</p>
              <p>총 수량: ${Number(item.quantity).toLocaleString("ko-KR")}${esc(item.unit)}</p>
              <p>구매일: ${esc(item.date)}</p>
              <p style="color:#668b73; font-weight:bold;">
                ${esc(item.unitLabel)} ${Number(item.unitPrice).toLocaleString("ko-KR")}원
              </p>
              ${item.memo ? `<p>메모: ${esc(item.memo)}</p>` : ""}
              <button type="button" class="soft-button" data-delete-deal="${index}">삭제</button>
            </div>
          `).join("") || "<p>아직 등록된 구매 기록이 없어. 첫 기록을 남겨봐! 😊</p>"}
        </section>
      </main>
    `;

    document.querySelector("#hot-deals-back").onclick = renderHome;
    document.querySelector("#deal-search").addEventListener("input", event => {
  searchText = event.target.value;
  render();
  const searchInput = document.querySelector("#deal-search");
  searchInput.focus();
  searchInput.setSelectionRange(searchText.length, searchText.length);
});

    const priceInput = document.querySelector("#deal-price");
    const quantityInput = document.querySelector("#deal-quantity");
    const unitInput = document.querySelector("#deal-unit");
    const preview = document.querySelector("#deal-unit-preview");

    function updatePreview() {
      const price = Number(priceInput.value);
      const quantity = Number(quantityInput.value);
      const unit = unitInput.value;

      if (priceInput.value === "" || quantityInput.value === "" || quantity <= 0 || price < 0) {
        preview.textContent = "가격과 수량을 입력하면 자동 계산돼.";
        return;
      }

      const result = calculate(price, quantity, unit);
      preview.textContent = `${result.label} ${result.value.toLocaleString("ko-KR")}원`;
    }

    priceInput.addEventListener("input", updatePreview);
    quantityInput.addEventListener("input", updatePreview);
    unitInput.addEventListener("change", updatePreview);

    document.querySelector("#hot-deal-form").onsubmit = async event => {
      event.preventDefault();

      const shop = document.querySelector("#deal-shop").value.trim();
      const name = document.querySelector("#deal-name").value.trim();
      const price = Number(priceInput.value);
      const quantity = Number(quantityInput.value);
      const unit = unitInput.value;
      const date = document.querySelector("#deal-date").value;
      const memo = document.querySelector("#deal-memo").value.trim();

      if (!shop || !name || !date || price < 0 || quantity <= 0 ||
          priceInput.value === "" || quantityInput.value === "") {
        return showMessage("상품 정보와 가격, 수량을 확인해 줘.");
      }

      const result = calculate(price, quantity, unit);

      records.unshift({
        shop,
        name,
        price,
        quantity,
        unit,
        date,
        unitPrice: result.value,
        unitLabel: result.label,
        memo
      });

      if (await saveSection(key, { records })) {
        showMessage("핫딜 기록을 저장했어! ❤️");
        render();
      }
    };

    document.querySelectorAll("[data-delete-deal]").forEach(button => {
      button.onclick = async () => {
        records.splice(Number(button.dataset.deleteDeal), 1);
        if (await saveSection(key, { records })) {
          showMessage("구매 기록을 삭제했어.");
          render();
        }
      };
    });
  }

  render();
}


start();
