/******************************
脚本名称: NodeSeek
Version : v1.1.0 (Surge)
更新时间: 2026-09-10
平台: Surge (iOS / Mac)
来源: 移植自 Nullwhy/Egern 的 Scripts/NodeSeek.js v1.1.2
      原始作者 @Curtinp118 / @Nullwhy
功能: 请求头捕获 + 每日定时签到

使用说明:
  1. 打开模块参数「Cookie 抓取」，访问 NodeSeek 个人名片页保存请求头
  2. 收到「Cookie 成功」通知后关闭「Cookie 抓取」
  3. 签到时间由模块参数「时」「分」控制

平台差异（相对 Egern 原版）:
  - ctx.storage -> $persistentStore
  - ctx.http    -> $httpClient
  - ctx.env     -> $argument（模块参数以 KEY=value&KEY2=value2 传入）
  - 捕获入口改用 http-request：只需要请求头，不必缓冲响应体
  - 403 增加有限重试（站点风控为偶发）
*******************************/

const SCRIPT_NAME = "NodeSeek";
const STORE_KEY = "nodeseek_headers";
const ATTEND_BASE = "https://www.nodeseek.com/api/attendance";
const RETRY_WAITS = [3000, 8000];

// 捕获时按此列表挑字段；签到时用同表默认值补全
const DEFAULT_HEADERS = {
  "Connection": "keep-alive",
  "Accept-Encoding": "gzip, deflate, br",
  "Priority": "u=3, i",
  "Content-Type": "text/plain;charset=UTF-8",
  "Origin": "https://www.nodeseek.com",
  "refract-sign": "",
  "User-Agent": "Mozilla/5.0",
  "refract-key": "",
  "Sec-Fetch-Mode": "cors",
  "Cookie": "",
  "Host": "www.nodeseek.com",
  "Referer": "https://www.nodeseek.com/",
  "Accept-Language": "zh-CN,zh-Hans;q=0.9",
  "Accept": "*/*"
};

const HEADER_KEYS = Object.keys(DEFAULT_HEADERS);

function log(msg) {
  console.log("[" + SCRIPT_NAME + "] " + msg);
}

