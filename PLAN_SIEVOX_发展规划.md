# SIEVOX 学生权益反馈系统 — 短期与长期发展规划

## Context

本规划基于 Cryo 和参宿的讨论，整合了当前系统（[SIEVOX 学生权益反馈系统](c:\Users\25453\Desktop\student-feedback-system)）的现状分析，将需求分为**短期（开学前）**和**长期（未来一年）***两个阶段。

### 当前系统现状

- **技术栈**: React 18 + Vite + Tailwind CSS | Node.js Express + MongoDB/Mongoose
- **已有功能**: 反馈提交/撤回、管理员处理、JWT认证、通知、绩效管理（6维度+雷达图）、学期归档、成员名单管理、超管账号管理
- **架构问题**: 后端单文件 `server.js`（1505行）、前端双文件 `App.jsx`（1236行）+ `AdminDashboard.jsx`（1784行），无React Router，轮询更新，设计风格为"AI味玻璃态"

---

## 短期规划（开学前）

### P0：架构重构— 基础前提

> **重要**: 在新功能添加前必须先完成架构重构，否则技术债务会持续累积。

**后端模块化** — 将 `backend/server.js` 拆分为：
```
backend/src/
  config/        — 环境变量、数据库连接
  models/        — User, Feedback, Notification, AuditLog, PerformanceRecord, SemesterMember, SystemConfig
  middleware/     — auth, security, audit, upload, validate
  routes/        — auth, feedback, admin/*, upload
  server.js      — 仅30行：导入、中间件挂载、路由注册、启动
```

**前端模块化** — 引入 React Router + 组件拆分：
```
frontend/src/
  api/           — 集中式 fetch client + 按域拆分
  components/ui/ — Button, Card, Input, Select, StatusBadge, Modal, Tabs, Chip, AttachmentViewer
  pages/         — auth/, student/, admin/
  hooks/         — useAuth, useTheme, useNotifications, useFeedbacks, usePerformance
  App.jsx        — 仅路由配置
```

**新增依赖**: `react-router-dom`, `react-hot-toast`/`sonner`, `socket.io` + `socket.io-client`

### P1：UI升级 — Material Design 3⭐ 优先级最高

> 参考现有迁移指南：[design-system/DESIGN_SYSTEM.md](c:\Users\25453\Desktop\student-feedback-system\design-system\DESIGN_SYSTEM.md)

**核心改动**：
1. CSS变量基础设施 — 5套配色主题（紫/蓝/绿/橙/青）× 深浅模式 = 10种视觉方案
2. 组件重构 — Button（filled/tonal/outlined/text）、Card（elevated/outlined/filled）、Input（MD3 Outlined）
3. 图标迁移 — emoji → Material Symbols 字体图标
4. 删除AI味元素 — 浮动光球、点阵网格、渐变文字、玻璃态效果、自定义滚动条渐变
5. 移动端优化 — <769px断点，底部导航，触控友好尺寸
6. 登录页重构 — 桌面端左右分栏（55% Hero + 45% 表单），手机端居中卡片

**无后端改动**。纯前端CSS和组件重构。

### P2：资源共享平台⭐ 新功能

> 讨论要点: "资源共享计划，单独开专栏"、"独门秘笈资料"、"审核机制"、"支持其他人上传"

**新增数据模型** — `Resource`:
- 标题、描述、分类（学习资料/历年试卷/笔记/独门秘笈/其他）
- 文件附件（支持PDF/DOCX/ZIP/图片等）
- 上传者、审核状态（待审核/已通过/已拒绝）、审核人、下载次数
- `isExclusive` 标记（独门秘笈资料）

**新增API**：
| 端点 | 说明 |
|------|------|
| `POST /api/resources` | 上传资源（待审核） |
| `GET /api/resources` | 浏览已审核资源（分类/标签筛选） |
| `GET /api/resources/:id` | 资源详情（下载计数） |
| `PATCH /api/admin/resources/:id/status` | 审核通过/拒绝 |
| `GET /api/admin/resources` | 管理端查看全部 |

**新增前端页面**：资源中心页、资源上传表单、资源卡片、管理员审核队列、「独门秘笈」徽章

### P3：学科工作集成

