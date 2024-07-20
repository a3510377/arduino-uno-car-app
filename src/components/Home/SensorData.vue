<template>
  <div
    class="grid grid-cols-4 gap-5 m-2 select-none w-1/2 max-h-48 px-5 items-center"
  >
    <div
      v-for="(value, i) in sensorADCData"
      :key="i"
      class="bg-white text-slate-600 flex items-center justify-center h-20 rounded-2xl flex-col hover:bg-gray-300 transition-colors duration-200 ease-in-out"
      :class="{
        '!bg-slate-600 !text-white hover:!bg-slate-700': !(
          binValue &
          (1 << (7 - i))
        ),
      }"
    >
      <div v-text="value" class="flex items-center justify-center h-full"></div>
      <div v-text="i + 1" class="flex items-center justify-center h-full"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { PortUse } from '../../utils/serial-vue';

const { port } = defineProps<{ port: PortUse }>();

const { sensorADCData, binValue } = port;
</script>
