import { diffJson } from 'diff';
import { Ref, ref, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';

import {
  availablePorts,
  IPortInfo,
  ISerialPortEvents,
  ISerialPortOptions,
  SerialPort,
} from './serial';
import { parseSensorADCPacket } from './string';

export const useAvailablePorts = (interval: number = 1000) => {
  const ports = ref<Record<string, IPortInfo>>({});
  const update = async () => {
    const newPorts = await availablePorts().catch((e) => {
      console.error(e);
      return [];
    });

    if (diffJson(Object.values(ports.value), newPorts).length - 1) {
      const newPortsCache: Record<string, IPortInfo> = {};
      newPorts.forEach((value) => (newPortsCache[value.port_name] = value));

      ports.value = newPortsCache;
    }
  };

  const pausable = useIntervalFn(update, interval, { immediate: true });

  return { ports, pausable, forceUpdate: update };
};

export class PortUse extends SerialPort<IPortUseEvents> {
  portName: Ref<string | undefined> = ref<string>();
  currentPort: Ref<SerialPort<IPortUseEvents> | undefined> =
    ref<SerialPort<IPortUseEvents>>();
  connected: Ref<boolean> = ref<boolean>(false);
  connecting: Ref<boolean> = ref<boolean>(false);
  lines: Ref<ILine[]> = ref<ILine[]>([]);
  binValue: Ref<number> = ref<number>(0);
  sensorADCData: Ref<number[]> = ref<number[]>(
    Array.from({ length: 8 }, () => 0)
  );
  valueData: Ref<{ [key: string]: string }> = ref<{ [key: string]: string }>(
    {}
  );

  constructor(options?: ISerialPortOptions) {
    super('', options);

    watch(this.portName, async (portName) => {
      this.connected.value = false;
      this.connecting.value = false;

      if (portName) this.serialPortName = portName;

      await this.forceClose();
    });
    this.setup();
  }

  setup() {
    const MAX_LINES = 500;
    let buf: string = '';
    let lastLineIndex: number = -1;

    const pushLine = (text: string, updateLastIndex: boolean = true) => {
      if (this.lines.value.length >= MAX_LINES) {
        this.lines.value.shift();

        if (lastLineIndex !== -1 && ++lastLineIndex >= MAX_LINES) {
          lastLineIndex = MAX_LINES - 1;
        }
      }
      const index = this.lines.value.push({
        line: text,
        timestamp: new Date(),
      });
      this.emit('new_line', text);

      if (updateLastIndex) {
        lastLineIndex = index;
      }
    };
    const updateLastLine = (line: string, clear: boolean = true) => {
      this.lines.value[lastLineIndex - 1].line = line;

      if (clear) lastLineIndex = -1;
    };

    this.on('data', (data) => {
      buf += data.toString();
      const lines = buf.split('\n');

      if (lines.length > 1) {
        if (buf && lastLineIndex !== -1) updateLastLine(buf.split('\n')[0]);

        buf = lines.pop() ?? '';

        for (let [i, line] of Object.entries(lines)) {
          line = line.trim();
          console.log('[readLoop]', line);
          if (line.startsWith('sen:')) {
            const match = line.match(/sen:([a-zA-Z0-9]{20})-([a-zA-Z0-9]{2})/);
            if (match) {
              const [_, adc, bool] = match;
              this.binValue.value = parseInt(bool, 16);
              this.sensorADCData.value = parseSensorADCPacket(adc);
            }
          } else if (line.startsWith('value:')) {
            // value:<name>:<value>
            const [_, name, ...values] = line.split(':');
            const value = values.join(':');

            console.log('[value]', name, value);
            this.emit('value', name, value);
            this.valueData.value[name] = value;
          } else if (line.startsWith('alert:')) {
            this.emit('alert', line.slice(6));
          } else {
            const match = line.match(/^alert(?:-(?<custom>[a-zA-Z0-9-_]+))?$/)
              ?.groups?.custom;
            if (match) {
              this.emit('alert_play', match);
            }
          }

          if (i !== '0') pushLine(line, false);
          else if (lastLineIndex !== -1) updateLastLine(line);
        }

        if (buf) {
          pushLine(buf);
        }
      } else {
        if (lastLineIndex !== -1) updateLastLine(buf, false);
        else pushLine(buf);
      }
    }).on('open', () => {
      this.valueData.value = {};
    });
  }

  async connect() {
    this.connected.value = false;
    this.connecting.value = true;

    await this.forceClose();
    await this.open()
      .then(() => {
        this.connected.value = true;
      })
      .catch((e) => {
        this.connected.value = false;
        console.log(e);
      });

    this.connecting.value = false;
  }

  async open(): Promise<null> {
    const result = await super.open();
    await this.startRead(512, 10).catch((e) => console.log(e));

    return result;
  }

  async close() {
    const result = await super.close();
    this.connected.value = false;
    return result;
  }
}

export interface IPortUseEvents extends ISerialPortEvents {
  alert: [message: string];
  alert_play: [id: string];
  value: [name: string, value: string];
  sensor: [data: number[], bool: number];
  new_line: [text: string];
}

export interface ILine {
  timestamp: Date;
  line: string;
  type?: string;
}
