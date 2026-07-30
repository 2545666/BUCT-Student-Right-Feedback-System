const menuButton = document.querySelector("#menuButton");
const mainNav = document.querySelector("#mainNav");
const navLinks = [...document.querySelectorAll(".main-nav a")];

function closeMenu() {
  mainNav.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "打开导航");
}

menuButton.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900 && mainNav.classList.contains("open")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mainNav.classList.contains("open")) closeMenu();
});

const navTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const navObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1, 0.35] }
);

navTargets.forEach((target) => navObserver.observe(target));

const galleries = {
  yuanz: {
    title: "院周晚会",
    category: "CULTURE & PERFORMANCE",
    items: [
      ["yuanz1", "舞台乐队表演"],
      ["yuanz2", "舞蹈节目现场"],
      ["yuanz3", "晚会主持阵容"],
      ["yuanz4", "语言类节目表演"],
      ["yuanz5", "歌唱节目现场"],
      ["yuanz6", "星空主题舞台表演"],
      ["yuanz7", "青春主题舞台秀"],
    ],
  },
  chorus129: {
    title: "129合唱",
    category: "CHORUS & YOUTH",
    items: [
      ["1291", "129合唱活动现场"],
      ["1292", "129合唱演出现场"],
      ["1293", "129合唱舞台记录"],
      ["1294", "129合唱团队风采"],
      ["1295", "129合唱活动现场"],
      ["1296", "129合唱舞台记录"],
      ["1297", "129合唱团队风采"],
    ],
  },
  grassMusic: {
    title: "草地音乐节",
    category: "GRASSLAND MUSIC FESTIVAL",
    items: [
      ["cao1", "草地舞台歌唱表演"],
      ["cao2", "音乐节独唱现场"],
      ["cao3", "音乐节舞蹈表演"],
      ["cao4", "夜间乐队舞台与现场观众"],
      ["cao5", "草地观众互动环节"],
      ["cao6", "草地音乐节独唱表演"],
      ["cao7", "双人歌唱节目现场"],
      ["cao8", "草地音乐节舞台全景"],
      ["cao9", "音乐节舞蹈节目现场"],
      ["cao10", "草地音乐节舞台表演"],
    ],
  },
  globalCulture: {
    title: "国际文化节",
    category: "GLOBAL CULTURE FESTIVAL",
    items: [
      ["guo", "国际文化展示与交流现场"],
      ["guo2", "国际文化节展区全景"],
      ["guo3", "中外学生体验中国传统文化"],
      ["guo4", "多元文化交流合影"],
      ["guo5", "各国传统服饰与文化展示"],
      ["guo6", "国际学生八极拳表演"],
    ],
  },
  badminton: {
    title: "师生羽毛球赛",
    category: "TEACHERS & STUDENTS BADMINTON",
    items: [
      ["shi1", "国际教育学院师生羽毛球赛大合影"],
      ["shi2", "赛后友好交流"],
      ["shi3", "羽毛球比赛现场"],
    ],
  },
  youthGames: {
    title: "青春竞技周",
    category: "YOUTH SPORTS WEEK",
    items: [
      ["qing1", "3V3篮球赛获奖队伍"],
      ["qing2", "悦动青春竞技周参赛成员合影"],
      ["qing3", "乒乓球比赛现场"],
      ["qing4", "羽毛球比赛现场"],
    ],
  },
  freshmanCup: {
    title: "新生杯 / 烛光杯",
    category: "FRESHMAN CUP & CANDLELIGHT CUP",
    items: [
      ["zhu1", "新生杯篮球队伍合影"],
      ["zhu2", "校园足球队伍合影"],
    ],
  },
  marathon: {
    title: "北京化工大学马拉松赛",
    category: "BUCT MARATHON",
    items: [["ma1", "国际教育学院马拉松接力赛参赛队伍"]],
  },
  sportsMeeting: {
    title: "运动会",
    category: "BUCT SPORTS MEETING",
    items: [
      ["yun1", "国际教育学院运动会参赛成员大合影"],
      ["yun2", "学院奖杯与旗手展示"],
      ["yun3", "运动会师生互动合影"],
      ["yun4", "田径赛道冲刺瞬间"],
    ],
  },
  moveBuct: {
    title: "悦动北化",
    category: "MOVE BUCT",
    items: [
      ["yue1", "夜间操场集体活力活动"],
      ["yue2", "悦动北化现场组织与服务"],
    ],
  },
};

const optimized = (id, width, format) => `image/optimized/${id}-${width}.${format}`;
const original = (id) => `image/${id}.jpg`;

