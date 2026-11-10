import { createClient } from "@supabase/supabase-js";

// Supabase 연결
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const app = document.querySelector("#app");
let currentUser = null;

// 우리 가족 메뉴
const sections = [
  ["🍚", "식단 & 급식표", "이번 달 식단과 급식표"],
  ["🛒", "장보기 / 냉장고 재료", "재료와 장보기 목록"],
  ["📏", "아이들 성장", "아이들의 키와 몸무게"],
  ["📅", "가족 일정", "우리 가족의 중요한 일정"],
  ["💰", "가계부", "가족의 수입과 지출"],
  ["🏡", "집안 관리", "우리 집 할 일과 관리"]
];

// 로그인 화면
function renderLogin() {
  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">OUR FAMILY SPACE</div>
        <h1>우리집<br><span>다섯식구</span></h1>
        <p>우리 가족의 하루를 한곳에 모아요.</p>
        <button id="google-login" class="primary">
          Google 계정으로 시작하기
        </button>
        <p class="hint">
          ${supabase
            ? "가족 전용 공간에 안전하게 로그인해요."
            : "Supabase 연결 설정이 필요해요."}
        </p>
      </section>
    </main>
  `;

  document.querySelector("#google-login").addEventListener("click", async () => {
    if (!supabase) {
      alert("Supabase 연결 설정을 확인해 주세요.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) alert("로그인 오류: " + error.message);
  });
}

// 클라우드 저장
async function saveSection(section, value) {
  if (!supabase || !currentUser) {
    alert("로그인이 필요해요.");
    return false;
  }

  const { error } = await supabase
    .from("family_data")
    .upsert({
      user_id: currentUser.id,
      key: section,
      value,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id,key"
    });

  if (error) {
    alert("저장하지 못했어요: " + error.message);
    return false;
  }

  alert("클라우드에 저장했어요!");
  return true;
}

// 홈 화면
async function renderHome() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <div class="eyebrow">OUR FAMILY SPACE</div>
          <h1>우리집 다섯식구 <span>♡</span></h1>
        </div>
        <button id="logout" class="ghost">로그아웃</button>
      </header>

      <section class="welcome">
        <p class="eyebrow">WELCOME HOME</p>
        <h2>오늘도 우리 가족,<br>건강하고 행복하게 🌷</h2>
        <p class="muted">${escapeHtml(currentUser?.email ?? "")}</p>
      </section>

      <section class="grid">
        ${sections.map(([emoji, title, desc]) => `
          <button class="tile" data-section="${title}">
            <span class="tile-icon">${emoji}</span>
            <strong>${title}</strong>
            <small>${desc}</small>
          </button>
        `).join("")}
      </section>

      <p class="footer-note">
        가족의 기록은 로그인한 계정의 클라우드에 저장돼요.
      </p>
    </main>
  `;

  document.querySelector("#logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;

      if (section === "식단 & 급식표") {
        openMealPlan();
      } else {
        openSection(section);
      }
    });
  });
}

// 기본 메뉴 화면
async function openSection(title) {
  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", currentUser.id)
    .eq("key", title)
    .maybeSingle();

  if (error) {
    alert("내용을 불러오지 못했어요: " + error.message);
    return;
  }

  const existing = data?.value?.note ?? "";

  app.innerHTML = `
    <main class="shell">
      <button id="back" class="ghost">← 홈으로</button>

      <section class="welcome">
        <p class="eyebrow">FAMILY SPACE</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">
          우리 가족의 기록을 여기에 저장해 보자.
        </p>
      </section>

      <label class="field-label" for="note">메모</label>
      <textarea id="note" placeholder="여기에 내용을 적어봐.">${escapeHtml(existing)}</textarea>

      <button id="save" class="primary full">
        클라우드에 저장하기
      </button>
    </main>
  `;

  document.querySelector("#back").addEventListener("click", renderHome);

  document.querySelector("#save").addEventListener("click", () => {
    saveSection(title, {
      note: document.querySelector("#note").value
    });
  });
}

// 이번 달 식단표 화면
async function openMealPlan() {
  const key = "식단 & 급식표";
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("family_data")
    .select("value")
    .eq("user_id", currentUser.id)
    .eq("key", key + "-" + month)
    .maybeSingle();

  if (error) {
    alert("식단표를 불러오지 못했어요: " + error.message);
    return;
  }

  const saved = data?.value ?? {};

  app.innerHTML = `
    <main class="shell">
      <button id="back" class="ghost">← 홈으로</button>

      <section class="welcome">
        <p class="eyebrow">OUR FAMILY MEAL</p>
        <h2>🍚 이번 달 식단 & 급식표</h2>
        <p class="muted">${now.getFullYear()}년 ${now.getMonth() + 1}월</p>
      </section>

      <section class="welcome">
        <h3>어린이집·유치원 급식표 사진</h3>
        <p class="muted">이번 달 급식표 사진을 올려줘.</p>

        <input id="mealPhoto" type="file" accept="image/*">

        <img
          id="preview"
          src="${saved.photo ?? ""}"
          alt="이번 달 급식표 미리보기"
          style="width:100%;margin-top:15px;border-radius:14px;${saved.photo ? "" : "display:none;"}"
        >
      </section>

      <label class="field-label" for="mealNote">
        우리 가족 식단 메모
      </label>

      <textarea id="mealNote" placeholder="이번 달 식단이나 먹고 싶은 메뉴를 적어줘.">${escapeHtml(saved.note ?? "")}</textarea>

      <button id="saveMeal" class="primary full">
        클라우드에 저장하기
      </button>
    </main>
  `;

  document.querySelector("#back").addEventListener("click", renderHome);

  let photo = saved.photo ?? "";

  document.querySelector("#mealPhoto").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일을 선택해 줘.");
      return;
    }

    try {
      photo = await compressImage(file);

      const preview = document.querySelector("#preview");
      preview.src = photo;
      preview.style.display = "block";
    } catch (error) {
      alert("사진을 불러오지 못했어요.");
    }
  });

  document.querySelector("#saveMeal").addEventListener("click", async () => {
    await saveSection(key + "-" + month, {
      photo,
      note: document.querySelector("#mealNote").value
    });
  });
}

// 사진 용량 줄이기
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 1400;
        const scale = Math.min(1, maxWidth / image.width);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// HTML 안전 처리
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

// 앱 시작
async function start() {
  if (!app) {
    console.error("앱 화면 요소 #app를 찾을 수 없어요.");
    return;
  }

  if (!supabase) {
    renderLogin();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  currentUser = session?.user ?? null;

  if (currentUser) {
    await renderHome();
  } else {
    renderLogin();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;

    if (currentUser) {
      renderHome();
    } else {
      renderLogin();
    }
  });
}

start();
