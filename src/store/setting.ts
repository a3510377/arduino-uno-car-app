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
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const SETTING_PATH = 'db/settings.json';

const AUDIO_CACHE: { [key: string]: Blob } = {};

export const useSetting = defineStore('video', () => {
  const alertSounds = ref<IAlertSoundMap>({});

  const save = async () => {
    await createDir('db', { dir: BaseDirectory.App, recursive: true });

    const json = JSON.stringify({
      alertSounds: alertSounds.value,
    });

    await writeTextFile(SETTING_PATH, json, { dir: BaseDirectory.App });
  };

  const load = async () => {
    if (!(await exists(SETTING_PATH, { dir: BaseDirectory.App }))) {
      await save();
    }

    const json = await readTextFile(SETTING_PATH, { dir: BaseDirectory.App });
    const data = JSON.parse(json);

    alertSounds.value = data.alertSounds;
  };

  load();

  watch(alertSounds, save, { deep: true });

  return {
    load,
    forceSave: save,

    async addAlertSound(
      filename: string,
      name: string,
      blob: Blob
    ): Promise<boolean> {
      if (alertSounds.value[name]) {
        return false;
      }

      await createDir('db/alert-sounds', {
        dir: BaseDirectory.App,
        recursive: true,
      });

      let path;
      const ext = filename.split('.').pop();
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
        type: blob.type,
        size,
        volume: 1,
        disable: false,
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
      const blob = new Blob([buffer], { type: sound.type });
      AUDIO_CACHE[sound.path] = blob;
      const blobUrl = URL.createObjectURL(blob);

      return {
        ...sound,
        url: blobUrl,
        close: () => URL.revokeObjectURL(blobUrl),
      };
    },

    alertSounds,
  };
});

export interface IAlertSound {
  name: string;
  path: string;
  type: string;
  size: number;
  volume: number;
  disable: boolean;
}

export interface IAlertSoundMap {
  [key: string]: IAlertSound;
}

export interface IPlayAlertSound extends IAlertSound {
  url: string;
  close(): void;
}