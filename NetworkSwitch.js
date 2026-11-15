/**
 * Surge 网络变化自适应切换策略模块 (支持双槽位)
 * 通过 $argument 接收模块表单中配置的双槽位参数
 */

function parseArgs(argStr) {
  const params = {};
  if (!argStr) return params;
  argStr.split('&').forEach(item => {
    const idx = item.indexOf('=');
    if (idx !== -1) {
      params[item.substring(0, idx).trim()] = item.substring(idx + 1).trim();
    }
  });
  return params;
}

const args = parseArgs(typeof $argument !== 'undefined' ? $argument : '');

// 槽位 1（兼容旧参数 group）
const slot1 = {
  group: args.group1 || args.group || '香港 select',
  wifi: args.wifi1 || args.wifi || '🇭🇰 HK-CDT-01',
  cellular: args.cellular1 || args.cellular || '🇭🇰 HK-hkcloudx-v6-01'
};

// 槽位 2
const slot2 = {
  group: args.group2 || '',
  wifi: args.wifi2 || '',
  cellular: args.cellular2 || ''
};

const showNotify = args.notify !== 'false';

// 网络环境多重判定 (兼容无定位权限场景)
function isWifiNetwork() {
  const wifi = $network.wifi;
  if (wifi && (wifi.ssid || wifi.bssid)) return true;
  const iface = ($network.v4 && $network.v4.primaryInterface) ||
                ($network.v6 && $network.v6.primaryInterface);
  return iface === 'en0';
}

const isWifi = isWifiNetwork();
const networkName = isWifi ? 'Wi-Fi' : '蜂窝移动网络';

const slots = [slot1, slot2];
const successMessages = [];

for (let i = 0; i < slots.length; i++) {
  const s = slots[i];
  if (!s.group) continue;

  const targetPolicy = isWifi ? s.wifi : s.cellular;
  if (!targetPolicy) continue;

  const ok = $surge.setSelectGroupPolicy(s.group, targetPolicy);
  if (ok) {
    console.log(`[Network-Switch] 槽位 ${i + 1}: 策略组 [${s.group}] 成功切换为 [${targetPolicy}]`);
    successMessages.push(`${s.group} -> ${targetPolicy}`);
  } else {
    console.log(`[Network-Switch] 槽位 ${i + 1}: 策略组 [${s.group}] 切换至 [${targetPolicy}] 失败`);
  }
}

if (showNotify && successMessages.length > 0) {
  $notification.post('Surge 节点自适应', `${networkName} 已连接`, successMessages.join('\n'));
}

$done();
