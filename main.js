#!/usr/bin/env node

const flags = require('flags');
flags.defineString('db', '', 'DB File path');
flags.defineBoolean('readonly', false, 'Open the database for readonly');
flags.defineNumber('port', 2048, 'TCP Port to listen on');
flags.parse();

console.log('db', '=', flags.get('db'))
console.log('readonly', '=', flags.get('readonly'))
console.log('port', '=', flags.get('port'))

const sqlite3 = require('sqlite3');
const sqliteMode = flags.get('readonly') === true ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(require('compression')());
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(function (req, res, next) {
    req.connection.setTimeout(2 * 60 * 1000); // 2 minutes
    res.connection.setTimeout(2 * 60 * 1000); // 2 minutes
    next();
});

function getSqlExecutor(httpRequestFieldName) {
    return function (req, res) {
        if (!req[httpRequestFieldName].sql)
            return res.send([]);

        const db = new sqlite3.Database(flags.get('db'), sqliteMode, err => {
            if (err) {
                res.status(500);
                return res.send(err);
            }

            db.all(req[httpRequestFieldName].sql, (err, rows) => {
                db.close();

                if (err) {
                    res.status(400);
                    return res.send(err);
                }
                res.send(rows);
            });
        });
    }
}

app.get('/', getSqlExecutor('query'));
app.post('/', getSqlExecutor('body'));
app.get('*', (req, res) => res.redirect(308, '/' + req._parsedUrl.search));
app.post('*', (req, res) => res.redirect(308, '/'));

app.listen(flags.get('port'));
