const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));
const cases = {
  air: { title: '宿舍空调维修进度', copy: '已联系物业确认配件到货，预计今日 18:00 前完成一次进度回访。', tag: '住宿生活', status: '处理中', progress: '68%' },
  queue: { title: '食堂窗口排队体验', copy: '已整理高峰时段观察记录，等待与餐饮中心确认现场优化方案。', tag: '餐饮服务', status: '待回访', progress: '82%' },
  class: { title: '公共教室开放建议', copy: '建议已纳入本月空间使用复盘，处理结果已同步至 SIEHUB 通知中心。', tag: '学习空间', status: '已归档', progress: '100%' }
};
document.querySelectorAll('.case-row').forEach((row) => row.addEventListener('click', () => {
  const item = cases[row.dataset.case];
  if (!item) return;
  document.querySelectorAll('.case-row').forEach((node) => node.classList.remove('selected'));
  row.classList.add('selected');
  document.querySelector('.desk-detail small').textContent = `CASE DETAIL / ${row.querySelector('.case-index').textContent}`;
  document.querySelector('.detail-status').textContent = item.status;
  document.querySelector('#case-title').textContent = item.title;
  document.querySelector('#case-copy').textContent = item.copy;
  document.querySelector('#case-tag').textContent = item.tag;
  document.querySelector('.mini-progress span').style.width = item.progress;
}));

const showcaseItems = [
  { title: '权益反馈回访', category: 'SIEVOX FIELD', caption: '问题跟进 · 现场记录' },
  { title: '提案大赛', category: 'PROPOSAL', caption: '观察成案 · 方案展示' },
  { title: '心栖 SIE', category: 'WELLBEING', caption: '情绪关怀 · 温柔空间' },
  { title: '权益服务日', category: 'SERVICE DAY', caption: '面对面沟通 · 闭环反馈' }
];
let activeGalleryIndex = 0;
const galleryModal = document.querySelector('#galleryModal');
const galleryImage = document.querySelector('#galleryImage');
const galleryCaption = document.querySelector('#galleryCaption');
const galleryCounter = document.querySelector('#galleryCounter');
const galleryTitle = document.querySelector('#galleryTitle');
const galleryCategory = document.querySelector('#galleryCategory');
const galleryThumbs = document.querySelector('#galleryThumbs');
const galleryClose = document.querySelector('#galleryClose');
const placeholderImage = (item, index) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 780"><rect width="1200" height="780" fill="#174c41"/><rect x="74" y="74" width="1052" height="632" fill="none" stroke="#d5a542" stroke-width="4" opacity=".75"/><text x="94" y="150" fill="#f1e8db" font-family="serif" font-size="42" font-weight="700">${String(index + 1).padStart(2, '0')} / ${item.category}</text><text x="94" y="410" fill="#f1e8db" font-family="serif" font-size="88" font-weight="700">${item.title}</text><text x="94" y="500" fill="#f1e8db" font-family="sans-serif" font-size="30" opacity=".72">Image placeholder - published photos will appear here</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const imageFor = (index) => placeholderImage(showcaseItems[index], index);
const renderGallery = (index) => {
  activeGalleryIndex = (index + showcaseItems.length) % showcaseItems.length;
  const item = showcaseItems[activeGalleryIndex];
  galleryImage.src = imageFor(activeGalleryIndex);
  galleryImage.alt = item.title;
  galleryCaption.textContent = item.caption;
  galleryTitle.textContent = item.title;
  galleryCategory.textContent = item.category;
  galleryCounter.textContent = `${String(activeGalleryIndex + 1).padStart(2, '0')} / ${String(showcaseItems.length).padStart(2, '0')}`;
  [...galleryThumbs.children].forEach((thumb, thumbIndex) => thumb.classList.toggle('active', thumbIndex === activeGalleryIndex));
};
const buildThumbs = () => {
  galleryThumbs.replaceChildren();
  showcaseItems.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `查看${item.title}`);
    const img = document.createElement('img');
    img.src = imageFor(index);
    img.alt = '';
    button.append(img);
    button.addEventListener('click', () => renderGallery(index));
    galleryThumbs.append(button);
  });
};
const openGallery = (index) => {
  buildThumbs();
  renderGallery(index);
  galleryModal.classList.add('open');
  galleryModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('gallery-open');
};
const closeGallery = () => {
  galleryModal.classList.remove('open');
  galleryModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('gallery-open');
};
document.querySelectorAll('.gallery-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => openGallery(Number(trigger.dataset.galleryIndex || 0)));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openGallery(Number(trigger.dataset.galleryIndex || 0));
    }
  });
});
galleryClose?.addEventListener('click', closeGallery);
document.querySelector('#galleryPrev')?.addEventListener('click', () => renderGallery(activeGalleryIndex - 1));
document.querySelector('#galleryNext')?.addEventListener('click', () => renderGallery(activeGalleryIndex + 1));
galleryModal?.addEventListener('click', (event) => {
  if (event.target === galleryModal) closeGallery();
});
document.addEventListener('keydown', (event) => {
  if (!galleryModal?.classList.contains('open')) return;
  if (event.key === 'Escape') closeGallery();
  if (event.key === 'ArrowLeft') renderGallery(activeGalleryIndex - 1);
  if (event.key === 'ArrowRight') renderGallery(activeGalleryIndex + 1);
});
