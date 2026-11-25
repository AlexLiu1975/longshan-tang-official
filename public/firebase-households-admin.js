import {
  addDoc, collection, doc, getDocs, query, runTransaction, serverTimestamp, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {
  LAMP_ITEMS, makeRegistrationId, matchesHouseholdSearch, normalizeHousehold, normalizeMember,
  normalizeRegistration, normalizeSearchTerm, paymentStatus, validPayment, validateHousehold,
  validateMember, validateRegistration
} from './admin-households-core.mjs';

const householdFields = {
  headName: 'head-name', phone: 'phone', telephone: 'telephone', email: 'email',
  address: 'address', notes: 'notes', active: 'active'
};
const memberFields = {
  name: 'name', relationship: 'relationship', gender: 'gender', address: 'address',
  sameAddress: 'same-address', birthDateGregorian: 'birth-gregorian', birthHour: 'birth-hour',
  birthLunarYear: 'birth-lunar-year', birthLunarMonth: 'birth-lunar-month',
  birthLunarDay: 'birth-lunar-day', birthLunarLeapMonth: 'birth-lunar-leap',
  phone: 'phone', notes: 'notes', active: 'active'
};
const paymentLabels = { unknown: '未確認', unpaid: '未繳', partial: '部分繳費', paid: '已繳清' };
const $ = id => document.getElementById(id);

function fields(prefix, mapping, values) {
  return Object.fromEntries(Object.entries(mapping).map(([key, suffix]) => {
    const input = $(prefix + '-' + suffix);
    const prop = input.type === 'checkbox' ? 'checked' : 'value';
    if (values) input[prop] = values[key] ?? (prop === 'checked' ? key === 'active' : '');
    return [key, input[prop]];
  }));
}

function list(id, rows, empty) {
  const container = $(id);
  container.replaceChildren(...rows);
  if (!rows.length) {
    const message = document.createElement('p');
    message.className = 'admin-empty';
    message.textContent = empty;
    container.append(message);
  }
}

function row(text, actions) {
  const item = document.createElement('article');
  item.className = 'admin-item';
  const title = document.createElement('p');
  title.textContent = text;
  item.append(title);
  for (const [label, handler] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn admin-secondary';
    button.textContent = label;
    button.addEventListener('click', handler);
    item.append(button);
  }
  return item;
}

export function initializeHouseholdAdmin(db) {
  let user = null;
  let householdId = '';
  let members = [];
  let paymentId = '';
  let revision = 0;
  let paymentRevision = null;
  const col = name => collection(db, name);
  const ref = (name, id) => doc(db, name, id);
  const records = async source => (await getDocs(source)).docs.map(item => ({ ...item.data(), id: item.id }));
  const audit = () => ({ updatedAt: serverTimestamp(), updatedBy: user.uid });
  const created = () => ({ ...audit(), createdAt: serverTimestamp(), createdBy: user.uid });

  async function perform(status, action) {
    if (!user) return;
    const session = revision;
    $(status).textContent = '處理中…';
    try {
      const message = await action(() => session === revision);
      if (session === revision) $(status).textContent = message || '';
    } catch (error) {
      if (session === revision) {
        $(status).textContent = error.code === 'permission-denied' ?
          '沒有存取權限，請確認登入帳號與 Firestore 規則。' :
          error.message === 'duplicate' ? '這位成員在同年度已有此項目紀錄。' :
          error.message === 'payment-changed' ? '繳費資料已變更，請重新開啟並確認最新金額。' :
          '操作失敗，請稍後再試。';
      }
    }
  }

  function bindForm(id, status, action) {
    $(id).addEventListener('submit', async event => {
      event.preventDefault();
      const button = $(id).querySelector('[type="submit"]');
      if (button.disabled) return;
      button.disabled = true;
      try {
        await perform(status, action);
      } finally {
        button.disabled = false;
      }
    });
  }

  function editMember(member = {}) {
    $('member-id').value = member.id || '';
    fields('member', memberFields, member);
    $('member-birth-hour').readOnly = Boolean(member.id);
    const legacy = [member.calendarType, member.birthYear, member.birthMonth, member.birthDay].filter(Boolean);
    $('member-legacy-birthday').textContent = legacy.length ? legacy.join(' / ') : '無既有資料';
    $('member-status').textContent = '';
    $('member-editor').hidden = false;
  }

  async function openHousehold(household, current) {
    householdId = household.id || '';
    const id = householdId;
    $('household-id').value = id;
    fields('household', householdFields, household);
    $('household-editor').hidden = false;
    $('member-editor').hidden = true;
    $('new-member').disabled = !id;
    $('lamp-save').disabled = true;
    $('lamp-member').replaceChildren(new Option('請選擇成員', ''));
    members = [];
    list('member-list', [], id ? '正在載入成員…' : '儲存家庭後即可新增成員。');
    if (!id) return;
    const found = await records(query(col('members'), where('householdId', '==', id)));
    if (!current() || householdId !== id || $('household-editor').hidden) return;
    members = found;
    list('member-list', members.map(member => row(
      [member.name, member.relationship, member.active === false ? '已停用' : ''].filter(Boolean).join(' · '),
      [['編輯', () => editMember(member)]]
    )), '尚無家庭成員。');
    const active = members.filter(member => member.active !== false);
    $('lamp-member').append(...active.map(member => new Option(
      [member.name, member.relationship].filter(Boolean).join(' · '), member.id
    )));
    $('lamp-save').disabled = household.active === false || !active.length;
  }

  bindForm('household-search-form', 'household-status', async current => {
    const term = $('household-search').value;
    const [households, people] = await Promise.all([records(col('households')), records(col('members'))]);
    if (!current()) return;
    const results = households.filter(household => matchesHouseholdSearch(
      household, people.filter(member => member.householdId === household.id), term
    ));
    list('household-search-results', results.map(household => row(
      [household.headName, household.phone, household.active === false ? '已停用' : ''].filter(Boolean).join(' · '),
      [['開啟', () => perform('household-status', check => openHousehold(household, check))]]
    )), '沒有符合的家庭。');
    return `找到 ${results.length} 戶。`;
  });

  $('new-household').addEventListener('click', () => perform('household-status', check => openHousehold({}, check)));
  $('household-close').addEventListener('click', () => { $('household-editor').hidden = true; });
  $('new-member').addEventListener('click', () => editMember());
  $('member-cancel').addEventListener('click', () => { $('member-editor').hidden = true; });

  bindForm('household-form', 'household-status', async current => {
    const data = normalizeHousehold(fields('household', householdFields));
    if (validateHousehold(data).length) return '請填寫戶主姓名。';
    const id = householdId;
    if (id) await updateDoc(ref('households', id), { ...data, ...audit() });
    const savedId = id || (await addDoc(col('households'), { ...data, ...created() })).id;
    if (current() && householdId === id && !$('household-editor').hidden) {
      await openHousehold({ ...data, id: savedId }, current);
    }
    return '已儲存家庭。';
  });

  bindForm('member-form', 'member-status', async current => {
    const data = normalizeMember({ householdId, ...fields('member', memberFields) });
    if (validateMember(data).length) return '請確認姓名及生日欄位。農曆年月日需一併填寫。';
    const { calendarType, birthYear, birthMonth, birthDay, isLeapMonth, birthHour, ...member } = data;
    const id = $('member-id').value;
    if (id) {
      const { householdId: parentId, ...changes } = member;
      await updateDoc(ref('members', id), { ...changes, ...audit() });
    } else {
      await addDoc(col('members'), { ...member, birthHour, ...created() });
    }
    if (current() && householdId === data.householdId && !$('household-editor').hidden) {
      await openHousehold({
        ...fields('household', householdFields), id: data.householdId
      }, current);
      $('household-status').textContent = '已儲存成員。';
    }
  });

  bindForm('lamp-registration-form', 'lamp-status', async current => {
    const lampType = $('lamp-type').value;
    const data = normalizeRegistration({
      householdId, memberId: $('lamp-member').value, year: Number($('lamp-year').value) + 1911,
      lampType, ...LAMP_ITEMS[lampType], notes: $('lamp-notes').value
    });
    if (validateRegistration(data).length) return '請確認成員、年度及登記項目。';
    const registration = ref('lampRegistrations', makeRegistrationId(data.memberId, data.year, lampType));
    const record = {
      ...data, ...created(), registeredAt: serverTimestamp(), cancelledAt: null, amountPaid: 0, paidOn: ''
    };
    await runTransaction(db, async transaction => {
      if ((await transaction.get(registration)).exists()) throw new Error('duplicate');
      transaction.set(registration, record);
    });
    if (current() && householdId === data.householdId) $('lamp-notes').value = '';
    return '已建立登記。可到斗燈登記總表更新繳費。';
  });

  function closePayment() {
    paymentId = '';
    paymentRevision = null;
    $('lamp-payment-form').hidden = true;
    $('lamp-payment-form').reset();
    $('lamp-payment-status').textContent = '';
  }

  function editPayment(item, name) {
    paymentId = item.id;
    paymentRevision = item.updatedAt;
    $('lamp-payment-registration').textContent = `${name} · 民國 ${item.year - 1911} 年 · ${item.itemName} · 應收 ${item.amount} 元`;
    $('lamp-amount-paid').max = item.amount;
    $('lamp-amount-paid').value = item.amountPaid ?? '';
    $('lamp-paid-on').value = item.paidOn ?? '';
    $('lamp-payment-status').textContent = '';
    $('lamp-payment-form').hidden = false;
    $('lamp-amount-paid').focus();
  }

  async function renderRegistrations(current) {
    const year = $('lamp-filter-year').value;
    const type = $('lamp-filter-type').value;
    const status = $('lamp-filter-status').value;
    const payment = $('lamp-filter-payment').value;
    const term = normalizeSearchTerm($('lamp-filter-name').value);
    const source = year ? query(col('lampRegistrations'), where('year', '==', Number(year) + 1911)) : col('lampRegistrations');
    const [registrations, people] = await Promise.all([records(source), records(col('members'))]);
    if (!current()) return;
    const names = new Map(people.map(member => [member.id, member.name]));
    const results = registrations.filter(item =>
      (!type || item.lampType === type) && (!status || item.status === status) &&
      (!payment || paymentStatus(item) === payment) &&
      (!term || normalizeSearchTerm(names.get(item.memberId)).includes(term))
    ).sort((a, b) => b.year - a.year || (a.itemName || '').localeCompare(b.itemName || '', 'zh-TW'));
    list('lamp-registration-list', results.map(item => {
      const name = names.get(item.memberId) || '成員資料缺失';
      const state = paymentStatus(item);
      const details = [
        `民國 ${item.year - 1911} 年`, name, item.itemName, `應收 ${item.amount} 元`,
        paymentLabels[state], state !== 'unknown' && `實收 ${item.amountPaid} 元`,
        item.paidOn, item.status === 'cancelled' && '已取消', item.notes
      ].filter(Boolean).join(' · ');
      return row(details, item.status === 'registered' ? [['修改繳費', () => editPayment(item, name)]] : []);
    }), '沒有符合的登記。');
    return `找到 ${results.length} 筆登記。`;
  }

  $('lamp-payment-close').addEventListener('click', closePayment);
  bindForm('lamp-filters-form', 'lamp-list-status', renderRegistrations);
  bindForm('lamp-payment-form', 'lamp-payment-status', async current => {
    const id = paymentId;
    const previous = paymentRevision;
    const amountPaid = $('lamp-amount-paid').valueAsNumber;
    const paidOn = $('lamp-paid-on').value;
    if (!validPayment(Number($('lamp-amount-paid').max), amountPaid, paidOn)) {
      return '請確認實收金額。實收大於零時須填收款日期，未收款時請清空日期。';
    }
    const registration = ref('lampRegistrations', id);
    const changes = { amountPaid, paidOn, ...audit() };
    await runTransaction(db, async transaction => {
      const item = (await transaction.get(registration)).data();
      if (!item || item.status !== 'registered' || !item.updatedAt?.isEqual(previous)) {
        throw new Error('payment-changed');
      }
      transaction.update(registration, changes);
    });
    if (current()) {
      if (paymentId === id) closePayment();
      await perform('lamp-list-status', async check => {
        await renderRegistrations(check);
        return '已儲存繳費資料。';
      });
    }
  });

  return {
    setUser(next) {
      user = next;
      revision++;
      householdId = '';
      members = [];
      closePayment();
      $('household-editor').hidden = true;
      $('member-editor').hidden = true;
      $('household-form').reset();
      $('member-form').reset();
      $('household-search-form').reset();
      $('lamp-registration-form').reset();
      $('lamp-filters-form').reset();
      $('lamp-year').value = Number(new Intl.DateTimeFormat('en', {
        year: 'numeric', timeZone: 'Asia/Taipei'
      }).format(new Date())) - 1911;
      for (const id of ['household-status', 'member-status', 'lamp-status', 'lamp-list-status']) $(id).textContent = '';
      list('household-search-results', [], '請輸入條件搜尋家庭。');
      list('member-list', [], '尚無家庭成員。');
      $('lamp-member').replaceChildren(new Option('請選擇成員', ''));
      list('lamp-registration-list', [], '請開啟斗燈登記總表載入資料。');
      if (user && !$('tab-lamps').hidden) this.loadRegistrations();
    },
    loadRegistrations() {
      return perform('lamp-list-status', renderRegistrations);
    }
  };
}
