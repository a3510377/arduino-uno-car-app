<template>
  <div class="h-1/6 flex max-h-11">
    <div class="container w-full flex justify-between gap-10">
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
        title="快捷鍵 - ctrl+alt+c"
        class="w-54"
        :label="connected ? '斷線' : '連線'"
        :loading="connecting"
        :severity="connected ? 'danger' : ''"
        :disabled="!portName || !ports[portName]"
        @click="connect"
      />

      <InputGroup class="!w-72">
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
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { register, unregister } from '@tauri-apps/api/globalShortcut';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputGroup from 'primevue/inputgroup';
import { useToast } from 'primevue/usetoast';

import { PortUse, useAvailablePorts } from '@/utils/serial-vue';
import { findUnoPort } from '@/utils';

const toast = useToast();
const inputValue = ref<string>();
const { ports, forceUpdate } = useAvailablePorts();
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
    oldVidPid = ports.value[portName.value]?.vid_pid;
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

let oldVidPid: string | undefined;
watch(ports, async () => {
  const oldPortName = portName.value;
  let oldPort = oldPortName ? ports.value[oldPortName] : null;

  // if old port disappeared but data is still there then close it
  if (oldPort && oldVidPid !== oldPort.vid_pid) {
    await port.close();
    await forceUpdate(); // force update ports info
    oldPort = null;
    oldVidPid = undefined;
  }

  if (!oldPort) {
    const autoPort = await findUnoPort();
    if (!autoPort) return;

    portName.value = autoPort.port_name;
    toast.add({
      severity: 'info',
      summary: '自動選擇連線埠',
      detail: `已自動選擇連線埠 ${autoPort.show_name}`,
      life: 1500,
    });
  }
});

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
</script>

<style scoped>
:deep(.p-inputtext.p-component) {
  width: auto;
}

@media (max-width: 860px) {
  .container {
    margin-right: 80px;
  }
}
</style>
