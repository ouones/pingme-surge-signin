# PingMe Surge 签到模块

适用于 Surge 的 PingMe 自动签到模块。

## 功能

- 首次打开 PingMe 时抓取签到所需参数
- 每天 08:30 和 20:30 自动签到
- 执行余额查询、签到和视频奖励任务
- 通过 Surge 通知执行结果

## 安装

1. 下载 [`PingMe签到.sgmodule`](./PingMe签到.sgmodule)。
2. 在 Surge 的“模块”中安装本地模块并启用。
3. 确认 MITM 主机名包含 `api.pingmeapp.net`。
4. 首次使用时保持“PingMe获取签到参数”脚本启用。
5. 打开 PingMe 并进入会刷新余额/奖励信息的页面。
6. 收到“PingMe 获取成功”通知后，关闭“PingMe获取签到参数”脚本，仅保留“PingMe签到”。

## 签到时间

```text
30 8,20 * * *
```

即每天 08:30 和 20:30 各执行一次，时间以设备时区为准。

模块声明了两个可编辑参数：

- `morning_hour`：早间签到小时，默认 `8`
- `evening_hour`：晚间签到小时，默认 `20`

分钟固定为 `30`。参数只填写小时数字，例如设置为 `9` 和 `21` 后，签到时间变为 09:30 和 21:30。

## 远程脚本

本模块引用以下远程脚本：

- [get_cookie.js](https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cookie/get_cookie.js)
- [PingMeSignin.js](https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/PingMe/PingMeSignin.js)

首次抓取参数的脚本会读取匹配请求的 URL 和请求头，并保存签到所需参数。获取成功后应关闭该脚本，避免重复捕获和通知。

## 免责声明

本项目仅整理 Surge 模块配置，不包含账号凭据。请自行确认远程脚本来源和运行风险。
