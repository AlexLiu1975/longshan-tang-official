export const PALACES = Object.freeze(['大安', '留連', '速喜', '赤口', '小吉', '空亡']);
export const BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);

const MEANINGS = {
  大安: '安定平穩，宜守成並按部就班。', 留連: '進展較慢，宜耐心整理再行動。',
  速喜: '喜訊較快，宜把握時機積極推進。', 赤口: '言語是非較多，宜謹慎溝通。',
  小吉: '小有助力，穩健行動可漸入佳境。', 空亡: '條件未足，宜暫緩並重新確認。',
};

function stepFrom(start, count) {
  if (!PALACES.includes(start) || !Number.isInteger(count) || count < 1) throw new RangeError('推算輸入不正確');
  const startIndex = PALACES.indexOf(start);
  const path = Array.from({ length: count }, (_, index) => PALACES[(startIndex + index) % PALACES.length]);
  return { start, count, path, result: path.at(-1) };
}

export function calculateReading({ lunarMonth, lunarDay, branch }) {
  if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) throw new RangeError('農曆月份須為 1 至 12');
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) throw new RangeError('農曆日期須為 1 至 30');
  const branchIndex = BRANCHES.indexOf(branch);
  if (branchIndex < 0) throw new RangeError('請選擇正確時辰');
  const month = stepFrom('大安', lunarMonth);
  const day = stepFrom(month.result, lunarDay);
  const hour = stepFrom(day.result, branchIndex + 1);
  return { month, day, hour, results: [month.result, day.result, hour.result], final: hour.result };
}

export function branchFromTime(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError('時間超出範圍');
  return hour === 23 || hour === 0 ? '子' : BRANCHES[Math.floor((hour + 1) / 2)];
}

export function currentSolarInput(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new RangeError('目前時間無法讀取');
  const pad = (value) => String(value).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export function convertSolarInput({ date, time }, SolarClass = globalThis.Solar) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || date < '1901-01-01' || date > '2100-12-31') throw new RangeError('國曆日期超出支援範圍');
  if (!/^\d{2}:\d{2}$/.test(time ?? '')) throw new RangeError('時間格式不正確');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59) throw new RangeError('日期或時間不正確');
  if (!SolarClass) throw new Error('農曆轉換程式尚未載入');
  const lunar = SolarClass.fromYmd(year, month, day).getLunar();
  const rawMonth = lunar.getMonth();
  return { lunarYear: lunar.getYear(), lunarMonth: Math.abs(rawMonth), lunarDay: lunar.getDay(), isLeapMonth: rawMonth < 0, branch: branchFromTime(hour) };
}

function formatPath(step) { return step.path.join(' → '); }

