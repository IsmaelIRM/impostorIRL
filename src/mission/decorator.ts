import "reflect-metadata";

export interface MissionOptions {
  id: string;
  name?: string;
  isInteractive: boolean;
  scope?: "individual" | "global";
  endsGame?: boolean;
  weight?: number;
}

export function Mission(options: MissionOptions): ClassDecorator {
  return function(constructor: Function) {
    Reflect.defineMetadata("_missionMeta", options, constructor);
    constructor.prototype._missionMeta = options;
  };
}