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

  this.config.debug = this.config.debug || false;
  if (
    this.config.ip == undefined ||
    this.config.ip == null ||
    this.config.ip == ""
  ) {
    this.log("You must provide IP from HaierACBridge Android app");
    return;
  }
  if (
    this.config.token == undefined ||
    this.config.token == null ||
    this.config.token == ""
  ) {
    this.log("You must provide token from HaierACBridge Android app");
    return;
  }

  if (
    this.config.polling == undefined ||
    this.config.polling == null ||
    this.config.polling == ""
  ) {
    this.log("You must provide polling in config");
    return;
  }

  if (this.config.useFanMode != false && this.config.useFanMode != true) {
    this.log("Incorrect useFanMode in config");
    return;
  }

  if (this.config.useDryMode != false && this.config.useDryMode != true) {
    this.log("Incorrect useDryMode in config");
    return;
  }

  if (
    this.config.healthModeType != "SHOW" &&
    this.config.healthModeType != "OFF" &&
    this.config.healthModeType != "FORCE"
  ) {
    this.log("Incorrect healthModeType in config");
    return;
  }

  if (
    this.config.swingType != "INDIVIDUAL" &&
    this.config.swingType != "OFF" &&
    this.config.swingType != "BOTH"
  ) {
    this.log("Incorrect swingType in config");
    return;
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
      this.log("Unexpected API version. Please update your homebridge!");
      return;
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
      if (this.accessories.length == 0) {
        resolve();
        return;
      }
      this.log("Updating devices data...");
      var done = 0;

      if (this.config.debug) {
        this.log("accessories: " + this.accessories.length);
      }

      for (var a = 0; a < this.accessories.length; a++) {
        var accessory = this.accessories[a];

        this.acApi.getDeviceData(accessory.context.data.id, (result, data) => {
          if (this.config.debug) {
            this.log("data:");
            this.log(data);
          }
          if (result == "OK") {
            this.log.debug("Updated " + accessory.context.data.id);
            this.setDeviceData(data);
          } else {
            this.setDeviceData(null, accessory.context.data.id);
            if (result == "BAD_TOKEN") {
              this.log("ERROR: Your token is incorrect");
            } else {
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
      }
    });
  },

  getDeviceFromListById: function (id) {
    return HaierACDevicesList.find(
      (accessory) => accessory.context.data.id == id
    );
  },

  setDeviceData: function (devicedata, id) {
    if (devicedata == null) {
      if (this.config.debug) {
        this.log("devicedata: null");
      }
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
        accessory.context.data.online = devicedata.online;

        accessory.stateManager.updateValues();
      } else {
        this.log.debug("Device " + devicedata.id + " locked!");
      }
    }
  },

  checkDevices: async function () {
    return new Promise((resolve) => {
      this.acApi.getDevices((result, data) => {
        if (this.config.debug) {
          this.log("data:");
          this.log(data);
        }
        if (result == "OK") {
          this.addNonExistingDevices(data);
          this.removeNonExistingDevices(data);
        } else {
          if (result == "BAD_TOKEN") {
            this.log("ERROR: Your token is incorrect");
          } else {
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
    if (this.config.debug) {
      this.log("Looking for devices to add...");
    }
    var toAdd = [];

    for (var a = 0; a < devices.length; a++) {
      var device = devices[a];

      let exists = false;

      for (var b = 0; b < HaierACDevicesList.length; b++) {
        if (HaierACDevicesList[b].context.data.id == device.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        toAdd.push(device);
      }
    }
    if (toAdd.length > 0) {
      this.log.debug("Found: " + toAdd.length);
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
      this.log.debug("No devices to add found");
    }
  },
  removeNonExistingDevices: function (devices) {
    this.log.debug("Looking for devices to remove...");
    var toRemove = [];

    for (var a = 0; a < HaierACDevicesList.length; a++) {
      var accessory = HaierACDevicesList[a];
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
      this.log.debug("Found: " + toRemove.length);
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
      this.log.debug("No devices to remove found");
    }
  },
  addDevice: function (device) {
    const uuid = this.api.hap.uuid.generate(device.id);
    if (
      !this.accessories.find((cachedaccessory) => cachedaccessory.UUID === uuid)
    ) {
      const accessoryBase = new this.api.platformAccessory(
        this.config.lang.acdevice_name + " " + device.name,
        uuid
      );
      const accessory = new HaierAccessory(this, accessoryBase, device);
      HaierACDevicesList.push(accessory);
      this.accessories.push(accessory);
      this.log("Registering: " + device.name + "(" + device.id + ")");
      this.api.registerPlatformAccessories(
        "homebridge-haieracbridge-platform",
        "HaierACBridge",
        [accessory.getAccessory()]
      );
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
    this.api.unregisterPlatformAccessories(
      "homebridge-haieracbridge-platform",
      "HaierACBridge",
      [accessory.accessory]
    );
    HaierACDevicesList = this.arrayRemove(
      HaierACDevicesList,
      HaierACDevicesList.find(
        (element) => element.context.data.id == accessory.context.data.id
      )
    );
    this.accessories = this.arrayRemove(this.accessories, accessory.accessory);
  },
  arrayRemove: function (arr, value) {
    return arr.filter(function (ele) {
      return ele != value;
    });
  },
};