function init() {
  const root = document.querySelector('[data-xlr-app]');
  if (!root) return;
  const modes = [...root.querySelectorAll('[data-mode]')];
  const panels = [...root.querySelectorAll('[data-mode-panel]')];
  const result = root.querySelector('#xlr-result');
  const status = root.querySelector('#xlr-status');
  const pauseButton = root.querySelector('#xlr-pause');
  const skipButton = root.querySelector('#xlr-skip');
  let animationId = 0;
  let paused = false;
  let skipped = false;

  const daySelect = root.querySelector('[name="lunar-day"]');
  const branchSelect = root.querySelector('[name="branch"]');
  daySelect.innerHTML = Array.from({ length: 30 }, (_, index) => `<option value="${index + 1}">${index + 1}日</option>`).join('');
  branchSelect.innerHTML = BRANCHES.map((branch) => `<option value="${branch}">${branch}時</option>`).join('');

  function selectMode(mode) {
    modes.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.modePanel !== mode; });
    status.textContent = '';
  }

  function resetPalm() {
    root.querySelectorAll('[data-palace]').forEach((node) => { node.dataset.state = 'idle'; });
  }

  function cancelAnimation() {
    animationId += 1;
    paused = false;
    skipped = false;
    pauseButton.textContent = '暫停動畫';
    pauseButton.hidden = true;
    skipButton.hidden = true;
    resetPalm();
  }

  const wait = (milliseconds, id) => new Promise((resolve) => {
    const tick = () => {
      if (id !== animationId || skipped) return resolve();
      if (paused) return setTimeout(tick, 80);
      setTimeout(resolve, milliseconds);
    };
    tick();
  });

  async function animate(reading) {
    const id = ++animationId;
    paused = false;
    skipped = false;
    pauseButton.textContent = '暫停動畫';
    pauseButton.hidden = false;
    skipButton.hidden = false;
    resetPalm();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const [label, step] of [['月宮', reading.month], ['日宮', reading.day], ['時宮', reading.hour]]) {
      status.textContent = `${label}推算中：${formatPath(step)}`;
      for (const palace of step.path) {
        if (id !== animationId || skipped) break;
        root.querySelectorAll('[data-palace]').forEach((node) => { node.dataset.state = node.dataset.state === 'current' ? 'visited' : node.dataset.state; });
        root.querySelector(`[data-palace="${palace}"]`).dataset.state = 'current';
        if (!reduced) await wait(280, id);
      }
      if (id !== animationId || skipped) break;
      root.querySelector(`[data-palace="${step.result}"]`).dataset.state = 'result';
    }
    if (id !== animationId) return;
    resetPalm();
    root.querySelector(`[data-palace="${reading.final}"]`).dataset.state = 'result';
    status.textContent = `完成：最終落宮為${reading.final}`;
    pauseButton.hidden = true;
    skipButton.hidden = true;
  }

  function render(reading, convertedText = '') {
    result.hidden = false;
    result.innerHTML = `${convertedText ? `<p class="converted-date">${convertedText}</p>` : ''}
      <div class="result-steps"><article><span>月宮</span><strong>${reading.month.result}</strong><p>${formatPath(reading.month)}</p></article>
      <article><span>日宮</span><strong>${reading.day.result}</strong><p>${formatPath(reading.day)}</p></article>
      <article><span>時宮・最終結果</span><strong>${reading.hour.result}</strong><p>${formatPath(reading.hour)}</p></article></div>
      <div class="final-meaning"><h3>${reading.final}</h3><p>${MEANINGS[reading.final]}</p></div>`;
    animate(reading);
  }

  function runSolar({ date, time }, prefix = '國曆') {
    let converted;
    try { converted = convertSolarInput({ date, time }); }
    catch (error) { cancelAnimation(); status.textContent = error.message; return; }
    const { lunarMonth, lunarDay, isLeapMonth, branch } = converted;
    const convertedText = `${prefix} ${date} ${time} → 農曆${isLeapMonth ? '閏' : ''}${lunarMonth}月${lunarDay}日・${branch}時`;
    if (isLeapMonth) {
      cancelAnimation();
      result.hidden = true;
      resetPalm();
      status.textContent = `${convertedText}。目前版本不處理閏月推算。`;
      return;
    }
    render(calculateReading({ lunarMonth, lunarDay, branch }), convertedText);
  }

  root.querySelector('#lunar-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    render(calculateReading({ lunarMonth: Number(data.get('lunar-month')), lunarDay: Number(data.get('lunar-day')), branch: data.get('branch') }));
  });

  root.querySelector('#solar-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get('solar-date'));
    const time = String(data.get('solar-time'));
    runSolar({ date, time });
  });

  root.querySelector('#xlr-now').addEventListener('click', () => {
    runSolar(currentSolarInput(), '即時起卦：國曆');
  });

  modes.forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));
  pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? '繼續動畫' : '暫停動畫'; });
  skipButton.addEventListener('click', () => { skipped = true; paused = false; });
  root.querySelectorAll('[data-practice-answer]').forEach((button) => button.addEventListener('click', () => {
    const answer = button.nextElementSibling;
    answer.hidden = !answer.hidden;
    button.setAttribute('aria-expanded', String(!answer.hidden));
  }));
  selectMode('lunar');
}

if (typeof document !== 'undefined') init();
