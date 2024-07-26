<template>
  <Toast position="bottom-right" />
  <div class="p-5 h-screen flex flex-col gap-5">
    <div class="h-1/2 w-full flex items-center flex-col pb-5">
      <SerialConnect :port="port" />
      <SerialText :port="port" />
      <Setting />
    </div>
    <div class="flex h-1/2 w-full items-center">
      <SensorData :port="port" />
      <ValueShow :port="port" />
    </div>
  </div>
  <span class="fixed bottom-5 left-5 select-none -z-10">v{{ version }}</span>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { unregisterAll } from '@tauri-apps/api/globalShortcut';
import { getVersion } from '@tauri-apps/api/app';

import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

import SerialText from '@/components/SerialText.vue';
import SerialConnect from '@/components/SerialConnect.vue';
import SensorData from '@/components/SensorData.vue';
import ValueShow from '@/components/ValueShow.vue';
import Setting from '@/components/setting/index.vue';
import { PortUse } from '@/utils/serial-vue.ts';
import { useSetting } from '@/store/setting';

const toast = useToast();
const setting = useSetting();
const version = ref<string>('0.0.0');

const port = new PortUse();

onMounted(async () => {
  version.value = await getVersion();
});

onUnmounted(async () => {
  port.forceClose();
  await unregisterAll();
});

port
  .on('alert', (msg) => {
    toast.add({ severity: 'info', summary: '訊息', detail: msg, life: 3000 });
  })
  .on('alert_play', async (i) => {
    console.time(`getAudio-${i}`);
    const sound = await setting.getAlertSoundAudio(i);
    console.timeEnd(`getAudio-${i}`);

    if (!sound) {
      console.log(`未找到音訊 ${i}`);
      return;
    }

    if (sound.disable) {
      console.log(`音訊已禁用，不播放 - ${i}`);
      return;
    }

    const audio = new Audio(sound.url);
    audio.volume = sound.volume;
    toast.add({
      severity: 'info',
      summary: '訊息',
      detail: `音訊播放中 - ${i} [${sound.description ?? '無'}]`,
      life: 500,
    });
    await audio.play();
    URL.revokeObjectURL(sound.url);
  });
</script>
