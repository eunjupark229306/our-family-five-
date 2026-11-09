import { createClient } from "@supabase/supabase-js";
import "./style.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = (url && key && !url.includes("YOUR-PROJECT") && !key.includes("YOUR_"))
  ? createClient(url, key)
  : null;

const app = document.querySelector("#app");

const sections = [
  ["🍚", "식단 & 급식표", "이번 달 식단과 가족 메뉴"],
  ["🛒", "장보기 / 냉장고", "재료와 장보기 목록"],
  ["📏", "아이들 성장", "세 아이의 키와 몸무게"],
  ["🗓️", "가족 일정", "우리 가족의 중요한 날"],
  ["💰", "가계부", "수입과 지출 기록"],
  ["🏡", "집안 관리", "집안일과 생활 체크"]
];

let currentUser = null;

function renderLogin() {
  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">OUR FAMILY SPACE</div>
        <h1>우리집<br><span>다섯식구</span></h1>
        <p>우리 가족의 하루를 한곳에 모아요.</p>
        <button id="google-login" class="primary">Google 계정으로 시작하기</button>
        <p class="hint">${supabase ? "가족 전용 공간에 안전하게 로그인해요." : "Supabase 연결 설정이 아직 필요해요. 아래 안내를 따라 설정해 주세요."}</p>
      </section>
    </main>`;
  document.querySelector("#google-login").addEventListener("click", async () => {
    if (!supabase) {
      alert("아직 Supabase 연결 정보가 설정되지 않았어요. .env 파일을 먼저 설정해 주세요.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) alert("로그인 오류: " + error.message);
  });
}

async function saveSection(section, value) {
  if (!supabase || !currentUser) return;
  const { error } = await supabase.from("family_data").upsert({
    user_id: currentUser.id,
    key: section,
    value,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,key" });
  if (error) alert("저장하지 못했어요: " + error.message);
  else alert("클라우드에 저장했어요!");
}

async function renderHome() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div><div class="eyebrow">OUR FAMILY SPACE</div><h1>우리집 다섯식구 <span>♡</span></h1></div>
        <button id="logout" class="ghost">로그아웃</button>
      </header>
      <section class="welcome">
        <p class="eyebrow">WELCOME HOME</p>
        <h2>오늘도 우리 가족,<br>건강하고 행복하게 🌷</h2>
        <p class="muted">${currentUser?.email ?? ""}</p>
      </section>
      <section class="grid">
        ${sections.map(([emoji, title, desc]) => `
          <button class="tile" data-section="${title}">
            <span class="tile-icon">${emoji}</span><strong>${title}</strong><small>${desc}</small>
          </button>`).join("")}
      </section>
      <p class="footer-note">가족의 기록은 로그인한 계정의 클라우드에 저장돼요.</p>
    </main>`;
  document.querySelector("#logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => openSection(button.dataset.section));
  });
}

async function openSection(title) {
  const { data } = await supabase.from("family_data").select("value")
    .eq("user_id", currentUser.id).eq("key", title).maybeSingle();
  const existing = data?.value?.note ?? "";
  app.innerHTML = `
    <main class="shell">
      <button id="back" class="ghost">← 홈으로</button>
      <section class="welcome">
        <p class="eyebrow">FAMILY NOTE</p><h2>${title}</h2>
        <p class="muted">지금은 기본 메모 저장 기능이 준비되어 있어. 세부 기능은 차례대로 추가할게.</p>
      </section>
      <label class="field-label" for="note">메모</label>
      <textarea id="note" placeholder="여기에 내용을 적어봐.">${escapeHtml(existing)}</textarea>
      <button id="save" class="primary full">클라우드에 저장하기</button>
    </main>`;
  document.querySelector("#back").addEventListener("click", renderHome);
  document.querySelector("#save").addEventListener("click", () =>
    saveSection(title, { note: document.querySelector("#note").value })
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function start() {
  if (!supabase) return renderLogin();
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  if (currentUser) await renderHome(); else renderLogin();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) await renderHome(); else renderLogin();
  });
}

start();