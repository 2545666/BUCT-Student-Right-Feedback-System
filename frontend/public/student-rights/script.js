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

const showcaseCards = [...document.querySelectorAll('.gallery-trigger')];
const showcaseItems = showcaseCards.map((card, index) => ({
  title: card.querySelector('.event-info h3')?.textContent?.trim() || 'Activity ' + String(index + 1).padStart(2, '0'),
  category: card.querySelector('.event-info small')?.textContent?.trim() || 'SHOWCASE',
  caption: card.querySelector('.event-info span')?.textContent?.trim() || 'Activity photo set'
}));
const placeholderCounts = [4, 3, 5, 4];
const storageKey = 'sievox-rights-showcase-photos-v1';
const galleryModal = document.querySelector('#galleryModal');
const galleryImage = document.querySelector('#galleryImage');
const galleryCaption = document.querySelector('#galleryCaption');
const galleryCounter = document.querySelector('#galleryCounter');
const galleryTitle = document.querySelector('#galleryTitle');
const galleryCategory = document.querySelector('#galleryCategory');
const galleryThumbs = document.querySelector('#galleryThumbs');
const galleryClose = document.querySelector('#galleryClose');
const cardPhotoIndexes = new Map();
let activeEventIndex = 0;
let activePhotoIndex = 0;

const escapeSvg = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const pad = (value) => String(value).padStart(2, '0');

const readStoredPhotos = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
  } catch (error) {
    return {};
  }
};

const storedPhotoSets = readStoredPhotos();

const saveStoredPhotos = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(storedPhotoSets));
  } catch (error) {
    console.warn('Photos are loaded for this session, but localStorage is full.', error);
  }
};

const localEditorParams = new URLSearchParams(window.location.search);
const isLocalEditor = false;

const placeholderImage = (item, eventIndex, photoIndex) => {
  const photoNumber = pad(photoIndex + 1);
  const total = pad(placeholderCounts[eventIndex] || 4);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 780">',
    '<rect width="1200" height="780" fill="#174c41"/>',
    '<circle cx="980" cy="128" r="132" fill="#df5a43" opacity=".2"/><circle cx="1040" cy="642" r="190" fill="#d5a542" opacity=".12"/>',
    '<rect x="74" y="74" width="1052" height="632" fill="none" stroke="#d5a542" stroke-width="4" opacity=".76"/>',
    '<text x="94" y="150" fill="#f2d27a" font-family="Georgia, serif" font-size="42" font-weight="700">' + pad(eventIndex + 1) + ' / ' + escapeSvg(item.category) + '</text>',
    '<text x="94" y="402" fill="#f8faf7" font-family="Georgia, serif" font-size="82" font-weight="700">' + escapeSvg(item.title) + '</text>',
    '<text x="94" y="496" fill="#f8faf7" font-family="Verdana, sans-serif" font-size="28" opacity=".72">Placeholder photo ' + photoNumber + ' of ' + total + '</text>',
    '<text x="94" y="574" fill="#d5a542" font-family="Verdana, sans-serif" font-size="22" opacity=".76">Upload multiple photos locally, then preview inside this activity.</text>',
    '<text x="1038" y="682" fill="#ffffff" font-family="Georgia, serif" font-size="72" font-weight="700" opacity=".2">SIEVOX</text>',
    '</svg>'
  ].join('');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const placeholderPhoto = (eventIndex, photoIndex) => {
  const item = showcaseItems[eventIndex] || {};
  return {
    src: placeholderImage(item, eventIndex, photoIndex),
    label: 'Placeholder ' + pad(photoIndex + 1),
    caption: (item.caption || 'Activity photo') + ' ? Placeholder ' + pad(photoIndex + 1)
  };
};

const getPhotoSet = (eventIndex) => {
  const publishedSet = window.SiePublishedShowcasePhotos?.[storageKey]?.[eventIndex];
  if (Array.isArray(publishedSet) && publishedSet.length) return publishedSet;
  const customSet = storedPhotoSets[eventIndex];
  if (Array.isArray(customSet) && customSet.length) return customSet;
  const count = placeholderCounts[eventIndex] || 4;
  return Array.from({ length: count }, (_, photoIndex) => placeholderPhoto(eventIndex, photoIndex));
};

const ensureDots = (stage, count) => {
  let dots = stage.querySelector('.photo-dots');
  if (!dots) {
    dots = document.createElement('div');
    dots.className = 'photo-dots';
    stage.append(dots);
  }
  if (dots.children.length !== count) {
    dots.replaceChildren(...Array.from({ length: count }, () => document.createElement('i')));
  }
  return dots;
};

const setCardPreview = (eventIndex, photoIndex) => {
  const card = showcaseCards[eventIndex];
  if (!card) return;
  const photos = getPhotoSet(eventIndex);
  const safeIndex = (photoIndex + photos.length) % photos.length;
  const photo = photos[safeIndex];
  const stage = card.querySelector('.upload-photo');
  const img = stage?.querySelector('img');
  const count = stage?.querySelector('.photo-count');
  if (!stage || !img || !photo) return;
  cardPhotoIndexes.set(eventIndex, safeIndex);
  stage.classList.add('has-image');
  img.src = photo.src;
  img.alt = photo.label || showcaseItems[eventIndex]?.title || '';
  if (count) count.textContent = pad(safeIndex + 1) + ' / ' + pad(photos.length);
  const dots = ensureDots(stage, photos.length);
  [...dots.children].forEach((dot, index) => dot.classList.toggle('active', index === safeIndex));
};

