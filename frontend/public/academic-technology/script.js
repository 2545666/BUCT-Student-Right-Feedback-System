const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hero = document.querySelector('.hero');
if (hero && !prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  let frame = 0;
  const resetHeroOffset = () => {
    hero.style.setProperty('--hero-x', '0px');
    hero.style.setProperty('--hero-y', '0px');
  };

  hero.addEventListener('pointermove', (event) => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 28;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 22;
      hero.style.setProperty('--hero-x', `${x.toFixed(2)}px`);
      hero.style.setProperty('--hero-y', `${y.toFixed(2)}px`);
    });
  });

  hero.addEventListener('pointerleave', resetHeroOffset);
  window.addEventListener('blur', resetHeroOffset);
}

const heroImages = [...document.querySelectorAll('.hero-image')];
const heroDots = document.querySelector('.hero-dots');
let heroIndex = 0;

if (heroImages.length && heroDots) {
  const renderHero = (index) => {
    heroIndex = (index + heroImages.length) % heroImages.length;
    heroImages.forEach((img, imgIndex) => img.classList.toggle('active', imgIndex === heroIndex));
    [...heroDots.children].forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === heroIndex));
  };

  heroDots.replaceChildren(
    ...heroImages.map((img, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `切换到第 ${index + 1} 张代表照片`);
      button.addEventListener('click', () => renderHero(index));
      return button;
    })
  );
  renderHero(0);
  if (!prefersReducedMotion) {
    window.setInterval(() => renderHero(heroIndex + 1), 4600);
  }
}

