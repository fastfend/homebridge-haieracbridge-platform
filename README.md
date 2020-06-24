<span align="center">

# `homebridge-haieracbridge-platform`
<a href="https://www.npmjs.com/package/homebridge-haieracbridge-platform"><img title="npm version" src="https://badgen.net/npm/v/homebridge-haieracbridge-platform" ></a>
<a href="https://www.npmjs.com/package/homebridge-haieracbridge-platform"><img title="npm downloads" src="https://badgen.net/npm/dt/homebridge-haieracbridge-platform" ></a>
<a href="https://github.com/fastfend/HaierACBridge"><img title="made with" src="https://badgen.net/badge/made with/HaierACBridge/orange" ></a>
<a href="https://github.com/homebridge/homebridge"><img title="made for" src="https://badgen.net/badge/plugin for/homebridge/purple" ></a>
<a href="https://github.com/fastfend/homebridge-haieracbridge-platform/blob/master/LICENSE"><img title="license" src="https://badgen.net/badge/license/GPL-3/blue" ></a>


</span>

`homebridge-haieracbridge-platform` is plugin for homebridge which allows you to control Haier AC devices from HomeKit! It should work with all AC devices controlled by SmartAir2 app.

## Features

- HomeKit automation
- Automatic detection of Haier devices added in your SmartAir2 app
- Turn AC on / off
- Show temperature values
- Show relative humidity if AC supports it
- Set every available mode `COOL, HEAT, SMART, DRY, FAN`
- Control fan speed, even auto
- Ability to control swing mode in every axis
- Syncing values with AC's remote
- Ability to force health mode
- Ability to turn on\off option to enable fan mode
- Ability to turn on\off option to enable dry mode
- After disabling automatic fan speed plugin will restore previously set value
- Custom language options

## Drawbacks

To use this plugin you will need HaierACBridge app made by me. My solution requires having a dedicated Android device with app running in background in the same subnet as homebridge instance.
If you want to access devices directly please use [bstuff/haier-ac-remote](https://github.com/bstuff/haier-ac-remote/tree/master/packages/homebridge-haier-ac) instead.

## Installation

1. Download [HaierACBridge](https://github.com/fastfend/HaierACBridge) app
1. Install and login in HaierACBridge app
2. Get token and IP address from app
3. Install this plugin by running `npm install -g homebridge-haieracbridge-platform` or by finding it in homebridge-config-ui-x
4. Update your homebridge `config.json` (refer to config section) or configure plugin in homebridge-config-ui-x

> NOTE: This plugin is supported by `homebridge-config-ui-x` plugin

## Config

### Example config

```js
{
  "platform": "HaierACBridge",
  "ip": "192.168.0.1",
  "token": "nuxr2qNzdMb9OJX",
  "polling": 4,
  "useFanMode": true,
  "useDryMode": true,
  "healthModeType": "FORCE",
  "swingType": "BOTH",
  "lang": {
    "acdevice_name": "Klimatyzacja",
    "acdevice_fan": "Wentylator",
    "acdevice_fan_rightleft": "Prawo-Lewo",
    "acdevice_fan_updown": "Góra-Dół",
    "acdevice_healthmode": "Tryb zdrowia",
    "acdevice_drymode": "Tryb suszenia"
  }
}
```

### Values

<span align="center">

|      Option      |        Available values         | Required |                                                                                                             Meaning                                                                                                             |
| :--------------: | :-----------------------------: | :------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|       `ip`       |           ipv4 value            |   yes    |                                                                                           IP address displayed in Android Bridge app                                                                                            |
|     `token`      |       15 character string       |   yes    |                                                                                              Token generated by Android Bridge app                                                                                              |
|    `polling`     |      integer from 1 to 60       |   yes    |                                                                                                   Polling interval in seconds                                                                                                   |
|   `useFanMode`   |             boolean             |   yes    |                                                               When enabled, turning on Fan first in Home app, when AC is turned off, will set Fan mode on device                                                                |
|   `useDryMode`   |             boolean             |   yes    |                                                                             When enabled, switch controlling Dry Mode will appear within accessory                                                                              |
| `healthModeType` |   "SHOW" or "FORCE" or "OFF"    |   yes    | When 'Show' is selected, switch controlling Health Mode will appear within accessory. When 'Force' is selected, switch controlling Health Mode will NOT appear within accessory, but instead Health Mode will be always enabled |
|   `swingType`    | "BOTH" or "INDIVIDUAL" or "OFF" |   yes    |                 When 'Individual' is selected, both switches controlling Up-Down swing and Right-Left will appear within accessory.\n When 'Both' is selected, fan accessory will have oscillate option instead                 |
|      `lang`      |             object              |    no    |                                                                                           Language settings (refer to lang settings)                                                                                            |

</span>

### Lang values

<span align="center">

|         Option         | Available values | Required |               Meaning                |
| :--------------------: | :--------------: | :------: | :----------------------------------: |
|     acdevice_name      |      string      |    no    |        Base name of accessory        |
|      acdevice_fan      |      string      |    no    |       Name of fan subaccessory       |
| acdevice_fan_rightleft |      string      |    no    | Name of RightLeft Swing subaccessory |
|  acdevice_fan_updown   |      string      |    no    |  Name of UpDown Swing subaccessory   |
|  acdevice_healthmode   |      string      |    no    |   Name of Health Mode subaccessory   |
|    acdevice_drymode    |      string      |    no    |    Name of Dry Mode subaccessory     |

</span>

## FAQ

### How to turn on FAN mode

Remember that you need `useFanMode` enabled to use that functionality.
To enable fan mode, first make sure that AC is turned off (Target mode = Off). After that set desired speed on Fan accessory. AC should turn on in FAN mode

### How forcing health mode works

When `healthModeType` is set to `FORCE`, every time some action is being made plugin enables health mode in AC.

> Note: You can still disable this mode on remote, but after using HomeKit it will be set back to enabled.

### After setting new language values in config HomeKit don't show changes

Make sure you set desired language values BEFORE starting plugin for the first time or BEFORE adding new device in SmartAir2.

## 100% working Haier AC models

- AS25S2SF1FA-BC
