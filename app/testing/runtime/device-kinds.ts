import type { RuntimeDeviceKind } from "./types";

type DeviceKindRule = {
  deviceKind: RuntimeDeviceKind;
  keys?: string[];
  prefixes?: string[];
};

const deviceKindRules: DeviceKindRule[] = [
  { deviceKind: "switchSelector", keys: ["button.switchSelector"] },
  { deviceKind: "lineblock", keys: ["button.lineblock"] },
  { deviceKind: "shuntingSignal", prefixes: ["signal.shunt"] },
  { deviceKind: "signal", prefixes: ["signal."] },
  { deviceKind: "occupancySensor", prefixes: ["track."] },
  {
    deviceKind: "routeTrigger",
    keys: [
      "signal.premain",
      "signal.premain.noocp",
      "button.departure",
      "button.shunt",
      "button.shunt.noocp",
      "button.shuntBufferSignal",
    ],
  },
];

export function getRuntimeDeviceKinds(pieceKey: string): RuntimeDeviceKind[] {
  const matches = deviceKindRules.flatMap((rule) => {
    if (rule.keys?.includes(pieceKey)) {
      return [rule.deviceKind];
    }

    if (rule.prefixes?.some((prefix) => pieceKey.startsWith(prefix))) {
      return [rule.deviceKind];
    }

    return [];
  });

  return matches.length > 0 ? matches : ["other"];
}
