export const parseSensorADCPacket = (data: string): number[] => {
  const buffers = (data.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16));

  if (buffers.length < 10) {
    return [];
  }

  const result: number[] = [];
  for (let i = 0; i < 8; i++) {
    const group = Math.floor(i / 4);
    const buf = buffers[(group + 1) * 4 + group];
    const de = buffers[i + group] | (((buf >> (((3 - i) % 4) * 2)) & 0x3) << 8);

    result.push(de);
  }

  return result;
};

export const getDateTime = (date: Date) => {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((x) => x.toString().padStart(2, '0'))
    .join(':');
};

export const formatDuration = (duration: number): string => {
  const ms = Math.floor((duration % 1) * 1000)
    .toString()
    .padStart(3, '0');

  return (
    [duration / 3600, (duration % 3600) / 60, duration % 60]
      .map((x) => Math.floor(x).toString().padStart(2, '0'))
      .join(':') + `:${ms}`
  );
};

export const makeID = (length: number) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  return Array.from(
    { length },
    () => characters[Math.floor(Math.random() * charactersLength)]
  ).join('');
};

export const formatShortKey = (key: string) => {
  key = key.toLowerCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
};

export const formatShortKeys = (keys: Record<string, undefined>) => {
  return Object.keys(keys).map(formatShortKey).join('+');
};
