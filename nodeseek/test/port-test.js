/**
 * NodeSeek.js（Surge 移植版）逻辑测试台
 * 用最小 Surge API 模拟器跑真实脚本源码，覆盖捕获/签到/异常分支。
 */
const fs = require("fs");
const path = require("path");

const SRC = fs.readFileSync(path.join(__dirname, "..", "NodeSeek.js"), "utf8");

function runScript(opts) {
  return new Promise((resolve) => {
    const notifications = [];
    const logs = [];
    const writes = {};
    const store = Object.assign({}, opts.stored || {});
    const httpCalls = [];

    const $persistentStore = {
      read: (k) => (k in store ? store[k] : null),
      write: (v, k) => { store[k] = v; writes[k] = v; return true; }
    };
    const $notification = { post: (name, sub, body) => notifications.push({ name, sub, body }) };
    const $httpClient = {
      post: (o, cb) => {
        httpCalls.push(o);
        const r = opts.httpImpl ? opts.httpImpl(o, httpCalls.length) : { status: 200, body: '{"message":"签到成功，获得 5 个鸡腿"}' };
        if (r && r.__err) setTimeout(() => cb(r.__err, null, null), 0);
        else setTimeout(() => cb(null, { status: r.status, statusCode: r.status }, r.body), 0);
      }
    };
    const fakeConsole = { log: (...a) => logs.push(a.join(" ")) };

    const start = Date.now();
    const donePromise = new Promise((res) => {
      const $done = () => res();
      const fn = new Function(
        "$persistentStore", "$notification", "$httpClient", "$request", "$response",
        "$argument", "$done", "console", "setTimeout", "Promise", "JSON", "RegExp",
        "Object", "String", "Array", "Date",
        SRC
      );
      fn($persistentStore, $notification, $httpClient,
        opts.request === undefined ? undefined : opts.request, undefined,
        opts.argument, $done, fakeConsole, setTimeout, Promise, JSON, RegExp,
        Object, String, Array, Date);
    });

    Promise.race([donePromise, new Promise((r) => setTimeout(r, 40000))]).then(() =>
      resolve({ notifications, logs, writes, httpCalls, store, elapsed: Date.now() - start }));
  });
}

const CAPTURE_ON = "MODE=capture&ENABLE_CAPTURE=true";
const CAPTURE_OFF = "MODE=capture&ENABLE_CAPTURE=false";
const CHECKIN_RANDOM = "MODE=checkin&FIXED_LEGS=false";
const CHECKIN_FIXED = "MODE=checkin&FIXED_LEGS=true";

function headersFixture(withCookie) {
  const h = {
    "refract-sign": "FAKE_SIGN_VALUE",
    "refract-key": "FAKE_KEY_VALUE",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9"
  };
  if (withCookie !== false) h["Cookie"] = "sessionid=FAKE_SESSION_abc123; cf_clearance=FAKE_CF";
  return h;
}
const GETINFO_URL = "https://www.nodeseek.com/api/account/getInfo/12345?readme=1";
const STORED = JSON.stringify(headersFixture());

