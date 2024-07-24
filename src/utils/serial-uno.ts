import { availablePorts } from './serial';
import { retry, RetryNextException } from './utils';

const UNO_HWIDS = ['2341:0043', '2341:0001', '2341:0243', '2A03:0043'];
// https://docs.platformio.org/en/latest/core/installation/udev-rules.html
const UDEV_HWIDS = [
  /1D50:6018/,
  /10C4:EA[67][013]/,
  /10C4:80A9/,
  /0403:6015/,
  /067B:2303/,
  /1A86:7523/,
  /1A86:55D3/,
  /1A86:55D4/,
  /2341:[08][023].*/,
  /2A03:[08][02].*/,
  /03EB:6124/,
  /16D0:0753/,
  /1EAF:000[34]/,
  /1781:0C9F/,
  /16C0:05DC/,
  /16C0:04[789B]./,
  /16C0:04[789A]./,
  /16C0:04[789ABCD]./,
  /16C0:04[789B]./,
  /1CBE:00FD/,
  /0451:F432/,
  /28E9:0189/,
  /1A86:7522/,
  /2886:[08]02D/,
  /2E8A:[01].*/,
  /0D28:0204/,
  /0483:5740/,
  /03EB:204F/,
  /0403:60[01][104]/,
  /0403:8220/,
  /0403:8A9[89]/,
  /0403:A6D0/,
  /0403:BCA[01]/,
  /0403:BCD[9A]/,
  /0403:BDC8/,
  /0403:C14[01]/,
  /0403:CFF8/,
  /0451:C32A/,
  /0483:.*/,
  /0640:0028/,
  /0640:.*/,
  /09FB:6001/,
  /0FBB:1000/,
  /1366:.*/,
  /138E:9000/,
  /1457:5118/,
  /15BA:.*/,
  /1781:0C63/,
  /1CBE:00FD/,
  /9E88:9E8F/,
  /C251:2710/,
  /03EB:2107/,
  /303A:1001/,
  /2FE3:0100/,
];

export const findUnoPort = async () => {
  return await retry(async () => {
    const ports = await availablePorts().catch(() => []);

    const port = ports.find((port) => {
      const pVidPid = port.vid_pid?.toUpperCase();

      if (!pVidPid || port.port_type !== 'usb') return;

      return (
        UNO_HWIDS.includes(pVidPid) ||
        UDEV_HWIDS.some((vidPid) => vidPid.test(pVidPid))
      );
    });

    if (!port) throw new RetryNextException();

    return port;
  }).catch(() => null);
};
