<template>
  <div class="h-1/6 w-full flex max-w-[40rem] max-h-11">
    <div class="w-full flex justify-between max-w-96">
      <Select
        v-model="portName"
        :options="Object.values(ports)"
        checkmark
        :highlightOnSelect="false"
        optionLabel="show_name"
        optionValue="port_name"
        placeholder="請選擇連線埠"
        class="w-full md:w-56"
        overlayClass="select-none"
      />

      <Button
        type="button"
        title="快捷鍵 - c"
        :label="connected ? '斷線' : '連線'"
        :loading="connecting"
        :disabled="!portName"
        @click="connect"
      />
    </div>
    <InputGroup class="ml-10">
      <InputText
        v-model="inputValue"
        placeholder="串口輸入"
        @keyup.enter="write"
      />
      <Button
        icon="pi pi-angle-right"
        :disabled="!connected || !inputValue || !portName"
        @click="write"
      />
    </InputGroup>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { register, unregister } from '@tauri-apps/api/globalShortcut';
import { ref } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputGroup from 'primevue/inputgroup';
import { useToast } from 'primevue/usetoast';
import { onKeyStroke } from '@vueuse/core';

import { PortUse, useAvailablePorts } from '@/utils/serial-vue';

const toast = useToast();
const inputValue = ref<string>();
const { ports } = useAvailablePorts();
const { port } = defineProps<{ port: PortUse }>();
const { connected, connecting, portName } = port;

const connect = async () => {
  if (!port.isOpen) {
    if (!portName.value) {
      toast.add({
        severity: 'error',
        summary: '錯誤',
        detail: '請先選擇連線埠',
        life: 1500,
      });
      return false;
    }
    await port.connect();
  } else await port.close();
  return true;
};

const write = async () => {
  if (!port.isOpen) return;

  if (inputValue.value) {
    console.log(await port.write(inputValue.value));
  }

  inputValue.value = '';
};

onMounted(async () => {
  await unregister('CommandOrControl+Alt+C');
  await register('CommandOrControl+Alt+C', async () => {
    if (!(await connect())) return;
    if (port.isOpen) {
      toast.add({
        severity: 'info',
        summary: '連線完成',
        detail: '連線完成',
        life: 1500,
      });
      new Audio(new URL('/audio/connect.mp3', import.meta.url).href).play();
    } else {
      toast.add({
        severity: 'warn',
        summary: '連線已斷線',
        detail: '連線已斷線',
        life: 1500,
      });
      new Audio(
        new URL('/audio/disconnected.mp3', import.meta.url).href
      ).play();
    }
  });
});

onUnmounted(async () => {
  await unregister('CommandOrControl+Alt+C');
});

onKeyStroke('c', (_) => connect());
</script>
