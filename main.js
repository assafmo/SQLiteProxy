#!/usr/bin/env node

const flags = require("flags");
flags.defineString("db", "", "DB File path");
flags.defineBoolean("readonly", false, "Open the database for readonly");
flags.defineNumber("port", 2048, "TCP Port to listen on");
flags.defineMultiString("cors", [], "CORS URLs to allow requests from");
flags.defineString("requestlimit", "1mb", "request body limit for HTTP POSTs");
flags.parse();

console.log("db", "=", flags.get("db"));
console.log("readonly", "=", flags.get("readonly"));
console.log("port", "=", flags.get("port"));
console.log("cors", "=", flags.get("cors").join(", ") || "false");
console.log("requestlimit", "=", flags.get("requestlimit"));

const Database = require("better-sqlite3");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(require("compression")());
app.use(
  bodyParser.urlencoded({ extended: false, limit: flags.get("requestlimit") })
);
app.use(bodyParser.json({ limit: "1mb" }));
app.use(function (req, res, next) {
  req.connection.setTimeout(2 * 60 * 1000); // 2 minutes
  res.connection.setTimeout(2 * 60 * 1000); // 2 minutes
  next();
});

if (flags.get("cors").length > 0) {
  const cors = require("cors");
  const corsWhitelist = new Set(flags.get("cors"));
  const corsOptions = {
    origin: function (origin, callback) {
      //https://www.w3.org/TR/cors/#access-control-allow-origin-response-header
      if (!origin || corsWhitelist.has(origin) || corsWhitelist.has("*")) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
  };
  app.use(cors(corsOptions));
}

function getSqlExecutor(httpRequestFieldName) {
  return function (req, res) {
    let blobtype = req[httpRequestFieldName].blobtype;
    if (blobtype == undefined || blobtype == null) {
      blobtype = "base64"; //default http blob handling to base64 if blobtype queryparam/bodyparam is missing
    }
    if (typeof blobtype != "string") {
      res.status(400);
      res.send(
        `${res.statusCode}: 'blobtype' element mandatory in http request ${httpRequestFieldName} must be string value 'base64' or 'array'!\n`
      );
      return;
    }
    blobtype = blobtype.toLowerCase().trim();
    if (blobtype != "base64" && blobtype != "array") {
      res.status(400);
      res.send(
        `${res.statusCode}: 'blobtype' element mandatory in http request ${httpRequestFieldName} must be string value 'base64' or 'array'!\n`
      );
      return;
    }

    const sql = req[httpRequestFieldName].sql;
    let params = [];
    if (httpRequestFieldName === "body" && req.is("application/json")) {
      params = req[httpRequestFieldName].params;
      if (params == undefined || params == null) {
        params = [];
      }

      if (!Array.isArray(params)) {
        res.status(400);
        res.send(
          `${res.statusCode}: 'params' element in http request body must be an array!\n`
        );
        return;
      }

      if (blobtype === "base64") {
        /********************************************************************************** 
        Enumerate through sqlite parameters and if of them is a blob param
        then decode+convert that param to a buffer.
        - Base64 Blob parameter is structured as follows: {data: "base64data"},
        - Non-blob parameters are primitives. not objects (numeric,string,bool)
        ***********************************************************************************/
        for (let i = 0; i < params.length; i++) {
          let param = params[i];
          //if the parameter is an object, assume it's a blob parameter
          if (typeof param === "object" && param !== null) {
            if (param.hasOwnProperty("data")) {
              var data = param.data;
              let buff = null;
              if (typeof Buffer.from === "function") {
                // Node 5.10+
                buff = Buffer.from(data, "base64");
              } else {
                // older Node versions, now deprecated
                buff = new Buffer(data, "base64");
              }
              params[i] = buff;
            }
          }
        }
      } else if (blobtype === "array") {
        /********************************************************************************** 
        Enumerate through sqlite parameters and if of them is a blob param
        then convert the param to a buffer.
        - Array Blob parameter is structured as follows: {data: bytearray[]},
        - Non-blob parameters are primitives. not objects (numeric,string,bool)
        ***********************************************************************************/
        for (let i = 0; i < params.length; i++) {
          let param = params[i];
          //if the parameter is an object, assume it's a blob parameter
          if (typeof param === "object" && param !== null) {
            if (param.hasOwnProperty("data")) {
              var data = param.data;
              let buff = null;
              if (typeof Buffer.from === "function") {
                // Node 5.10+
                buff = Buffer.from(data);
              } else {
                // older Node versions, now deprecated
                buff = new Buffer(data);
              }
              params[i] = buff;
            }
          }
        }
      }
    }
    if (!sql) {
      return res.send([]);
    }

    let db;
    try {
      const readonly = flags.get("readonly");
      db = new Database(flags.get("db"), { readonly });
      if (!readonly) {
        db.pragma("journal_mode = WAL");
      }
    } catch (err) {
      res.status(400);
      //precautionary check if err doesn't have a code member
      let errcode = res.statusCode;
      if (err.code) {
        errcode = err.code;
      }
      res.send(`${errcode}: ${err.message}\n`);
      db.close && db.close();
      return;
    }

    let rows = [];
    try {
      if (sql.toLowerCase().includes("select")) {
        const stmt = db.prepare(sql);
        rows = stmt.all(params);
      } else {
        const stmt = db.prepare(sql);
        stmt.run(params);
      }
    } catch (err) {
      res.status(400);
      res.send(`${err.code}: ${err.message}\n`);
      db.close();
      return;
    }

    db.close();

    //if blobtype = base64, enumerate through the rows/fields and convert any buffer fields found to base64 string
    if (blobtype == "base64") {
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];

        //get field count for row
        let fieldcount = 0;
        for (var prop in row) {
          if (Object.prototype.hasOwnProperty.call(row, prop)) {
            fieldcount++;
          }
        }

        //enumerate through fields
        for (let j = 0; j < fieldcount; j++) {
          let fieldname = Object.keys(row)[j];
          let fielddata = row[fieldname];
          if (Buffer.isBuffer(fielddata)) {
            let base64data = fielddata.toString("base64");
            rows[i][fieldname] = base64data;
          }
        }
      }
    }

    res.send(rows);
  };
}

app.get("/", getSqlExecutor("query"));
app.post("/", getSqlExecutor("body"));
app.get("*", (req, res) => res.redirect(308, "/" + req._parsedUrl.search));
app.post("*", (req, res) => res.redirect(308, "/"));

app.listen(flags.get("port"));
