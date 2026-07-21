# 设计系统迁移指南：AI风格 → Material Design 3

## 为什么当前 UI "AI味太重"？

当前系统的 UI 呈现出典型的 AI 生成特征，原因如下：

| 问题 | 当前表现 | 为什么是 AI 味 |
|------|----------|----------------|
| **过度装饰** | 浮动光球、点阵网格、渐变文字、发光效果 | AI 倾向于堆砌视觉效果来"丰富"界面 |
| **玻璃拟态泛滥** | 所有卡片 `backdrop-blur-xl bg-white/5` | AI 默认模板之一，缺乏设计意图 |
| **emoji 图标** | 📚🏠🍽️🛡️📋 等 | 真正的产品使用 SVG 图标库，不用 emoji |
| **渐变色滥用** | 按钮渐变、标题渐变、滚动条渐变 | 商业产品极少使用多彩渐变 |
| **暗色优先 + hack 补丁** | 先做暗色，再用 `!important` 覆盖浅色 | 缺乏设计系统思维 |
| **圆角不一致** | `rounded-xl`(12px)、`rounded-2xl`(16px) 混用 | 缺乏形状系统 |
| **间距无规律** | `gap-3`、`gap-4`、`gap-6` 随意使用 | 缺乏网格系统 |
| **无组件拆分** | 1200+ 行的单文件 | 不是 UI 问题但加剧了混乱感 |

## Material Design 3 设计系统

### 色彩系统

使用 **Material Design 3 动态色彩** 方案，支持 **5 套配色主题** 自由切换，选择持久化到 localStorage，刷新不丢失：

#### 配色主题

| 主题 | Primary | 风格 |
|------|---------|------|
| 典雅紫 (purple) | `#6750A4` | Material 默认紫，稳重专业 |
| 海洋蓝 (blue) | `#1A6CE3` | 清爽理性，适合教育场景 |
| 森林绿 (green) | `#4A8D3F` | 自然沉稳，适合环保/健康主题 |
| 暖阳橙 (orange) | `#C85100` | 温暖活力，适合社区/服务主题 |
| 青碧色 (teal) | `#007B7B` | 现代清新，适合科技/创新主题 |

#### 色彩架构

```
[data-color="purple|blue|green|orange|teal"]   →  控制 Primary/Secondary/Tertiary/Error
[data-theme="light|dark"]                      →  控制 Surface/On-Surface/Outline
```

两维度独立组合，任意配色 × 任意模式 = 10种视觉方案。
所有选择自动存入 localStorage，刷新页面后保持不变。

**关键原则：**
- 每种颜色都有 `On-*` 变体（用于文字/图标）
- 每种颜色都有 `Container` 变体（用于填充区域）
- 暗色主题是同一系统的映射，不是 hack 覆盖

### 字体系统

```
Display Large:   400 57px/64px   Roboto
Display Medium:  400 45px/52px
Display Small:   400 36px/44px
Headline Large:  400 32px/40px
Headline Medium: 400 28px/36px
Headline Small:  400 24px/32px
Title Large:     400 22px/28px
Title Medium:    500 16px/24px   ← 卡片标题
Title Small:     500 14px/20px   ← 列表标题
Body Large:      400 16px/24px
Body Medium:     400 14px/20px   ← 正文
Body Small:      400 12px/16px   ← 辅助信息
Label Large:     500 14px/20px   ← 按钮文字
Label Medium:    500 12px/16px   ← 标签/芯片
Label Small:     500 11px/16px
```

**关键原则：**
- 所有字号有明确的用途和层级
- 不再使用 `text-transparent bg-clip-text bg-gradient-to-r` 做标题

### 高度系统 (Elevation)

```
Level 0: none                       — 平坦内容区
Level 1: 0 1px 2px rgba(0,0,0,.3)  — 卡片 (Card)
Level 2: 0 1px 2px ..., 0 2px 6px  — 顶部栏 (App Bar)
Level 3: 0 1px 3px ..., 0 4px 8px  — FAB, 底部表单
Level 4: 0 2px 3px ..., 0 6px 10px — 侧边抽屉
Level 5: 0 4px 4px ..., 0 8px 12px — 对话框 (Dialog)
```