> 讨论要点: "学辅开课调查/讲座预告"、"绩效动态加权机制可加入学科的志愿者"

#### 3a. 学辅开课调查系统
- **新增模型**: `Survey`（问卷）+ `SurveyResponse`（答卷）
- 支持题型：文本、单选、多选、评分
- 管理端：创建问卷、查看统计结果
- 学生端：浏览可用问卷、填写提交

#### 3b. 讲座/活动预告
- **新增模型**: `Announcement`
- 类型：讲座/活动/通知/成果展示
- 信息字段：时间、地点、主讲人、附件
- 首页顶部横幅展示即将到来的讲座

#### 3c. 绩效维度扩展
- 在 `PerformanceRecord` 维度枚举中新增：`academic_teaching`（学术教学）、`academic_event`（学术活动）、`academic_research`（学术研究）
- 更新管理端绩效UI显示新维度

**新增依赖**: `recharts`（问卷结果图表）

### P4：手机号/邮箱验证 & 消息同步

学生会工作人员端，学生端，消息可同步在微信or邮箱

**后端改动**：
- 新增 `VerificationCode` 模型（目标、类型、验证码、用途、过期时间）
- 新增依赖 `nodemailer`（邮箱发送）+ `@alicloud/sms-sdk`（短信，可选）
- 新增API：发送验证码（限流）、验证验证码、绑定/修改邮箱、绑定/修改手机号
- 注册接口增加验证码校验（可选强制执行）

**前端新增组件**：验证码输入框、发送按钮（60秒冷却倒计时）、邮箱/手机验证表单

**风险评估**: 邮箱验证（低风险，nodemailer标准方案）；短信验证（中风险，需短信模板审核。系统已有ICP备案 京ICP备2026010091号-1）。**建议先做邮箱验证**。

### P5：微信小程序（第10-12周）

> 讨论要点: "如果用小程序的话在微信上通信可能会容易一点"、"SSL证书已存在"

**方案A（推荐先行）**: WebView 包裹 — 使用 `<web-view>` 组件加载现有Web应用，最快路径到MVP，复用全部React代码

**方案B（完整实现）**: 原生小程序 — 使用 Taro/uni-app 重写前端：
- 后端新增微信OAuth登录接口
- User模型增加 `wechatOpenId` 字段
- 模板消息推送通知

**前置条件**: 微信公众号/小程序注册、审核、域名ICP备案。现有SSL证书（[sievox.cn](c:\Users\25453\Desktop\student-feedback-system\backend\ssl)）可直接使用。
---

## 长期规划（未来一年）

### LT1：平台升级 — SIE生活平台（第4-6月）

> 讨论要点: "直接扩大到学生会"、"SIE生活平台"、"覆盖所有部门"、"志愿者绩效统一管理"、"每一届院团委学生会骨干和志愿者统一归档"、"变为院学生会官网"

**品牌升级**：
- 从「SIEVOX学生权益反馈系统」→「SIE生活平台」
- 权益反馈作为子平台之一
- 品牌字符串集中管理到配置文件，统一修改

**多部门架构**：
```
SIE生活平台
├── 学生权益部（已有SIEVOX平台）— 学生反馈、权益维护
├── 学术科技部 — 学辅调查、讲座预告、课程资源共享
├── 文体部 — 活动发布、报名管理
├── 志愿者工作部 -
|—— 实践部
└── 综合办公室 — 通知公告、文件管理
```

**数据模型扩展**：
- User 增加 `department` 字段（枚举：rights/academic/cultural/sports/general_office）
- User 增加 `collegeLevel` 字段（院级/校级）
- 新增 `Department` 模型（名称、权限、管理员列表）

**角色层级**：
```
院级超管 >主席团成员&团委学生兼职副书记> 部门部长(admin) > 部门干事(admin) > 学生(student)
```

### LT2：轻量AI智能体（第6-8月）

> 讨论要点: "看能不能开发个轻量智能体"

**功能设计**：
1. **反馈自动分类** — 根据反馈内容自动建议分类和优先级
2. **FAQ智能问答** — 学生常见问题自动回复（如"宿舍报修流程"、"奖学金申请条件"）
3. **紧急问题升级** — 识别紧急/敏感内容，自动标记并通知人工管理员

