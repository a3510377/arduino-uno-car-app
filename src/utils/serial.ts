import { invoke } from '@tauri-apps/api';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { InvokeArgs } from '@tauri-apps/api/tauri';
import { EventEmitter, IBaseEvent } from './event';

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

export class SerialPort<
  EV extends ISerialPortEvents = ISerialPortEvents
> extends EventEmitter<EV> {
  isOpen: boolean = false;
  protected reading: boolean = false;
  protected serialPortName: string;
  protected settings: ISerialPortOptions;
  protected readConfig?: { size?: number; interval?: number };

  protected pluginEventUnListeners: Partial<IPluginEventUnListeners> = {};

  constructor(portName: string, options: Partial<ISerialPortOptions> = {}) {
    super();
    this.settings = { baudRate: 115200, ...options };
    this.serialPortName = portName;
  }

  async open(): Promise<null> {
    if (this.isOpen) {
      return null;
    }

    const result = await invokeSerialPlugin('connect_port', {
      portName: this.serialPortName,
      ...this.settings,
    });

    this.isOpen = true;
    listen(`plugin:serialport:disconnect-${this.serialPortName}`, async () => {
      this.isOpen = false;
      await this.close();
    });

    if (this.readConfig) {
      const { size, interval } = this.readConfig;

      await this.startRead(size, interval);
    }

    this.emit('open');
    return result;
  }

  async startRead(size?: number, interval?: number): Promise<null> {
    this.readConfig = { size, interval };

    await this._pluginReadEventRegister();
    return await invokeSerialPlugin('start_read_port', {
      portName: this.serialPortName,
      size,
      interval,
    });
  }

  async stopRead(): Promise<null> {
    this.readConfig = undefined;

    await invokeSerialPlugin('cancel_read_port', {
      portName: this.serialPortName,
    });
    this.cancelListen();
    return null;
  }

  async close(): Promise<null> {
    await invokeSerialPlugin('close_port', {
      portName: this.serialPortName,
    }).catch(console.debug);

    this.isOpen = false;

    this.cancelListen();
    this.emit('close');

    return null;
  }

  async forceClose(): Promise<null> {
    this.close();
    this.readConfig = undefined;
    return null;
  }

  cancelListen() {
    this.reading = false;

    this.pluginEventUnListeners.bytesListen?.();
    this.pluginEventUnListeners.bytesListen = undefined;
    this.pluginEventUnListeners.stringListen?.();
    this.pluginEventUnListeners.stringListen = undefined;
  }

  async setPortName(portName: string) {
    this.serialPortName = portName;
    await this.forceClose();
    await this.open();
  }

  async setBaudRate(baudRate?: number) {
    this.settings.baudRate = baudRate;
    await this.close();
    await this.open();
  }

  async setDataBits(dataBits?: DataBitsType) {
    this.settings.dataBits = dataBits;
    await this.close();
    await this.open();
  }

  async setParity(parity?: ParityType) {
    this.settings.parity = parity;
    await this.close();
    await this.open();
  }

  async setStopBits(stopBits?: StopBitsType) {
    this.settings.stopBits = stopBits;
    await this.close();
    await this.open();
  }

  async setFlowControl(flowControl?: FlowControlType) {
    this.settings.flowControl = flowControl;
    await this.close();
    await this.open();
  }

  protected async _pluginReadEventRegister() {
    this.reading = true;

    if (!this.pluginEventUnListeners.bytesListen) {
      this.pluginEventUnListeners.bytesListen = await listen<IReadData>(
        `plugin:serialport:read-${this.serialPortName}`,
        ({ payload }) => {
          this.emit('received_bytes', new Uint8Array(payload.data));
        }
      );
    }

    if (!this.pluginEventUnListeners.stringListen) {
      this.pluginEventUnListeners.stringListen = await listen<IReadData>(
        `plugin:serialport:read-string-${this.serialPortName}`,
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

export interface ISerialPortEvents extends IBaseEvent {
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
