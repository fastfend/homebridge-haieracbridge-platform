"use strict";

module.exports = function (homebridge) {
  let HaierACBridgePlatform = require("./src/platform.js")(homebridge);
  homebridge.registerPlatform(
    "homebridge-haieracbridge-platform",
    "HaierACBridge",
    HaierACBridgePlatform,
    true
  );
};
