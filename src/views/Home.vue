<script setup lang="ts">
import { onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';

import { PortUse } from '../utils/serial-vue';
import SerialText from '../components/Home/SerialText.vue';
import SerialConnect from '../components/Home/SerialConnect.vue';
import SensorData from '../components/Home/SensorData.vue';
import ValueShow from '../components/Home/ValueShow.vue';

const toast = useToast();

const port = new PortUse();
// const { sensorADCData, binValue } = port;

onUnmounted(() => {
  port.forceClose();
});
port
  .on('alert', (msg) => {
    toast.add({ severity: 'info', summary: '訊息', detail: msg, life: 3000 });
  })
  .on('alert_play', (i) => {
    new Audio(`audio/alert/${i}.wav`).play();
    toast.add({
      severity: 'info',
      summary: '訊息',
      detail: `音訊播放中 - ${i}`,
      life: 500,
    });
  });
</script>

<template>
  <div class="p-5 h-full">
    <div class="h-1/2 w-full flex justify-center items-center flex-col">
      <SerialConnect :port="port" />
      <SerialText :port="port" />
    </div>
    <div class="flex w-full h-1/2 items-center">
      <SensorData :port="port" />
      <ValueShow :port="port" />
    </div>
  </div>
</template>
