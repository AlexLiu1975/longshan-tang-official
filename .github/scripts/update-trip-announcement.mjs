const projectId = 'longshan-tang-official';
const title = '丙午年農曆10月6至7日宜蘭三清宮進香神尊名冊';
const content = `進香日期：丙午年農曆10月6至7日
進香地點：宜蘭三清宮
名冊確認：農曆9月1日晚上博杯

堂內神尊（8尊）
1. 李府千歲
2. 天師祖
3. 中壇元帥
4. 二郎神君
5. 朱府千歲
6. 關聖帝君
7. 虎爺
8. 李府二千歲

各家神尊（14尊）
1. 簡家天師祖（簡O財）
2. 宋家觀音佛祖（宋O秀）
3. 鳳陽老母（王O雄）
4. 中壇元帥（歐O喆）
5. 詹家天師祖（邱O香）
6. 福德正神（洪O成）
7. 蘇家順天聖母（許O連）
8. 葉家關聖帝君（葉O芸）
9. 林家天師祖（林O坤）
10. 李府千歲（蔡O文）
11. 楊家觀音佛祖（邱O錦）
12. 朱府千歲（陳O逞）
13. 方家觀音佛祖（方O泰）
14. 吳府千歲（吳O聰）`;

const databaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const queryResponse = await fetch(`${databaseUrl}:runQuery`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'news' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'published' },
          op: 'EQUAL',
          value: { booleanValue: true }
        }
      }
    }
  })
});
const results = await queryResponse.json();
if (!queryResponse.ok) throw new Error(`Firestore query failed: ${results.error?.message || queryResponse.status}`);
const announcement = results.map(item => item.document).find(item => item?.fields?.title?.stringValue === title);
if (!announcement) throw new Error(`Announcement not found: ${title}`);

const patchResponse = await fetch(`https://firestore.googleapis.com/v1/${announcement.name}?updateMask.fieldPaths=content`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ fields: { content: { stringValue: content } } })
});
const updated = await patchResponse.json();
if (!patchResponse.ok) throw new Error(`Firestore update failed: ${updated.error?.message || patchResponse.status}`);
if (updated.fields?.content?.stringValue !== content) throw new Error('Updated content did not match the requested announcement');
console.log(`Updated announcement ${announcement.name.split('/').pop()} with ${content.split('\n').length} lines.`);