(async () => {
  const results = [];
  function check(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? "PASS  " : "FAIL  ") + name + (detail ? "  | " + detail : ""));
  }

  // T1 捕获成功
  {
    const r = await runScript({ request: { url: GETINFO_URL, headers: headersFixture() }, argument: CAPTURE_ON });
    const saved = r.writes["nodeseek_headers"] ? JSON.parse(r.writes["nodeseek_headers"]) : null;
    check("T1 捕获：写入 nodeseek_headers", !!saved, saved ? Object.keys(saved).join(",") : "null");
    check("T1 捕获：保留 Cookie 值", saved && saved.Cookie === headersFixture().Cookie);
    check("T1 捕获：保留 refract-sign / refract-key", saved && saved["refract-sign"] === "FAKE_SIGN_VALUE" && saved["refract-key"] === "FAKE_KEY_VALUE");
    check("T1 捕获：通知成功且提示关闭开关", r.notifications.some((n) => /Cookie 成功/.test(n.sub) && /关闭/.test(n.body)), JSON.stringify(r.notifications));
    check("T1 捕获：不发 HTTP 请求（不干扰原请求）", r.httpCalls.length === 0);
  }

  // T2 捕获开关关闭 → 静默跳过
  {
    const r = await runScript({ request: { url: GETINFO_URL, headers: headersFixture() }, argument: CAPTURE_OFF });
    check("T2 开关关闭：不写存储", Object.keys(r.writes).length === 0, JSON.stringify(r.writes));
    check("T2 开关关闭：不打扰用户（无通知）", r.notifications.length === 0);
  }

  // T3 未登录（无 Cookie）不得覆盖已有有效数据
  {
    const r = await runScript({ request: { url: GETINFO_URL, headers: headersFixture(false) }, argument: CAPTURE_ON, stored: { nodeseek_headers: STORED } });
    check("T3 匿名请求：不覆盖已存请求头", Object.keys(r.writes).length === 0, JSON.stringify(r.writes));
    check("T3 匿名请求：提示未登录", r.notifications.some((n) => /未保存|登录/.test(n.sub + n.body)), JSON.stringify(r.notifications));
    check("T3 匿名请求：原存储保持不变", r.store["nodeseek_headers"] === STORED);
  }

  // T4 cron 无存储
  {
    const r = await runScript({ argument: CHECKIN_RANDOM });
    check("T4 无请求头：提示重新抓取", r.notifications.some((n) => /缺少请求头/.test(n.sub)), JSON.stringify(r.notifications));
    check("T4 无请求头：不发请求", r.httpCalls.length === 0);
  }

  // T5 随机鸡腿 200
  {
    const r = await runScript({ argument: CHECKIN_RANDOM, stored: { nodeseek_headers: STORED } });
    const call = r.httpCalls[0] || {};
    const h = call.headers || {};
    check("T5 随机：URL random=true", /random=true/.test(call.url || ""), call.url);
    check("T5 随机：带捕获的 Cookie", h.Cookie === headersFixture().Cookie);
    check("T5 随机：带 refract-sign（旧脚本缺此头）", h["refract-sign"] === "FAKE_SIGN_VALUE");
    check("T5 随机：补全缺失默认头 Host/Origin/Referer", h.Host === "www.nodeseek.com" && h.Origin === "https://www.nodeseek.com" && !!h.Referer);
    check("T5 随机：POST + 空 body", /post/i.test(r.logs.join(" ")) === false && call.body === "");
    check("T5 随机：通知签到成功（随机）", r.notifications.some((n) => /签到成功（随机）/.test(n.sub)), JSON.stringify(r.notifications));
  }

  // T6 固定鸡腿
  {
    const r = await runScript({ argument: CHECKIN_FIXED, stored: { nodeseek_headers: STORED } });
    check("T6 固定：URL random=false", /random=false/.test((r.httpCalls[0] || {}).url || ""), (r.httpCalls[0] || {}).url);
    check("T6 固定：通知文案为固定", r.notifications.some((n) => /签到成功（固定）/.test(n.sub)));
  }

  // T7 403 两次后成功（重试生效）
  {
    const r = await runScript({
      argument: CHECKIN_RANDOM, stored: { nodeseek_headers: STORED },
      httpImpl: (o, n) => (n <= 2 ? { status: 403, body: "<html>403</html>" } : { status: 200, body: '{"message":"签到成功，获得 3 个鸡腿"}' })
    });
    check("T7 重试：共请求 3 次", r.httpCalls.length === 3, "实际 " + r.httpCalls.length);
    check("T7 重试：最终通知签到成功", r.notifications.some((n) => /签到成功/.test(n.sub)), JSON.stringify(r.notifications));
  }

  // T8 持续 403 → 3 次后放弃
  {
    const r = await runScript({ argument: CHECKIN_RANDOM, stored: { nodeseek_headers: STORED }, httpImpl: () => ({ status: 403, body: "<html>403</html>" }) });
    check("T8 持续 403：请求 3 次后停止", r.httpCalls.length === 3, "实际 " + r.httpCalls.length);
    check("T8 持续 403：通知被风控", r.notifications.some((n) => /被风控/.test(n.sub)), JSON.stringify(r.notifications));
  }

  // T9 存储损坏
  {
    const r = await runScript({ argument: CHECKIN_RANDOM, stored: { nodeseek_headers: "{not json" } });
    check("T9 存储损坏：提示数据异常", r.notifications.some((n) => /数据异常/.test(n.sub)), JSON.stringify(r.notifications));
    check("T9 存储损坏：不发请求", r.httpCalls.length === 0);
  }

  // T10 网络异常
  {
    const r = await runScript({ argument: CHECKIN_RANDOM, stored: { nodeseek_headers: STORED }, httpImpl: () => ({ __err: "network down" }) });
    check("T10 网络异常：重试后通知网络错误", r.notifications.some((n) => /网络错误/.test(n.sub)), JSON.stringify(r.notifications));
    check("T10 网络异常：共尝试 3 次", r.httpCalls.length === 3, "实际 " + r.httpCalls.length);
  }

  // T11 已签到（200 但含提示）
  {
    const r = await runScript({ argument: CHECKIN_RANDOM, stored: { nodeseek_headers: STORED }, httpImpl: () => ({ status: 200, body: '{"message":"今日已完成签到"}' }) });
    check("T11 已签到：透传服务端消息", r.notifications.some((n) => /今日已完成签到/.test(n.body)), JSON.stringify(r.notifications));
  }

  // T12 无 $argument 且无 $request（脚本编辑器手动执行）→ 走签到
  {
    const r = await runScript({ argument: undefined, stored: { nodeseek_headers: STORED } });
    check("T12 无参数：默认走签到", r.httpCalls.length === 1 && /random=true/.test(r.httpCalls[0].url));
  }

  // T13 脚本必须调用 $done（否则请求会被 Surge 判超时）
  {
    const r = await runScript({ argument: CAPTURE_ON, request: { url: GETINFO_URL, headers: headersFixture() } });
    check("T13 结束调用 $done", r.elapsed < 5000, "耗时 " + r.elapsed + "ms");
  }

  const failed = results.filter((x) => !x.pass);
  console.log("\n===== 逻辑测试: " + (results.length - failed.length) + "/" + results.length + " 通过 =====");
  process.exit(failed.length === 0 ? 0 : 1);
})();
