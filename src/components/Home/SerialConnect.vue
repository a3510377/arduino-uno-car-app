<script lang="ts" setup>
import { ref } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

import { PortUse, useAvailablePorts } from '../../utils/serial-vue';
import InputGroup from 'primevue/inputgroup';

const inputValue = ref<string>();
const { ports } = useAvailablePorts();
const { port } = defineProps<{ port: PortUse }>();
const { connected, connecting, portName } = port;

const connect = () => {
  if (!port.isOpen) {
    port.connect();
  } else {
    port.close();
  }
};

const write = async () => {
  if (!port.isOpen) return;

  if (inputValue.value) {
    console.log(await port.write(inputValue.value));
  }
  inputValue.value = '';
};
</script>

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
      />

      <Button
        type="button"
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

<style lang="scss" scoped></style>
