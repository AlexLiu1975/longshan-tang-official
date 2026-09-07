import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkATNhqg_kIDcjT4KdUDNuRJk1o5VqPio",
  authDomain: "longshan-tang-official.firebaseapp.com",
  projectId: "longshan-tang-official",
  storageBucket: "longshan-tang-official.firebasestorage.app",
  messagingSenderId: "1001844784486",
  appId: "1:1001844784486:web:284e88cb6a957d4c1d5ca7"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const counters = {
  homepage: {
    documentId: "homepageVisits",
    elementId: "homepage-visit-count",
    sessionKey: "longshan-homepage-counted"
  },
  divination: {
    documentId: "divinationUses",
    elementId: "divination-use-count"
  }
};

function formatCount(value) {
  return new Intl.NumberFormat("zh-TW").format(Number(value) || 0);
}

async function readCounter(type) {
  const config = counters[type];
  if (!config) return 0;
  const snapshot = await getDoc(doc(db, "site_stats", config.documentId));
  return snapshot.exists() ? Number(snapshot.data().count) || 0 : 0;
}

async function refreshCounter(type) {
  const config = counters[type];
  const element = document.getElementById(config?.elementId);
  if (!config || !element) return;
  try {
    const count = await readCounter(type);
    element.textContent = formatCount(count);
  } catch (error) {
    console.error(`讀取 ${type} 統計失敗：`, error);
    element.textContent = "0";
  }
}

async function incrementCounter(type) {
  const config = counters[type];
  if (!config) return;
  const counterRef = doc(db, "site_stats", config.documentId);
  await setDoc(counterRef, {
    count: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });
  await refreshCounter(type);
}

async function countHomepageVisit() {
  const config = counters.homepage;
  const element = document.getElementById(config.elementId);
  if (!element) return;

  try {
    if (!sessionStorage.getItem(config.sessionKey)) {
      await incrementCounter("homepage");
      sessionStorage.setItem(config.sessionKey, "1");
    } else {
      await refreshCounter("homepage");
    }
  } catch (error) {
    console.error("首頁參觀統計失敗：", error);
    await refreshCounter("homepage");
  }
}

async function recordDivinationUse() {
  try {
    await incrementCounter("divination");
  } catch (error) {
    console.error("占卜使用統計失敗：", error);
  }
}

window.LongshanStats = {
  recordDivinationUse,
  refreshDivinationCount: () => refreshCounter("divination")
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById(counters.homepage.elementId)) {
    countHomepageVisit();
  }
  if (document.getElementById(counters.divination.elementId)) {
    refreshCounter("divination");
  }
});
