const sqlite3 = require('sqlite3');

const conf = require(process.argv[2]);
const sqliteMode = conf.readonly === true ? sqlite3.OPEN_READONLY : null;
const sqliteFilePath = conf.db ? conf.db : ':memory:';

const db = new sqlite3.Database(sqliteFilePath, sqliteMode);
// process.on('SIGINT', db.close.bind(db));
// process.on('SIGTERM', db.close.bind(db));

const express = require('express');
const bodyParser = require('body-parser');
const port = process.argv[3] || 1357;

const app = express();
app.use(require('compression')());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function getSqlExecutor(httpRequestFieldName) {
    return function (req, res) {
        if (!req[httpRequestFieldName].sql)
            return res.send([]);

        db.all(req[httpRequestFieldName].sql, function (err, rows) {
            if (err) {
                res.status(400);
                return res.send(err);
            }
            res.send(rows);
        });
    }
}

app.get('/', getSqlExecutor('query'));
app.post('/', getSqlExecutor('body'));

app.listen(port);