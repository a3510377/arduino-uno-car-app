import { invoke } from '@tauri-apps/api';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { InvokeArgs } from '@tauri-apps/api/tauri';

export const invokeSerialPlugin = <E extends SerialPluginCommandNames>(
  name: E,
  options: ISerialPluginCommandOptions[E]
): Promise<ISerialPluginCommandResult[E]> => {
  return invoke(`plugin:serialport|${name}`, options as InvokeArgs);
};

export const availablePorts = (): Promise<IPortInfo[]> => {
  return invokeSerialPlugin('available_ports', {});
};

export const closeAllPort = (): Promise<null> => {
  return invokeSerialPlugin('close_all_port', {});
};

export class SerialPort {
  isOpen: boolean = false;
  settings: ISerialPortOptions;

  private events: {
    [K in keyof ISerialPortEvents]?: ((
      ...options: ISerialPortEvents[K]
    ) => void)[];
  } = {};
  private pluginEventUnListeners: Partial<IPluginEventUnListeners> = {};

  constructor(
    public readonly portName: string,
    options: Partial<ISerialPortOptions> = {}
  ) {
    this.settings = { baudRate: 115200, ...options };
  }

  async open(): Promise<null> {
    if (this.isOpen) {
      return null;
    }

    const result = await invokeSerialPlugin('connect_port', {
      portName: this.portName,
      ...this.settings,
    });
    this.isOpen = true;
    listen(`plugin:serialport:disconnect-${this.portName}`, async () => {
      this.isOpen = false;
      await this.close();
    });
    return result;
  }

  async startRead(size?: number, interval?: number): Promise<null> {
    await this._pluginReadEventRegister();
    return await invokeSerialPlugin('start_read_port', {
      portName: this.portName,
      size,
      interval,
    });
  }

  async stopRead(): Promise<null> {
    await invokeSerialPlugin('cancel_read_port', { portName: this.portName });
    this.cancelListen();
    return null;
  }

  async close(): Promise<null> {
    if (this.isOpen) {
      this.emit('close');
      await this.forceClose();
      this.isOpen = false;
    }
    return null;
  }

  async forceClose(): Promise<null> {
    await invokeSerialPlugin('close_port', {
      portName: this.portName,
    }).catch(console.debug);

    this.isOpen = false;
    this.cancelListen();
    return null;
  }

  addListener<K extends keyof ISerialPortEvents>(
    name: K,
    callback: (...options: ISerialPortEvents[K]) => void
  ): void {
    this.events[name] ||= [];
    this.events[name].push(callback);
  }

  removeListener<K extends keyof ISerialPortEvents>(
    name: K,
    callback: (...options: ISerialPortEvents[K]) => void
  ): void {
    const events = this.events[name];
    if (events) {
      const index = events.indexOf(callback);
      if (index !== -1) {
        events.splice(index, 1);
      }

      if (!events.length) {
        delete this.events[name];
      }
    }
  }

  removeAllListener(): void {
    this.events = {};
  }

  emit<K extends keyof ISerialPortEvents>(
    name: K,
    ...options: ISerialPortEvents[K]
  ): void {
    this.events[name]?.forEach((cb) => cb(...options));
  }

  cancelListen() {
    this.pluginEventUnListeners.bytesListen?.();
    this.pluginEventUnListeners.stringListen?.();
  }

  protected async _pluginReadEventRegister() {
    if (!this.pluginEventUnListeners.bytesListen) {
      this.pluginEventUnListeners.bytesListen = await listen<IReadData>(
        `plugin:serialport:read-${this.portName}`,
        ({ payload }) => {
          this.emit('received_bytes', new Uint8Array(payload.data));
        }
      );
    }

    if (!this.pluginEventUnListeners.stringListen) {
      this.pluginEventUnListeners.stringListen = await listen<IReadData>(
        `plugin:serialport:read-string-${this.portName}`,
        ({ payload }) => {
          this.emit(
            'data',
            new TextDecoder('utf-8').decode(new Uint8Array(payload.data))
          );
        }
      );
    }
  }
}

/* -------------------------------------------------------------------- */

export type FlowControlType = 'none' | 'software' | 'hardware';
export type DataBitsType = 5 | 6 | 7 | 8;
export type ParityType = 'none' | 'odd' | 'even';
export type StopBitsType = 1 | 2;

export interface ISerialPortEvents {
  data: [string];
  received_bytes: [Uint8Array];
  open: [];
  close: [];
}

export interface IPluginEventUnListeners {
  bytesListen: UnlistenFn;
  stringListen: UnlistenFn;
}

export interface IReadData {
  size: number;
  data: number[];
}

export interface ISerialPortOptions {
  baudRate?: number;
  dataBits?: DataBitsType;
  parity?: ParityType;
  stopBits?: StopBitsType;
  flowControl?: FlowControlType;
}

export interface IPortInfo {
  port_name: string;
  show_name: string;
  port_type: 'usb' | 'pci' | 'bluetooth' | 'unknown';
  manufacturer?: string;
  product?: string;
}

export type SerialPluginCommandNames = keyof ISerialPluginCommandOptions;

export interface ISerialPluginCommandOptions {
  available_ports: {};
  connect_port: ISerialPluginCommandConnectPortOption;
  start_read_port: ISerialPluginCommandStartReadPortOption;
  close_port: ISerialPluginCommandBasePortOption;
  close_all_port: {};
  cancel_read_port: ISerialPluginCommandBasePortOption;
}

export interface ISerialPluginCommandResult {
  available_ports: IPortInfo[];
  connect_port: null;
  start_read_port: null;
  close_port: null;
  close_all_port: null;
  cancel_read_port: null;
}

export interface ISerialPluginCommandBasePortOption {
  portName: string;
}

export interface ISerialPluginCommandConnectPortOption
  extends ISerialPortOptions,
    ISerialPluginCommandBasePortOption {}

export interface ISerialPluginCommandStartReadPortOption
  extends ISerialPluginCommandBasePortOption {
  size?: number;
  interval?: number;
}
