import { makeID } from '@/utils';
import {
  exists,
  createDir,
  BaseDirectory,
  writeTextFile,
  writeBinaryFile,
  readTextFile,
  removeFile,
  readBinaryFile,
} from '@tauri-apps/api/fs';
import { unregister } from '@tauri-apps/api/globalShortcut';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const SETTING_PATH = 'db/settings.json';

const AUDIO_CACHE: { [path: string]: Blob } = {};
const AUDIO_NAME_TEST = /[a-zA-Z0-9-_]+/;

const DEFAULT_SHORT_KEYS: IShortKeyActionMap = {
  'system.connectOrDisconnect': {
    key: 'Ctrl+Alt+C',
    description: '連線/斷線端口',
    global: true,
  },
  'system.connect': { description: '連線端口' },
  'system.disconnect': { description: '斷開端口連接' },
};

const mergeShortKeys = (
  defaultKeysMap: IShortKeyActionMap,
  newKeys: IShortKeyAction[]
): IShortKeyAction[] => {
  const newKeysMap: IShortKeyActionMap = { ...defaultKeysMap };

  newKeys.filter(({ id }) => id).forEach((key) => (newKeysMap[key.id] = key));

  return Object.entries(newKeysMap).map(([id, short]) => ({ ...short, id }));
};

export const useSetting = defineStore('video', () => {
  const shortKeys = ref<IShortKeyAction[]>([]);
  const alertSounds = ref<IAlertSoundMap>({});
  const systemShortKeysMap = ref<IShortKeyActionMap>({});

  const save = async () => {
    await createDir('db', { dir: BaseDirectory.App, recursive: true });

    const json = JSON.stringify(
      {
        shortKeys: shortKeys.value,
        alertSounds: alertSounds.value,
      } as ISettings,
      null,
      2
    );

    await writeTextFile(SETTING_PATH, json, { dir: BaseDirectory.App });
  };

  const load = async () => {
    if (!(await exists(SETTING_PATH, { dir: BaseDirectory.App }))) {
      await save();
    }

    const json = await readTextFile(SETTING_PATH, { dir: BaseDirectory.App });
    const data: ISettings = JSON.parse(json);

    shortKeys.value = mergeShortKeys(DEFAULT_SHORT_KEYS, data.shortKeys || []);

    const newKeysMap: IShortKeyActionMap = {};
    shortKeys.value.forEach((key) => {
      if (key.id.startsWith('system.')) {
        newKeysMap[key.id] = key;
      }
    });
    systemShortKeysMap.value = newKeysMap;

    alertSounds.value = data.alertSounds || {};
    for (const sound of Object.values(alertSounds.value)) {
      if (AUDIO_CACHE[sound.path]) {
        continue;
      }

      const buffer = await readBinaryFile(sound.path, {
        dir: BaseDirectory.App,
      });
      AUDIO_CACHE[sound.path] = new Blob([buffer]);
    }
  };

  load();

  watch([alertSounds, shortKeys], save, { deep: true });

  return {
    load,
    forceSave: save,

    async addAlertSound(
      filename: string,
      name: string,
      blob: Blob,
      options?: IAddAlertSoundOptions
    ): Promise<boolean> {
      if (!AUDIO_NAME_TEST.test(name)) {
        return false;
      }
      if (alertSounds.value[name]) {
        return false;
      }

      await createDir('db/alert-sounds', {
        dir: BaseDirectory.App,
        recursive: true,
      });

      let path;
      const names = filename.split('.');
      const ext = names.pop();
      const oldFileName = names.join('.');
      do {
        path = `db/alert-sounds/${makeID(20)}.${ext}`;
      } while (await exists(path, { dir: BaseDirectory.App }));

      await writeBinaryFile(path, await blob.arrayBuffer(), {
        dir: BaseDirectory.App,
      });

      const sizePromise = new Promise<number>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.addEventListener('error', reject);
      });

      const size = await sizePromise;

      AUDIO_CACHE[path] = blob;
      alertSounds.value[name] = {
        name,
        path,
        size,
        volume: options?.volume ?? 1,
        disable: options?.disable ?? false,
        description: options?.description ?? oldFileName,
      };
      return true;
    },

    async removeAlertSound(name: string): Promise<boolean> {
      const sound = alertSounds.value[name];
      if (!sound) {
        return false;
      }

      await removeFile(sound.path, { dir: BaseDirectory.App });
      delete alertSounds.value[name];
      delete AUDIO_CACHE[sound.path];

      return true;
    },

    async getAlertSoundAudio(
      name: string | IAlertSound
    ): Promise<IPlayAlertSound | null> {
      let sound: IAlertSound;
      if (typeof name === 'string') {
        sound = alertSounds.value[name];

        if (!sound) {
          return null;
        }
      } else sound = name;

      const oldBlob = AUDIO_CACHE[sound.path];
      if (oldBlob) {
        const blobUrl = URL.createObjectURL(oldBlob);

        return {
          ...sound,
          url: blobUrl,
          close: () => URL.revokeObjectURL(blobUrl),
        };
      }

      const buffer = await readBinaryFile(sound.path, {
        dir: BaseDirectory.App,
      });
      const blob = new Blob([buffer]);
      AUDIO_CACHE[sound.path] = blob;
      const blobUrl = URL.createObjectURL(blob);

      return {
        ...sound,
        url: blobUrl,
        close: () => URL.revokeObjectURL(blobUrl),
      };
    },

    editAlertSoundName(name: string, newName: string): boolean {
      if (!AUDIO_NAME_TEST.test(newName)) {
        return false;
      }

      const oldSound = alertSounds.value[name];
      if (alertSounds.value[newName] || !oldSound) {
        return false;
      }

      alertSounds.value[newName] = { ...oldSound, name: newName };
      delete alertSounds.value[name];
      return true;
    },

    async editShortKey(shortKey: IShortKeyAction, newKey: string) {
      const index = shortKeys.value.findIndex((key) => key.id === shortKey.id);

      if (index === -1) {
        return false;
      }

      if (shortKey.key) await unregister(shortKey.key);
      shortKeys.value[index].key = newKey;
      return true;
    },

    systemShortKeysMap,
    shortKeys,
    alertSounds,
  };
});

export type IShortKeyActionType = 'send-msg' | 'system';

export interface IShortKeyAction {
  id: `${IShortKeyActionType}.${string}`;
  description: string;
  key?: string;
  value?: string;
  global: boolean;
}

export interface IShortKeyActionMap {
  [id: `${IShortKeyActionType}.${string}`]: {
    description: string;
    key?: string;
    value?: string;
    global?: boolean;
  };
}

export interface IAlertSoundMap {
  [key: string]: IAlertSound;
}

export interface ISettings {
  alertSounds: IAlertSoundMap;
  shortKeys: IShortKeyAction[];
}

export interface IExtendsSettings {
  alertSounds: { [key: string]: IExtendsAlertSound };
}

export interface IAddAlertSoundOptions {
  description?: string;
  volume: number;
  disable: boolean;
}

export interface IExtendsAlertSound extends IAddAlertSoundOptions {
  name: string;
  path: string;
}

export interface IAlertSound extends IExtendsAlertSound {
  size: number;
}

export interface IPlayAlertSound extends IAlertSound {
  url: string;
  close(): void;
}
