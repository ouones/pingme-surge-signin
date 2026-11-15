# Surge 签到模块合集

个人自用的 Surge (iOS / Mac) 签到模块。

| 模块 | 说明 | 目录 |
|---|---|---|
| PingMe签到 | PingMe 自动签到、任务和视频奖励 | [根目录](./PingMe签到.sgmodule) |
| NodeSeek签到 | NodeSeek 自动签到（抓取浏览器请求头 + 每日定时） | [`nodeseek/`](./nodeseek/) |
| 网络自适应切换 | Wi-Fi 与蜂窝网络切换时自动更改策略组选中节点 | [根目录](./网络自适应切换.sgmodule) |

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

## 网络自适应切换模块

当设备在 Wi-Fi 与蜂窝数据之间切换时，自动将指定策略组的选中项调整为目标节点。

### 模块 URL

```text
https://raw.githubusercontent.com/ouones/pingme-surge-signin/main/网络自适应切换.sgmodule
```

### 可配置参数 (Arguments)

在 Surge 模块详情页中可直接编辑以下双槽位参数：

- **槽位 1**：
  - `group1`：策略组 1 名称（默认：`香港 select`）
  - `wifi1`：Wi-Fi 环境下策略组 1 的目标节点（默认：`🇭🇰 HK-CDT-01`）
  - `cellular1`：蜂窝网络下策略组 1 的目标节点（默认：`🇭🇰 HK-hkcloudx-v6-01`）
- **槽位 2（选填，留空则不生效）**：
  - `group2`：策略组 2 名称（例如：`美国 select`）
  - `wifi2`：Wi-Fi 环境下策略组 2 的目标节点
  - `cellular2`：蜂窝网络下策略组 2 的目标节点
- **通用**：
  - `notify`：是否在切换时弹出系统通知，可选 `true` 或 `false`（默认：`true`）

---

## 免责声明

本项目仅整理 Surge 模块配置，不包含账号凭据。请自行确认远程脚本来源和运行风险。脚本仅用于学习研究，风险自负。
