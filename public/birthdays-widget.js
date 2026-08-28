(() => {
  const holyDays = [
    { month: 1, day: 9, lunar: '正月初九', name: '玉皇大天尊' },
    { month: 2, day: 2, lunar: '二月初二', name: '福德正神' },
    { month: 2, day: 15, lunar: '二月十五', name: '太上道祖' },
    { month: 2, day: 19, lunar: '二月十九', name: '觀音佛祖、如來佛祖' },
    { month: 4, day: 18, lunar: '四月十八', name: '碧霞元君、紫微大帝' },
    { month: 4, day: 25, lunar: '四月廿五', name: '二郎神君' },
    { month: 4, day: 26, lunar: '四月廿六', name: '李府千歲、飛虎將軍、虎爺公' },
    { month: 4, day: 27, lunar: '四月廿七', name: '范府千歲' },
    { month: 5, day: 9, lunar: '五月初九', name: '鳳陽老母' },
    { month: 5, day: 18, lunar: '五月十八', name: '張府天師' },
    { month: 6, day: 18, lunar: '六月十八', name: '池府千歲' },
    { month: 6, day: 24, lunar: '六月廿四', name: '關聖帝君' },
    { month: 7, day: 7, lunar: '七月初七', name: '註生娘娘' },
    { month: 7, day: 29, lunar: '七月廿九', name: '地藏王菩薩' },
    { month: 9, day: 9, lunar: '九月初九', name: '中壇元帥、太子元帥' },
    { month: 9, day: 15, lunar: '九月十五', name: '吳府千歲' },
    { month: 10, day: 24, lunar: '十月廿四', name: '朱府千歲' }
  ];

  const chineseDigits = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9
  };

  function chineseNumberToInt(text) {
    text = String(text)
      .replace(/[年月日初]/g, '')
      .replace(/^正$/, '1');

    if (/^\d+$/.test(text)) return Number(text);
    if (text === '十') return 10;

    if (text.startsWith('廿')) {
      return 20 + (chineseDigits[text[1]] || 0);
    }

    if (text.startsWith('卅')) {
      return 30 + (chineseDigits[text[1]] || 0);
    }

    if (text.includes('十')) {
      const [a, b] = text.split('十');
      const tens = a ? (chineseDigits[a] || 0) : 1;
      const ones = b ? (chineseDigits[b] || 0) : 0;
      return tens * 10 + ones;
    }

    return chineseDigits[text] || 0;
  }

  const lunarFormatter = new Intl.DateTimeFormat(
    'zh-TW-u-ca-chinese',
    { month: 'long', day: 'numeric' }
  );

  function getLunarMonthDay(date) {
    const parts = lunarFormatter.formatToParts(date);

    const monthPart = parts.find(p => p.type === 'month')?.value || '';
    const dayPart = parts.find(p => p.type === 'day')?.value || '';

    // 隴善堂目前聖誕資料均以一般農曆月份為準，不採閏月。
    if (monthPart.includes('閏')) return null;

    return {
      month: chineseNumberToInt(monthPart),
      day: chineseNumberToInt(dayPart)
    };
  }

  function sameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function formatGregorian(date) {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  function findUpcoming(count = 4) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const results = [];

    // 掃描未來 500 天，足以涵蓋跨農曆年的下一輪聖誕。
    for (let offset = 0; offset <= 500 && results.length < count; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);

      const lunar = getLunarMonthDay(date);
      if (!lunar) continue;

      const matches = holyDays.filter(
        item => item.month === lunar.month && item.day === lunar.day
      );

      matches.forEach(item => {
        if (results.length < count) {
          results.push({
            ...item,
            date,
            isToday: sameLocalDay(date, today)
          });
        }
      });
    }

    return results;
  }

  function render() {
    const grid = document.getElementById('upcoming-holy-days');
    if (!grid) return;

    const upcoming = findUpcoming(4);
    if (!upcoming.length) return;

    grid.innerHTML = upcoming.map(item => `
      <div>
        <strong>${item.lunar}${item.isToday ? '・今日' : ''}</strong>
        <span>${item.name}</span>
        <small style="display:block;margin-top:8px;color:#8a6f60;">
          國曆 ${formatGregorian(item.date)}
        </small>
      </div>
    `).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
