<template>
  <div
    class="value-show grid h-full grid-flow-row-dense grid-cols-3 grid-rows-3 m-2 select-none w-1/2 p-5 border rounded-md text-xl"
  >
    <div v-for="(value, key) in valueData" :key="key">
      <div class="text-gray-400 mr-2">{{ key }}</div>
      <div
        class="transition-colors"
        :class="{ 'text-red-500': hasChange(key as string) }"
      >
        {{ value }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';

import { PortUse } from '@/utils/serial-vue';

const { port } = defineProps<{ port: PortUse }>();
const { valueData } = port;

let oldValueData: Record<string, string>;
const changeKeys = ref<Record<string, number>>({});
watch(
  valueData,
  (newVal) => {
    for (const key in newVal) {
      if (newVal[key] !== oldValueData[key]) {
        if (hasChange(key)) {
          clearTimeout(changeKeys.value[key]);
        }

        changeKeys.value[key] = +setTimeout(() => {
          changeKeys.value[key] = -1;
        }, 500);
      }
    }
    oldValueData = { ...newVal };
  },
  { deep: true }
);

const hasChange = (key: string) => {
  return changeKeys.value[key] && changeKeys.value[key] !== -1;
};
</script>
