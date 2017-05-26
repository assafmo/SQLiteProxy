const flags = require('flags');
flags.defineString('db', ':memory:', 'DB File path');
flags.defineBoolean('readonly', false, 'Open the database as readonly');
flags.defineNumber('port', 2048, 'TCP Port to listen on');
flags.parse();

console.log('db', '=', flags.get('db'))
console.log('readonly', '=', flags.get('readonly'))
console.log('port', '=', flags.get('port'))

const sqlite3 = require('sqlite3');
const sqliteMode = flags.get('readonly') === true ? sqlite3.OPEN_READONLY : null;

const db = new sqlite3.Database(flags.get('db'), sqliteMode);
// process.on('SIGINT', db.close.bind(db));
// process.on('SIGTERM', db.close.bind(db));

const express = require('express');
const bodyParser = require('body-parser');

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
app.get('*', (req, res) => res.redirect('/'));
app.post('*', (req, res) => res.redirect('/'));

app.listen(flags.get('port'));