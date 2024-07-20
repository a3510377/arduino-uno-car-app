<script lang="ts" setup>
import Select from 'primevue/select';
import Button from 'primevue/button';

import { PortUse, useAvailablePorts } from '../../utils/serial-vue';

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
</script>

<template>
  <div class="w-96 flex justify-between">
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
      class="max-w-24"
      type="button"
      :label="connected ? '斷線' : '連線'"
      :loading="connecting"
      :disabled="!portName"
      @click="connect"
    />
  </div>
</template>

<style lang="scss" scoped></style>
