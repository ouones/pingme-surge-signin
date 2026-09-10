/**
 * .sgmodule 静态校验：按 Surge 官方文档（manual.nssurge.com/profile/module.html）
 * 校验参数表、占位符、脚本行与 MITM 段。
 */
const fs = require("fs");
const path = require("path");

const MODULE = fs.readFileSync(path.join(__dirname, "..", "NodeSeek签到.sgmodule"), "utf8");
const SCRIPT = fs.readFileSync(path.join(__dirname, "..", "NodeSeek.js"), "utf8");

let fails = 0;
let total = 0;
function check(name, cond, detail) {
  total++;
  if (cond) { console.log("PASS  " + name + (detail ? "  | " + detail : "")); }
  else { fails++; console.log("FAIL  " + name + (detail ? "  | " + detail : "")); }
}

function meta(key) {
  const m = MODULE.match(new RegExp("^#!" + key + "=(.*)$", "m"));
  return m ? m[1] : null;
}

// ---------- 文档规则 1: 参数名只能用字母/数字/下划线 ----------
const argsLine = meta("arguments");
check("存在 #!arguments", !!argsLine);

// 解析（Surge 逗号分隔；name:default）
const params = {};
const problems = [];
argsLine.split(",").forEach((part) => {
  const i = part.indexOf(":");
  const name = (i === -1 ? part : part.slice(0, i)).trim();
  const def = i === -1 ? "" : part.slice(i + 1).trim();
  if (!/^[A-Za-z0-9_]+$/.test(name)) problems.push("非法参数名: " + name);
  if (/[,:*\s]/.test(def)) problems.push("默认值含特殊字符: " + name + "=" + def);
  params[name] = def;
});
check("参数名仅含字母数字下划线", problems.filter((p) => p.startsWith("非法参数名")).length === 0, problems.join("; ") || Object.keys(params).join(","));
check("默认值不含逗号/冒号/星号/空格（避免转义与解析歧义）", problems.filter((p) => p.startsWith("默认值")).length === 0, problems.filter((p) => p.startsWith("默认值")).join("; ") || "OK");

// ---------- 文档规则 2: 占位符与参数一一对应 ----------
const placeholders = [...new Set((MODULE.match(/\{\{\{(\w+)\}\}\}/g) || []).map((s) => s.replace(/[{}]/g, "")))];
check("占位符都已声明", placeholders.every((p) => p in params), "占位符=" + placeholders.join(",") + " 声明=" + Object.keys(params).join(","));
check("无未使用的参数", Object.keys(params).every((p) => placeholders.includes(p)), Object.keys(params).filter((p) => !placeholders.includes(p)).join(",") || "OK");

// ---------- 文档规则 3: #!arguments-desc 是整体描述（不逐条） ----------
// Surge 参数表只显示一段整体描述，没有逐参数说明的字段，所以这段 must 覆盖所有参数名，
// 否则用户在 Surge 里只能看到裸参数名，无法知道用途。
const desc = meta("arguments-desc");
check("存在 #!arguments-desc", !!desc);
check("desc 不含 ASCII 逗号（避免被当作参数分隔）", desc && !desc.includes(","), desc);
check("desc 覆盖全部参数名（Surge 无法逐参数说明）",
  desc && Object.keys(params).every((p) => desc.includes(p)),
  "缺失: " + Object.keys(params).filter((p) => !desc.includes(p)).join(",") || "OK");

// ---------- 文档规则 4: requirement ----------
const req = meta("requirement");
check("存在 #!requirement（参数表需 CORE_VERSION>=20）", req === "CORE_VERSION>=20", req);

// ---------- 文档规则 5: 脚本行 ----------
const scriptLines = MODULE.split("\n").filter((l) => /^\S+\s*=\s*type=/.test(l));
check("有 2 条脚本行", scriptLines.length === 2, "实际 " + scriptLines.length);
scriptLines.forEach((line, i) => {
  const tag = "脚本行" + (i + 1);
  check(tag + ": 含 script-path", /script-path=\S+/.test(line));
  check(tag + ": 无残留未替换写法（%PARAMETER%）", !/%[A-Z_]+%/.test(line));
  if (/type=cron/.test(line)) {
    const m = line.match(/cronexp="([^"]+)"/);
    check(tag + ": cronexp 用双引号包裹（含空格必须）", !!m, m ? m[1] : "缺失");
    check(tag + ": cronexp 段数为 5 或 6", !!m && m[1].trim().split(/\s+/).length >= 5 && m[1].trim().split(/\s+/).length <= 6, m ? m[1] : "");
    check(tag + ": cronexp 无字面星号转义残留", !!m && !m[1].includes("\\"), m ? m[1] : "");
  }
  if (/type=http-request/.test(line)) {
    check(tag + ": pattern 能编译", (() => { try { new RegExp(line.match(/pattern=([^,]+)/)[1]); return true; } catch (e) { return false; } })());
    check(tag + ": 不需要 requires-body（只取请求头）", !/requires-body/.test(line));
  }
});

// ---------- 文档规则 6: MITM ----------
check("含 [MITM] 段", /\[MITM\]/.test(MODULE));
check("MITM 用 %APPEND%（模块内不得用裸赋值）", /hostname\s*=\s*%APPEND%\s*www\.nodeseek\.com/.test(MODULE));

// ---------- 文档规则 7: 模块不得包含 [Proxy] / [Proxy Group] ----------
check("不含 [Proxy]/[Proxy Group]（模块禁止）", !/\[Proxy( Group)?\]/.test(MODULE));

// ---------- 脚本侧：参数名与脚本读取的 key 对齐 ----------
check("脚本读取 ENABLE_COOKIE", SCRIPT.includes('argTrue("ENABLE_COOKIE")'));
check("脚本读取 FIXED_LEGS", SCRIPT.includes('argTrue("FIXED_LEGS")'));
check("脚本读取 MODE", SCRIPT.includes('arg("MODE")'));
// 去掉注释后再做源码检查，避免把说明文字当成实现
const SCRIPT_CODE = SCRIPT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

check("脚本不再使用 Egern 的 ctx.*/env 对象", !/\bctx\.(storage|http|env)\b/.test(SCRIPT_CODE));
check("脚本用 Surge API（$persistentStore/$httpClient/$argument）",
  SCRIPT_CODE.includes("$persistentStore") && SCRIPT_CODE.includes("$httpClient") && SCRIPT_CODE.includes("$argument"));

console.log("\n===== 模块校验: " + (total - fails) + "/" + total + " 通过 =====");
process.exit(fails === 0 ? 0 : 1);
