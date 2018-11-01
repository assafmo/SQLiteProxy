#!/usr/bin/env node

const flags = require("flags");
flags.defineString("db", "", "DB File path");
flags.defineBoolean("readonly", false, "Open the database for readonly");
flags.defineNumber("port", 2048, "TCP Port to listen on");
flags.parse();

console.log("db", "=", flags.get("db"));
console.log("readonly", "=", flags.get("readonly"));
console.log("port", "=", flags.get("port"));

const Database = require("better-sqlite3");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(require("compression")());
app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
app.use(bodyParser.json({ limit: "1mb" }));
app.use(function(req, res, next) {
  req.connection.setTimeout(2 * 60 * 1000); // 2 minutes
  res.connection.setTimeout(2 * 60 * 1000); // 2 minutes
  next();
});

function getSqlExecutor(httpRequestFieldName) {
  return function(req, res) {
    const sql = req[httpRequestFieldName].sql;
    if (!sql) {
      return res.send([]);
    }

    let db;
    try {
      db = new Database(flags.get("db"), {
        readonly: flags.get("readonly")
      });
      db.pragma("journal_mode = WAL");
    } catch (err) {
      res.status(400);
      res.send(`${err.code}: ${err.message}\n`);
      db.close && db.close();
      return;
    }

    let rows = [];
    try {
      if (sql.toLowerCase().includes("select")) {
        rows = db.prepare(sql).all();
      } else {
        db.prepare(sql).run();
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