function notify(subtitle, body) {
  log(subtitle + ": " + body);
  if (typeof $notification !== "undefined" && $notification.post) {
    $notification.post(SCRIPT_NAME, subtitle, body);
  }
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

// ---- 模块参数解析：Surge 以 "KEY=value&KEY2=value2" 传入 $argument ----
function arg(key) {
  const raw = typeof $argument === "string" ? $argument : "";
  const m = raw.match(new RegExp("(?:^|&)" + key + "=([^&]*)", "i"));
  return m ? decodeURIComponent(m[1]).trim() : "";
}

function argTrue(key) {
  return ["1", "true", "yes", "on"].indexOf(arg(key).toLowerCase()) !== -1;
}

// ---- 存储 ----
function storeGet(key) {
  try { return $persistentStore.read(key); } catch (e) { return null; }
}

function storeSet(key, value) {
  try { $persistentStore.write(value, key); return true; } catch (e) { return false; }
}

// ---- HTTP ----
function httpPost(opts) {
  return new Promise(function (resolve, reject) {
    $httpClient.post(opts, function (err, resp, data) {
      if (err) return reject(err);
      resolve({
        status: resp && (resp.status || resp.statusCode),
        body: typeof data === "string" ? data : ""
      });
    });
  });
}

// ---- 请求头 ----
function headerValue(src, key) {
  return src[key] || src[key.toLowerCase()] || src[key.toUpperCase()] || "";
}

function pickHeaders(src) {
  const saved = {};
  for (let i = 0; i < HEADER_KEYS.length; i++) {
    const key = HEADER_KEYS[i];
    const value = headerValue(src || {}, key);
    if (value) saved[key] = value;
  }
  return saved;
}

function buildAttendHeaders(saved) {
  const headers = {};
  for (let i = 0; i < HEADER_KEYS.length; i++) {
    const key = HEADER_KEYS[i];
    headers[key] = (saved && saved[key]) || DEFAULT_HEADERS[key];
  }
  return headers;
}

// ---- Cookie 捕获（http-request）----
async function captureHeaders() {
  if (!argTrue("ENABLE_COOKIE")) {
    log("Cookie 抓取已关闭，跳过");
    return;
  }

  const saved = pickHeaders(($request && $request.headers) || {});

  // 未登录时请求不带会话 Cookie，此时保存会把已抓到的有效请求头覆盖成匿名头
  if (!saved["Cookie"]) {
    notify("Cookie 未保存", "该请求没有 Cookie，请确认已登录 NodeSeek");
    return;
  }

  if (!storeSet(STORE_KEY, JSON.stringify(saved))) {
    notify("Cookie 保存失败", "写入本地存储失败");
    return;
  }

  const names = Object.keys(saved).join(", ");
  log("已保存 " + Object.keys(saved).length + " 个字段: " + names);
  notify("Cookie 成功", "已保存 " + Object.keys(saved).length + " 个字段，请关闭「Cookie 抓取」");
}

// ---- 每日签到（cron）----
// fixed_legs: 关=随机 random=true；开=固定 5 random=false
async function doCheckIn() {
  const fixed = argTrue("FIXED_LEGS");
  const url = ATTEND_BASE + "?random=" + (fixed ? "false" : "true");
  const modeTag = fixed ? "固定" : "随机";

  const raw = storeGet(STORE_KEY);
  if (!raw) {
    notify("缺少请求头", "请先打开「Cookie 抓取」并访问 NodeSeek 个人名片页");
    return;
  }

  let saved;
  try { saved = JSON.parse(raw); } catch (e) {
    notify("数据异常", "请重新打开「Cookie 抓取」并访问个人名片页");
    return;
  }

  log("开始签到（" + modeTag + "鸡腿）");

  let attempt = 0;
  while (true) {
    attempt++;
    let res;
    try {
      res = await httpPost({
        url: url,
        headers: buildAttendHeaders(saved),
        body: "",
        timeout: 20000
      });
    } catch (e) {
      if (attempt <= RETRY_WAITS.length) {
        log("网络错误，第 " + attempt + " 次重试");
        await sleep(RETRY_WAITS[attempt - 1]);
        continue;
      }
      notify("网络错误", "请检查网络连接");
      return;
    }

    const status = res.status;
    let message = "";
    try { message = (JSON.parse(res.body) || {}).message || ""; } catch (e) {}

    if (status === 403) {
      // 站点风控为偶发，重试通常能过
      if (attempt <= RETRY_WAITS.length) {
        log("403，第 " + attempt + " 次重试");
        await sleep(RETRY_WAITS[attempt - 1]);
        continue;
      }
      notify("被风控", "403，重试 " + attempt + " 次仍失败，请稍后手动重跑");
      return;
    }

    if (status === 500) {
      if (attempt <= RETRY_WAITS.length) {
        log("500，第 " + attempt + " 次重试");
        await sleep(RETRY_WAITS[attempt - 1]);
        continue;
      }
      notify("服务器错误", "500");
      return;
    }

    if (status >= 200 && status < 300) {
      notify("签到成功（" + modeTag + "）", message || "签到完成");
      return;
    }

    notify("请求异常", "HTTP " + status + (message ? " " + message : ""));
    return;
  }
}

// ---- 入口 ----
(async function () {
  try {
    const mode = arg("MODE").toLowerCase();
    if (mode === "checkin") {
      await doCheckIn();
    } else if (mode === "capture") {
      await captureHeaders();
    } else if (typeof $request !== "undefined" && $request) {
      await captureHeaders();
    } else {
      await doCheckIn();
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    log("脚本错误: " + msg);
    notify("脚本错误", msg);
  } finally {
    if (typeof $done === "function") $done({});
  }
})();