const gallerySets = {
  'high-math': [
    { src: 'assets/activities/tutoring/image01.webp', title: '高等数学辅导现场 01' },
    { src: 'assets/activities/tutoring/image02.webp', title: '高等数学辅导现场 02' },
    { src: 'assets/activities/tutoring/image03.webp', title: '高等数学辅导现场 03' },
    { src: 'assets/activities/tutoring/image04.webp', title: '高等数学辅导现场 04' },
  ],
  'physics-bao-siyuan': [
    { src: 'assets/article-shots/physics-title-shot.png', title: '普通物理推文标题截图' },
    { src: 'assets/article-shots/physics-cover-shot.png', title: '普通物理推文封面截图' },
    { src: 'assets/article-shots/physics-bao-siyuan-context-wide.png', title: '普通物理推文内容截图' },
  ],
  'complex-bao-siyuan': [
    { src: 'assets/article-shots/complex-title-shot.png', title: '复变函数推文标题截图' },
    { src: 'assets/article-shots/complex-cover-shot.png', title: '复变函数推文封面截图' },
    { src: 'assets/article-shots/complex-bao-siyuan-article.png', title: '复变函数推文内容截图' },
  ],
  'english-tutoring': [
    { src: 'assets/activities/tutoring/image05.webp', title: '大学英语与四六级辅导现场' },
  ],
  'organic-tutoring': [
    { src: 'assets/article-shots/organic-wechat-mid.png', title: '有机化学推文封面截图' },
    { src: 'assets/article-shots/organic-wechat.png', title: '有机化学推文长图' },
  ],
  'italian-tutoring': [
    { src: 'assets/article-shots/italian-wechat.png', title: '意大利语推文封面截图' },
  ],
  tutoring: [
    { src: 'assets/activities/tutoring/image01.webp', title: '高等数学辅导现场 01' },
    { src: 'assets/activities/tutoring/image02.webp', title: '高等数学辅导现场 02' },
    { src: 'assets/activities/tutoring/image03.webp', title: '高等数学辅导现场 03' },
    { src: 'assets/activities/tutoring/image04.webp', title: '高等数学辅导现场 04' },
    { src: 'assets/activities/tutoring/image05.webp', title: '大学英语与四六级辅导' },
  ],
  'speak-up': [
    { src: 'assets/activities/speak-up/image06.webp', title: 'Speak Up 外语角现场' },
    { src: 'assets/activities/speak-up/image07.webp', title: 'Speak Up 外语角交流' },
  ],
  'study-abroad': [
    { src: 'assets/activities/study-abroad/image08.webp', title: '德国留学辅导讲座' },
    { src: 'assets/activities/study-abroad/image09.webp', title: '德国留学辅导讲座现场' },
    { src: 'assets/activities/study-abroad/image10.webp', title: '留学咨询日' },
    { src: 'assets/activities/study-abroad/image11.webp', title: '留学咨询日交流' },
    { src: 'assets/activities/study-abroad/image12.webp', title: '留学规划讲座' },
    { src: 'assets/activities/study-abroad/image13.webp', title: '留学规划讲座交流' },
  ],
  'national-scholarship': [
    { src: 'assets/activities/scholarship/image14.webp', title: '国家奖学金答辩' },
    { src: 'assets/activities/scholarship/image15.webp', title: '国家奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image16.webp', title: '国家奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image17.webp', title: '国家奖学金答辩现场' },
  ],
  'scholarship-sharing': [
    { src: 'assets/activities/scholarship/image18.webp', title: '国奖分享会' },
    { src: 'assets/activities/scholarship/image19.webp', title: '国奖分享会现场' },
  ],
  'social-scholarship': [
    { src: 'assets/activities/scholarship/image20.webp', title: '社会资助奖学金答辩' },
    { src: 'assets/activities/scholarship/image21.webp', title: '社会资助奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image22.webp', title: '社会资助奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image23.webp', title: '社会资助奖学金答辩现场' },
  ],
  scholarship: [
    { src: 'assets/activities/scholarship/image14.webp', title: '国家奖学金答辩' },
    { src: 'assets/activities/scholarship/image15.webp', title: '国家奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image16.webp', title: '国家奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image17.webp', title: '国家奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image18.webp', title: '国奖分享会' },
    { src: 'assets/activities/scholarship/image19.webp', title: '国奖分享会现场' },
    { src: 'assets/activities/scholarship/image20.webp', title: '社会资助奖学金答辩' },
    { src: 'assets/activities/scholarship/image21.webp', title: '社会资助奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image22.webp', title: '社会资助奖学金答辩现场' },
    { src: 'assets/activities/scholarship/image23.webp', title: '社会资助奖学金答辩现场' },
  ],
  'sprout-cup': [
    { src: 'assets/activities/competitions/image24.webp', title: '萌芽杯活动现场' },
  ],
  'challenge-cup': [
    { src: 'assets/activities/competitions/image25.webp', title: '挑战杯备赛现场' },
  ],
  'career-planning': [
    { src: 'assets/activities/competitions/image26.webp', title: '职业规划大赛宣讲' },
    { src: 'assets/activities/competitions/image27.webp', title: '职业规划大赛现场' },
    { src: 'assets/activities/competitions/career-planning-zheng-xiaonan.png', title: '职业规划大赛北京市赛决赛' },
  ],
  competitions: [
    { src: 'assets/activities/competitions/image24.webp', title: '萌芽杯活动现场' },
    { src: 'assets/activities/competitions/image25.webp', title: '挑战杯备赛现场' },
    { src: 'assets/activities/competitions/image26.webp', title: '职业规划大赛宣讲' },
    { src: 'assets/activities/competitions/image27.webp', title: '职业规划大赛现场' },
    { src: 'assets/activities/competitions/career-planning-zheng-xiaonan.png', title: '职业规划大赛北京市赛决赛' },
  ],
  'campus-week': [
    { src: 'assets/activities/campus-week/image28.webp', title: '联合宣讲合影' },
    { src: 'assets/activities/campus-week/image29.webp', title: '院周活动现场' },
    { src: 'assets/activities/campus-week/image30.webp', title: '联合宣讲活动' },
    { src: 'assets/activities/campus-week/image31.webp', title: '院周活动互动' },
  ],
  recognition: [
    { src: 'assets/activities/innovation-recognition/image32.webp', title: '学生创新表彰总结会全景' },
    { src: 'assets/activities/innovation-recognition/image33.webp', title: '学生创新表彰总结会现场' },
    { src: 'assets/activities/innovation-recognition/image34.webp', title: '创新竞赛成果颁奖' },
    { src: 'assets/activities/innovation-recognition/image35.webp', title: '创新竞赛成果颁奖' },
    { src: 'assets/activities/innovation-recognition/image36.webp', title: '专业工作室聘书颁发' },
    { src: 'assets/activities/innovation-recognition/image37.webp', title: '部门负责人聘书颁发' },
    { src: 'assets/activities/innovation-recognition/image38.webp', title: '学生经验分享' },
    { src: 'assets/activities/innovation-recognition/image39.webp', title: '学生经验分享' },
  ],
};

