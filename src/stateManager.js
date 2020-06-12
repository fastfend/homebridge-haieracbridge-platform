var Service, Characteristic;

function getFunctionName(fun) {
  let val = fun.toString();
  val = val.substr("function ".length);
  val = val.substr(0, val.indexOf("("));
  return val;
}

class StateManager {
  constructor(platform, accessory, services) {
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    this.platform = platform;
    this.log = platform.log;
    this.config = platform.config;
    this.accessory = accessory;
    this.data = this.accessory.context.data;
    this.services = services;
  }

  updateDevice(callback) {
    var datapackage = {
      powerstate: this.data.powerState,
      mode: this.data.targetMode,
      tempset: this.data.targetTemperature,
      fanspeed: this.data.fanSpeed,
      swing_rl: this.data.swingRightLeft,
      swing_ud: this.data.swingUpDown,
      healthmode: this.data.healthMode,
    };

    this.log("Sending datapackage: ");
    this.log(datapackage);

    this.platform.acApi.setDeviceData(
      this.data.id,
      datapackage,
      (result, data) => {
        callback(result);
      }
    );
  }

  updateValues(valueName) {
    var isOnline = this.getIsOnline();

    //AC acService
    this.services.acService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(
        isOnline
          ? this.getCurrentHeatingCoolingState()
          : new Error("Device offline")
      );

    if (valueName != "getTargetHeatingCoolingState") {
      this.services.acService
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(
          isOnline
            ? this.getTargetHeatingCoolingState()
            : new Error("Device offline")
        );
    }

    this.services.acService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(
        isOnline ? this.getCurrentTemperature() : new Error("Device offline")
      );

    if (valueName != "getTargetTemperature") {
      this.services.acService
        .getCharacteristic(Characteristic.TargetTemperature)
        .updateValue(
          isOnline ? this.getTargetTemperature() : new Error("Device offline")
        );
    }

    this.services.acService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(
        isOnline
          ? this.getCurrentRelativeHumidity()
          : new Error("Device offline")
      );

    //FAN fanService
    if (valueName != "getTargetFanState") {
      this.services.fanService
        .getCharacteristic(Characteristic.TargetFanState)
        .updateValue(
          isOnline ? this.getTargetFanState() : new Error("Device offline")
        );
    }

    if (valueName != "getRotationSpeed") {
      this.services.fanService
        .getCharacteristic(Characteristic.RotationSpeed)
        .updateValue(
          isOnline ? this.getRotationSpeed() : new Error("Device offline")
        );
    }

    if (valueName != "getActive") {
      this.services.fanService
        .getCharacteristic(Characteristic.Active)
        .updateValue(isOnline ? this.getActive() : new Error("Device offline"));
    }

    //HEALTH
    if (valueName != "getHealthMode") {
      this.services.healthService
        .getCharacteristic(Characteristic.On)
        .updateValue(
          isOnline ? this.getHealthMode() : new Error("Device offline")
        );
    }

    //SWING RL
    if (valueName != "getSwingRightLeft") {
      this.services.swingRightLeftService
        .getCharacteristic(Characteristic.On)
        .updateValue(
          isOnline ? this.getSwingRightLeft() : new Error("Device offline")
        );
    }

    //SWING UD
    if (valueName != "getSwingUpDown") {
      this.services.swingUpDownService
        .getCharacteristic(Characteristic.On)
        .updateValue(
          isOnline ? this.getSwingUpDown() : new Error("Device offline")
        );
    }

    //DRYMODE
    if (valueName != "getDryMode") {
      if (this.platform.config.useDryMode) {
        this.services.dryModeService
          .getCharacteristic(Characteristic.On)
          .updateValue(
            isOnline ? this.getDryMode() : new Error("Device offline")
          );
      }
    }
  }

  getIsOnline() {
    return this.data.currentTemperature != 0;
  }

