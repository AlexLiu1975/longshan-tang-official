import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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
const form = document.getElementById('contact-form');
const submit = document.getElementById('contact-submit');
const status = document.getElementById('contact-status');
let lastSubmittedAt = 0;

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = `contact-status ${type}`.trim();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('contact-name').value.trim();
  const contact = document.getElementById('contact-method').value.trim();
  const category = document.getElementById('contact-category').value;
  const message = document.getElementById('contact-message').value.trim();
  const website = document.getElementById('contact-website').value.trim();

  if (website) return;
  if (message.length < 2 || message.length > 1000 || name.length > 40 || contact.length > 100) {
    setStatus('請確認留言內容與欄位長度。', 'error');
    return;
  }
  const now = Date.now();
  if (now - lastSubmittedAt < 15000) {
    setStatus('請稍候片刻再送出下一則留言。', 'error');
    return;
  }

  submit.disabled = true;
  submit.textContent = '傳送中…';
  setStatus('正在送出留言…');
  try {
    await addDoc(collection(db, 'contact_messages'), {
      name,
      contact,
      category,
      message,
      status: 'new',
      createdAt: serverTimestamp(),
      source: 'official-website'
    });
    lastSubmittedAt = Date.now();
    form.reset();
    setStatus('感謝您的留言，隴善堂已收到您的訊息。', 'success');
  } catch (error) {
    console.error('送出留言失敗：', error);
    setStatus('目前無法送出留言，請稍後再試，或透過電話／LINE 與我們聯絡。', 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = '送出留言';
  }
});
