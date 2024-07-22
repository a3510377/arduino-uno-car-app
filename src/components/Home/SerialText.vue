<template>
  <div
    :class="[
      'relative h-5/6 p-2 border w-full text-xl rounded-md border-[--p-button-outlined-primary-border-color]',
      'mt-5',
    ]"
  >
    <ButtonGroup class="absolute -top-[1px] right-6">
      <Button
        outlined
        size="small"
        icon="pi pi-clock"
        class="!rounded-tl-none"
        :class="{ '!text-gray-500': !timeShow }"
        @click="timeShow = !timeShow"
      />
      <Button
        outlined
        size="small"
        icon="pi pi-angle-double-down"
        :class="{ '!text-gray-500': !autoScroll }"
        @click="
          () => {
            autoScroll = !autoScroll;
            toDown();
          }
        "
      />
      <Button
        outlined
        size="small"
        icon="pi pi-trash"
        class="max-w-24 !rounded-tr-none"
        @click="lines = []"
        :disabled="!lines.length"
      />
    </ButtonGroup>

    <span class="absolute -bottom-[1px] right-6">
      <Button
        v-if="!autoScroll && showDown"
        size="small"
        icon="pi pi-arrow-down"
        class="!rounded-b-none"
        @click="toDown"
        outlined
      />
    </span>
    <div
      ref="scrollContainer"
      class="scroll h-full w-full overflow-auto"
      @scroll="
        () => {
          if (scrollContainer) {
            showDown =
              scrollContainer.scrollHeight - scrollContainer.scrollTop > 800;

            if (showDown && autoScroll) {
              autoScroll = false;
            }
          }
        }
      "
    >
      <div v-for="({ line, timestamp }, i) in lines" :key="i" class="flex">
        <p class="text-lg text-gray-400 mr-2" v-if="timeShow">
          {{ getDateTime(timestamp) }}
        </p>
        <p
          class="text-white"
          :class="{
            '!text-red-500': SPECIAL_RED_RE.test(line.trim()),
            '!text-yellow-500': SPECIAL_YEL_RE.test(line.trim()),
          }"
        >
          {{ line }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue';

import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';

import { getDateTime } from '@/utils';
import { PortUse } from '@/utils/serial-vue';

const SPECIAL_RED_RE = /^alert((?:-(\d+))?|:.*)$/;
const SPECIAL_YEL_RE =
  /^((sen:([a-zA-Z0-9]{20})-([a-zA-Z0-9]{2}))|(value:[^:]+:[^:]*))$/;

const { port } = defineProps<{ port: PortUse }>();

const timeShow = ref<boolean>(true);
const autoScroll = ref<boolean>(true);
const showDown = ref<boolean>(false);
const { lines } = port;
const scrollContainer = ref<HTMLDivElement | null>(null);

onUnmounted(() => {
  port.forceClose();
});

const toDown = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

port.on('new_line', async () => {
  if (autoScroll.value) {
    await nextTick(); // wait for dom update
    toDown();
  }
});
</script>

<style scoped>
.scroll::-webkit-scrollbar {
  width: 7px;
}

.scroll::-webkit-scrollbar-button {
  background: transparent;

  border-radius: 4px;
}

.scroll::-webkit-scrollbar-track-piece {
  background: transparent;
}

.scroll::-webkit-scrollbar-thumb {
  border-radius: 4px;

  background-color: rgba(0, 0, 0, 0.4);

  border: 1px solid slategrey;
}

.scroll::-webkit-scrollbar-track {
  box-shadow: transparent;
}
</style>
