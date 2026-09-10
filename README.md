# Surge 签到模块合集

个人自用的 Surge (iOS / Mac) 签到模块。

| 模块 | 说明 | 目录 |
|---|---|---|
| PingMe签到 | PingMe 自动签到、任务和视频奖励 | [根目录](./PingMe签到.sgmodule) |
| NodeSeek签到 | NodeSeek 自动签到（抓取浏览器请求头 + 每日定时） | [`nodeseek/`](./nodeseek/) |

---

## PingMe 签到模块

适用于 Surge 的 PingMe 自动签到模块。

### 功能

- 首次打开 PingMe 时抓取签到所需参数
- 每天 08:30 和 20:30 自动签到
- 执行余额查询、签到和视频奖励任务
- 通过 Surge 通知执行结果

### 安装

模块 URL：

```text
https://raw.githubusercontent.com/ouones/pingme-surge-signin/main/PingMe签到.sgmodule
```

1. 在 Surge 的“模块”中通过上面的 URL 安装并启用（或下载后用本地模块安装）。
2. 确认 MITM 主机名包含 `api.pingmeapp.net`。
3. 首次使用时保持“PingMe获取签到参数”脚本启用。
4. 打开 PingMe 并进入会刷新余额/奖励信息的页面。
5. 收到“PingMe 获取成功”通知后，关闭“PingMe获取签到参数”脚本，仅保留“PingMe签到”。

### 签到时间

```text
30 8,20 * * *
```

即每天 08:30 和 20:30 各执行一次，时间以设备时区为准。

模块声明了两个可编辑参数：

- `enable_cookie_capture`：cookies/签到参数抓取开关，默认 `true`
- `cronExp`：签到脚本 Cron 表达式，默认 `30 8,20 * * *`

`cronExp` 使用 Surge 支持的五段 Cron 表达式。关闭 `enable_cookie_capture` 后，抓取脚本仍会被匹配，但会直接跳过保存，不会读取或写入签到参数。

### 远程脚本

- [PingMeCookieCapture.js](https://raw.githubusercontent.com/ouones/pingme-surge-signin/main/PingMeCookieCapture.js)
- [PingMeSignin.js](https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/PingMe/PingMeSignin.js)

首次抓取参数的脚本会读取匹配请求的 URL 和请求头，并保存签到所需参数。获取成功后应关闭该脚本，避免重复捕获和通知。

---

## NodeSeek 签到模块

脚本移植自 [Nullwhy/Egern](https://github.com/Nullwhy/Egern)，抓取浏览器请求头后每日定时签到。
详见 [`nodeseek/README.md`](./nodeseek/README.md)。

模块 URL：

```text
https://raw.githubusercontent.com/ouones/pingme-surge-signin/main/nodeseek/NodeSeek签到.sgmodule
```

可编辑参数：`enable_cookie_capture` / `fixed_legs` / `hour` / `minute`。

---

## 免责声明

本项目仅整理 Surge 模块配置，不包含账号凭据。请自行确认远程脚本来源和运行风险。脚本仅用于学习研究，风险自负。