**关键原则：**
- 高度 = 重要性 + 与背景的距离
- 不再使用 `shadow-purple-500/25` 发光阴影

### 形状系统 (Shape)

```
none:        0px   — 分割线、输入框底部边框
extra-small: 4px   — 输入框顶部圆角
small:       8px   — 芯片 (Chip)、小按钮
medium:      12px  — 卡片 (Card)
large:       16px  — FAB
extra-large: 28px  — 对话框、底部表单
full:        9999px — 药丸按钮、头像
```

### 间距系统 (8dp Grid)

所有间距必须是 8 的倍数：

```
4px  (0.5x)  — 元素内部紧密间距
8px  (1x)    — 最小间距单位
12px (1.5x)  — 相关元素间距
16px (2x)    — 标准内边距
20px (2.5x)  — 
24px (3x)    — 区域间距
32px (4x)    — 大区域间距
40px (5x)    — 
48px (6x)    — 页面级间距
```

### 图标系统

**不要再用 emoji！** 使用 Google Material Symbols：

```html
<!-- 引入字体 -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

<!-- 使用 -->
<span class="material-symbols-rounded">feedback</span>
```

**图标映射表：**
| Emoji | 场景 | Material Symbol |
|-------|------|----------------|
| 📚 | 教学教务 | `menu_book` |
| 🏠 | 宿舍住宿 | `night_shelter` |
| 🍽️ | 餐饮服务 | `restaurant` |
| 🛡️ | 安全保卫 | `security` |
| 📋 | 综合服务 | `category` |
| 📊 | 统计 | `bar_chart` / `monitoring` |
| ⏳ | 待处理 | `hourglass_empty` |
| ⚙️ | 处理中 | `engineering` |
| ✅ | 已解决 | `check_circle` |
| ✏️ | 提交反馈 | `edit_note` |
| 📜 | 历史记录 | `history` |
| 🔒 | 密码 | `lock` |
| 👤 | 用户 | `person` |
| 🌗 | 主题切换 | `light_mode` / `dark_mode` |
| 📬 | 通知 | `notifications` |

## 组件对照表

### 按钮 (Button)

| 变体 | 旧设计 | 新设计 |
|------|--------|--------|
| 主要操作 | `bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl` | `background: var(--md-primary); border-radius: 999px;` |
| 次要操作 | `bg-white/10 hover:bg-white/20 border-white/20` | `background: var(--md-secondary-container);` (Tonal) |
| 文字按钮 | `bg-transparent text-purple-300` | `color: var(--md-primary);` (Text) |
| 危险操作 | 无 | `background: var(--md-error);` |
| 尺寸 | `px-6 py-3` (固定) | 标准 40px / 大 56px / 小 32px |

### 卡片 (Card)

| 属性 | 旧设计 | 新设计 |
|------|--------|--------|
| 背景 | `bg-white/5 backdrop-blur-xl` (玻璃) | `var(--md-surface-container-low)` (纯色) |
| 边框 | `border-white/10` (半透明) | 无边框或 `var(--md-outline-variant)` (轮廓卡片) |
| 阴影 | `hover:shadow-lg hover:shadow-purple-500/10` | `var(--md-elevation-1)` → hover `elevation-2` |
| 圆角 | `rounded-2xl` (16px) | `var(--md-shape-medium)` (12px) |

### 输入框 (Text Field)

| 属性 | 旧设计 | 新设计 |
|------|--------|--------|
| 样式 | `bg-white/5 border-white/10 rounded-xl` | MD Outlined: 顶部小圆角 + 底部边框 |
| 聚焦 | `focus:border-purple-500/50` | 底部2px主色边框 |
| 占位符 | `placeholder-white/30` | `var(--md-on-surface-variant)` 60%透明度 |

### 芯片/标签 (Chip)

| 场景 | 旧设计 | 新设计 |
|------|--------|--------|
| 类别选择 | 无专用组件，用 div+click | Assist Chip / Filter Chip |
| 状态标签 | 四色背景+文字 | 四色容器背景+容器色文字 |

### 状态徽章 (Status Badge)

