(() => {
  const holyDays = [
    { month: 1, day: 9, lunar: '正月初九', name: '玉皇大天尊', type: '神佛聖誕' },
    { month: 2, day: 2, lunar: '二月初二', name: '福德正神', type: '神佛聖誕' },
    { month: 2, day: 15, lunar: '二月十五', name: '太上道祖', type: '神佛聖誕' },
    { month: 2, day: 19, lunar: '二月十九', name: '觀音佛祖、如來佛祖', type: '神佛聖誕' },
    { month: 4, day: 18, lunar: '四月十八', name: '碧霞元君、紫微大帝', type: '神佛聖誕' },
    { month: 4, day: 25, lunar: '四月廿五', name: '二郎神君', type: '神佛聖誕' },
    { month: 4, day: 26, lunar: '四月廿六', name: '李府千歲、飛虎將軍、虎爺公', type: '神佛聖誕' },
    { month: 4, day: 27, lunar: '四月廿七', name: '范府千歲', type: '神佛聖誕' },
    { month: 5, day: 9, lunar: '五月初九', name: '鳳陽老母', type: '神佛聖誕' },
    { month: 5, day: 18, lunar: '五月十八', name: '張府天師', type: '神佛聖誕' },
    { month: 6, day: 18, lunar: '六月十八', name: '池府千歲', type: '神佛聖誕' },
    { month: 6, day: 24, lunar: '六月廿四', name: '關聖帝君', type: '神佛聖誕' },
    { month: 7, day: 7, lunar: '七月初七', name: '註生娘娘', type: '神佛聖誕' },
    { month: 7, day: 29, lunar: '七月廿九', name: '地藏王菩薩', type: '神佛聖誕' },
    { month: 9, day: 9, lunar: '九月初九', name: '中壇元帥、太子元帥', type: '神佛聖誕' },
    { month: 9, day: 15, lunar: '九月十五', name: '吳府千歲', type: '神佛聖誕' },
    { month: 10, day: 24, lunar: '十月廿四', name: '朱府千歲', type: '神佛聖誕' }
  ];

  const chineseDigits = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9
  };

  function chineseNumberToInt(text) {
    text = String(text).replace(/[年月日初]/g, '').replace(/^正$/, '1');
    if (/^\d+$/.test(text)) return Number(text);
    if (text === '十') return 10;
    if (text.startsWith('廿')) return 20 + (chineseDigits[text[1]] || 0);
    if (text.startsWith('卅')) return 30 + (chineseDigits[text[1]] || 0);
    if (text.includes('十')) {
      const [a, b] = text.split('十');
      const tens = a ? (chineseDigits[a] || 0) : 1;
      const ones = b ? (chineseDigits[b] || 0) : 0;
      return tens * 10 + ones;
    }
    return chineseDigits[text] || 0;
  }

  const lunarFormatter = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { month: 'long', day: 'numeric' });

  function getLunarMonthDay(date) {
    const parts = lunarFormatter.formatToParts(date);
    const monthPart = parts.find(p => p.type === 'month')?.value || '';
    const dayPart = parts.find(p => p.type === 'day')?.value || '';
    if (monthPart.includes('閏')) return null;
    return { month: chineseNumberToInt(monthPart), day: chineseNumberToInt(dayPart) };
  }

  function lunarMonthName(month) {
    return month === 1 ? '正月' : `${['','一','二','三','四','五','六','七','八','九','十','十一','十二'][month]}月`;
  }

  function lunarDayName(day) {
    if (day === 1) return '初一';
    if (day === 15) return '十五';
    return String(day);
  }

  function sameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function formatGregorian(date) {
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function eventsForLunarDate(lunar) {
    const events = holyDays.filter(item => item.month === lunar.month && item.day === lunar.day);

    // 隴善堂例行誦經：每月農曆初一、十五；農曆七月初一及十五不舉行。
    if (lunar.month !== 7 && (lunar.day === 1 || lunar.day === 15)) {
      events.push({
        month: lunar.month,
        day: lunar.day,
        lunar: `${lunarMonthName(lunar.month)}${lunarDayName(lunar.day)}`,
        name: '誦經祈福',
        type: '誦經祈福'
      });
    }

    return events;
  }

  function findUpcoming(count = 4) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const results = [];

    for (let offset = 0; offset <= 500 && results.length < count; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const lunar = getLunarMonthDay(date);
      if (!lunar) continue;

      eventsForLunarDate(lunar).forEach(item => {
        if (results.length < count) results.push({ ...item, date, isToday: sameLocalDay(date, today) });
      });
    }
    return results;
  }

  function render() {
    const grid = document.getElementById('upcoming-holy-days');
    if (!grid) return;
    const upcoming = findUpcoming(4);
    if (!upcoming.length) return;

    grid.innerHTML = upcoming.map(item => {
      const typeClass = item.type === '誦經祈福' ? 'is-prayer' : 'is-birthday';
      return `
        <div class="holy-event-card ${typeClass}">
          <small class="event-type">${item.type}</small>
          <strong>${item.lunar}${item.isToday ? '・今日' : ''}</strong>
          <span>${item.name}</span>
          <small class="gregorian-date">國曆 ${formatGregorian(item.date)}</small>
        </div>
      `;
    }).join('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
