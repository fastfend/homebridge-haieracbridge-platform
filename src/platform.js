const pluginName = "homebridge-haieracbridge-platform";
const platformName = "HaierACBridge";

const restApi = require("./api");
const HaierAccessory = require("./accessory");

let HaierACDevicesList = [];

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  return HaierACBridge;
};

function HaierACBridge(log, config, api) {
  if (!api || !config) return;

  // HB
  this.log = log;
  this.log("Hello! Started loading procedure...");
  this.accessories = [];
  this.config = config;

  this.config.polling = this.config.polling * 1000 || 5000;
  if (
    this.config.ip == undefined ||
    this.config.ip == null ||
    this.config.ip == ""
  ) {
    throw new Error("You must provide IP from HaierACBridge Android app");
  }
  if (
    this.config.token == undefined ||
    this.config.token == null ||
    this.config.token == ""
  ) {
    throw new Error("You must provide token from HaierACBridge Android app");
  }

  if (
    this.config.polling == undefined ||
    this.config.polling == null ||
    this.config.polling == ""
  ) {
    throw new Error("You must provide polling in config");
  }

  if (this.config.useFanMode != false && this.config.useFanMode != true) {
    throw new Error("Incorrect useFanMode in config");
  }

  if (this.config.useDryMode != false && this.config.useDryMode != true) {
    throw new Error("Incorrect useDryMode in config");
  }

  if (
    this.config.healthModeType != "SHOW" &&
    this.config.healthModeType != "OFF" &&
    this.config.healthModeType != "FORCE"
  ) {
    throw new Error("Incorrect healthModeType in config");
  }

  if (
    this.config.swingType != "INDIVIDUAL" &&
    this.config.swingType != "OFF" &&
    this.config.swingType != "BOTH"
  ) {
    throw new Error("Incorrect swingType in config");
  }

  if (typeof this.config.lang == "undefined" || !this.config.lang) {
    this.config.lang = {};
    this.config.lang.acdevice_name = "AC";
    this.config.lang.acdevice_fan = "Fan";
    this.config.lang.acdevice_fan_rightleft = "RightLeft Swing";
    this.config.lang.acdevice_fan_updown = "UpDown Swing";
    this.config.lang.acdevice_healthmode = "Health Mode";
    this.config.lang.acdevice_drymode = "Dry Mode";
  } else {
    this.config.lang.acdevice_name =
      typeof this.config.lang.acdevice_name == "undefined" ||
      !this.config.lang.acdevice_name
        ? "AC"
        : this.config.lang.acdevice_name;

    this.config.lang.acdevice_fan =
      typeof this.config.lang.acdevice_fan == "undefined" ||
      !this.config.lang.acdevice_fan
        ? "Fan"
        : this.config.lang.acdevice_fan;

    this.config.lang.acdevice_fan_rightleft =
      typeof this.config.lang.acdevice_fan_rightleft == "undefined" ||
      !this.config.lang.acdevice_fan_rightleft
        ? "RightLeft Swing"
        : this.config.lang.acdevice_fan_rightleft;

    this.config.lang.acdevice_fan_updown =
      typeof this.config.lang.acdevice_fan_updown == "undefined" ||
      !this.config.lang.acdevice_fan_updown
        ? "UpDown Swing"
        : this.config.lang.acdevice_fan_updown;

    this.config.lang.acdevice_healthmode =
      typeof this.config.lang.acdevice_healthmode == "undefined" ||
      !this.config.lang.acdevice_healthmode
        ? "Health Mode"
        : this.config.lang.acdevice_healthmode;

    this.config.lang.acdevice_drymode =
      typeof this.config.lang.acdevice_drymode == "undefined" ||
      !this.config.lang.acdevice_drymode
        ? "Dry Mode"
        : this.config.lang.acdevice_drymode;
  }

  this.log.debug(this.config.lang);

  if (api) {
    if (api.version < 2.2) {
      throw new Error("Unexpected API version. Please update your homebridge!");
    }

    this.acApi = new restApi.RestAPI(this);
    this.api = api;
    this.api.on("didFinishLaunching", this._init.bind(this));
  }
}

