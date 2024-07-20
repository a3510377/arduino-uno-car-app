export class EventEmitter<Events> implements EventEmitter<Events> {
  private _events: {
    [K in keyof Events]?: ((...args: Events[K]) => void)[];
  } = {};

  on<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this {
    if (!this._events[event]) {
      this._events[event] = [];
    }

    this._events[event].push(listener);
    return this;
  }

  addListener<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void,
    once: boolean = false
  ): this {
    if (once) {
      return this.once(event, listener);
    }
    return this.on(event, listener);
  }

  once<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this {
    const wrapper = (...args: Events[Event]) => {
      listener(...args);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
    return this;
  }

  off<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this {
    if (!this._events[event]) {
      return this;
    }

    const index = this._events[event].indexOf(listener);
    if (index !== -1) {
      this._events[event].splice(index, 1);
      if (this._events[event].length === 0) {
        delete this._events[event];
      }
    }

    return this;
  }

  removeListener<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this {
    return this.off(event, listener);
  }

  removeAllListeners<Event extends keyof Events>(event?: Event): this {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  emit<Event extends keyof Events>(
    event: Event,
    ...args: Events[Event]
  ): boolean {
    if (!this._events[event]) {
      return false;
    }

    this._events[event]?.forEach((l) => l(...args));
    return true;
  }
}

export interface EventEmitter<Events extends IBaseEvent> {
  on<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this;
  on<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    listener: (...args: any[]) => void
  ): this;

  addListener<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void,
    once?: boolean
  ): this;
  addListener<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    listener: (...args: any[]) => void,
    once?: boolean
  ): this;

  once<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this;
  once<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    listener: (...args: any[]) => void
  ): this;

  emit<Event extends keyof Events>(
    event: Event,
    ...args: Events[Event]
  ): boolean;
  emit<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    ...args: unknown[]
  ): boolean;

  off<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this;
  off<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    listener: (...args: any[]) => void
  ): this;

  removeListener<Event extends keyof Events>(
    event: Event,
    listener: (...args: Events[Event]) => void
  ): this;
  removeListener<Event extends string | symbol>(
    event: Exclude<Event, keyof Events>,
    listener: (...args: any[]) => void
  ): this;

  removeAllListeners<Event extends keyof Events>(event?: Event): this;
  removeAllListeners<Event extends string | symbol>(
    event?: Exclude<Event, keyof Events>
  ): this;
}

export interface IBaseEvent {
  [k: string | symbol]: unknown[];
}
