<template>
  <TabPanel value="alert-sounds" class="h-full">
    <div class="h-8">
      <label for="file">添加語音: </label>
      <input
        ref="audioFile"
        type="file"
        name="file"
        accept="audio/*"
        @change="onFileSelect"
      />
    </div>

    <DataTable
      :value="Object.values(setting.alertSounds)"
      class="mt-6 border border-cyan-500 rounded-md overflow-y-scroll h-[calc(100%-4rem)] p-2"
    >
      <Column>
        <template #body="{ data }">
          <div class="flex items-center justify-center">
            <Button
              :icon="
                data.name === customAudio && playingAudio
                  ? 'pi pi-pause'
                  : 'pi pi-play'
              "
              :severity="
                data.name === customAudio && playingAudio ? 'warn' : ''
              "
              rounded
              :loading="data.name === customAudio && loadingAudio"
              @click="playOrPause(data)"
            />
          </div>
        </template>
      </Column>
      <Column field="name" header="名稱" class="disable-center">
        <template #body="{ data }">
          <div class="flex items-center">
            <Button
              text
              rounded
              class="mr-1"
              icon="pi pi-pen-to-square"
              iconClass="!text-[.8rem]"
              @click="editName(data)"
              title="點擊修改"
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
      <Column field="description" header="描述" class="disable-center">
        <template #body="{ data }">
          <div class="flex items-center">
            <p>{{ data.description }}</p>
          </div>
        </template>
      </Column>
      <Column field="size" header="長度">
        <template #body="{ data }">
          <div class="flex items-center justify-center">
            {{ formatDuration(data.size) }}
          </div>
        </template>
      </Column>
      <Column field="volume" header="音量">
        <template #body="{ data }">
          <div class="flex items-center justify-center gap-5">
            <Slider
              v-model="data.volume"
              :step="0.01"
              :min="0"
              :max="1"
              class="w-36"
              :disabled="data.disable"
            />
            <InputNumber
              v-model="data.volume"
              inputClass="w-24"
              :min="0"
              :max="1"
              :step="0.01"
              showButtons
              :disabled="data.disable"
            />
          </div>
        </template>
      </Column>
      <Column field="disable" header="禁用">
        <template #body="{ data }">
          <div class="flex items-center justify-center">
            <Checkbox v-model="data.disable" :binary="true" />
          </div>
        </template>
      </Column>
      <Column field="disable" header="刪除">
        <template #body="{ data }">
          <div class="flex items-center justify-center">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="setting.removeAlertSound(data.name)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      :visible="!!startEditName"
      modal
      header="修改設定"
      :closeButtonProps="{
        text: true,
        rounded: true,
        severity: 'secondary',
        onClick: () => (startEditName = ''),
      }"
    >
      <OnClickOutside @trigger="startEditName = ''">
        <div class="flex items-center gap-4 mb-8">
          <label for="name" class="font-semibold w-24">名稱</label>
          <InputText
            id="name"
            class="flex-auto"
            autocomplete="off"
            v-model="name"
            @keyup.enter="saveEdit"
          />
        </div>
        <div class="flex items-center gap-4 mb-8">
          <label for="name" class="font-semibold w-24">描述</label>
          <InputText
            id="name"
            class="flex-auto"
            autocomplete="off"
            v-model="description"
            @keyup.enter="saveEdit"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            @click="startEditName = ''"
          />
          <Button type="button" label="Save" @click="saveEdit" />
        </div>
      </OnClickOutside>
    </Dialog>
  </TabPanel>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';

import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import TabPanel from 'primevue/tabpanel';
import Checkbox from 'primevue/checkbox';

import { useToast } from 'primevue/usetoast';
import { useClipboard } from '@vueuse/core';
import { OnClickOutside } from '@vueuse/components';

import { makeID, formatDuration } from '@/utils';
import { IAlertSound, useSetting } from '@/store/setting';

const setting = useSetting();

const toast = useToast();
const customAudio = ref<string>('');
const loadingAudio = ref<boolean>(false);
const playingAudio = ref<boolean>(false);

const name = ref<string>('');
const description = ref<string>('');
const startEditName = ref<string>('');

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
    audio.volume = sound.volume;
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

const editName = async (sound: IAlertSound) => {
  if (setting.alertSounds[sound.name]) {
    startEditName.value = sound.name;
    name.value = sound.name;
    description.value = sound.description || '';
  }
};

const saveEdit = () => {
  if (startEditName.value) {
    const sound = setting.alertSounds[startEditName.value];
    const oldDescription = sound.description;
    if (oldDescription !== description.value) {
      sound.description = description.value || void 0;
      toast.add({
        severity: 'success',
        summary: '成功',
        detail: `修改 ${startEditName.value} 描述成功`,
        life: 1500,
      });
    }
    if (startEditName.value !== name.value) {
      if (setting.editAlertSoundName(startEditName.value, name.value)) {
        toast.add({
          severity: 'success',
          summary: '成功',
          detail: `修改 ${startEditName.value} -> ${name.value} 成功`,
          life: 1500,
        });
      } else {
        toast.add({
          severity: 'error',
          summary: '失敗',
          detail: `修改 ${startEditName.value} -> ${name.value} 失敗`,
          life: 1500,
        });
      }
    }
  }
  startEditName.value = '';
};
</script>

<style scoped>
:deep(
    .p-datatable-header-cell:not(.disable-center)
      .p-datatable-column-header-content
  ) {
  justify-content: center;
}
</style>
