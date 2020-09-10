#!/usr/bin/env node

const flags = require("flags");
flags.defineString("db", "", "DB File path");
flags.defineBoolean("readonly", false, "Open the database for readonly");
flags.defineNumber("port", 2048, "TCP Port to listen on");
flags.defineMultiString("cors", [], "CORS URLs to allow requests from");
flags.parse();

console.log("db", "=", flags.get("db"));
console.log("readonly", "=", flags.get("readonly"));
console.log("port", "=", flags.get("port"));
console.log("cors", "=", flags.get("cors").join(", ") || "false");

const Database = require("better-sqlite3");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(require("compression")());
app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
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
    const sql = req[httpRequestFieldName].sql;
    let params = [];
    if (httpRequestFieldName === "body" && req.is("application/json")) {
      params = req[httpRequestFieldName].params;
      if (params == undefined || params == null) {
        params = [];
      }
    }
    if (!sql) {
      return res.send([]);
    }

    let db;
    try {
      if (!Array.isArray(params)) {
        res.status(400);
        res.send(
          `${err.code}: 'params' element in http request body must be an array!\n`
        );
        return;
      }
      const readonly = flags.get("readonly");
      db = new Database(flags.get("db"), { readonly });
      if (!readonly) {
        db.pragma("journal_mode = WAL");
      }
    } catch (err) {
      res.status(400);
      res.send(`${err.code}: ${err.message}\n`);
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
    res.send(rows);
  };
}

app.get("/", getSqlExecutor("query"));
app.post("/", getSqlExecutor("body"));
app.get("*", (req, res) => res.redirect(308, "/" + req._parsedUrl.search));
app.post("*", (req, res) => res.redirect(308, "/"));

app.listen(flags.get("port"));
