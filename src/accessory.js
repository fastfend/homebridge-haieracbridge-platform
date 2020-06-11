const StateManager = require("./stateManager");

var Service, Characteristic;

class HaierAccessory {
  constructor(platform, accessory, device) {
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    this.platform = platform;
    this.log = platform.log;
    this.api = platform.api;

    this.stateManager = new StateManager(platform, accessory, this);

    this.lock = false;

    this.accessory = accessory;
    this.context = this.accessory.context;
    if (device != undefined || device != null) {
      this.context.data = {
        id: device.id,
        name: device.name,
        powerState: false,
        lastPowerState: false,
        fanSpeed: "HIGH",
        targetMode: "COOL",
        lastTargetMode: "COOL",
        currentTemperature: 21,
        targetTemperature: 22,
        swingUpDown: false,
        swingRightLeft: false,
        healthMode: false,
        humidity: 40,
        fanSafety: false,
      };
    }

    //AC
    this.acService = accessory.getService(Service.Thermostat);
    if (!this.acService) {
      this.acService = accessory.addService(
        Service.Thermostat,
        this.platform.config.lang.acdevice_name
      );
    }
    this.setupACService(this.acService);

    //FAN
    this.fanService = accessory.getService(Service.Fanv2);
    if (!this.fanService) {
      this.fanService = accessory.addService(
        Service.Fanv2,
        this.platform.config.lang.acdevice_fan
      );
    }
    this.setupFanService(this.fanService);

    //FANLEFTRIGHT
    this.swingRightLeftService = accessory.getService(
      this.platform.config.lang.acdevice_fan_rightleft
    );
    if (!this.swingRightLeftService) {
      this.swingRightLeftService = accessory.addService(
        Service.Switch,
        this.platform.config.lang.acdevice_fan_rightleft,
        "LR"
      );
    }
    this.setupSwingRightLeftService(this.swingRightLeftService);

    //FANUPDOWN
    this.swingUpDownService = accessory.getService(
      this.platform.config.lang.acdevice_fan_updown
    );
    if (!this.swingUpDownService) {
      this.swingUpDownService = accessory.addService(
        Service.Switch,
        this.platform.config.lang.acdevice_fan_updown,
        "UD"
      );
    }
    this.setupSwingUpDownService(this.swingUpDownService);

    //HEALTH
    this.healthService = accessory.getService(
      this.platform.config.lang.acdevice_healthmode
    );
    if (!this.healthService) {
      this.healthService = accessory.addService(
        Service.Switch,
        this.platform.config.lang.acdevice_healthmode,
        "H"
      );
    }
    this.setupHealthService(this.healthService);

    //DRYMODE
    if (this.platform.config.useDryMode) {
      this.dryModeService = accessory.getService(
        this.platform.config.lang.acdevice_drymode
      );
      if (!this.dryModeService) {
        this.dryModeService = accessory.addService(
          Service.Switch,
          this.platform.config.lang.acdevice_drymode,
          "D"
        );
      }
      this.setupDryModeService(this.dryModeService);
    }

    //INFO
    this.informationService = accessory.getService(
      Service.AccessoryInformation
    );
    if (!this.informationService) {
      this.informationService = accessory.addService(
        Service.AccessoryInformation,
        this.platform.config.lang.acdevice_name + " " + this.context.data.name
      );
    }
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Haier")
      .setCharacteristic(Characteristic.Model, "HaierAC")
      .setCharacteristic(Characteristic.SerialNumber, this.context.data.id);

    accessory.on("identify", () => {
      this.log("Siema to ja!");
    });
  }

  getAccessory() {
    return this.accessory;
  }

  setupDryModeService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getDryMode());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setDryMode(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });
  }

  setupHealthService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getHealthMode());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setHealthMode(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });
  }

  setupSwingRightLeftService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getSwingRightLeft());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setSwingRightLeft(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });
  }

  setupSwingUpDownService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getSwingUpDown());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setSwingUpDown(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });
  }

  // AC SERVICE
  setupACService(service) {
    service
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getCurrentHeatingCoolingState());
        } else {
          callback("Device Offline", 0);
        }
      });

    service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getTargetHeatingCoolingState());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setTargetHeatingCoolingState(value); //Add no change protection
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getCurrentTemperature());
        } else {
          callback("Device Offline", 0);
        }
      });

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getTargetTemperature());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setTargetTemperature(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });

    service
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getCurrentRelativeHumidity());
        } else {
          callback("Device Offline", 0);
        }
      });
  }

  setupFanService(service) {
    service
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 33.333,
      })
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getRotationSpeed());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setRotationSpeed(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });

    service
      .getCharacteristic(Characteristic.TargetFanState)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getTargetFanState());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setTargetFanState(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });

    service
      .getCharacteristic(Characteristic.Active)
      .on("get", (callback) => {
        if (this.stateManager.getIsOnline()) {
          callback(null, this.stateManager.getTargetFanState());
        } else {
          callback("Device Offline", 0);
        }
      })
      .on("set", (value, callback) => {
        this.lock = true;
        this.stateManager.setActive(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.lock = false;
        });
      });
  }
}

module.exports = HaierAccessory;
