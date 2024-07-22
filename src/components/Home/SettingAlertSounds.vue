<template>
  <TabPanel value="alert-sounds" class="h-full">
    <input
      class="h-8"
      ref="audioFile"
      type="file"
      name=""
      id=""
      accept="audio/*"
      @change="onFileSelect"
    />

    <DataTable
      :value="Object.values(setting.alertSounds)"
      class="mt-6 border border-cyan-500 rounded-md overflow-y-scroll h-[calc(100%-4rem)] p-2"
    >
      <Column>
        <template #body="{ data }">
          <Button
            :icon="
              data.name === customAudio && playingAudio
                ? 'pi pi-pause'
                : 'pi pi-play'
            "
            :severity="data.name === customAudio && playingAudio ? 'warn' : ''"
            rounded
            :loading="data.name === customAudio && loadingAudio"
            @click="playOrPause(data)"
          />
        </template>
      </Column>
      <Column field="name" header="ID">
        <template #body="{ data }">
          <div class="flex items-center">
            <Button
              text
              rounded
              icon="pi pi-pen-to-square"
              iconClass="!text-[.8rem]"
              @click="playOrPause(data)"
              title="點擊改名"
            />
            <p
              @click="copyText(data.name)"
              class="cursor-pointer"
              title="點擊複製"
            >
              {{ data.name }}
            </p>
          </div>
        </template>
      </Column>
      <Column field="size" header="長度">
        <template #body="{ data }">
          {{ formatDuration(data.size) }}
        </template>
      </Column>
    </DataTable>

    <Dialog></Dialog>
  </TabPanel>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';

import Dialog from 'primevue/dialog';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';

import { useToast } from 'primevue/usetoast';

import { makeID, formatDuration } from '@/utils';
import { IAlertSound, useSetting } from '@/store/setting';
import { useClipboard } from '@vueuse/core';
import Button from 'primevue/button';

const setting = useSetting();

const toast = useToast();
const name = ref<string>('test');
const customAudio = ref<string>('');
const loadingAudio = ref<boolean>(false);
const playingAudio = ref<boolean>(false);

const audioFile = ref<HTMLInputElement>();
const { copy } = useClipboard();
const audio: HTMLAudioElement = new Audio();

onUnmounted(() => {
  audio.pause();
});

audio.addEventListener('play', () => (playingAudio.value = true));
audio.addEventListener('pause', () => (playingAudio.value = false));
audio.addEventListener('ended', () => (playingAudio.value = false));

const onFileSelect = async (_event: Event) => {
  const file = audioFile.value?.files?.[0];
  if (!file) return;

  await setting.addAlertSound(file.name, makeID(5), file);
};

const playOrPause = async (sound: IAlertSound) => {
  if (customAudio.value === sound.name && playingAudio.value) {
    audio.pause();
    return;
  }

  try {
    customAudio.value = sound.name;
    loadingAudio.value = true;
    console.time(`getAudio-${sound.name}`);
    const playAudio = await setting.getAlertSoundAudio(sound);
    console.timeEnd(`getAudio-${sound.name}`);

    audio.pause();
    if (!playAudio) return;

    audio.src = playAudio.url;
    audio.addEventListener(
      'loadeddata',
      () => {
        loadingAudio.value = false;
        toast.add({
          severity: 'info',
          summary: '訊息',
          detail: `音訊播放中 - ${sound.name}`,
          life: 500,
        });
      },
      { once: true }
    );

    audio.load();
    await audio.play();
    URL.revokeObjectURL(playAudio.url);
  } catch (error) {
    // force disable this error
    // https://developer.chrome.com/blog/play-request-was-interrupted
    if (
      error instanceof Error &&
      error.message.startsWith(
        'The play() request was interrupted by a call to pause()'
      )
    ) {
      return;
    }
    loadingAudio.value = false;
    console.error(error);
    toast.add({
      severity: 'error',
      summary: '錯誤',
      detail: '播放音訊失敗',
      life: 3000,
    });
  }
};

const copyText = (text: string) => {
  copy(text);
  toast.add({
    severity: 'info',
    summary: '複製',
    detail: `複製 '${text}' 成功`,
    life: 1500,
  });
};
</script>
