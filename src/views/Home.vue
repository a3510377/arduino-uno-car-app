<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useIntervalFn } from '@vueuse/core';

import Select from 'primevue/select';
import Button from 'primevue/button';

import { availablePorts, IPortInfo, SerialPort } from '../utils/serial';

const ports = ref<Record<string, IPortInfo>>({});
const selectedPort = ref<string>('');
const connected = ref<boolean>(false);
const connecting = ref<boolean>(false);

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

  port.addListener('data', console.log);
  await port.open().catch((e) => console.log(e));
  await port.startRead().catch((e) => console.log(e));

  connected.value = true;
  connecting.value = false;
};
</script>

<template>
  <div class="p-5">
    <div class="grid grid-cols-2">
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
  </div>
</template>
