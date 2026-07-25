# SIEVOX 远端服务器部署交接文档

给接手部署的智能体/工程师：

这是北京化工大学国际教育学院 SIEVOX 学生权益反馈系统。当前代码已完成 UI-demo 正式并入前端、统一登录入口、终极管理员/超级管理员/管理端/学生端分流、组织架构与归档相关基础功能。请按本文部署，不要照抄旧文档里的乱码环境变量块。

## 1. 当前仓库状态

- GitHub 仓库：`https://github.com/2545666/BUCT-Student-Right-Feedback-System.git`
- 分支：`main`
- 当前建议部署提交：`5140dbd fix: refine theme controls and dark mode layout`
- 前端目录：`frontend/`
- 后端目录：`backend/`
- 原始 UI demo 样式目录：`ui-demo/`
- 生产前端构建产物：`frontend/dist/`

本地验证结果：

- `frontend` 已通过 `npm run build`
- 本地前端端口：`3000`
- 本地后端端口：`3101`
- 后端健康检查：`GET /api/health`

## 2. 强制注意事项

### 2.1 后端端口是 3101，不是 3001

后端默认：

```js
process.env.PORT || 3101
```

前端开发代理也指向：

```js
http://localhost:3101
```

部署时请让后端监听 `127.0.0.1:3101`，再用 Nginx 把 `/api` 反代过去。

### 2.2 生产前端使用同源 `/api`

`frontend/src/App.jsx` 和 `frontend/src/AdminDashboard.jsx` 的 API 逻辑是：

```js
import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:3101/api`
  : '/api'
```

所以生产环境必须满足：

- 用户访问：`https://你的域名/`
- API 访问：`https://你的域名/api/...`
- Nginx 需要把 `/api` 反代到 `http://127.0.0.1:3101`

### 2.3 不建议直接把后端 `NODE_ENV` 设为 `production`

当前 `backend/server.js` 中：

- `NODE_ENV=production` 会让后端自己尝试监听 `80/443`
- 并读取：
  - `backend/ssl/sievox.cn.key`
  - `backend/ssl/sievox.cn.pem`

如果服务器使用 Nginx/Certbot 管理 HTTPS，后端会和 Nginx 抢占 `80/443`。推荐部署方式：

```bash
NODE_ENV=staging
PORT=3101
```

这样后端仍按服务端模式运行，但只监听 `3101`，由 Nginx 统一负责公网 HTTPS。

### 2.4 后端当前没有自动读取 `.env`

虽然项目有 `backend/.env.example`，但当前 `backend/server.js` 没有执行：

```js
require('dotenv').config()
```

因此仅创建 `.env` 不一定生效。推荐用 PM2 ecosystem 文件显式注入环境变量，或由部署智能体先补一行 dotenv 加载代码后再部署。

本文采用“不改代码”的部署方案：PM2 ecosystem 注入环境变量。

### 2.5 `CORS_ORIGIN` 当前只适合填一个源

代码中 `process.env.CORS_ORIGIN` 没有按逗号拆分。如果填：

```bash
CORS_ORIGIN=https://a.com,https://www.a.com
```

它会被当成一个完整字符串，可能导致 CORS 不匹配。

推荐：

- 只保留一个正式访问域名，例如 `https://sievox.example.com`
- 另一个域名在 Nginx 里 301 跳转到主域名

## 3. 推荐服务器架构

```text
用户浏览器
  |
  | HTTPS 443
  v
Nginx
  |-- /              -> frontend/dist 静态文件
  |-- /api           -> http://127.0.0.1:3101
  |-- /api/uploads   -> 后端 Express 静态映射或反代
  v
Node.js backend/server.js
  |
  v
MongoDB buct_feedback
```

## 4. 服务器基础依赖

建议系统：

- Ubuntu 22.04 LTS 或更新
- Node.js 18+，推荐 Node.js 20 LTS
- MongoDB 6/7
- Nginx
- PM2
- Git

安装示例：

```bash
apt update
apt install -y git nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2
```

MongoDB 可使用服务器本机 MongoDB，也可使用云数据库。生产环境必须启用认证。

## 5. 拉取代码

```bash
mkdir -p /var/www
cd /var/www

git clone https://github.com/2545666/BUCT-Student-Right-Feedback-System.git sievox
cd /var/www/sievox

git checkout main
git pull
git rev-parse --short HEAD
```

确认输出至少是：

```bash
5140dbd
```

或晚于该提交。

## 6. 后端部署

### 6.1 安装依赖

```bash
cd /var/www/sievox/backend
npm ci
```

如服务器没有完整 lockfile 兼容环境，可退回：

```bash
npm install
```

### 6.2 创建 PM2 ecosystem 文件