const cycleStates = new WeakMap();

const setupCycleCard = (card, photos) => {
  const img = card?.querySelector('img');
  if (!card || !img || !Array.isArray(photos) || !photos.length) return;

  let state = cycleStates.get(card);
  if (!state) {
    const count = document.createElement('span');
    count.className = 'cycle-count';
    const dots = document.createElement('div');
    dots.className = 'cycle-dots';
    const notice = document.createElement('div');
    notice.className = 'cycle-source-notice';
    notice.textContent = '此图片来自微信公众号平台，未经允许不可用';
    notice.hidden = true;
    card.append(count, dots, notice);
    state = { img, count, dots, notice, timer: null, index: 0, photos: [] };
    cycleStates.set(card, state);
  } else if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }

  state.photos = photos;
  state.dots.replaceChildren(...photos.map(() => document.createElement('i')));

  const render = (nextIndex) => {
    state.index = (nextIndex + state.photos.length) % state.photos.length;
    const photo = state.photos[state.index];
    if (photo.blocked) {
      state.img.removeAttribute('src');
      state.img.alt = photo.title;
      state.img.classList.add('blocked-source');
      state.notice.hidden = false;
      state.notice.textContent = photo.title || '此图片来自微信公众号平台，未经允许不可用';
    } else {
      state.img.src = photo.src;
      state.img.alt = photo.title;
      state.img.classList.remove('blocked-source');
      state.notice.hidden = true;
    }
    if (state.photos.length > 1) {
      state.count.hidden = false;
      state.dots.hidden = false;
      state.count.textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(state.photos.length).padStart(2, '0')}`;
      [...state.dots.children].forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === state.index));
    } else {
      state.count.hidden = true;
      state.dots.hidden = true;
    }
  };

  render(0);
  if (!prefersReducedMotion && photos.length > 1) {
    state.timer = window.setInterval(() => render(state.index + 1), 3300 + Math.floor(Math.random() * 1100));
  }
};

document.querySelectorAll('[data-cycle]').forEach((card) => {
  const key = card.dataset.cycle;
  const photos = gallerySets[key] || [];
  if (!photos.length) return;
  setupCycleCard(card, photos);
});

const profileCycleSources = {
  'su-yanyan': {
    title: '苏妍妍',
    source: 'assets/profile-galleries/su-yanyan.json',
    fallback: { src: 'assets/scholarship-profiles/su-yanyan.png', title: '苏妍妍形象照' },
  },
  'bao-xingpeng': {
    title: '包兴鹏',
    source: 'assets/profile-galleries/bao-xingpeng.json',
    fallback: { src: 'assets/scholarship-profiles/bao-xingpeng.png', title: '包兴鹏形象照' },
  },
  'chen-yichi': {
    title: '陈钇池',
    source: 'assets/profile-galleries/chen-yichi.json',
    fallback: { src: 'assets/scholarship-profiles/chen-yichi.png', title: '陈钇池形象照' },
  },
  'zheng-xiaonan': {
    title: '郑晓楠',
    source: 'assets/profile-galleries/zheng-xiaonan.json',
    fallback: { src: 'assets/scholarship-profiles/zheng-xiaonan.png', title: '郑晓楠形象照' },
  },
};

const loadProfileCycles = async () => {
  await Promise.all(Object.entries(profileCycleSources).map(async ([key, config]) => {
    const card = document.querySelector(`[data-cycle="${key}"]`);
    if (!card) return;

    let photos = [config.fallback];
    try {
      const response = await fetch(config.source, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : [];
        const extras = items
          .filter((item) => Boolean(item?.src))
          .map((item, index) => ({
            src: item.src,
            title: item.title || `${config.title}推文图片 ${String(index + 1).padStart(2, '0')}`,
          }));
        photos = [config.fallback, ...extras];
      }
    } catch (error) {
      console.warn(`Failed to load profile cycle for ${key}`, error);
    }

    setupCycleCard(card, photos);
  }));
};

loadProfileCycles();

const galleryModal = document.querySelector('#galleryModal');
const galleryImage = document.querySelector('#galleryImage');
const galleryTitle = document.querySelector('#galleryTitle');
const galleryCount = document.querySelector('#galleryCount');
const galleryThumbs = document.querySelector('#galleryThumbs');
const galleryClose = document.querySelector('.gallery-close');
const galleryPrev = document.querySelector('.gallery-arrow.prev');
const galleryNext = document.querySelector('.gallery-arrow.next');

let activeGalleryKey = 'scholarship';
let activeIndex = 0;

const openGallery = (key, startIndex = 0) => {
  activeGalleryKey = key;
  activeIndex = startIndex;
  const items = gallerySets[key] || [];
  if (!items.length) return;
  renderGallery();
  galleryModal.classList.add('open');
  galleryModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('gallery-open');
};

const closeGallery = () => {
  galleryModal.classList.remove('open');
  galleryModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('gallery-open');
};

const renderGallery = () => {
  const items = gallerySets[activeGalleryKey] || [];
  if (!items.length) return;
  activeIndex = (activeIndex + items.length) % items.length;
  const item = items[activeIndex];
  galleryImage.src = item.src;
  galleryImage.alt = item.title;
  galleryTitle.textContent = item.title;
  galleryCount.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  galleryThumbs.replaceChildren(
    ...items.map((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === activeIndex ? 'active' : '';
      button.title = photo.title;
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = '';
      button.append(img);
      button.addEventListener('click', () => {
        activeIndex = index;
        renderGallery();
      });
      return button;
    })
  );
};

document.querySelectorAll('[data-gallery]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    openGallery(trigger.dataset.gallery || 'scholarship', 0);
  });
});

galleryClose?.addEventListener('click', closeGallery);
galleryPrev?.addEventListener('click', () => {
  activeIndex -= 1;
  renderGallery();
});
galleryNext?.addEventListener('click', () => {
  activeIndex += 1;
  renderGallery();
});

galleryModal?.addEventListener('click', (event) => {
  if (event.target === galleryModal) closeGallery();
});

document.addEventListener('keydown', (event) => {
  if (!galleryModal?.classList.contains('open')) return;
  if (event.key === 'Escape') closeGallery();
  if (event.key === 'ArrowLeft') {
    activeIndex -= 1;
    renderGallery();
  }
  if (event.key === 'ArrowRight') {
    activeIndex += 1;
    renderGallery();
  }
});

const setupAcademicMotion = () => {
  const motionTargets = [
    '.section-heading',
    '.atlas-rail a',
    '.subject-card',
    '.case-card',
    '.wide-story',
    '.profile-strip article',
    '.competition .split-panels article',
    '.recognition-grid article',
    '.bridge',
    '.member-feature',
    '.member-card',
    '.join-panel',
  ].join(',');

  const targets = [...document.querySelectorAll(motionTargets)];
  if (!targets.length || prefersReducedMotion) return;

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    window.gsap.set(targets, {
      opacity: 0,
      y: 34,
      filter: 'blur(10px)',
    });

    window.gsap.to(targets, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.045,
      scrollTrigger: {
        trigger: '#atlas',
        start: 'top 86%',
        end: 'bottom 20%',
        toggleActions: 'play none none none',
      },
    });

    window.gsap.utils.toArray('.subject-card img, .case-card img, .profile-strip img, .wide-story img, .screen-stack img').forEach((img) => {
      window.gsap.fromTo(img,
        { scale: 0.92, opacity: 0.82 },
        {
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: img,
            start: 'top 92%',
            end: 'bottom 18%',
            scrub: true,
          },
        }
      );
    });

    const heroTitle = document.querySelector('.hero-copy h1');
    if (heroTitle) {
      const heroTimeline = window.gsap.timeline({ defaults: { ease: 'power4.out' } });
      heroTimeline
        .fromTo('.hero-motion', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.1 }, 0)
        .fromTo(heroTitle, { clipPath: 'inset(0 100% 0 0)', y: 18 }, { clipPath: 'inset(0 0% 0 0)', y: 0, duration: 1.05 }, 0.12)
        .fromTo('.hero-copy p, .hero-actions', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.08 }, 0.42)
        .fromTo('.hero-note span', { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.58, stagger: 0.07 }, 0.62)
        .fromTo('.hero-dots', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.52 }, 0.78);
    }
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-ready');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  targets.forEach((target) => observer.observe(target));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAcademicMotion, { once: true });
} else {
  setupAcademicMotion();
}
