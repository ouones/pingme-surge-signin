/**
 * Surge 网络变化自适应切换策略模块
 * 支持通过模块参数自定义策略组和目标节点
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
const groupName = args.group || '香港 select';
const wifiPolicy = args.wifi || '🇭🇰 HK-CDT-01';
const cellularPolicy = args.cellular || '🇭🇰 HK-hkcloudx-v6-01';
const showNotify = args.notify !== 'false';

function isWifiNetwork() {
  const wifi = $network.wifi;
  if (wifi && (wifi.ssid || wifi.bssid)) {
    return true;
  }
  const iface = ($network.v4 && $network.v4.primaryInterface) ||
                ($network.v6 && $network.v6.primaryInterface);
  return iface === 'en0';
}

const isWifi = isWifiNetwork();
const targetPolicy = isWifi ? wifiPolicy : cellularPolicy;
const networkName = isWifi ? 'Wi-Fi' : '蜂窝移动网络';

if (groupName && targetPolicy) {
  const success = $surge.setSelectGroupPolicy(groupName, targetPolicy);
  if (success) {
    console.log(`[Network-Switch] 网络变更为 ${networkName}，[${groupName}] 已切换为: ${targetPolicy}`);
    if (showNotify) {
      $notification.post('Surge 节点自适应', `${networkName} 已连接`, `[${groupName}] 已自动切换为: ${targetPolicy}`);
    }
  } else {
    console.log(`[Network-Switch] 切换失败，请确认策略组 [${groupName}] 或节点 [${targetPolicy}] 是否正确`);
  }
}

$done();
