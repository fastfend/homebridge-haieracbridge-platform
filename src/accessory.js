const StateManager = require("./stateManager");

var Service, Characteristic;

class HaierAccessory {
  constructor(platform, accessory, device) {
    Service = platform.api.hap.Service;
    Characteristic = platform.api.hap.Characteristic;

    this.platform = platform;
    this.log = platform.log;
    this.api = platform.api;

    this.lock = false;

    this.accessory = accessory;
    this.context = this.accessory.context;
    if (typeof device == "object") {
      this.context.data = {
        id: device.id,
        name: device.name,
        base_name: this.platform.config.lang.acdevice_name,
        base_fan: this.platform.config.lang.acdevice_fan,
        base_fan_rl: this.platform.config.lang.acdevice_fan_rightleft,
        base_fan_ud: this.platform.config.lang.acdevice_fan_updown,
        base_healthmode: this.platform.config.lang.acdevice_healthmode,
        base_drymode: this.platform.config.lang.acdevice_drymode,
        online: false,
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

    this.stateManager = new StateManager(platform, accessory, this);

    //AC
    this.acService = accessory.getService(Service.Thermostat);
    if (!this.acService) {
      this.acService = accessory.addService(
        Service.Thermostat,
        this.context.data.base_name
      );
    }
    this.setupACService(this.acService);

    //FAN
    this.fanService = accessory.getService(Service.Fanv2);
    if (!this.fanService) {
      this.fanService = accessory.addService(
        Service.Fanv2,
        this.context.data.base_fan
      );
    }
    this.setupFanService(this.fanService);

    if (this.platform.config.swingType == "INDIVIDUAL") {
      //FANLEFTRIGHT
      this.swingRightLeftService = accessory.getService(
        this.context.data.base_fan_rl
      );
      if (!this.swingRightLeftService) {
        this.swingRightLeftService = accessory.addService(
          Service.Switch,
          this.context.data.base_fan_rl,
          "RL"
        );
      }
      this.setupSwingRightLeftService(this.swingRightLeftService);

      //FANUPDOWN
      this.swingUpDownService = accessory.getService(
        this.context.data.base_fan_ud
      );
      if (!this.swingUpDownService) {
        this.swingUpDownService = accessory.addService(
          Service.Switch,
          this.context.data.base_fan_ud,
          "UD"
        );
      }
      this.setupSwingUpDownService(this.swingUpDownService);
    } else {
      this.swingRightLeftService = accessory.getService(
        this.context.data.base_fan_rl
      );
      this.swingUpDownService = accessory.getService(
        this.context.data.base_fan_ud
      );

      if (this.swingRightLeftService) {
        accessory.removeService(this.swingRightLeftService);
      }

      if (this.swingUpDownService) {
        accessory.removeService(this.swingUpDownService);
      }
    }

    //HEALTH
    if (this.platform.config.healthModeType == "SHOW") {
      this.healthService = accessory.getService(
        this.context.data.base_healthmode
      );
      if (!this.healthService) {
        this.healthService = accessory.addService(
          Service.Switch,
          this.context.data.base_healthmode,
          "H"
        );
      }
      this.setupHealthService(this.healthService);
    } else {
      this.healthService = accessory.getService(
        this.context.data.base_healthmode
      );
      if (this.healthService) {
        accessory.removeService(this.healthService);
      }
    }

    //DRYMODE
    if (this.platform.config.useDryMode) {
      this.dryModeService = accessory.getService(
        this.context.data.base_drymode
      );
      if (!this.dryModeService) {
        this.dryModeService = accessory.addService(
          Service.Switch,
          this.context.data.base_drymode,
          "D"
        );
      }
      this.setupDryModeService(this.dryModeService);
    } else {
      this.dryModeService = accessory.getService(
        this.context.data.base_drymode
      );
      if (this.dryModeService) {
        accessory.removeService(this.dryModeService);
      }
    }

    //INFO
    this.informationService = accessory.getService(
      Service.AccessoryInformation
    );
    if (!this.informationService) {
      this.informationService = accessory.addService(
        Service.AccessoryInformation,
        this.context.data.base_name + " " + this.context.data.name
      );
    }
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Haier")
      .setCharacteristic(Characteristic.Model, "HaierAC")
      .setCharacteristic(Characteristic.SerialNumber, this.context.data.id)
      .setCharacteristic(
        Characteristic.Name,
        this.context.data.base_name + " " + this.context.data.name
      );
  }

  unlockUpdates() {
    setTimeout(() => {
      this.lock = false;
    }, 2000);
  }

  lockUpdates() {
    this.lock = true;
  }

  getAccessory() {
    return this.accessory;
  }

  setupDryModeService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setDryMode(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });
  }

  setupHealthService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setHealthMode(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });
  }

  setupSwingRightLeftService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setSwingRightLeft(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });
  }

  setupSwingUpDownService(service) {
    service
      .getCharacteristic(Characteristic.On)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setSwingUpDown(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });
  }

  // AC SERVICE
  setupACService(service) {
    service
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .updateValue(this.stateManager.getCurrentHeatingCoolingState());

    service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setTargetHeatingCoolingState(value); //Add no change protection
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(this.stateManager.getCurrentTemperature());

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: 16,
        maxValue: 30,
        minStep: 1,
      })
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setTargetTemperature(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });

    service
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .updateValue(this.stateManager.getCurrentRelativeHumidity());
  }

  setupFanService(service) {
    service
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 33.333,
      })
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setRotationSpeed(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });

    service
      .getCharacteristic(Characteristic.TargetFanState)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setTargetFanState(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });

    service
      .getCharacteristic(Characteristic.Active)
      .on("set", (value, callback) => {
        this.lockUpdates();
        this.stateManager.setActive(value);
        this.stateManager.updateDevice(() => {
          callback();
          this.unlockUpdates();
        });
      });

    if (this.platform.config.swingType == "BOTH") {
      service
        .getCharacteristic(Characteristic.SwingMode)
        .on("set", (value, callback) => {
          this.lockUpdates();
          this.stateManager.setSwingMode(value);
          this.stateManager.updateDevice(() => {
            callback();
            this.unlockUpdates();
          });
        });
    }
  }
}

module.exports = HaierAccessory;
