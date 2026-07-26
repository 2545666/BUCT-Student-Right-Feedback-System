# SIEHUB 远端部署交接

日期：2026-07-26
目标服务器：`182.92.71.153`

## 本次本地完成的变更

### 2026-07-26 最新追加

1. 已新增各部门“部门介绍页面”受控区块式编辑器 MVP：
   - 学生端仍保留“部门介绍 / 学生服务入口 / 通知与活动”三入口。
   - 点击“部门介绍”进入该部门已发布介绍页；未发布时显示默认模板。
   - 管理端原“部门工作台 / 规划中”卡片保持不变。
   - 管理端新增独立“部门介绍编辑”入口，支持顶部封面、文本、图片、视频、部门职责、联系方式等受控区块。
   - 编辑器支持中英文内容字段、区块排序、删除、保存草稿、发布和发布记录展示。
   - 学术科技部管理端已改为“管理入口卡片 + SIEBridge 审核工作台并存”，不再只显示 SIEBridge 审核。

2. 登录页品牌细节已调整：
   - 删除“一处登录，抵达所有学生工作模块。”右侧圆形 HUB 装饰 logo。
   - 登录页学院署名的国际教育学院 logo 已统一改用 `frontend/src/assets/SIE_LOGO.svg`。

相关源码追加：

- `backend/server.js`
  - 新增 `DepartmentIntroduction`、`DepartmentIntroductionRevision`、`DepartmentIntroductionMedia` 模型。
  - 新增 `/api/hub/departments/:organization/:department/introduction*` 系列接口。
  - 新增 `/api/department-intro-assets` 静态资源映射和 `department_intro_uploads` 专用上传目录。
  - JSON body limit 从 `10kb` 调整为 `256kb`，用于承载受控区块内容。
- `backend/organization.js`
  - 部门管理权限包含 `manage_department_introduction`。
- `frontend/src/DepartmentIntroduction.jsx`
  - 新增学生端介绍页渲染、管理端区块编辑器、入口卡片组件。
- `frontend/src/App.jsx`
  - 接入学生端“部门介绍”入口。
  - 管理端新增“部门介绍编辑”入口，且不替换“部门工作台”。
  - 修正学术科技部 `siebridge` 模块权限匹配。
- `frontend/src/siehub.css`
  - 新增部门介绍页和编辑器布局样式，含英文长文本与窄屏适配。

### 2026-07-26 先前追加

1. 英文版覆盖与英文专用布局已增强：
   - 补齐登录页、SIEHUB、SIEVOX、SIEBridge、组织治理、绩效管理等高频界面的运行时翻译。
   - 修复英文模式下长按钮、长标题、模块卡片、表格和筛选区的溢出问题。
   - 登录页英文 DOM 已检查，可见文本无中文残留，1440px 下无横向溢出。

2. SIEVOX 中“部门绩效管理”顶部板块已重新排版：
   - `部门绩效管理` 标题说明区与操作区分离。
   - `管理本学期成员` 与 `期末动态加权结算` 改为两张等高操作卡。
   - `当前管理学期` 选择、重命名和“归档并开启新学期”改为独立学期控制台。
   - 删除总榜单标题右侧重复出现的“管理本学期成员名单 / 期末动态加权结算”按钮，减少挤压和视觉重复。
   - 已补移动端和英文模式自适应样式，避免组件溢出。

相关源码追加：

- `frontend/src/AdminDashboard.jsx`
  - 重排 SIEVOX 绩效管理顶部 `performance-command` 区块。
  - 新增 `performance-action-card` 操作卡结构。
  - 新增 `performance-semester-console` 学期控制台结构。
- `frontend/src/sievox-runtime.css`
  - 新增 SIEVOX 绩效管理顶部区块、操作卡、学期控制台、窄屏单列布局样式。
- `frontend/src/App.jsx`
  - 追加相关中文文案的 EN 翻译。
- `frontend/src/index.css`
  - 追加 SIEVOX/Tailwind-heavy 工作区英文模式兜底排版。
- `frontend/src/siehub.css`
  - 追加 SIEHUB 英文模式卡片和导航自适应样式。
- `frontend/src/siebridge.css`
  - 追加 SIEBridge 英文模式搜索、卡片、表单与审核区自适应样式。

### 先前完成

学术科技部学生端已恢复为与其他部门一致的三入口结构：

1. 部门介绍
2. 学生服务入口
3. 通知与活动

其中第 2 项现在是 `SIEBridge 课程资源共享平台` 入口卡片，不会在进入学术科技部时直接跳转到平台。点击卡片后进入 SIEBridge；平台页提供“返回学生服务入口”按钮。

相关源码：

- `frontend/src/App.jsx`
  - `DepartmentStudentPortal` 不再对 `academic_technology` 直接 return SIEBridge。
  - 增加 SIEBridge 入口卡片和返回入口状态。
  - 增加中文入口文案的 EN 翻译。
- `frontend/src/siehub.css`
  - 增加 `.siebridge-entry` 与 `.siebridge-student-back` 样式。

课程性质仍为上传者自由填写，不限制为固定枚举值。

## 本地构建结果

已在 `frontend` 目录执行：

```powershell
npm run build
```

构建成功。当前本地 `frontend/dist` 主要产物：

- `assets/index-D4vSO86Q.js`
- `assets/index-Bv2hT3VH.css`
- `assets/BUCT_LOGO_blue-kEte8-qA.png`
- `assets/SIE_LOGO-CCxz1oGZ.svg`
- `assets/LOGO_1-DIFKYRrW.png`
- `assets/SIEHUB_LOGO-BqKZVvp9.png`

