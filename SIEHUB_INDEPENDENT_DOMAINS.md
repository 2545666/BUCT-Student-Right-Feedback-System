# SIEHUB / SIEVOX / SIEBridge 独立域名部署说明

## 推荐域名形态

域名不能写成 `sievox/xxx.cn`，斜杠后面属于路径，不是独立网址。推荐使用：

- `siehub.xxx.cn`：SIEHUB 一站式学生服务平台
- `sievox.xxx.cn`：SIEVOX 学生权益反馈系统
- `siebridge.xxx.cn`：SIEBridge 课程资源共享平台

三个域名都解析到同一台服务器 IP 后，可以复用同一份前端 `dist` 和同一个后端 API。

## 前端构建环境变量

在 `frontend/.env.production` 中配置：

```env
VITE_API_BASE=/api
VITE_SIEVOX_URL=https://sievox.xxx.cn
VITE_SIEBRIDGE_URL=https://siebridge.xxx.cn
```

效果：

- 从 SIEHUB 首页点击 SIEVOX 时跳转到 `VITE_SIEVOX_URL`
- 从 SIEHUB 首页点击 SIEBridge 时跳转到 `VITE_SIEBRIDGE_URL`
- 当前浏览器域名等于 `VITE_SIEVOX_URL` 的 host 时，登录后自动进入 SIEVOX
- 当前浏览器域名等于 `VITE_SIEBRIDGE_URL` 的 host 时，登录后自动进入 SIEBridge

## 后端 CORS

后端 `.env` 需要允许三个域名：

```env
CORS_ORIGIN=https://siehub.xxx.cn,https://sievox.xxx.cn,https://siebridge.xxx.cn
```

当前后端已经支持逗号分隔的多域名 CORS。

## Nginx 示例

```nginx
server {
    listen 80;
    server_name siehub.xxx.cn sievox.xxx.cn siebridge.xxx.cn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name siehub.xxx.cn sievox.xxx.cn siebridge.xxx.cn;

    root /var/www/sievox/frontend/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/siehub.xxx.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/siehub.xxx.cn/privkey.pem;

    location /api {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

证书可以用一张多域名证书：

```bash
certbot --nginx -d siehub.xxx.cn -d sievox.xxx.cn -d siebridge.xxx.cn
```

## 上线检查

- 三个 DNS A 记录都指向 `182.92.71.153`
- `frontend/.env.production` 已填入真实 SIEVOX / SIEBridge 域名
- 后端 `.env` 的 `CORS_ORIGIN` 包含三个 HTTPS 域名
- Nginx `server_name` 包含三个域名
- `curl -I https://siehub.xxx.cn`、`curl -I https://sievox.xxx.cn`、`curl -I https://siebridge.xxx.cn` 都返回 200
