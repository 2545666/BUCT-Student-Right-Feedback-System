# # <img src="./frontend/src/assets/LOGO_1.png" width="24" height="24" style="vertical-align: middle;"> 北京化工大学国际教育学院 - SIEVOX学生权益反馈系统

北京化工大学国际教育学院学生权益反馈管理平台，支持实时反馈、分类管理、进度跟踪等功能。

## ✨ 功能特性

### 学生端
- 🔐 安全的用户注册与登录系统
- 📝 按类别提交权益问题反馈
- 🔄 实时查看反馈处理进度
- 🕵️ 支持匿名提交保护隐私
- 📊 个人反馈统计仪表板

### 管理端
- 📈 实时数据统计面板
- 🏷️ 按状态/类别/优先级筛选
- 💬 反馈回复与状态更新
- 📋 完整的处理记录追踪

### 问题分类
| 类别 | 图标 | 描述 |
|------|------|------|
| 教学教务 | 📚 | 课程、考试与规划 |
| 宿舍住宿 | 🏠 | 环境与配套服务 |
| 餐饮服务 | 🍽️ | 食品、运营与价格|
| 安全保卫 | 🛡️ | 人身、消防与网络|
| 综合服务与其他 | 📋 |活动、心理与行政 |

## 🛡️ 安全特性

- **Helmet** - 设置安全 HTTP 响应头
- **速率限制** - 防止暴力攻击和 DDoS
- **MongoDB 注入防护** - 数据清洗防止 NoSQL 注入
- **XSS 防护** - 防止跨站脚本攻击
- **HPP 防护** - 防止 HTTP 参数污染
- **JWT 认证** - 安全的身份验证机制
- **密码加密** - bcrypt 哈希存储
- **账户锁定** - 多次失败自动锁定
- **审计日志** - 完整操作记录

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd student-feedback-system
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等
```

4. **启动 MongoDB**
```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 或本地安装的 MongoDB
mongod --dbpath /path/to/data
```

5. **启动后端服务**
```bash
npm run dev
```

6. **安装前端依赖**
```bash
cd ../frontend
npm install
```

7. **启动前端开发服务器**
```bash
npm run dev
```

8. **访问系统**
- 前端: http://localhost:3000
- 后端 API: http://localhost:3001

## 📁 项目结构

```
student-feedback-system/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── App.jsx             # 主应用组件
│   │   ├── AdminDashboard.jsx  # 管理员仪表板
│   │   ├── main.jsx            # 入口文件
│   │   └── index.css           # 全局样式
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── server.js               # 主服务器文件
│   ├── .env.example            # 环境变量模板
│   └── package.json
│
└── README.md
```

## 🔌 API 接口

### 认证相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/password | 修改密码 |

### 反馈相关
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/feedback | 提交反馈 |
| GET | /api/feedback/my | 获取我的反馈 |
| GET | /api/feedback/:id | 获取反馈详情 |

### 管理员接口
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/admin/feedbacks | 获取所有反馈 |
| PATCH | /api/admin/feedback/:id/status | 更新反馈状态 |
| GET | /api/admin/stats | 获取统计数据 |

## 🎨 设计风格

系统采用现代玻璃态 (Glassmorphism) 设计风格：
- **主色调**: 紫色 (#9333ea) + 蓝色 (#3b82f6)
- **背景**: 深色渐变 + 动态光晕效果
- **卡片**: 毛玻璃效果 + 微妙边框
- **交互**: 流畅的过渡动画

## 📄 许可证

MIT License

## 👥 贡献者

 赵启涵(BUCT SIE)

---

Copyright© 2026 赵启涵
京ICP备2026010091号-1
京公网安备11011402055565号