| 状态 | 旧设计 | 新设计 |
|------|--------|--------|
| 待处理 | `bg-yellow-500/20 text-yellow-400` | `bg-[--md-pending-container] text-[--md-on-pending-container]` |
| 处理中 | `bg-blue-500/20 text-blue-400` | `bg-[--md-processing-container] text-[--md-on-processing-container]` |
| 已解决 | `bg-green-500/20 text-green-400` | `bg-[--md-resolved-container] text-[--md-on-resolved-container]` |
| 已拒绝 | `bg-red-500/20 text-red-400` | `bg-[--md-error-container] text-[--md-on-error-container]` |

## 要删除的元素

重构时需要彻底删除以下"AI味"元素：

1. ❌ `Background` 组件 — 浮动光球 + 点阵网格 + 渐变动画
2. ❌ `GlowOrb` 组件 — 装饰性光球
3. ❌ `FloatingShape` 组件 — 浮动几何图形
4. ❌ `.gradient-text` — 渐变色标题文字
5. ❌ `.glass` 类 — 玻璃态效果
6. ❌ `.glow` / `.glow-blue` — 发光阴影
7. ❌ `shadow-purple-500/25` — 紫色发光按钮阴影
8. ❌ `bg-gradient-to-r from-purple-600 to-blue-600` — 所有渐变按钮
9. ❌ `bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500` — 渐变标题
10. ❌ `backdrop-blur-xl` — 所有玻璃模糊效果
11. ❌ `index.css` 中的 `html:not(.dark)` 暴力覆盖规则（约90行）
12. ❌ 自定义滚动条渐变
13. ❌ emoji 作为功能性图标

## 迁移步骤建议

### Phase 1: 建立基础设施
1. 在 `index.css` 中定义 `:root` 和 `[data-theme="dark"]` CSS 变量（替换现有 hack）
2. 引入 Material Symbols 字体
3. 更新 `tailwind.config.js` 映射 CSS 变量到 Tailwind
4. 替换字体：`Noto Sans SC` → Roboto（中文保留 Noto Sans SC 作为 fallback）

### Phase 2: 替换基础组件
1. 重构 `Button` → 四种变体 (filled, tonal, outlined, text)
2. 重构 `Card` → 三种变体 (elevated, outlined, filled)
3. 重构 `Input` / `Select` → MD Outlined Text Field
4. 新建 `Chip` 组件
5. 重构 `StatusBadge` → 使用新色彩标记

### Phase 3: 重构页面
1. LoginPage — 干净的表单卡片
2. DashboardPage — 统计卡片 + 分段按钮标签
3. SubmitForm — 类别选择器 + 表单
4. FeedbackList — 手风琴展开面板

### Phase 4: 清理
1. 删除所有装饰组件 (Background, GlowOrb, FloatingShape)
2. 删除 `index.css` 中的 hack 代码
3. 删除动画关键帧 (float, pulse-slow, gradient-shift)
4. 删除自定义滚动条样式

## 登录页布局

### 桌面端 (≥769px)
左右分栏布局：
- **左侧 (55-60%)**：Hero 区域 — 主色容器背景 + 点阵纹理，左上角放置学校+学院 logo，中央为预留大图位（可替换为校园照片），底部为标语文字
- **右侧 (40-45%)**：表单面板 — 白色表面上的登录/注册卡片，包含系统 logo、标题、标签切换、表单、主题控制器

### 手机端 (<769px)
居中单一卡片布局：
- 左上角：缩小版的学校+学院 logo 角标
- 卡片内：系统 logo + 学院 logo 并排 + 标题 + 表单
- 表单面板无背景，直接融入页面

## 样例文件

打开 `design-system/material-design-sample.html` 在浏览器中预览完整的 Material Design 样例页面。

样例包含：
- **登录页** — 桌面端左右分栏 + 手机端居中卡片，登录/注册切换
- **学生仪表盘** — 统计卡片 + 提交反馈 + 反馈列表
- **设置弹窗** — 个人资料 + 修改密码
- **5 套配色主题** — 紫/蓝/绿/橙/青，一键切换，刷新保持
- **深浅模式** — 每套配色独立支持浅色/暗色
- **完整交互** — 类别选择、子类别芯片、手风琴展开等
