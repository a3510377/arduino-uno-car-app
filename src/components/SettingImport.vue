<template>
  <TabPanel
    value="import-setting"
    class="h-full flex justify-center items-center"
  >
    <div class="h-8">
      <label for="file">匯入設定: </label>
      <input ref="fileEl" type="file" id="file" accept="application/zip" />
      <Button @click="importSetting">匯入</Button>
    </div>
  </TabPanel>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import JSZip from 'jszip';

import Button from 'primevue/button';
import TabPanel from 'primevue/tabpanel';

import { useToast } from 'primevue/usetoast';
import { IExtendsSettings, useSetting } from '@/store/setting';

const toast = useToast();
const settings = useSetting();
const fileEl = ref<HTMLInputElement | null>(null);

const importSetting = async () => {
  if (!fileEl.value) return;
  const file = fileEl.value.files?.[0];
  if (!file) return;

  const zip = new JSZip();

  const zipFile = await zip.loadAsync(file);

  const settingsFile = zipFile.file('settings.json');
  if (!settingsFile) {
    toast.add({
      severity: 'error',
      summary: '匯入失敗',
      detail: '找不到設定檔案',
      life: 1000,
    });
    return;
  }
  const extendsSetting: IExtendsSettings = JSON.parse(
    await settingsFile.async('text')
  );

  for (const sound of Object.values(extendsSetting.alertSounds)) {
    const fileName = sound.path.split(/[/\\]/).pop() || '';
    if (!fileName) {
      toast.add({
        severity: 'error',
        summary: '匯入失敗',
        detail: '音訊檔案名稱錯誤',
        life: 1000,
      });
      console.error('音訊檔案名稱錯誤', sound.path);
      continue;
    }

    const blob = await zipFile.file(sound.path)?.async('blob');
    if (blob) {
      if (await settings.addAlertSound(fileName, sound.name, blob, sound)) {
        toast.add({
          severity: 'info',
          summary: '匯入成功',
          detail: `音訊已匯入 - ${fileName}`,
          life: 1000,
        });
      } else {
        toast.add({
          severity: 'error',
          summary: '匯入失敗',
          detail: `音訊已存在 - ${fileName}`,
          life: 1000,
        });
      }
    } else {
      toast.add({
        severity: 'error',
        summary: '匯入失敗',
        detail: '找不到音訊檔案',
        life: 1000,
      });
      console.error('找不到音訊檔案', sound.path);
    }
  }
};
</script>