const renderGallery = (photoIndex) => {
  const photos = getPhotoSet(activeEventIndex);
  activePhotoIndex = (photoIndex + photos.length) % photos.length;
  const item = showcaseItems[activeEventIndex];
  const photo = photos[activePhotoIndex];
  if (!item || !photo) return;
  galleryImage.src = photo.src;
  galleryImage.alt = photo.label || item.title;
  galleryCaption.textContent = photo.caption || item.caption;
  galleryTitle.textContent = item.title;
  galleryCategory.textContent = item.category;
  galleryCounter.textContent = 'PHOTO ' + pad(activePhotoIndex + 1) + ' / ' + pad(photos.length);
  [...galleryThumbs.children].forEach((thumb, thumbIndex) => thumb.classList.toggle('active', thumbIndex === activePhotoIndex));
  setCardPreview(activeEventIndex, activePhotoIndex);
};

const buildThumbs = () => {
  const photos = getPhotoSet(activeEventIndex);
  galleryThumbs.replaceChildren();
  photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'View photo ' + pad(index + 1));
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = '';
    button.append(img);
    button.addEventListener('click', () => renderGallery(index));
    galleryThumbs.append(button);
  });
};

const openGallery = (eventIndex, photoIndex = 0) => {
  activeEventIndex = (eventIndex + showcaseItems.length) % showcaseItems.length;
  buildThumbs();
  renderGallery(photoIndex);
  galleryModal.classList.add('open');
  galleryModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('gallery-open');
};

const closeGallery = () => {
  galleryModal.classList.remove('open');
  galleryModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('gallery-open');
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({
    src: reader.result,
    label: file.name,
    caption: file.name.replace(/.[^.]+$/, '')
  });
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const attachUploadControls = (card, eventIndex) => {
  const stage = card.querySelector('.upload-photo');
  if (!stage) return;
  card.classList.add('local-editable');
  const tools = document.createElement('div');
  tools.className = 'photo-tools';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.hidden = true;
  const button = document.createElement('button');
  button.className = 'upload-trigger';
  button.type = 'button';
  button.textContent = '????';
  tools.append(button, input);
  stage.append(tools);
  tools.addEventListener('click', (event) => event.stopPropagation());
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const files = [...input.files].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    const photos = await Promise.all(files.slice(0, 12).map(readFileAsDataUrl));
    storedPhotoSets[eventIndex] = photos;
    saveStoredPhotos();
    setCardPreview(eventIndex, 0);
    if (galleryModal?.classList.contains('open') && activeEventIndex === eventIndex) {
      buildThumbs();
      renderGallery(0);
    }
    input.value = '';
  });
};

showcaseCards.forEach((card, eventIndex) => {
  setCardPreview(eventIndex, eventIndex % getPhotoSet(eventIndex).length);
  if (isLocalEditor) attachUploadControls(card, eventIndex);
  card.addEventListener('click', (event) => {
    if (event.target.closest('.photo-tools')) return;
    openGallery(eventIndex, cardPhotoIndexes.get(eventIndex) || 0);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openGallery(eventIndex, cardPhotoIndexes.get(eventIndex) || 0);
    }
  });
});

window.setInterval(() => {
  if (document.body.classList.contains('gallery-open')) return;
  showcaseCards.forEach((_, eventIndex) => {
    const photos = getPhotoSet(eventIndex);
    if (photos.length < 2) return;
    setCardPreview(eventIndex, (cardPhotoIndexes.get(eventIndex) || 0) + 1);
  });
}, 3600);

galleryClose?.addEventListener('click', closeGallery);
document.querySelector('#galleryPrev')?.addEventListener('click', () => renderGallery(activePhotoIndex - 1));
document.querySelector('#galleryNext')?.addEventListener('click', () => renderGallery(activePhotoIndex + 1));
galleryModal?.addEventListener('click', (event) => {
  if (event.target === galleryModal) closeGallery();
});
document.addEventListener('keydown', (event) => {
  if (!galleryModal?.classList.contains('open')) return;
  if (event.key === 'Escape') closeGallery();
  if (event.key === 'ArrowLeft') renderGallery(activePhotoIndex - 1);
  if (event.key === 'ArrowRight') renderGallery(activePhotoIndex + 1);
});

const loadSieShowcaseEditor = () => {
  const script = document.createElement('script');
  script.src = '../department-showcase-editor.js';
  script.defer = true;
  script.onload = () => window.SieShowcaseEditor?.boot({
    organization: 'student_union',
    department: 'student_rights',
    photoStorageKey: storageKey
  });
  document.head.append(script);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSieShowcaseEditor, { once: true });
} else {
  loadSieShowcaseEditor();
}
