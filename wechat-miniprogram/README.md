# SIEHUB WeChat Mini Program

This is a native WeChat Mini Program front end for the SIEHUB mobile experience. It does not use `web-view`, so it can run under a personal Mini Program account while connecting directly to the `sievox.cn` API.

## Configuration

- AppID: `wx765b531a83da67ec`
- API entry: `https://sievox.cn/api`
- Public domain: `https://sievox.cn`
- Server IP: `182.92.71.153`

## WeChat Console Requirements

In the WeChat Mini Program console, configure these production settings before preview/release:

- Add `https://sievox.cn` to request legal domains.
- Add `https://sievox.cn` to upload/download legal domains only if file uploads or downloads are used later.
- Add `182.92.71.153` to the server IP allowlist if the API being used requires IP allowlisting.

Keep the AppSecret only in the backend/server environment. It must not be copied into Mini Program frontend files.
