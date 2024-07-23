# Tauri + Vue + TypeScript

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's Take Over mode by following these steps:

1. Run `Extensions: Show Built-in Extensions` from VS Code's command palette, look for `TypeScript and JavaScript Language Features`, then right click and select `Disable (Workspace)`. By default, Take Over mode will enable itself if the default TypeScript extension is disabled.
2. Reload the VS Code window by running `Developer: Reload Window` from the command palette.

You can learn more about Take Over mode [here](https://github.com/johnsoncodehk/volar/discussions/471).

```cpp
#include <Arduino.h>

void debug_sensors();

void setup() {
  Serial.begin(115200);
}

uint8_t sensorBools = 0b10000001;
uint16_t sensorValues[8] = {0x3ff, 0x2ff, 0x1ff, 0x2ff,
                            0x00f, 0xaf,  0x000, 0x100};

void loop() {
  debug_sensors();
  delay(1000);
  // Serial.println("alert");
  Serial.println("alert:Test");
  delay(1000);
  Serial.println("alert");
  delay(1000);
  Serial.println("alert-1");
  delay(1000);
  Serial.println("value:test1:1");
  delay(1000);
  Serial.println("value:test1:2");
  delay(1000);

  if (Serial.available()) {
    char c = Serial.read();
    if (c == '1') {
      sensorBools ^= 0b00000001;
    } else if (c == '2') {
      sensorBools ^= 0b00000010;
    } else if (c == '3') {
      sensorBools ^= 0b00000100;
    } else if (c == '4') {
      sensorBools ^= 0b00001000;
    } else if (c == '5') {
      sensorBools ^= 0b00010000;
    } else if (c == '6') {
      sensorBools ^= 0b00100000;
    } else if (c == '7') {
      sensorBools ^= 0b01000000;
    } else if (c == '8') {
      sensorBools ^= 0b10000000;
    }
  }
}

void debug_sensors() {
  char buf[3];
  uint16_t buf1;
  uint8_t buf2 = 0, count = 0;

  Serial.print("sen:");
  for (int i = 0; i < 8; i++) {
    buf1 = sensorValues[i];
    buf2 <<= 2;
    buf2 |= buf1 >> 8;

    sprintf(buf, "%02x", buf1 & 0xff);
    Serial.print(buf);
    if (++count == 4) {
      sprintf(buf, "%02x", buf2);
      Serial.print(buf);
      buf2 = count = 0;
    }
  }
  sprintf(buf, "-%02x", sensorBools);
  Serial.print(buf);
  Serial.println();
}
```
