const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const dir = path.join(__dirname, '..');
const pluginPath = path.join(dir, 'NodeSeek签到.plugin');
const scriptPath = path.join(dir, 'NodeSeek-loon.js');
assert(fs.existsSync(pluginPath), 'Loon 插件尚未创建');
assert(fs.existsSync(scriptPath), 'Loon 脚本尚未创建');
const plugin = fs.readFileSync(pluginPath, 'utf8');
const src = fs.readFileSync(scriptPath, 'utf8');
assert(plugin.includes('#!loon_version = 3.5.1(983)'));
assert(plugin.includes('cron ${cron} then script('));
assert(plugin.includes('enable=${enable_cookie}'));
assert(plugin.includes('{${fixed_legs}}'));
assert(plugin.includes('hostname = www.nodeseek.com'));
assert(plugin.includes('NodeSeek-loon.js'));
const lines = plugin.split('\n');
const captureLine = lines.find(s => s.startsWith('request if '));
const cronLine = lines.find(s => s.startsWith('cron '));
assert(captureLine && cronLine);
const pattern = captureLine.match(/~= \/(.+?)\/i then/);
assert(pattern && new RegExp(pattern[1], 'i').test('https://www.nodeseek.com/api/account/getInfo/123'));
assert(!new RegExp(pattern[1], 'i').test('https://www.nodeseek.com/api/account/other/123'));
function run(argument, request, store) {
  return new Promise((resolve, reject) => {
    const calls = [], notifications = [];
    const timer = setTimeout(() => reject(new Error('script did not finish')), 1000);
    const ctx = {
      $argument: argument, $request: request,
      $persistentStore: {read: k => store[k], write: (v,k) => (store[k]=v, true)},
      $notification: {post: (...a) => notifications.push(a)},
      $httpClient: {post: (o,cb) => {calls.push(o); cb(null,{status:200,headers:{}},'{"message":"ok"}');}},
      $done: () => {clearTimeout(timer); resolve({calls, notifications});},
      console: {log: () => {}}, setTimeout
    };
    vm.runInNewContext(src, ctx);
  });
}
(async () => {
  const store = {};
  const capture = await run('MODE=capture&ENABLE_COOKIE=true', {headers:{Cookie:'test-session','refract-sign':'test-sign'}}, store);
  assert(store.nodeseek_headers && capture.notifications.length === 1, '捕获并存储');
  const random = await run({fixed_legs:false}, undefined, store);
  assert(random.calls[0].url.endsWith('random=true'));
  assert.strictEqual(random.calls[0].headers.Cookie, 'test-session');
  const fixed = await run({fixed_legs:true}, undefined, store);
  assert(fixed.calls[0].url.endsWith('random=false'));
  const missing = await run({fixed_legs:false}, undefined, {});
  assert.strictEqual(missing.calls.length, 0);
  assert(missing.notifications.some(n => n[1].includes('缺少请求头')));
  console.log('Loon 本地模拟通过：插件结构、URL 匹配、凭据捕获和复用、随机/固定、缺失凭据');
})().catch(e => { console.error(e); process.exitCode = 1; });
