import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import * as app from '../public/xiao-liu-ren.js';
const { Solar } = createRequire(import.meta.url)('../public/vendor/lunar.js');

test('instant input always uses Taipei across UTC midnight and year boundaries', () => {
  assert.deepEqual(app.currentSolarInput(new Date('2025-12-31T16:00:00Z')), { date: '2026-01-01', time: '00:00', second: 0 });
  assert.deepEqual(app.currentSolarInput(new Date('2026-10-02T15:00:09Z')), { date: '2026-10-02', time: '23:00', second: 9 });
  assert.throws(() => app.currentSolarInput(new Date('invalid')), RangeError);
});

test('all twelve hour boundaries retain the original counting order', () => {
  const expected = ['子','子','丑','丑','寅','寅','卯','卯','辰','辰','巳','巳','午','午','未','未','申','申','酉','酉','戌','戌','亥','亥','子'];
  for (let hour = 0; hour < 24; hour++) {
    assert.equal(app.branchFromTime(hour), expected[hour + 1]);
  }
  assert.equal(app.BRANCH_LABELS[0], '1．子時 23:00–00:59');
  assert.equal(app.BRANCH_LABELS[11], '12．亥時 21:00–22:59');
});

const pillars = (date, time, second = 0) => app.fourPillars({date, time, second}, Solar);
test('January first does not change the pillar year', () => {
  assert.equal(pillars('2025-12-31', '12:00').year, '乙巳');
  assert.equal(pillars('2026-01-01', '12:00').year, '乙巳');
});
test('Li Chun changes year and month at the exact second, before lunar New Year', () => {
  assert.deepEqual(pillars('2026-02-04', '04:02', 7), {year:'乙巳',month:'己丑',day:'己酉',hour:'丙寅'});
  assert.deepEqual(pillars('2026-02-04', '04:02', 8), {year:'丙午',month:'庚寅',day:'己酉',hour:'丙寅'});
  assert.equal(pillars('2026-02-17', '12:00').year, '丙午');
});
test('a jie changes the month at its instant; a zhongqi does not', () => {
  assert.equal(pillars('2026-03-05','21:58',59).month, '庚寅');
  assert.equal(pillars('2026-03-05','21:59',0).month, '辛卯');
  assert.equal(pillars('2026-03-20','00:00').month,'辛卯');
  assert.equal(pillars('2026-03-21','00:00').month,'辛卯');
});
test('zi initial changes day and hour stem together; midnight keeps that day', () => {
  assert.deepEqual(pillars('2026-10-02','22:59',59),{year:'丙午',month:'丁酉',day:'己酉',hour:'乙亥'});
  assert.deepEqual(pillars('2026-10-02','23:00'),{year:'丙午',month:'丁酉',day:'庚戌',hour:'丙子'});
  assert.deepEqual(pillars('2026-10-03','00:59',59),{year:'丙午',month:'丁酉',day:'庚戌',hour:'丙子'});
  assert.equal(pillars('2026-10-03','01:00').hour,'丁丑');
  assert.equal(pillars('2025-12-31','23:00').day,pillars('2026-01-01','00:00').day);
});
test('Click108 calendar fixtures preserve civil lunar date for the original reading', () => {
  assert.deepEqual(app.convertSolarInput({date:'2026-10-02',time:'23:00'},Solar),
    {lunarYear:2026,lunarMonth:8,lunarDay:22,isLeapMonth:false,branch:'子'});
  assert.equal(app.convertSolarInput({date:'2026-02-03',time:'12:00'},Solar).lunarDay,16);
  assert.equal(app.convertSolarInput({date:'2026-02-17',time:'12:00'},Solar).lunarDay,1);
  assert.deepEqual(app.convertSolarInput({date:'2027-01-01',time:'12:00'},Solar),
    {lunarYear:2026,lunarMonth:11,lunarDay:24,isLeapMonth:false,branch:'午'});
  assert.equal(app.calculateReading({lunarMonth:9,lunarDay:15,branch:'午'}).final,'小吉');
});
test('invalid calendar input fails without producing pillars', () => {
  for(const input of [{date:'2026-02-30',time:'12:00'},{date:'2026-01-01',time:'24:00'},{date:'2101-01-01',time:'00:00'},{date:'2026-01-01',time:'00:00',second:60}]) {
    assert.throws(()=>app.fourPillars(input,Solar),RangeError);
  }
});