在 `/var/www/sievox/backend/ecosystem.config.cjs` 创建：

```js
module.exports = {
  apps: [
    {
      name: 'sievox-backend',
      cwd: '/var/www/sievox/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: '3101',
        MONGODB_URI: 'mongodb://buct_app:替换为数据库密码@127.0.0.1:27017/buct_feedback?authSource=buct_feedback',
        JWT_SECRET: '替换为至少64位随机字符串',
        JWT_EXPIRE: '7d',
        CORS_ORIGIN: 'https://替换为正式域名'
      }
    }
  ]
};
```

如果 MongoDB 用户建在 `admin` 库，把 `authSource=buct_feedback` 改成：

```text
authSource=admin
```

### 6.3 准备上传目录

后端固定使用：

```text
backend/uploads
```

执行：

```bash
mkdir -p /var/www/sievox/backend/uploads
chown -R root:root /var/www/sievox/backend/uploads
```

如果 PM2 不用 root 用户运行，请把 owner 改成实际运行用户，例如：

```bash
chown -R www-data:www-data /var/www/sievox/backend/uploads
```

### 6.4 启动后端

```bash
cd /var/www/sievox/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
pm2 logs sievox-backend --lines 80
```

本机健康检查：

```bash
curl http://127.0.0.1:3101/api/health
```

期望：

```json
{"success":true,"message":"服务运行正常", "...": "..."}
```

## 7. 前端部署

### 7.1 安装依赖并构建

```bash
cd /var/www/sievox/frontend
npm ci
npm run build
```

构建成功后会生成：

```text
/var/www/sievox/frontend/dist
```

### 7.2 Nginx 配置

创建：

```bash
nano /etc/nginx/sites-available/sievox
```

基础 HTTP 版本：

```nginx
server {
    listen 80;
    server_name 替换为正式域名;

    root /var/www/sievox/frontend/dist;
    index index.html;

    client_max_body_size 50m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3101/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用：

```bash
ln -s /etc/nginx/sites-available/sievox /etc/nginx/sites-enabled/sievox
nginx -t
systemctl reload nginx
```

如果有默认站点冲突：

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 7.3 HTTPS

推荐用 Certbot：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 替换为正式域名
```

如果同时使用 `www`，建议 Nginx/Certbot 做跳转到主域名，并且 `CORS_ORIGIN` 只保留主域名。

## 8. MongoDB 初始化与默认账号

后端启动时会确保以下账号存在或被更新为 superadmin：

| 学号/账号 | 默认密码 | 类型 |
|---|---|---|
| `20240901010` | `SIEVOX2026.` | 终极管理员，`isUltimateAdmin=true` |
| `20240901008` | `SIEVOX2026.` | 超级管理员 |
| `20240901009` | `SIEVOX2026.` | 超级管理员 |

安全要求：

1. 首次上线后立刻登录终极管理员账号。
2. 立刻修改默认密码，或直接在数据库中重置。
3. 不要在公开文档、截图、群聊里继续传播默认密码。

注意：当前启动逻辑每次启动都会“确保”这些账号的角色/身份字段。不要随意删除这段逻辑，除非已经改成更安全的初始化脚本。

## 9. 关键业务/角色状态

当前前端已改为统一登录入口：

- 登录页不再区分学生/管理员/超管入口
- 后端根据账号角色返回身份
- 前端自动进入对应界面

角色映射：

| 组织身份 | 系统访问端 |
|---|---|
| 学生 | 学生端 |
| 志愿者 | 子管理员/管理端 |
| 部门负责人 | 超级管理员端，但标签显示“部门负责人” |
| 团委学生兼职团干部 | 超级管理员端，但标签显示“团委学生兼职团干部” |
| 主席团成员 | 超级管理员端 |
| 团委学生兼职副书记 | 超级管理员端 |
| 终极管理员 | 最高权限，可访问任意端 |

组织架构：

- 团委：
  - 组织部
  - 宣传部
  - 实践部
  - 志愿者工作部
- 学生会：
  - 综合办公室
  - 学生权益部
  - 文体艺术部
  - 学术科技部
  - 新媒体工作部

终极管理员界面中，团委学生会架构与部门绩效管理同级。

## 10. 部署后验收清单

### 10.1 网络与接口

```bash
curl https://正式域名/api/health
```

应该返回：

```json
{"success":true}
```

### 10.2 前端页面

浏览器访问：

```text
https://正式域名/
```

检查：

- 登录页是统一入口，不显示“学生/管理员/超管”分入口
- 外观设置按钮可打开调色盘
- 主界面顶部不直接显示主题色小圆点
- 太阳/月亮深浅色切换可用
- 深色模式下背景、卡片、字体完整反转