**实现方案**：
- 后端新增 `POST /api/ai/classify` 和 `POST /api/ai/faq`
- Feedback 模型新增 `aiSuggestedCategory`、`aiSuggestedPriority` 字段
- 管理端显示AI建议，一键采纳
- 使用国产大模型API（DeepSeek/通义千问等），异步队列处理

### LT3：校级扩展（第8-12月）

> 讨论要点: "可以把校级的权益部管理员和老师邀请进来"、"校级可能得放一会儿了"

- **校级管理员角色** — `collegeLevel: 'school'` 可查看所有学院数据
- **跨院数据对比** — 校级统计面板展示各学院反馈处理效率对比
- **教师角色** — 导师/辅导员可查看所带班级的反馈统计
- **校会对接** — 与校学生会建立工作机制后再推进

---

## 已完成功能（无需重复开发）

| 功能 | 状态 | 备注 |
|------|------|------|
| 学生反馈撤回 | ✅ | `isRevoked` 软删除 |
| 管理员删除问题 | ✅ | 超管可删除账号/撤回消息 |
| 部门成员归档 | ✅ | `SemesterMember` 模型 + 学期冻结 |
| 绩效管理 | ✅ | 6维度纯加分制 + 雷达图 + 加权计算 |
| SSL/HTTPS | ✅ | `backend/ssl/` 已有证书 |
| 通知系统 | ✅ | 新反馈/状态更新/新消息自动通知 |
| 审计日志 | ✅ | 所有敏感操作记录 |

---

## 依赖与顺序

```
Phase 0 (架构重构) ──── 必须先做
  │
  ├─→ Phase 1 (UI升级 MD3) ── 可与P0部分并行
  ├─→ Phase 2 (资源共享)   ── 独立，P0后即可开始
  ├─→ Phase 3 (学科集成)   ── 独立，P0后即可开始
  ├─→ Phase 4 (验证系统)   ── 独立，小范围
  │
  └─→ Phase 5 (微信小程序) ── 需前端重构完成后
        │
        └─→ LT1 (SIE平台) → LT2 (AI智能体) → LT3 (校级扩展)
```

**可并行开发**：Phase 2 和 Phase 3 可由不同开发人员同时进行。

---

## 新增依赖汇总

| 包 | 阶段 | 用途 |
|----|------|------|
| `react-router-dom` | P0 | 前端路由 |
| `react-hot-toast` | P0 | Toast通知（替代alert） |
| `socket.io` + `socket.io-client` | P0 | 实时更新（替代轮询） |
| `recharts` | P3 | 问卷结果图表 |
| `react-dropzone` | P2 | 拖拽文件上传（可选） |
| `nodemailer` | P4 | 邮箱验证码 |
| `@alicloud/sms-sdk` | P4 | 短信验证码（可选） |

---

## 关键文件

| 文件 | 作用 |
|------|------|
| [backend/server.js](c:\Users\25453\Desktop\student-feedback-system\backend\server.js) | 单体后端（1505行），需模块化拆分 |
| [frontend/src/App.jsx](c:\Users\25453\Desktop\student-feedback-system\frontend\src\App.jsx) | 学生端单体（1236行），需拆分为页面+组件+hooks |
| [frontend/src/AdminDashboard.jsx](c:\Users\25453\Desktop\student-feedback-system\frontend\src\AdminDashboard.jsx) | 管理端单体（1784行），需拆分为功能页面 |
| [frontend/src/index.css](c:\Users\25453\Desktop\student-feedback-system\frontend\src\index.css) | 含90+行浅色模式hack覆盖，需替换为CSS变量 |
| [design-system/DESIGN_SYSTEM.md](c:\Users\25453\Desktop\student-feedback-system\design-system\DESIGN_SYSTEM.md) | MD3迁移完整指南 |

---

## 验证方式

1. **P0重构**: 所有现有API端点返回相同响应格式，前端所有页面功能与重构前一致，`npm run dev` 正常启动
2. **P1 UI**: 5套配色 × 深浅模式全部视觉正常，移动端响应式无布局异常
3. **P2资源**: 上传→审核→浏览→下载全流程通畅
4. **P3调查**: 创建问卷→学生填写→管理端查看统计结果
5. **P4验证**: 发送验证码→验证→绑定邮箱/手机全流程