本地 `frontend/dist/index.html` SHA256：

`23C66A9319786C03FF7C7FD81632E109346ABFACD3B4BD410B3F2DFC82F43735`

## 服务器同步背景

### 当前线上状态更新

部署智能体已反馈：SIEBridge 后端与前端功能目前已经部署到服务器。后续部署不再把 SIEBridge 视为缺失阻塞项，当前增量目标应聚焦“部门介绍页面编辑器”。

部署时请以线上已可用的 SIEBridge 为基线：

- 不要回滚或删除线上 `backend/siebridge.js`；
- 不要删除或重建线上 `backend/siebridge_uploads`；
- 不要用旧版 `server.js` 覆盖掉线上已挂载的 SIEBridge 路由；
- 如需同步 `backend/server.js`，必须保留现有 SIEBridge 路由，并叠加本地新增的部门介绍页路由。

此前读取的服务器同步记录为：

`C:\Users\25453\AppData\Local\Temp\SIEHUB_LOCAL_SYNC_FROM_SERVER_20260726.md`

该记录说明，在同步检查时以下白名单文件与服务器一致：

- `backend/server.js`
- `backend/organization.js`
- `frontend/dist/index.html`

同时明确记录：

- MongoDB 未同步；
- 远端 MongoDB 未拉回；
- 远端上传文件未拉回、未修改；
- 同步检查期间没有重启后端进程；
- 学生权益部/SIEVOX 仍使用 `LOGO_1-DIFKYRrW.png`。

注意：本次重新构建后，`frontend/dist/index.html` 和入口 JS/CSS 产物已经更新，因此服务器上的旧 dist 不再是最新版本。

## 部署智能体需要执行

1. 备份服务器当前后端代码、前端 dist、MongoDB 和上传目录。
2. 本次按“部门介绍编辑器增量部署”执行：先同步后端介绍页相关改动，再同步前端。不要只发布前端。
3. 后端本次重点同步：
   - `backend/server.js`
   - `backend/organization.js`
   - `backend/package.json` / `backend/package-lock.json`（仅当服务器依赖版本不同或缺依赖时，按线上流程安装）
4. 后端同步时必须确认以下新增内容已进入线上：
   - `DepartmentIntroduction`
   - `DepartmentIntroductionRevision`
   - `DepartmentIntroductionMedia`
   - `GET /api/hub/departments/:organization/:department/introduction`
   - `GET /api/hub/departments/:organization/:department/introduction/editor`
   - `PUT /api/hub/departments/:organization/:department/introduction/draft`
   - `POST /api/hub/departments/:organization/:department/introduction/publish`
   - `POST /api/hub/departments/:organization/:department/introduction/media`
   - `/api/department-intro-assets` 静态资源映射
   - `manage_department_introduction` 部门管理权限
5. 确保服务器创建并保留以下上传目录，且后端进程有写入权限：
   - `backend/department_intro_uploads`
6. 不要覆盖 MongoDB 数据，也不要删除远端上传资料目录。
7. 重启后端后先验证接口：
   - `GET /api/health`
   - `GET /api/siebridge/meta` 仍正常，确认 SIEBridge 没有被回退
   - 登录态访问 `GET /api/hub/departments/student_union/academic_technology/introduction`
   - 管理身份访问 `GET /api/hub/departments/student_union/academic_technology/introduction/editor`
   - 管理身份保存草稿：`PUT /api/hub/departments/student_union/academic_technology/introduction/draft`
   - 管理身份发布：`POST /api/hub/departments/student_union/academic_technology/introduction/publish`
   - 管理身份上传图片或 mp4：`POST /api/hub/departments/student_union/academic_technology/introduction/media`
8. 后端接口正常后，再将本地最新 `frontend/dist` 整目录同步到服务器前端静态目录，确保旧 hash 资源不会造成页面引用缺失。
9. 部署后验证：
   - 登录后进入“学术科技部”；
   - 默认可看到“部门介绍 / 学生服务入口 / 通知与活动”三张卡；
   - 点击“部门介绍”能进入介绍页，未发布时显示默认模板；
   - 点击“ SIEBridge 课程资源共享平台”后能进入课程资源平台；
   - 点击“返回学生服务入口”能回到三卡片页面；
   - 管理端“部门工作台”仍显示“规划中”；
   - 管理端可看到独立“部门介绍编辑”入口；
   - 部门介绍编辑器可添加区块、保存草稿并发布；
   - 学生权益部的 SIEVOX 入口仍可正常进入；
   - EN 切换后新入口文案正常翻译；
   - EN 模式下登录页、SIEHUB 模块卡片、SIEBridge、SIEVOX 管理端没有明显中文残留和横向溢出；
   - 进入 SIEVOX 管理端“部门绩效管理”，确认顶部标题说明、两张操作卡、学期控制台排版整齐；
   - “管理本学期成员”和“期末动态加权结算”仍能打开原有弹窗/功能。

## 不应在本次部署中做的事

- 不要反向拉取旧服务器 dist 覆盖本地新构建；
- 不要同步或清空 MongoDB；
- 不要删除 `backend/siebridge_uploads` 或服务器已有上传文件；
- 不要删除 `backend/department_intro_uploads` 或部门介绍页上传文件；
- 不要把线上已部署成功的 SIEBridge 后端回滚为缺失状态；
- 不要修改 SIEVOX 的成熟业务入口逻辑。