HaierACBridge.prototype = {
  _init: function () {
    this.mainJob();
  },

  _wait: async function () {
    return new Promise((resolve) => setTimeout(resolve, this.config.polling));
  },

  mainJob: async function () {
    while (true) {
      await this.checkDevices();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.updateDevices();
      await this._wait();
    }
  },
  //Executed on loading from cache
  configureAccessory: function (accessory) {
    this.accessories.push(accessory);
    HaierACDevicesList.push(new HaierAccessory(this, accessory));
  },

  updateDevices: async function () {
    return new Promise((resolve) => {
      this.log("Updating devices data...");
      var done = 0;
      this.accessories.forEach((accessory) => {
        this.acApi.getDeviceData(accessory.context.data.id, (result, data) => {
          if (result == "OK") {
            this.log.debug("Updated " + accessory.context.data.id);
            this.setDeviceData(data);
          } else {
            if (result == "ECONNREFUSED") {
              this.setDeviceData(null, accessory.context.data.id);
              this.log(
                "ERROR: Couldn't connect to HaierAC Bridge. Check your IP settings in HomeBridge configuration"
              );
            }
          }
          done++;
          if (done == this.accessories.length) {
            resolve();
          }
        });
      });
    });
  },

  getDeviceFromListById: function (id) {
    return HaierACDevicesList.find(
      (accessory) => accessory.context.data.id == id
    );
  },

  setDeviceData: function (devicedata, id) {
    if (devicedata == null) {
      var accessory = this.getDeviceFromListById(id);
      accessory.context.data.currentTemperature = 0;
      accessory.stateManager.updateValues();
    } else {
      var accessory = this.getDeviceFromListById(devicedata.id);

      if (accessory != undefined && !accessory.lock) {
        accessory.context.data.powerState = devicedata.powerstate;
        accessory.context.data.currentTemperature = devicedata.temp;
        accessory.context.data.targetTemperature = devicedata.tempset;
        accessory.context.data.humidity = devicedata.humidity;
        accessory.context.data.targetMode = devicedata.mode;
        accessory.context.data.fanSpeed = devicedata.fanspeed;
        accessory.context.data.fanSafety = devicedata.safefan;
        accessory.context.data.swingUpDown = devicedata.swing_ud;
        accessory.context.data.swingRightLeft = devicedata.swing_rl;
        accessory.context.data.healthMode = devicedata.healthmode;

        accessory.stateManager.updateValues();
      } else {
        this.log.debug("Device " + devicedata.id + " locked!");
      }
    }
  },

  checkDevices: async function () {
    return new Promise((resolve) => {
      this.acApi.getDevices((result, data) => {
        if (result == "OK") {
          data = [data[4]];
          //data = [];
          this.addNonExistingDevices(data);
          this.removeNonExistingDevices(data);
        } else {
          if (result == "ECONNREFUSED") {
            this.log(
              "ERROR: Couldn't connect to HaierAC Bridge. Check your IP settings in HomeBridge configuration"
            );
          }
        }
        resolve();
      });
    });
  },
  addNonExistingDevices: function (devices) {
    this.log("Looking for devices to add...");
    var toAdd = [];

    for (var a = 0; a < devices.length; a++) {
      var device = devices[a];

      let exists = false;

      for (var b = 0; b < this.accessories.length; b++) {
        if (this.accessories[b].context.data.id == device.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        toAdd.push(device);
      }
    }
    if (toAdd.length > 0) {
      this.log("Found: " + toAdd.length);
      this.log.debug(
        "Device count before action in DeviceList: " + HaierACDevicesList.length
      );
      toAdd.forEach((element) => {
        this.addDevice(element);
      });
      this.log.debug(
        "Device count after action in DeviceList: " + HaierACDevicesList.length
      );
    } else {
      this.log("No devices to add found");
    }
  },
  removeNonExistingDevices: function (devices) {
    this.log("Looking for devices to remove...");
    var toRemove = [];

    for (var a = 0; a < this.accessories.length; a++) {
      var accessory = this.accessories[a];
      var exists = false;
      for (var b = 0; b < devices.length; b++) {
        var device = devices[b];
        if (accessory.context.data.id == device.id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        toRemove.push(accessory);
      }
    }

    if (toRemove.length > 0) {
      this.log("Found: " + toRemove.length);
      this.log.debug(
        "Device count before action in DeviceList: " + HaierACDevicesList.length
      );
      toRemove.forEach((element) => {
        this.removeDevice(element);
      });
      this.log.debug(
        "Device count after action in DeviceList: " + HaierACDevicesList.length
      );
    } else {
      this.log("No devices to remove found");
    }
  },
  addDevice: function (device) {
    const uuid = this.api.hap.uuid.generate(device.id);
    if (
      !this.accessories.find((cachedaccessory) => cachedaccessory.UUID === uuid)
    ) {
      const uuid = this.api.hap.uuid.generate(device.id);
      const accessoryBase = new this.api.platformAccessory(
        this.config.lang.acdevice_name + " " + device.name,
        uuid
      );
      const accessory = new HaierAccessory(this, accessoryBase, device);
      HaierACDevicesList.push(accessory);
      this.log("Registering: " + device.name + "(" + device.id + ")");
      this.api.registerPlatformAccessories("HaierAccessory", "HaierACBridge", [
        accessory.getAccessory(),
      ]);
    }
  },
  removeDevice: function (accessory) {
    this.log(
      "Unregistering: " +
        accessory.context.data.name +
        "(" +
        accessory.context.data.id +
        ")"
    );
    this.api.unregisterPlatformAccessories("HaierAccessory", "HaierACBridge", [
      accessory,
    ]);
    HaierACDevicesList = this.arrayRemove(
      HaierACDevicesList,
      HaierACDevicesList.find(
        (element) => element.context.data.id == accessory.context.data.id
      )
    );
  },
  arrayRemove: function (arr, value) {
    return arr.filter(function (ele) {
      return ele != value;
    });
  },
};
