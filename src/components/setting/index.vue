<template>
  <div class="fixed top-5 right-5">
    <Button
      icon="pi pi-thumbtack"
      text
      rounded
      :class="{ '!text-gray-500': top }"
      @click="top = !top"
    />
    <Button icon="pi pi-cog" text rounded @click="showSetting = true" />
  </div>
  <div class="fixed inset-5" v-if="showSetting">
    <Tabs class="h-full" value="alert-sounds">
      <TabList class="relative h-14">
        <Tab value="alert-sounds">
          <i class="pi pi-headphones mr-1" />
          警告音
        </Tab>
        <Tab value="shortcut-setting">快捷鍵設定</Tab>
        <Tab value="import-setting">
          <i class="pi pi-upload mr-1" />
          匯入設定
        </Tab>
        <div class="absolute top-2 right-2">
          <Button
            icon="pi pi-times"
            text
            rounded
            @click="showSetting = false"
          />
        </div>
      </TabList>
      <TabPanels class="h-[calc(100%-3.5rem)]">
        <SettingAlertSounds />
        <SettingShortcutKey />
        <SettingImport />
      </TabPanels>
    </Tabs>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { appWindow } from '@tauri-apps/api/window';

import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';

import SettingAlertSounds from './AlertSounds.vue';
import SettingShortcutKey from './ShortcutKey.vue';
import SettingImport from './Import.vue';

import Button from 'primevue/button';

const showSetting = ref<boolean>(false);
const top = ref<boolean>(false);

onMounted(() => appWindow.setAlwaysOnTop(top.value));
watch(top, (newVal) => appWindow.setAlwaysOnTop(newVal));
onKeyStroke('Escape', () => (showSetting.value = false));
</script>
