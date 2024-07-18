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
