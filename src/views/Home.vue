<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useIntervalFn } from '@vueuse/core';

import Select from 'primevue/select';
import Button from 'primevue/button';

import { availablePorts, IPortInfo, SerialPort } from '../utils/serial';

const ports = ref<Record<string, IPortInfo>>({});
const selectedPort = ref<string>('');
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

const connectPort = async () => {
  connecting.value = true;
  const port = new SerialPort(selectedPort.value, {});
  port.addListener('data', console.log);
  // let buf = '';
  // port.watch((data) => {
  //   buf += data;
  //   const lines = buf.split('\n');
  //   if (lines.length > 1) {
  //     buf = lines.pop() ?? '';
  //     for (const line of lines) {
  //       console.log(line.length);
  //       console.log(line);
  //     }
  //   }
  // });
  await port.open();
  await port.startRead().catch((e) => console.log(e));
  // invoke('plugin:serialport|connect_port', { portName: selectedPort.value })
  //   .then((status) => {
  //     console.log(status);

  //     connecting.value = false;
  //   })
  //   .catch((e) => {
  //     console.log(e);
  //     connecting.value = false;
  //   });
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
        label="連線"
        :loading="connecting"
        @click="connectPort"
      />
    </div>
  </div>
</template>
