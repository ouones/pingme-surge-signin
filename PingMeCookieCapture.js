/*
 * PingMe 参数抓取脚本
 *
 * 只保存 PingMe 签到脚本需要的请求 URL、原始查询参数和请求头。
 * 通过模块参数 Enable=false 可以关闭抓取。
 */
const argument = typeof $argument === 'string' ? $argument : '';
const enabledMatch = argument.match(/(?:^|&)Enable=([^&]*)/i);
const enabledValue = enabledMatch ? decodeURIComponent(enabledMatch[1]).trim().toLowerCase() : 'true';
const enabled = !['false', '0', 'off', 'disable', 'disabled'].includes(enabledValue);

if (!enabled) {
  $done({});
} else {
  const request = typeof $request === 'undefined' ? {} : $request;
  const url = request.url || '';

  function parseRawQuery(targetUrl) {
    const query = (targetUrl.split('?')[1] || '').split('#')[0];
    const result = {};
    query.split('&').forEach(pair => {
      if (!pair) return;
      const index = pair.indexOf('=');
      if (index < 0) return;
      result[pair.slice(0, index)] = pair.slice(index + 1);
    });
    return result;
  }

  const capture = {
    url,
    paramsRaw: parseRawQuery(url),
    headers: request.headers || {},
  };

  $persistentStore.write(JSON.stringify(capture), 'pingme_capture_v3');
  $notification.post('PingMe 获取成功✅', '现在可以关闭 cookies 抓取开关', '');
  $done({});
}
