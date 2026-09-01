export function getAiResponse(question = '') {
  const q = String(question).trim();
  if (!q) return { text: '請輸入想查詢的內容，例如：最近的神佛聖誕、最新公告、隴善堂在哪裡，或周文王先天易卦。' };

  if (/聖誕|神佛|生日|農曆/.test(q) && !/是誰|介紹|典故/.test(q)) {
    return { text: '可以前往「神佛聖誕」查詢隴善堂整理的聖誕日期與近期聖誕資訊。', action: '/pages/birthdays.html', actionLabel: '查看神佛聖誕' };
  }
  if (/公告|活動|消息|法會/.test(q)) {
    return { text: '最新公告與活動資訊以隴善堂公告中心發布內容為準。', action: '/pages/news.html', actionLabel: '查看最新公告' };
  }
  if (/易卦|占卜|起卦|文王|抽籤/.test(q)) {
    return { text: '可進入「周文王先天易卦」服務。請保持一事一問、誠心敬意，卦象作為方向參考。', action: '/pages/divination.html', actionLabel: '前往周文王先天易卦' };
  }
  if (/地址|在哪|位置|電話|聯絡|地圖|導航|google\s*maps?|社群|line/i.test(q)) {
    return {
      text: '隴善堂地址：831 高雄市大寮區中興里捷西路51巷116號。\n聯絡電話：07-7813731。\n可點下方「開啟 Google 地圖」直接導航；其他聯絡方式與 LINE 社群可前往「聯絡我們」頁面查看。',
      action: 'https://www.google.com/maps/search/?api=1&query=22.613886087464497%2C120.39170258910214',
      actionLabel: '開啟 Google 地圖'
    };
  }
  if (/隴善堂|介紹|道場|宗旨|精神/.test(q)) {
    return { text: '隴善堂以敬天、禮神、行善、教化、結緣為核心精神，兼容佛道信仰文化。', action: '/pages/about.html', actionLabel: '認識隴善堂' };
  }
  if (/佛|菩薩|神明|道祖|天尊|帝君|娘娘|千歲|太子|觀音|典故|文化/.test(q)) {
    return { text: '這屬於信仰文化問題。AI 智慧服務可協助提供宗教文化與民俗背景的輔助說明，但不代表神明指示或宗教裁示。' };
  }

  return { text: '目前 V1 先提供隴善堂網站導覽、神佛聖誕、公告活動、聯絡資訊、周文王先天易卦與基礎信仰文化引導。之後串接 AI API 後，會再擴充更完整的自然語言問答。' };
}