### 10.3 登录分流

使用终极管理员测试：

```text
账号：20240901010
密码：SIEVOX2026.
```

检查：

- 能登录
- 右上角有角色标签
- 终极管理员可看到端切换/手机端预览
- 非终极管理员不应看到学生端/管理端/超级管理员导航切换

### 10.4 业务功能冒烟测试

至少测试：

1. 学生注册/登录
2. 提交权益反馈
3. 管理端查看反馈
4. 管理端处理反馈
5. 管理端查看自己绩效
6. 终极管理员查看：
   - 业务反馈处理
   - 账号管理面板
   - 部门绩效管理
   - 团委学生会架构
7. 终极管理员分配角色/身份标签
8. 上传附件并通过 `/api/uploads/...` 能访问

## 11. 可运行的本地/服务器验证命令

前端构建：

```bash
cd /var/www/sievox/frontend
npm run build
```

组织架构单测：

```bash
cd /var/www/sievox/backend
node --test organization.test.js
```

后端启动检查：

```bash
pm2 status
pm2 logs sievox-backend --lines 120
curl http://127.0.0.1:3101/api/health
```

Nginx 检查：

```bash
nginx -t
systemctl status nginx
curl -I https://正式域名/
curl https://正式域名/api/health
```

## 12. 更新部署流程

后续更新代码：

```bash
cd /var/www/sievox
git pull

cd frontend
npm ci
npm run build

cd ../backend
npm ci
pm2 restart sievox-backend

nginx -t
systemctl reload nginx
```

如果只是前端样式更新，通常不需要重启后端。

## 13. 回滚方案

如果新版本部署后前端异常：

```bash
cd /var/www/sievox
git log --oneline -5
git checkout 上一个稳定提交

cd frontend
npm ci
npm run build

systemctl reload nginx
```

如果后端异常：

```bash
cd /var/www/sievox
git checkout 上一个稳定提交

cd backend
npm ci
pm2 restart sievox-backend
pm2 logs sievox-backend --lines 120
```

当前最近稳定相关提交：

- `5140dbd`：主题控件、深色模式、布局修复
- `0b69de2`：统一登录入口、衬线粗体
- `1d3ce25`：管理端工作区 UI-demo 化
- `fafa4d6`：管理 UI 对齐、后端改 3101

## 14. 常见问题排查

### 页面打开但 API 失败

检查：

```bash
curl http://127.0.0.1:3101/api/health
curl https://正式域名/api/health
pm2 logs sievox-backend --lines 120
```

通常原因：

- PM2 没启动
- Nginx `/api` 反代路径错
- 后端监听端口不是 3101
- MongoDB 连不上

### 登录报“网络错误，请重试”

优先检查：

1. 浏览器 Network 面板中 `/api/auth/login` 是否 502/404/CORS。
2. `CORS_ORIGIN` 是否精确等于当前访问域名。
3. Nginx 是否把 `/api/` 正确代理到 `127.0.0.1:3101/api/`。
4. 后端是否能连 MongoDB。

### `NODE_ENV=production` 后服务起不来

这是预期风险。当前代码会读 SSL 文件并监听 80/443。

推荐改回：

```bash
NODE_ENV=staging
PORT=3101
```

并让 Nginx 负责 HTTPS。

### 上传附件 413

Nginx 需要：

```nginx
client_max_body_size 50m;
```

后端 multer 当前限制是 50MB。

### 主题色/深色模式看起来不一致

确认部署的是 `5140dbd` 或之后提交，并重新构建前端：

```bash
git rev-parse --short HEAD
cd frontend
npm run build
```

## 15. 不要遗漏的文件/目录

需要部署：

- `frontend/dist`
- `backend/server.js`
- `backend/organization.js`
- `backend/package.json`
- `backend/package-lock.json`
- `ui-demo/styles.css`
- `frontend/src/sievox-runtime.css`

需要持久化/备份：

- MongoDB 数据库 `buct_feedback`
- `backend/uploads`
- PM2 ecosystem 配置
- Nginx 站点配置
- SSL 证书

不需要部署：

- `node_modules`
- `frontend/dist` 以外的本地构建缓存
- 未跟踪的本地 `plan.md`

## 16. 交接结论

推荐部署策略：

1. 后端用 PM2 跑 `backend/server.js`，监听 `127.0.0.1:3101`。
2. 前端执行 `npm run build`，由 Nginx 服务 `frontend/dist`。
3. Nginx 把 `/api/` 反代到 `http://127.0.0.1:3101/api/`。
4. `NODE_ENV` 不要用 `production`，除非明确要让 Node 自己管理 80/443 和 SSL 文件。
5. 上线后第一件事：修改默认管理员密码。

