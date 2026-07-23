const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const refreshIcons = () => {
  if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
};

const THEME_MODE_KEY = "sievox_demo_theme_mode";
const THEME_COLOR_KEY = "sievox_demo_theme_color";
const allowedModes = ["light", "dark"];
const allowedColors = ["purple", "blue", "green", "orange", "teal"];

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const applyTheme = (mode, color, animate = false) => {
  const safeMode = allowedModes.includes(mode) ? mode : "light";
  const safeColor = allowedColors.includes(color) ? color : "blue";
  const commitTheme = () => {
    document.documentElement.dataset.theme = safeMode;
    document.documentElement.dataset.color = safeColor;
    localStorage.setItem(THEME_MODE_KEY, safeMode);
    localStorage.setItem(THEME_COLOR_KEY, safeColor);
    $$('[data-theme-mode]').forEach((button) => button.classList.toggle("is-active", button.dataset.themeMode === safeMode));
    $$('[data-theme-color]').forEach((button) => button.classList.toggle("is-active", button.dataset.themeColor === safeColor));
  };
  if (animate && document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(commitTheme);
  else commitTheme();
};

const toggleThemePanel = (force) => {
  const panel = $(".theme-panel");
  const shouldOpen = typeof force === "boolean" ? force : !panel.classList.contains("is-open");
  panel.classList.toggle("is-open", shouldOpen);
  panel.setAttribute("aria-hidden", String(!shouldOpen));
};

applyTheme(localStorage.getItem(THEME_MODE_KEY) || "light", localStorage.getItem(THEME_COLOR_KEY) || "blue");

const showToast = (message) => {
  const toast = $(".toast");
  $("span", toast).textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
};

const animateMetric = (element) => {
  if (prefersReducedMotion()) return;
  const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && /\d/.test(node.nodeValue));
  if (!textNode) return;
  const raw = textNode.nodeValue.trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)(%?)$/);
  if (!match) return;
  const target = Number(match[1]);
  const decimals = match[1].includes(".") ? match[1].split(".")[1].length : 0;
  const leadingZero = /^0\d/.test(match[1]);
  const suffix = match[2];
  const start = performance.now();
  const duration = 760;
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    let value = (target * eased).toFixed(decimals);
    if (leadingZero && decimals === 0) value = value.padStart(2, "0");
    textNode.nodeValue = `${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const runAppEntrance = () => {
  document.body.classList.remove("app-entering");
  void document.body.offsetWidth;
  document.body.classList.add("app-entering");
  const visibleRoot = $("#superadmin-desktop:not([hidden])") || $("#admin-desktop:not([hidden])") || $("#student-desktop:not([hidden])") || document;
  $$(".stats-strip strong, .admin-metrics strong, .superadmin-metrics strong, .score-total strong, .score-meta strong", visibleRoot).forEach(animateMetric);
  window.clearTimeout(runAppEntrance.timer);
  runAppEntrance.timer = window.setTimeout(() => document.body.classList.remove("app-entering"), 1350);
};

const setRole = (role) => {
  $$("[data-role]").forEach((button) => button.classList.toggle("is-active", button.dataset.role === role));
  $("#student-desktop").hidden = role !== "student";
  $("#admin-desktop").hidden = role !== "admin";
  $("#page-title").textContent = role === "student" ? "权益工作台" : "权益事务处理台";
  if (!document.body.classList.contains("auth-active")) runAppEntrance();
};

const setDemoRole = (role) => {
  const safeRole = ["student", "admin", "superadmin"].includes(role) ? role : "student";
  $$("[data-role]").forEach((button) => button.classList.toggle("is-active", button.dataset.role === safeRole));
  $("#student-desktop").hidden = safeRole !== "student";
  $("#admin-desktop").hidden = safeRole !== "admin";
  $("#superadmin-desktop").hidden = safeRole !== "superadmin";
  const titles = {
    student: "权益工作台",
    admin: "权益事务处理台",
    superadmin: "学院权益治理总控台"
  };
  $("#page-title").textContent = titles[safeRole];
  if (safeRole === "admin") setAdminView("cases");
  if (!document.body.classList.contains("auth-active")) runAppEntrance();
};

const setAdminView = (view) => {
  const safeView = view === "performance" ? "performance" : "cases";
  $$("[data-admin-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.adminView === safeView));
  $$("[data-admin-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.adminPanel === safeView));
  if (!document.body.classList.contains("auth-active")) runAppEntrance();
};

const setStudentPage = (page) => {
  $$("[data-student-page]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.studentPage === page));
  $$("[data-student-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.studentNav === page));
  const titles = { dashboard: "权益工作台", feedbacks: "我的反馈", guide: "服务指南" };
  $("#page-title").textContent = titles[page] || "权益工作台";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (!document.body.classList.contains("auth-active")) runAppEntrance();
};

const setMobilePage = (page) => {
  $$("[data-mobile-page]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.mobilePage === page));
  $$(".mobile-tabbar [data-mobile-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileTarget === page));
  $(".mobile-main").scrollTop = 0;
};

const openCompose = (category = "") => {
  $(".drawer-backdrop").classList.add("is-open");
  $(".compose-drawer").classList.add("is-open");
  $(".compose-drawer").setAttribute("aria-hidden", "false");
  if (category) {
    $$(".compose-categories button").forEach((button) => button.classList.toggle("is-active", button.dataset.value === category));
  }
};

const openMobileCompose = (category = "") => {
  $(".drawer-backdrop").classList.add("is-open");
  $(".mobile-sheet").classList.add("is-open");
  $(".mobile-sheet").setAttribute("aria-hidden", "false");
  if (category) $("#mobile-category").textContent = category;
};

const closeOverlays = () => {
  $(".drawer-backdrop").classList.remove("is-open");
  $(".compose-drawer").classList.remove("is-open");
  $(".mobile-sheet").classList.remove("is-open");
  $(".compose-drawer").setAttribute("aria-hidden", "true");
  $(".mobile-sheet").setAttribute("aria-hidden", "true");
};

const openFeedback = (key) => {
  const dialog = $(".feedback-dialog");
  const content = {
    canteen: ["处理中", "#SVX-0721", "食堂三楼麻辣烫窗口卫生问题", "后勤服务中心正在核实现场情况，预计将在 1 个工作日内同步处理结果。"],
    library: ["已解决", "#SVX-0710", "图书馆周末开放时间不足", "考试周期间，图书馆周末开放时间已延长至 22:00。"],
    gate: ["待受理", "#SVX-0708", "宿舍楼门禁系统频繁故障", "事项已进入学生权益中心受理队列，受理后将自动分派至安全保卫部门。"]
  }[key] || null;
  if (content) {
    const status = $(".dialog-status .status");
    status.className = `status ${content[0] === "已解决" ? "resolved" : content[0] === "待受理" ? "pending" : "processing"}`;
    status.innerHTML = `<i></i>${content[0]}`;
    $(".dialog-status small").textContent = content[1];
    $(".feedback-dialog h2").textContent = content[2];
    $(".feedback-dialog > p").textContent = content[3];
  }
  dialog.showModal();
};

const populateFullList = () => {
  const source = $(".feedback-section .feedback-list");
  const target = $(".full-list");
  target.innerHTML = source.innerHTML;
  $$('[data-feedback]', target).forEach((button) => button.addEventListener("click", () => openFeedback(button.dataset.feedback)));
  refreshIcons();
};

$$('[data-role]').forEach((button) => button.addEventListener("click", () => setDemoRole(button.dataset.role)));
$$("[data-admin-view]").forEach((button) => button.addEventListener("click", () => setAdminView(button.dataset.adminView)));
$$('[data-student-nav]').forEach((button) => button.addEventListener("click", () => setStudentPage(button.dataset.studentNav)));
$$('[data-mobile-target]').forEach((button) => button.addEventListener("click", () => setMobilePage(button.dataset.mobileTarget)));

$$('[data-category]').forEach((button) => button.addEventListener("click", () => {
  const isMobile = window.matchMedia("(max-width: 760px)").matches || document.body.classList.contains("preview-mobile");
  if (isMobile) openMobileCompose(button.dataset.category);
  else openCompose(button.dataset.category);
}));

$$('[data-feedback]').forEach((button) => button.addEventListener("click", () => openFeedback(button.dataset.feedback)));
$$('[data-action="open-compose"]').forEach((button) => button.addEventListener("click", () => openCompose()));
$$('[data-action="open-mobile-compose"]').forEach((button) => button.addEventListener("click", () => openMobileCompose()));
$$('[data-action="close-overlays"]').forEach((button) => button.addEventListener("click", closeOverlays));

$$('[data-action="toggle-theme-panel"]').forEach((button) => button.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleThemePanel();
}));
$$('[data-action="close-theme-panel"]').forEach((button) => button.addEventListener("click", () => toggleThemePanel(false)));
$$('[data-theme-mode]').forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeMode, document.documentElement.dataset.color, true)));
$$('[data-theme-color]').forEach((button) => button.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme, button.dataset.themeColor, true)));
$(".theme-panel").addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", () => toggleThemePanel(false));

$$('[data-login-role]').forEach((button) => button.addEventListener("click", () => {
  $$('[data-login-role]').forEach((item) => item.classList.remove("is-active"));
  button.classList.add("is-active");
  const roleConfig = {
    student: { label: "学号", value: "2024090107", placeholder: "请输入学号" },
    admin: { label: "管理员账号", value: "admin_sie", placeholder: "请输入管理员账号" },
    superadmin: { label: "负责人账号", value: "superadmin_sie", placeholder: "请输入超级管理员账号" }
  };
  const config = roleConfig[button.dataset.loginRole] || roleConfig.student;
  $(".login-field > span").textContent = config.label;
  $("#login-student-id").value = config.value;
  $("#login-student-id").placeholder = config.placeholder;
}));

$$('[data-action="toggle-password"]').forEach((button) => button.addEventListener("click", () => {
  const input = $("#login-password");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  button.setAttribute("aria-label", showing ? "显示密码" : "隐藏密码");
  button.innerHTML = `<i data-lucide="${showing ? "eye" : "eye-off"}"></i>`;
  refreshIcons();
}));

$("#demo-login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const loginView = $(".login-view");
  const submit = $(".login-submit");
  const role = $('[data-login-role].is-active').dataset.loginRole;
  submit.disabled = true;
  submit.querySelector("span").textContent = "正在验证身份…";
  window.setTimeout(() => {
    loginView.classList.add("is-leaving");
    window.setTimeout(() => {
      document.body.classList.remove("auth-active");
      loginView.classList.remove("is-leaving");
      setDemoRole(role);
      submit.disabled = false;
      submit.querySelector("span").textContent = "进入权益反馈系统";
      window.scrollTo(0, 0);
    }, 340);
  }, 360);
});

const loginArt = $(".login-art");
if (loginArt && !prefersReducedMotion()) {
  const motionLayers = [
    [$(".orbit-one"), 13], [$(".orbit-two"), 8], [$(".art-seal"), -10],
    [$(".cross-one"), 7], [$(".cross-two"), -5]
  ];
  loginArt.addEventListener("pointermove", (event) => {
    const bounds = loginArt.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    motionLayers.forEach(([layer, distance]) => {
      if (!layer) return;
      layer.style.setProperty("--motion-x", `${(x * distance).toFixed(2)}px`);
      layer.style.setProperty("--motion-y", `${(y * distance).toFixed(2)}px`);
    });
  });
  loginArt.addEventListener("pointerleave", () => motionLayers.forEach(([layer]) => {
    if (!layer) return;
    layer.style.setProperty("--motion-x", "0px");
    layer.style.setProperty("--motion-y", "0px");
  }));
}

$$('[data-action="open-preview"]').forEach((button) => button.addEventListener("click", () => {
  document.body.classList.add("preview-mobile");
  setMobilePage("home");
}));
$$('[data-action="close-preview"]').forEach((button) => button.addEventListener("click", () => {
  closeOverlays();
  document.body.classList.remove("preview-mobile");
}));

$$('.compose-categories button').forEach((button) => button.addEventListener("click", () => {
  $$('.compose-categories button').forEach((item) => item.classList.remove("is-active"));
  button.classList.add("is-active");
}));
$$('.priority-switch button').forEach((button) => button.addEventListener("click", () => {
  $$('.priority-switch button').forEach((item) => item.classList.remove("is-active"));
  button.classList.add("is-active");
}));

const attachCounter = (selector, limit) => {
  const field = $(selector);
  if (!field) return;
  field.addEventListener("input", () => {
    const counter = field.parentElement.querySelector("small");
    if (counter) counter.textContent = `${field.value.length} / ${limit}`;
  });
};
attachCounter("#compose-title", 50);
attachCounter("#compose-content", 500);

$$('[data-action="submit-feedback"]').forEach((button) => button.addEventListener("click", () => {
  closeOverlays();
  showToast("反馈已提交，我们会尽快处理。");
}));
$$('[data-action="admin-reply"]').forEach((button) => button.addEventListener("click", () => showToast("回复已发送给学生。")));
$$('[data-action="resolve-case"]').forEach((button) => button.addEventListener("click", () => {
  const status = $(".case-inspector .status");
  status.className = "status resolved";
  status.innerHTML = "<i></i>已解决";
  showToast("事项已标记为已解决。");
}));

$$('[data-admin-case]').forEach((button) => button.addEventListener("click", () => {
  $$('[data-admin-case]').forEach((row) => row.classList.remove("is-selected"));
  button.classList.add("is-selected");
  if (button.dataset.adminCase === "gate") {
    $(".case-inspector h2").textContent = "宿舍楼门禁系统频繁故障";
    $(".case-inspector .case-body").textContent = "北区 3 号楼门禁系统本周多次出现刷卡无响应的情况，晚间存在明显安全隐患，希望尽快检修。";
  } else {
    $(".case-inspector h2").textContent = "食堂三楼麻辣烫窗口卫生问题";
    $(".case-inspector .case-body").textContent = "近期发现食堂三楼麻辣烫窗口存在食材未按规定冷藏、工作人员未佩戴手套等问题，希望相关部门尽快检查整改。";
  }
}));

$$('[data-action="close-dialog"]').forEach((button) => button.addEventListener("click", () => $(".feedback-dialog").close()));
$(".feedback-dialog").addEventListener("click", (event) => {
  if (event.target === $(".feedback-dialog")) $(".feedback-dialog").close();
});
$$('[data-action="send-message"]').forEach((button) => button.addEventListener("click", () => {
  $(".feedback-dialog").close();
  showToast("补充留言已发送。");
}));

$$("[data-super-tab]").forEach((button) => button.addEventListener("click", () => {
  const target = button.dataset.superTab;
  $$("[data-super-tab]").forEach((item) => item.classList.toggle("is-active", item.dataset.superTab === target));
  $$("[data-super-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.superPanel === target));
  if (!document.body.classList.contains("auth-active")) runAppEntrance();
}));

const superMessages = {
  "super-export": "人员名单导出任务已生成。",
  "super-add-user": "已打开新增账号流程示意。",
  "super-log": "已定位到该管理员的操作日志。",
  "super-demote": "演示：该管理员将降级为学生。",
  "super-reset": "演示：密码已重置为默认规则。",
  "super-feedbacks": "已打开该学生提交的问题列表。",
  "super-promote": "演示：该学生将提升为管理员。",
  "super-delete": "演示：账号注销需要二次确认与审计留痕。",
  "super-refresh": "审计日志已刷新。",
  "super-roster": "本学期成员名单管理面板已准备。",
  "super-semester": "新学期开启前会冻结上一学期名单与绩效。",
  "super-score": "绩效记录已录入，并自动重算本学期总分。",
  "super-revoke": "已选择批量撤回绩效流水示意。"
};

Object.keys(superMessages).forEach((action) => {
  $$(`[data-action="${action}"]`).forEach((button) => {
    button.addEventListener("click", () => showToast(superMessages[action]));
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "n" && !document.body.classList.contains("auth-active") && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) openCompose();
  if (event.key === "Escape") closeOverlays();
});

populateFullList();
refreshIcons();
