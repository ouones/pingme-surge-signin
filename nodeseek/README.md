# NodeSeek Surge 签到模块

适用于 Surge (iOS / Mac) 的 NodeSeek 自动签到模块：捕获浏览器请求头 + 每日定时签到。
脚本移植自 [Nullwhy/Egern](https://github.com/Nullwhy/Egern) 的 `Scripts/NodeSeek.js` v1.1.2，原始作者 @Curtinp118 / @Nullwhy。

语法与参数表实现遵循 Surge 官方文档：<https://manual.nssurge.com/profile/module.html>

## 为什么不用旧的 Sliverkiss 脚本

旧的 `Sliverkiss/nodeseek.js`（最后更新 2024-11）抓取的是 10 个基础请求头，**不含**
`refract-sign` / `refract-key` / `Origin` / `User-Agent` 这些站点风控字段，且已近两年未更新。
（推断：这是它容易被 403 的原因。未实测 —— 本机出口 IP 访问 nodeseek.com 直接被 Cloudflare 403。）

本模块捕获并原样回放浏览器侧的完整请求头。这也是 Surge 环境下唯一可行的路线：
Surge 的 `$httpClient` 无法像 `curl_cffi` 那样伪造 TLS 指纹。

## 文件

| 文件 | 说明 |
|---|---|
| `NodeSeek签到.sgmodule` | Surge 模块，安装这个 |
| `NodeSeek.js` | 脚本本体（请求头捕获 + 签到），被模块远程引用 |
| 本目录 | 位于 [ouones/pingme-surge-signin](https://github.com/ouones/pingme-surge-signin) 的 `nodeseek/` 子目录 |
| `test/port-test.js` | 脚本逻辑测试台（模拟 Surge API 跑真实源码） |
| `test/module-check.js` | 模块静态校验（参数表、占位符、cron、MITM 段） |

## 模块参数（可在 Surge 里直接改）

安装模块后，进入 模块 → NodeSeek签到 → 参数，可编辑这 4 项：

- `enable_cookie` — Cookie 抓取开关，**默认 `true`**。访问一次个人名片页就会保存请求头，抓到后改成 `false`。
- `fixed_legs` — 鸡腿模式。`false`（默认）= 随机鸡腿，`true` = 固定 5 鸡腿。
- `hour` — 签到小时（24 小时制），默认 `10`。
- `minute` — 签到分钟，默认 `0`。

生成的实际 cron 为 `{{{minute}}} {{{hour}}} * * *`，即每天 `10:00`（设备时区）。

> **Surge 的参数表只有一个整体描述字段**（`#!arguments-desc`），没有逐参数说明。
> 因此每个参数的用途都写进了那段描述里，参数名也起得尽量自解释，Surge 里看到的才是完整的。

> 为什么把时间拆成「时」「分」两个数字参数，而不是一个 cron 表达式参数？
> `#!arguments` 用逗号分隔参数，而 cron 常见写法（如 `30 8,20 * * *`）本身含逗号，
> 塞进默认值会破坏解析；官方文档也未定义转义规则。拆成数字就完全避开了这个坑。

## 安装

模块 URL（Surge 里直接添加）：

```text
https://raw.githubusercontent.com/ouones/pingme-surge-signin/main/nodeseek/NodeSeek签到.sgmodule
```

1. 在 Surge「模块」中通过上面的 URL 安装，或下载后用本地模块安装。
2. 确认 MITM 已开启，且 hostname 列表里出现 `www.nodeseek.com`（模块用 `%APPEND%` 追加）。
3. `enable_cookie` 默认已是 `true`，无需改动（若曾关掉，改回 `true`）。
4. 用浏览器登录 NodeSeek，打开**自己的个人名片页**（会请求 `/api/account/getInfo/...`）。
5. 收到「Cookie 成功」通知后，把 `enable_cookie` 改为 `false`，避免每次浏览都重复捕获。
6. 之后每天 10:00 自动签到，结果通过 Surge 通知推送。想立刻验证可在 Surge 的脚本编辑器里手动执行
   「NodeSeek签到」（会带上模块参数）。

## 已知限制

- **请求头有效期未知。** `refract-sign` 是站点侧签名头，本模块靠原样回放工作。
  如果站点给该签名加了时间窗，签到会 403，届时把 `enable_cookie` 重新设为 `true` 抓一次即可。
- **403 是偶发的。** 脚本内置 3 次尝试（间隔 3s / 8s）；连续失败会推送「被风控」通知。
- **抓到的请求头存在 Surge 本地**（`$persistentStore`，键名 `nodeseek_headers`），含 Cookie 与签名。
  不要把这个值分享给任何人，导出配置时注意。
- 需要 MITM，属于对 HTTPS 流量的中间人解密，请自行评估风险。
- 参数表需要 `CORE_VERSION>=20`（Surge Mac 5.6.0+ / iOS 5.10.0+），模块里用 `#!requirement` 声明了。

## 测试

```bash
node test/port-test.js     # 脚本逻辑：31 项
node test/module-check.js  # 模块静态校验：27 项
```

覆盖：参数开关、匿名请求不覆盖有效数据、随机/固定鸡腿、缺失/损坏存储、403 重试与最终失败、
网络异常、已签到透传、模块参数名合法性、占位符双向对齐、cron 引号与段数、MITM `%APPEND%`。

## 免责声明

本项目仅整理 Surge 模块与脚本移植，不包含任何账号凭据。脚本仅用于学习研究，风险自负。
