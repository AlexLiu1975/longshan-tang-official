import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkATNhqg_kIDcjT4KdUDNuRJk1o5VqPio",
  authDomain: "longshan-tang-official.firebaseapp.com",
  projectId: "longshan-tang-official",
  storageBucket: "longshan-tang-official.firebasestorage.app",
  messagingSenderId: "1001844784486",
  appId: "1:1001844784486:web:284e88cb6a957d4c1d5ca7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(timestamp.toDate());
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadNews() {
  const newsSection = document.querySelector("#news");

  if (!newsSection) {
    return;
  }

  const oldNotice = newsSection.querySelector(".notice-card");

  if (!oldNotice) {
    return;
  }

  try {
    const newsQuery = query(
      collection(db, "news"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(newsQuery);

    const newsItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    newsItems.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      }

      const aTime = a.publishDate?.toMillis?.() || 0;
      const bTime = b.publishDate?.toMillis?.() || 0;

      return bTime - aTime;
    });

    const latestNews = newsItems.slice(0, 5);

    if (latestNews.length === 0) {
      oldNotice.innerHTML = `
        <time>最新公告</time>
        <h3>目前尚無公告</h3>
        <p>隴善堂最新消息將於此處公布。</p>
      `;
      return;
    }

    const container = document.createElement("div");
    container.id = "firebase-news-list";

    latestNews.forEach((item) => {
      const article = document.createElement("article");
      article.className = "notice-card";

      const pinnedText = item.pinned ? "📌 置頂・" : "";

      article.innerHTML = `
        <time>${pinnedText}${escapeHtml(formatDate(item.publishDate))}</time>
        <h3>${escapeHtml(item.title || "隴善堂公告")}</h3>
        <p>${escapeHtml(item.summary || item.content || "")}</p>
      `;

      container.appendChild(article);
    });

    oldNotice.replaceWith(container);
  } catch (error) {
    console.error("讀取最新公告失敗：", error);

    oldNotice.innerHTML = `
      <time>最新公告</time>
      <h3>公告載入中</h3>
      <p>目前暫時無法取得最新公告，請稍後再試。</p>
    `;
  }
}

loadNews();