const galleryModal = document.querySelector("#galleryModal");
const galleryStage = document.querySelector(".gallery-stage");
const galleryImage = document.querySelector("#galleryImage");
const galleryAvif = document.querySelector("#galleryAvif");
const galleryWebp = document.querySelector("#galleryWebp");
const galleryCaption = document.querySelector("#galleryCaption");
const galleryCounter = document.querySelector("#galleryCounter");
const galleryThumbs = document.querySelector("#galleryThumbs");
const galleryTitle = document.querySelector("#galleryTitle");
const galleryCategory = document.querySelector("#galleryCategory");
const galleryClose = document.querySelector("#galleryClose");
let activeGallery = [];
let activeImageIndex = 0;
let activeTrigger = null;
let nextPreload = null;
let touchStart = null;

function preloadNextImage() {
  nextPreload?.remove();
  nextPreload = null;
  if (activeGallery.length < 2) return;
  const [nextId] = activeGallery[(activeImageIndex + 1) % activeGallery.length];
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.type = "image/avif";
  link.href = optimized(nextId, 1200, "avif");
  link.dataset.galleryPreload = "next";
  document.head.append(link);
  nextPreload = link;
}

function renderGalleryImage(index) {
  activeImageIndex = (index + activeGallery.length) % activeGallery.length;
  const [id, caption] = activeGallery[activeImageIndex];
  galleryAvif.srcset = optimized(id, 1200, "avif");
  galleryWebp.srcset = optimized(id, 1200, "webp");
  galleryImage.src = original(id);
  galleryImage.alt = caption;
  galleryCaption.textContent = caption;
  galleryCounter.textContent = `${String(activeImageIndex + 1).padStart(2, "0")} / ${String(activeGallery.length).padStart(2, "0")}`;
  [...galleryThumbs.children].forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("active", thumbIndex === activeImageIndex);
    thumb.setAttribute("aria-current", thumbIndex === activeImageIndex ? "true" : "false");
  });
  preloadNextImage();
}

function openGallery(name, trigger) {
  const gallery = galleries[name];
  if (!gallery) return;
  activeGallery = gallery.items;
  activeTrigger = trigger;
  galleryTitle.textContent = gallery.title;
  galleryCategory.textContent = gallery.category;
  galleryThumbs.replaceChildren();

  activeGallery.forEach(([id, caption], index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");
    button.type = "button";
    button.setAttribute("aria-label", `查看第 ${index + 1} 张照片：${caption}`);
    image.src = optimized(id, 480, "webp");
    image.alt = "";
    image.width = 480;
    image.height = 320;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image);
    button.addEventListener("click", () => renderGalleryImage(index));
    galleryThumbs.append(button);
  });

  renderGalleryImage(0);
  galleryModal.classList.add("open");
  galleryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("gallery-open");
  galleryClose.focus();
}

function closeGallery() {
  galleryModal.classList.remove("open");
  galleryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("gallery-open");
  galleryThumbs.replaceChildren();
  nextPreload?.remove();
  nextPreload = null;
  activeTrigger?.focus();
}

document.querySelectorAll(".gallery-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => openGallery(trigger.dataset.gallery, trigger));
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openGallery(trigger.dataset.gallery, trigger);
  });
});

galleryClose.addEventListener("click", closeGallery);
document.querySelector("#galleryPrev").addEventListener("click", () => renderGalleryImage(activeImageIndex - 1));
document.querySelector("#galleryNext").addEventListener("click", () => renderGalleryImage(activeImageIndex + 1));
galleryModal.addEventListener("click", (event) => {
  if (event.target === galleryModal) closeGallery();
});

galleryStage.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

galleryStage.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dy) > 110 && Math.abs(dy) > Math.abs(dx) * 1.2 && dy > 0) {
    closeGallery();
    return;
  }
  if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
  renderGalleryImage(activeImageIndex + (dx < 0 ? 1 : -1));
});

document.addEventListener("keydown", (event) => {
  if (!galleryModal.classList.contains("open")) return;
  if (event.key === "Escape") closeGallery();
  if (event.key === "ArrowLeft") renderGalleryImage(activeImageIndex - 1);
  if (event.key === "ArrowRight") renderGalleryImage(activeImageIndex + 1);
});

const revealItems = document.querySelectorAll(
  ".section-heading, .value-grid article, .responsibility-heading, .responsibility-list li, .department-motto, .event-track, .chair-card, .member-row, .honor-content, .stats, .recruit-ticket"
);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  revealItems.forEach((item) => {
    item.classList.add("reveal-ready");
    revealObserver.observe(item);
  });
}
