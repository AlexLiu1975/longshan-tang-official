import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const ADMIN_EMAIL = 'beyle931224@gmail.com';
const firebaseConfig = {
  apiKey: "AIzaSyDkATNhqg_kIDcjT4KdUDNuRJk1o5VqPio",
  authDomain: "longshan-tang-official.firebaseapp.com",
  projectId: "longshan-tang-official",
  storageBucket: "longshan-tang-official.firebasestorage.app",
  messagingSenderId: "1001844784486",
  appId: "1:1001844784486:web:284e88cb6a957d4c1d5ca7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const $ = selector => document.querySelector(selector);
const loginPanel = $('#admin-login');
const adminApp = $('#admin-app');
const loginStatus = $('#login-status');
const adminUser = $('#admin-user');
const messagesList = $('#messages-list');
const messageSummary = $('#message-summary');
const newsList = $('#news-admin-list');
const newsStatus = $('#news-status');
let currentMessages = [];
let currentNews = [];

function formatDate(timestamp) {
  if (!timestamp?.toDate) return '';
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp.toDate());
}

function esc(value = '') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function isAdmin(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL;
}

$('#google-login').addEventListener('click', async () => {
  loginStatus.textContent = '正在登入…';
  try {
    const result = await signInWithPopup(auth, provider);
    if (!isAdmin(result.user)) {
      await signOut(auth);
      loginStatus.textContent = '此 Google 帳號沒有管理權限。';
      loginStatus.className = 'contact-status error';
    }
  } catch (error) {
    console.error(error);
    loginStatus.textContent = error.code === 'auth/operation-not-allowed' ? '尚未啟用 Google 登入，請先到 Firebase Authentication 開啟 Google 登入方式。' : '登入失敗，請稍後再試。';
    loginStatus.className = 'contact-status error';
  }
});

$('#admin-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (user && isAdmin(user)) {
    loginPanel.hidden = true;
    adminApp.hidden = false;
    adminUser.textContent = `已登入：${user.email}`;
    await Promise.all([loadMessages(), loadNews()]);
  } else {
    adminApp.hidden = true;
    loginPanel.hidden = false;
    adminUser.textContent = '';
  }
});

document.querySelectorAll('.admin-tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const tab = button.dataset.tab;
    $('#tab-messages').hidden = tab !== 'messages';
    $('#tab-news').hidden = tab !== 'news';
  });
});

async function loadMessages() {
  messagesList.innerHTML = '<p class="admin-empty">正在載入留言…</p>';
  try {
    const snapshot = await getDocs(query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')));
    currentMessages = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderMessageSummary();
    renderMessages();
  } catch (error) {
    console.error(error);
    messagesList.innerHTML = '<p class="admin-empty">無法讀取留言，請確認管理員權限與 Firestore 規則。</p>';
  }
}

function renderMessageSummary() {
  const counts = { new: 0, read: 0, replied: 0 };
  currentMessages.forEach(item => counts[item.status] = (counts[item.status] || 0) + 1);
  messageSummary.innerHTML = `
    <div><strong>${counts.new || 0}</strong><span>新留言</span></div>
    <div><strong>${counts.read || 0}</strong><span>已閱讀</span></div>
    <div><strong>${counts.replied || 0}</strong><span>已回覆</span></div>`;
}

function renderMessages() {
  if (!currentMessages.length) {
    messagesList.innerHTML = '<p class="admin-empty">目前沒有留言。</p>';
    return;
  }
  messagesList.innerHTML = currentMessages.map(item => `
    <article class="admin-item">
      <div class="admin-item-head"><div><span class="admin-badge status-${esc(item.status)}">${item.status === 'new' ? '新留言' : item.status === 'read' ? '已閱讀' : '已回覆'}</span><strong>${esc(item.name || '未具名')}</strong></div><time>${esc(formatDate(item.createdAt))}</time></div>
      <p class="admin-category">${esc(item.category || '一般詢問')}</p>
      <p class="admin-message">${esc(item.message || '')}</p>
      ${item.contact ? `<p class="admin-contact">聯絡方式：${esc(item.contact)}</p>` : ''}
      <div class="admin-actions">
        <button class="btn admin-secondary" data-message-status="read" data-id="${item.id}" type="button">標記已閱讀</button>
        <button class="btn primary" data-message-status="replied" data-id="${item.id}" type="button">標記已回覆</button>
      </div>
    </article>`).join('');

  messagesList.querySelectorAll('[data-message-status]').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await updateDoc(doc(db, 'contact_messages', button.dataset.id), { status: button.dataset.messageStatus });
        await loadMessages();
      } catch (error) {
        console.error(error);
        button.disabled = false;
        alert('更新留言狀態失敗。');
      }
    });
  });
}