  getCurrentHeatingCoolingState() {
    let currentTemperature = this.data.currentTemperature;
    let targetTemperature = this.data.targetTemperature;
    let targetMode = this.data.targetMode;
    let powerState = this.data.powerState;

    if (powerState == false) {
      return Characteristic.CurrentHeatingCoolingState.OFF;
    } else if (targetMode == "SMART") {
      if (currentTemperature == targetTemperature) {
        return Characteristic.CurrentHeatingCoolingState.OFF;
      } else if (currentTemperature > targetTemperature) {
        return Characteristic.CurrentHeatingCoolingState.COOL;
      } else if (currentTemperature < targetTemperature) {
        return Characteristic.CurrentHeatingCoolingState.HEAT;
      }
    } else if (targetMode == "HEAT") {
      return Characteristic.CurrentHeatingCoolingState.HEAT;
    } else if (targetMode == "COOL") {
      return Characteristic.CurrentHeatingCoolingState.COOL;
    } else {
      return Characteristic.CurrentHeatingCoolingState.OFF;
    }
  }

  getTargetHeatingCoolingState() {
    let targetMode = this.data.targetMode;
    let powerState = this.data.powerState;

    if (powerState == false || targetMode == "FAN" || targetMode == "DRY") {
      return Characteristic.TargetHeatingCoolingState.OFF;
    } else if (targetMode == "COOL") {
      return Characteristic.TargetHeatingCoolingState.COOL;
    } else if (targetMode == "HEAT") {
      return Characteristic.TargetHeatingCoolingState.HEAT;
    } else if (targetMode == "SMART") {
      return Characteristic.TargetHeatingCoolingState.AUTO;
    }
  }

  setTargetHeatingCoolingState(value) {
    if (!this.targetHeatingCoolingLock) {
      switch (value) {
        case Characteristic.TargetHeatingCoolingState.OFF:
          if (this.data.powerState == true) {
            this.targetFanLock = true;
          }
          this.data.powerState = false;
          break;
        case Characteristic.TargetHeatingCoolingState.COOL:
          if (this.data.powerState == false) {
            this.targetFanLock = true;
          }
          this.data.powerState = true;
          this.data.targetMode = "COOL";
          break;
        case Characteristic.TargetHeatingCoolingState.HEAT:
          if (this.data.powerState == false) {
            this.targetFanLock = true;
          }
          this.data.powerState = true;
          this.data.targetMode = "HEAT";
          break;
        case Characteristic.TargetHeatingCoolingState.AUTO:
          if (this.data.powerState == false) {
            this.targetFanLock = true;
          }
          this.data.powerState = true;
          this.data.targetMode = "SMART";
          break;
      }

      this.updateValues("setTargetHeatingCoolingState");
    } else {
      this.targetHeatingCoolingLock = false;
      this.log.debug("Unlocked TargetHeatingCoolingState setter");
    }
  }

  getCurrentTemperature() {
    let currentTemperature = this.data.currentTemperature;
    return currentTemperature;
  }

  getTargetTemperature() {
    let targetTemperature = this.data.targetTemperature;
    return targetTemperature;
  }

  setTargetTemperature(value) {
    this.data.targetTemperature = value;
    this.updateValues("setTargetTemperature");
  }

  getCurrentRelativeHumidity() {
    let humidity = this.data.humidity;
    return humidity;
  }

  getTargetFanState() {
    let fanSpeed = this.data.fanSpeed;
    let powerState = this.data.powerState;

    if (fanSpeed == "AUTO" && powerState == true) {
      return Characteristic.TargetFanState.AUTO;
    } else {
      return Characteristic.TargetFanState.MANUAL;
    }
  }

  setTargetFanState(value) {
    if (!this.targetFanLock) {
      let powerState = this.data.powerState;
      let targetMode = this.data.targetMode;

      if (targetMode == "FAN") {
        this.updateValues("setTargetFanState");
        return;
      } else {
        if (value) {
          if (!powerState) {
            this.data.powerState = true;
          }
          this.data.lastFanSpeed = this.data.fanSpeed;
          this.data.fanSpeed = "AUTO";
        } else {
          if (this.data.lastFanSpeed == "AUTO") {
            this.data.fanSpeed = "MID";
          } else {
            this.data.fanSpeed = this.data.lastFanSpeed;
          }
        }
        this.updateValues("setTargetFanState");
      }
    } else {
      this.targetFanLock = false;
      this.log.debug("Unlocked targetFanState setter");
    }
  }

