import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('public/pages/admin.html', 'utf8');
const css = readFileSync('public/admin.css', 'utf8');

test('admin page keeps existing features and adds household and lamp tabs', () => {
  for (const existingId of ['tab-messages', 'tab-news', 'messages-list', 'news-form', 'news-admin-list']) {
    assert.match(html, new RegExp(`id="${existingId}"`), `missing existing #${existingId}`);
  }
  for (const tab of ['households', 'lamps']) {
    assert.match(html, new RegExp(`data-tab="${tab}"`), `missing ${tab} tab button`);
    assert.match(html, new RegExp(`id="tab-${tab}"[^>]*hidden`), `missing hidden ${tab} panel`);
  }
});

test('household management exposes the approved forms and result containers', () => {
  for (const formId of [
    'household-search-form',
    'household-form',
    'member-form',
    'lamp-registration-form',
    'lamp-filters-form'
  ]) {
    assert.match(html, new RegExp(`<form[^>]+id="${formId}"`), `missing #${formId}`);
  }
  for (const containerId of [
    'household-search-results',
    'household-editor',
    'member-list',
    'member-editor',
    'lamp-registration-list'
  ]) {
    assert.match(html, new RegExp(`id="${containerId}"`), `missing #${containerId}`);
  }
});

test('new admin controls have explicit accessible labels and live statuses', () => {
  const labelledIds = [
    'household-search', 'household-head-name', 'household-phone', 'household-telephone',
    'household-email', 'household-address', 'household-notes', 'member-name',
    'member-relationship', 'member-gender', 'member-address', 'member-birth-gregorian',
    'member-birth-lunar-year', 'member-birth-lunar-month', 'member-birth-lunar-day',
    'member-birth-lunar-leap', 'member-birth-hour', 'member-phone', 'member-notes',
    'lamp-member', 'lamp-year', 'lamp-type', 'lamp-notes', 'lamp-filter-year',
    'lamp-filter-type', 'lamp-filter-status', 'lamp-filter-name'
  ];
  for (const id of labelledIds) {
    assert.match(html, new RegExp(`<label[^>]+for="${id}"`), `#${id} needs an explicit label`);
    assert.match(html, new RegExp(`id="${id}"`), `missing labelled control #${id}`);
  }
  for (const statusId of ['household-status', 'member-status', 'lamp-status', 'lamp-list-status']) {
    assert.match(
      html,
      new RegExp(`id="${statusId}"[^>]+role="status"[^>]+aria-live="polite"`),
      `#${statusId} needs a polite live status`
    );
  }
});

test('legacy birthday is read-only and lamp choices show approved price snapshots', () => {
  assert.match(html, /id="member-legacy-birthday"[^>]*aria-live="polite"/);
  assert.match(html, /value="taisui"[^>]*>太歲（300 元）<\/option>/);
  assert.match(html, /value="dou_deng"[^>]*>斗燈（1,200 元）<\/option>/);
  assert.doesNotMatch(html, /<a[^>]+(?:cancel|取消登記)/i);
});

test('household admin layout provides focus and responsive states', () => {
  assert.match(css, /\.admin-workspace-grid/);
  assert.match(css, /\.admin-form[^}]*:focus/);
  assert.match(css, /@media\(max-width:860px\)/);
  assert.match(css, /\.admin-workspace-grid\{grid-template-columns:1fr\}/);
});
