<template>
  <TabPanel
    value="shortcut-setting"
    class="h-full flex flex-col justify-center items-center select-none"
  >
    <DataTable
      :value="settings.shortKeys"
      :tableStyle="[
        '--p-datatable-body-cell-border-color:#4b5563;--p-datatable-header-cell-border-color:#4b5563',
        '--p-checkbox-background:white;',
      ]"
      class="w-full h-[calc(100%-4rem)] overflow-y-scroll"
      v-on:row-click="rowClick"
      :row-class="
        (x: IShortKeyAction) => ({
          '!bg-gray-800/75': x.id.startsWith('system.'),
        })
      "
    >
      <!-- <Column field="id" header="ID">
        <template #body="{ data }">
          {{ data.id }}
        </template>
      </Column> -->
      <Column field="description" header="名稱" />
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
      <Column field="value" header="訊息">
        <template #body="{ data }">
          {{ data.id.startsWith('send-msg.') ? data.value : '-' }}
        </template>
      </Column>
      <!-- <Column field="global" header="全域">
        <template #body="{ data }">
          <Checkbox v-model="data.global" :binary="true" />
        </template>
      </Column> -->
      <Column field="" header="">
        <template #body="{ data }">
          <Button
            v-if="data.id.startsWith('send-msg.')"
            text
            rounded
            icon="pi pi-trash"
            size="small"
            class="ml-auto"
            severity="danger"
            @click="() => settings.removeShortKey(data)"
          />
        </template>
      </Column>
    </DataTable>
    <Button
      label="添加"
      size="small"
      icon="pi pi-plus"
      severity="success"
      class="mr-2"
      @click="addShortKey"
    />
  </TabPanel>
  <Dialog
    :visible="!!editingShortKey"
    :closable="false"
    :show-header="false"
    content-class="!p-0 w-96 h-64"
  >
    <OnClickOutside
      @trigger="editingShortKey = null"
      class="flex flex-col justify-center p-10 gap-12 h-full"
    >
      <FloatLabel>
        <InputText
          id="key-input"
          class="w-full"
          v-model="editingShortKeysString"
          @keydown="onSetKeyDown"
        />
        <label for="key-input">按下所需按鍵組合</label>
      </FloatLabel>
      <div
        v-if="
          editingShortKey?.id.startsWith('send-msg.') &&
          editingShortKey?.value !== void 0
        "
      >
        <FloatLabel>
          <InputText
            id="key-value"
            class="w-full"
            v-model="editingShortKey.value"
          />
          <label for="key-value">要發送的訊息</label>
        </FloatLabel>
      </div>
    </OnClickOutside>
  </Dialog>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import TabPanel from 'primevue/tabpanel';
// import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';

import { IShortKeyAction, useSetting } from '@/store/setting';
import { OnClickOutside } from '@vueuse/components';
import { formatShortKey, formatShortKeys } from '@/utils';

const settings = useSetting();
const editingShortKey = ref<IShortKeyAction | null>(null);
const editingShortKeyValue = ref<Record<string, undefined>>({});
const editingShortKeysString = computed(() => {
  return formatShortKeys(editingShortKeyValue.value);
});

const onSetKeyDown = async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const nowKey = formatShortKey(e.key);
  if (nowKey === 'Escape') {
    editingShortKeyValue.value = {};
    return;
  }

  if (nowKey === 'Enter') {
    await saveKey();
    editingShortKey.value = null;
    return;
  }

  editingShortKeyValue.value[nowKey] = undefined;
};

const saveKey = async () => {
  if (editingShortKey.value) {
    await settings.editShortKey(
      editingShortKey.value,
      editingShortKeysString.value
    );
  }
};

const rowClick = ({ data }: { data: IShortKeyAction }) => {
  editingShortKey.value = data;
  editingShortKeyValue.value = Object.fromEntries(
    data.key
      ?.split('+')
      .filter(Boolean)
      .map((x) => [x, undefined]) || []
  );
};

const addShortKey = () => {
  const data = settings.addSendMsgShortKey();
  editingShortKey.value = data;
  editingShortKeyValue.value = {};
};
</script>
