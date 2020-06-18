const http = require("http");

class RestAPI {
  constructor(context) {
    this.ip = context.config.ip;
    this.token = context.config.token;
    this.log = context.log;
  }

  getDevices(callback) {
    var result = "OK";
    var data = [];
    var options = {
      host: this.ip,
      port: 10000,
      path: "/listDevices",
      method: "GET",
      headers: {
        token: this.token,
      },
    };

    var request = http.request(options, (res) => {
      let response = "";
      res.on("data", (chunk) => {
        response += chunk;
      });

      res.on("end", () => {
        if (response == "Wrong token" || response == "Missing token header") {
          result = "BAD_TOKEN";
          callback(result, response);
        } else {
          try {
            data = JSON.parse(response);
            callback(result, data);
          } catch {
            callback("ERROR", "ERROR");
          }
        }
      });
    });

    request.on("error", function (err) {
      callback(err.code, data);
    });

    request.end();
  }

  getDeviceData(deviceid, callback) {
    var result = "OK";
    var data = [];
    var options = {
      host: this.ip,
      port: 10000,
      path: "/deviceData",
      method: "GET",
      headers: {
        token: this.token,
        id: deviceid,
      },
    };

    var request = http.request(options, (res) => {
      let response = "";
      res.on("data", (chunk) => {
        response += chunk;
      });

      res.on("end", () => {
        if (response == "Wrong token" || response == "Missing token header") {
          result = "BAD_TOKEN";
          callback(result, response);
        } else {
          try {
            data = JSON.parse(response);
            callback(result, data);
          } catch {
            callback("ERROR", "ERROR");
          }
        }
      });
    });

    request.on("error", function (err) {
      callback(err.code, data);
    });

    request.end();
  }

  setDeviceData(deviceid, values, callback) {
    var result = "OK";
    var options = {
      host: this.ip,
      port: 10000,
      path: "/deviceData",
      method: "POST",
      headers: {
        token: this.token,
        id: deviceid,
        "Content-Type": "application/json",
      },
    };

    var request = http.request(options, (res) => {
      let response = "";
      res.on("data", (chunk) => {
        response += chunk;
      });

      res.on("end", () => {
        if (response == "Wrong Token" || response == "Missing token header") {
          result = "BAD_TOKEN";
          callback(result, response);
        } else {
          try {
            data = JSON.parse(response);
            callback(result, data);
          } catch {
            callback("ERROR", "ERROR");
          }
        }
      });
    });

    request.on("error", function (err) {
      callback(err.code, "");
    });
    request.write(JSON.stringify(values));
    request.end();
  }
}

module.exports.RestAPI = RestAPI;
