<template>
  <TabPanel
    value="shortcut-setting"
    class="h-full flex justify-center items-center select-none"
  >
    <DataTable
      :value="settings.shortKeys"
      tableStyle="min-width: 50rem"
      v-on:row-click="rowClick"
    >
      <Column field="id" header="ID">
        <template #body="{ data }">
          {{ data.id }}
        </template>
      </Column>
      <Column field="description" header="描述" />
      <Column field="key" header="快捷鍵">
        <template #body="{ data }">
          <div class="flex">
            <div v-for="(key, i) in data.key.split('+')" class="flex">
              <strong>{{ key }}</strong>
              <p v-if="i < data.key.split('+').length - 1">+</p>
            </div>
          </div>
        </template>
      </Column>
      <Column field="value" header="發送訊息">
        <template #body="{ data }">
          {{ data.id.startsWith('send-msg.') ? data.value : '-' }}
        </template>
      </Column>
      <Column field="global" header="全域調用">
        <template #body="{ data }">
          <Checkbox v-model="data.global" :binary="true" />
        </template>
      </Column>
    </DataTable>
  </TabPanel>
  <Dialog :visible="!!editingShortKey" :closable="false" :show-header="false">
    <OnClickOutside @trigger="editingShortKey = null" class="flex flex-col m-4">
      <h1 class="my-5">按下所需按鍵組合，並按下 "Enter"</h1>
      <InputText
        :value="formatShortKeys(editingShortKeyValue)"
        @keydown="onSetKeyDown"
      />
    </OnClickOutside>
  </Dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import TabPanel from 'primevue/tabpanel';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';

import { IShortKeyAction, useSetting } from '@/store/setting';
import { OnClickOutside } from '@vueuse/components';
import { formatShortKey, formatShortKeys } from '@/utils';

const editingShortKey = ref<IShortKeyAction | null>(null);
const editingShortKeyValue = ref<Record<string, undefined>>({});
const settings = useSetting();

const onSetKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const nowKey = formatShortKey(e.key);
  if (nowKey === 'Escape') {
    editingShortKeyValue.value = {};
    return;
  }
  if (nowKey === 'Enter') {
    if (editingShortKey.value) {
      await settings.editShortKey(
        editingShortKey.value,
        formatShortKeys(editingShortKeyValue.value)
      );
    }

    editingShortKey.value = null;
    return;
  }

  editingShortKeyValue.value[nowKey] = undefined;
};

const rowClick = ({ data }: { data: IShortKeyAction }) => {
  editingShortKey.value = data;
  editingShortKeyValue.value = {};
};
</script>
