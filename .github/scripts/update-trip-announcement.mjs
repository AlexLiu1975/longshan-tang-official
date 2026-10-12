import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';

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

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, 'base64url')}`;
  const response = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`OAuth failed: ${result.error || response.status}`);
  return result.access_token;
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required');
const credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
const accessToken = await getAccessToken(credentials);
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/news`;
const listResponse = await fetch(baseUrl, { headers: { authorization: `Bearer ${accessToken}` } });
const list = await listResponse.json();
if (!listResponse.ok) throw new Error(`Firestore list failed: ${list.error?.message || listResponse.status}`);

const announcement = (list.documents || []).find(item => item.fields?.title?.stringValue === title);
if (!announcement) throw new Error(`Announcement not found: ${title}`);

const patchUrl = `${announcement.name.replace('projects/', 'https://firestore.googleapis.com/v1/projects/')}?updateMask.fieldPaths=content&updateMask.fieldPaths=updatedAt`;
const patchResponse = await fetch(patchUrl, {
  method: 'PATCH',
  headers: {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    fields: {
      content: { stringValue: content },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  })
});
const updated = await patchResponse.json();
if (!patchResponse.ok) throw new Error(`Firestore update failed: ${updated.error?.message || patchResponse.status}`);
if (updated.fields?.content?.stringValue !== content) throw new Error('Updated content did not match the requested announcement');
console.log(`Updated announcement ${announcement.name.split('/').pop()} with ${content.split('\n').length} lines.`);