$('#refresh-messages').addEventListener('click', loadMessages);

async function loadNews() {
  newsList.innerHTML = '<p class="admin-empty">正在載入公告…</p>';
  try {
    const snapshot = await getDocs(collection(db, 'news'));
    currentNews = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a,b) => (b.publishDate?.toMillis?.() || 0) - (a.publishDate?.toMillis?.() || 0));
    renderNews();
  } catch (error) {
    console.error(error);
    newsList.innerHTML = '<p class="admin-empty">無法讀取公告。</p>';
  }
}

function renderNews() {
  if (!currentNews.length) {
    newsList.innerHTML = '<p class="admin-empty">目前沒有公告。</p>';
    return;
  }
  newsList.innerHTML = currentNews.map(item => `
    <article class="admin-item">
      <div class="admin-item-head"><div>${item.pinned ? '<span class="admin-badge">置頂</span>' : ''}<strong>${esc(item.title || '未命名公告')}</strong></div><time>${esc(formatDate(item.publishDate))}</time></div>
      <p class="admin-category">${esc(item.category || '一般消息')}・${item.published ? '已發布' : '未發布'}</p>
      <p>${esc(item.summary || '')}</p>
      <div class="admin-actions"><button class="btn admin-secondary" data-news-edit="${item.id}" type="button">編輯</button><button class="btn admin-danger" data-news-delete="${item.id}" type="button">刪除</button></div>
    </article>`).join('');

  newsList.querySelectorAll('[data-news-edit]').forEach(button => button.addEventListener('click', () => editNews(button.dataset.newsEdit)));
  newsList.querySelectorAll('[data-news-delete]').forEach(button => button.addEventListener('click', () => removeNews(button.dataset.newsDelete)));
}

function editNews(id) {
  const item = currentNews.find(news => news.id === id);
  if (!item) return;
  $('#news-id').value = id;
  $('#news-title').value = item.title || '';
  $('#news-category').value = item.category || '一般消息';
  $('#news-summary').value = item.summary || '';
  $('#news-content').value = item.content || '';
  $('#news-published').checked = Boolean(item.published);
  $('#news-pinned').checked = Boolean(item.pinned);
  $('#news-save').textContent = '更新公告';
  $('#news-cancel').hidden = false;
  $('#news-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetNewsForm() {
  $('#news-form').reset();
  $('#news-id').value = '';
  $('#news-published').checked = true;
  $('#news-save').textContent = '儲存公告';
  $('#news-cancel').hidden = true;
}

$('#news-cancel').addEventListener('click', resetNewsForm);

$('#news-form').addEventListener('submit', async event => {
  event.preventDefault();
  const id = $('#news-id').value;
  const payload = {
    title: $('#news-title').value.trim(),
    category: $('#news-category').value,
    summary: $('#news-summary').value.trim(),
    content: $('#news-content').value.trim(),
    published: $('#news-published').checked,
    pinned: $('#news-pinned').checked,
    updatedAt: serverTimestamp()
  };
  if (!payload.title || !payload.summary || !payload.content) return;
  $('#news-save').disabled = true;
  newsStatus.textContent = id ? '正在更新公告…' : '正在建立公告…';
  try {
    if (id) {
      await updateDoc(doc(db, 'news', id), payload);
    } else {
      await addDoc(collection(db, 'news'), { ...payload, publishDate: serverTimestamp(), createdAt: serverTimestamp() });
    }
    newsStatus.textContent = '公告已儲存。';
    newsStatus.className = 'contact-status success';
    resetNewsForm();
    await loadNews();
  } catch (error) {
    console.error(error);
    newsStatus.textContent = '公告儲存失敗。';
    newsStatus.className = 'contact-status error';
  } finally {
    $('#news-save').disabled = false;
  }
});

async function removeNews(id) {
  if (!confirm('確定要刪除這則公告嗎？此動作無法復原。')) return;
  try {
    await deleteDoc(doc(db, 'news', id));
    await loadNews();
  } catch (error) {
    console.error(error);
    alert('刪除公告失敗。');
  }
}
