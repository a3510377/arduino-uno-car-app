<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useIntervalFn } from '@vueuse/core';

import Select from 'primevue/select';
import Button from 'primevue/button';

import { availablePorts, IPortInfo, SerialPort } from '../utils/serial';
import { parseSensorADCPacket } from '../utils';

const ports = ref<Record<string, IPortInfo>>({});
const textString = ref<string>('');
const selectedPort = ref<string>('');
const connected = ref<boolean>(false);
const connecting = ref<boolean>(false);
const binValue = ref<number>(0);
const sensorADCData = ref<number[]>([]);

watch(selectedPort, () => (connecting.value = false));

useIntervalFn(
  async () => {
    const newPorts = await availablePorts().catch((e) => {
      console.error(e);
      return [];
    });

    ports.value = {};
    newPorts.forEach((value) => (ports.value[value.port_name] = value));
  },
  1000,
  { immediate: true }
);

let currentPort: SerialPort | null = null;
onUnmounted(async () => {
  await currentPort?.close();
  currentPort?.removeAllListener();
});

const connectPort = async () => {
  await currentPort?.close().catch(console.log);

  if (connected.value) {
    connected.value = false;
    return;
  }
  if (!selectedPort.value) {
    return;
  }

  connected.value = false;
  connecting.value = true;

  const port = new SerialPort(selectedPort.value, {});
  currentPort = port;

  let buf: string = '';
  port.addListener('data', (data) => {
    textString.value += data.toString();

    buf += data.toString();

    const lines = buf.split('\n');
    if (lines.length > 1) {
      buf = lines.pop() ?? '';

      for (let line of lines) {
        line = line.trim();
        console.log('[readLoop]', line);

        if (line.startsWith('sen:')) {
          const match = line.match(/sen:([a-zA-Z0-9]{20})-([a-zA-Z0-9]{2})/);
          if (match) {
            const [_, adc, bool] = match;

            binValue.value = parseInt(bool, 16);
            sensorADCData.value = parseSensorADCPacket(adc);
          }
        } else if (line.startsWith('value:')) {
          // value:<name>:<value>
          const [_, name, value] = line.split(':');
          console.log('value:', name, value);
        } else if (line === 'alert' || line === 'alert-0') {
          new Audio('src/assets/audio/alert/0.wav').play();
        } else if (line === 'alert-1') {
          new Audio('src/assets/audio/alert/1.wav').play();
        } else if (line.startsWith('alert:')) {
          // alert:message
        }
      }
    }
  });

  await port.open().catch((e) => console.log(e));
  await port.startRead(1024, 1).catch((e) => console.log(e));

  connected.value = true;
  connecting.value = false;
};
</script>

<template>
  <div class="p-5">
    <div class="grid grid-cols-2 justify-items-center">
      <Select
        v-model="selectedPort"
        :options="Object.values(ports)"
        checkmark
        :highlightOnSelect="false"
        optionLabel="show_name"
        optionValue="port_name"
        placeholder="請選擇連線埠"
        class="w-full md:w-56"
      />

      <Button
        class="max-w-24"
        type="button"
        :label="connected ? '斷線' : '連線'"
        :loading="connecting"
        @click="connectPort"
      />
    </div>
    <div>
      <Button
        class="max-w-24"
        type="button"
        label="清除"
        @click="textString = ''"
      />
      <textarea
        :value="textString"
        readonly
        class="p-4 h-64 w-full border-2 border-gray-300 rounded-md"
      />
    </div>
  </div>
</template>
