const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidDeleteConfirmation } = require('./siebridge');
const {
  buildWechatNoticePayload,
  normalizeDateToEndOfDay,
  normalizeWechatArticleUrl,
  sourceKeyFromWechatArticleUrl,
  parseWechatArticleHtml
} = require('./server');

test('SIEBridge approved resource deletion requires title or fixed confirmation phrase', () => {
  const resource = { title: 'Advanced Calculus Final Review' };

  assert.equal(isValidDeleteConfirmation(resource, 'Advanced Calculus Final Review'), true);
  assert.equal(isValidDeleteConfirmation(resource, '确认删除'), true);
  assert.equal(isValidDeleteConfirmation(resource, '  确认删除  '), true);
  assert.equal(isValidDeleteConfirmation(resource, ''), false);
  assert.equal(isValidDeleteConfirmation(resource, 'delete'), false);
  assert.equal(isValidDeleteConfirmation(resource, 'Advanced Calculus'), false);
});

test('WeChat notice source key includes article id, update time, and item index', () => {
  const payload = buildWechatNoticePayload(
    { article_id: 'article-123', update_time: 1800000000, content: {} },
    { title: '国教空间推送', digest: '摘要', url: 'https://example.com/a' },
    2,
    { organization: 'student_union', department: 'new_media' }
  );

  assert.equal(payload.source, 'wechat_mp');
  assert.equal(payload.sourceExternalId, 'article-123:1800000000:2');
  assert.equal(payload.status, 'published');
});

test('notice dateTo filter includes the full selected day', () => {
  const date = normalizeDateToEndOfDay('2026-07-27');

  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 6);
  assert.equal(date.getDate(), 27);
  assert.equal(date.getHours(), 23);
  assert.equal(date.getMinutes(), 59);
  assert.equal(date.getSeconds(), 59);
});

test('wechat article helpers normalize links and parse page metadata', () => {
  const url = normalizeWechatArticleUrl('https://mp.weixin.qq.com/s/demo123?from=singlemessage');
  assert.equal(url, 'https://mp.weixin.qq.com/s/demo123?from=singlemessage');
  assert.equal(sourceKeyFromWechatArticleUrl(url), 'manual_link:demo123');

  const html = `
    <script>
      var msg_title = '国教空间&#x2014;测试推文';
      var msg_desc = '这是摘要';
      var msg_cdn_url = 'https://example.com/cover.jpg';
      var ct = '1800000000';
    </script>
  `;
  const payload = parseWechatArticleHtml(html, url, { organization: 'student_union', department: 'new_media' });

  assert.equal(payload.title.zh, '国教空间—测试推文');
  assert.equal(payload.summary.zh, '这是摘要');
  assert.equal(payload.coverImageUrl, 'https://example.com/cover.jpg');
  assert.equal(payload.sourceExternalId, 'manual_link:demo123');
  assert.equal(payload.status, 'published');
});