  getRotationSpeed() {
    let fanSpeed = this.data.fanSpeed;
    let powerState = this.data.powerState;

    if (powerState == false) {
      return 0;
    } else if (fanSpeed == "LOW") {
      return 100 / 3;
    } else if (fanSpeed == "MID") {
      return (100 / 3) * 2;
    } else if (fanSpeed == "HIGH" || fanSpeed == "AUTO") {
      return 100;
    }
  }

  setRotationSpeed(value) {
    let powerState = this.data.powerState;

    if (value >= (100 / 3) * 2) {
      this.data.fanSpeed = "HIGH";
    } else if (value < (100 / 3) * 2 && value >= 100 / 3) {
      this.data.fanSpeed = "MID";
    } else if (value < 100 / 3 && value > 0) {
      this.data.fanSpeed = "LOW";
    } else if (value == 0) {
      if (powerState) {
        this.data.powerState = false;
      }
    }

    this.updateValues("setRotationSpeed");
  }

  getActive() {
    let powerState = this.data.powerState;
    if (powerState) {
      return Characteristic.Active.ACTIVE;
    } else {
      return Characteristic.Active.INACTIVE;
    }
  }

  setActive(value) {
    let powerState = this.data.powerState;
    if (powerState == false) {
      this.data.powerState = true;
      if (this.config.useFanMode) {
        this.data.targetMode = "FAN";
      }
    }

    if (value) {
      if (!powerState) {
        this.data.powerState = true;
      }
    } else {
      if (powerState) {
        this.data.powerState = false;
      }
    }
  }

  getHealthMode() {
    let healthMode = this.data.healthMode;
    let powerState = this.data.powerState;
    if (powerState) {
      return healthMode;
    } else {
      return false;
    }
  }

  setHealthMode(value) {
    let powerState = this.data.powerState;
    if (powerState) {
      this.data.healthMode = value;
    }
    this.updateValues("setHealthMode");
  }

  getSwingRightLeft() {
    let swingRightLeft = this.data.swingRightLeft;
    let powerState = this.data.powerState;
    if (powerState) {
      return swingRightLeft;
    } else {
      return false;
    }
  }

  setSwingRightLeft(value) {
    let powerState = this.data.powerState;
    if (powerState) {
      this.data.swingRightLeft = value;
    }
    this.updateValues("setSwingRightLeft");
  }

  getSwingUpDown() {
    let swingUpDown = this.data.swingUpDown;
    let powerState = this.data.powerState;
    if (powerState) {
      return swingUpDown;
    } else {
      return false;
    }
  }

  setSwingUpDown(value) {
    let powerState = this.data.powerState;
    if (powerState) {
      this.data.swingUpDown = value;
    }
    this.updateValues("setSwingUpDown");
  }

  getDryMode() {
    let targetMode = this.data.targetMode;
    let powerState = this.data.powerState;

    if (powerState) {
      return targetMode == "DRY";
    } else {
      return false;
    }
  }

  setDryMode(value) {
    if (value) {
      this.data.lastPowerState = this.data.powerState;
      this.data.powerState = true;
      this.data.lastTargetMode = this.data.targetMode;
      this.data.targetMode = "DRY";
      this.targetHeatingCoolingLock = true;
      this.targetFanLock = true;
    } else {
      this.data.targetMode = this.data.lastTargetMode;
      if (!this.data.lastPowerState) {
        this.data.powerState = false;
        this.data.lastPowerState = this.data.powerState;
      }
    }
    this.updateValues("setDryMode");
  }
}

module.exports = StateManager;
