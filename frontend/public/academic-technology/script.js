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
const tabs = document.querySelectorAll('.filter-tabs button');
const rows = document.querySelectorAll('.library-row');
const search = document.querySelector('#resource-search');
const filterRows = () => {
  const filter = document.querySelector('.filter-tabs button.active')?.dataset.filter || 'all';
  const query = search.value.trim().toLowerCase();
  rows.forEach((row) => {
    const matchesType = filter === 'all' || row.dataset.type === filter;
    const matchesQuery = !query || row.dataset.search.includes(query);
    row.classList.toggle('is-hidden', !(matchesType && matchesQuery));
  });
};
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  filterRows();
}));
search?.addEventListener('input', filterRows);

const showcaseItems = [
  { title: 'SIE 学辅课堂', category: 'TUTORING', caption: '朋辈讲解 · 课程攻坚' },
  { title: '表达训练现场', category: 'SPEAK UP!', caption: '观点输出 · 舞台反馈' },
  { title: '挑战杯 / 萌芽杯', category: 'COMPETITION', caption: '选题讨论 · 项目打磨' },
  { title: '国奖答辩分享', category: 'SCHOLARSHIP', caption: '经验拆解 · 榜样引领' }
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 780"><rect width="1200" height="780" fill="#101b2d"/><path d="M80 130h1040M80 390h1040M80 650h1040M180 70v640M520 70v640M880 70v640" stroke="#65d7df" stroke-width="2" opacity=".18"/><rect x="76" y="76" width="1048" height="628" fill="none" stroke="#65d7df" stroke-width="4" opacity=".72"/><text x="96" y="152" fill="#e5bd51" font-family="serif" font-size="42" font-weight="700">${String(index + 1).padStart(2, '0')} / ${item.category}</text><text x="96" y="410" fill="#f8faf7" font-family="serif" font-size="84" font-weight="700">${item.title}</text><text x="96" y="500" fill="#f8faf7" font-family="sans-serif" font-size="30" opacity=".7">Image placeholder - published photos will appear here</text></svg>`;
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
