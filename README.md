# SQLiteProxy

A simple HTTP JSON proxy for SQLite.  
This probably should not be exposed to end users. :-)

[![npm version](https://badge.fury.io/js/sqliteproxy.svg)](https://badge.fury.io/js/sqliteproxy)

# Installation

```
npm install -g sqliteproxy
```

# Options

```
Usage: sqliteproxy [options]

Options:
  --db: DB File path
    (default: "")
  --[no]readonly: Open the database for readonly
    (default: false)
  --port: TCP Port to listen on
    (default: 2048)
    (a number)
```

# Usage examples

## Existing DB

```
$ sqliteproxy --db ./examples/vt.db
^Z
[1]  + 23436 suspended sqliteproxy --db ./examples/vt.db
$ bg
[1]  + 23436 continued sqliteproxy --db ./examples/vt.db
$ curl 'http://localhost:2048' \
-d sql="select * from vt where md5 = '0060cc2e24f259545558ebd8834dc345'" -L | jq . # POST /
[
  {
    "md5": "0060cc2e24f259545558ebd8834dc345",
    "av_score": "7/61"
  }
]
$ curl 'http://localhost:2048' -G \
--data-urlencode sql="select * from vt where md5 = '0060cc2e24f259545558ebd8834dc345'" -L | jq . # GET /
[
  {
    "md5": "0060cc2e24f259545558ebd8834dc345",
    "av_score": "7/61"
  }
]
$ curl 'http://localhost:2048' -d sql='create table x(a)' -L
[]
$ curl 'http://localhost:2048' -d sql='drop table x' -L
[]
$ fg
[1]  + 23436 running    sqliteproxy --db ./examples/vt.db
^C
```

## Read only

```
$ sqliteproxy --db ./examples/vt.db --readonly
^Z
[1]  + 23447 suspended sqliteproxy --db ./examples/vt.db --readonly
$ bg
[1]  + 23447 continued sqliteproxy --db ./examples/vt.db --readonly
$ curl 'http://localhost:2048' -d sql='create table x(a)' -L
SQLITE_READONLY: attempt to write a readonly database
$ fg
[1]  + 23447 running    sqliteproxy --db ./examples/vt.db --readonly
^C
```

## New DB

```
$ sqliteproxy --db myNewDb.sqlite
^Z
[1]  + 23453 suspended sqliteproxy --db myNewDb.sqlite
$ bg
[1]  + 23453 continued sqliteproxy --db myNewDb.sqlite
$ curl 'http://localhost:2048' -d sql='create table x(a)' -L
[]
$ curl 'http://localhost:2048' -d sql='insert into x values (1),(2),(3)' -L
[]
$ curl 'http://localhost:2048' -d sql='select * from x' -L
[
  {
    "a": 1
  },
  {
    "a": 2
  },
  {
    "a": 3
  }
]
$ fg
[1]  + 23453 running    sqliteproxy --db myNewDb.sqlite
^C
```

# Docker

[https://hub.docker.com/r/assafmo/sqliteproxy](https://hub.docker.com/r/assafmo/sqliteproxy/)

```
docker run -d -p 2048:2048 -v /path/to/my/db/dir/:/data/ assafmo/sqliteproxy --db /data/my.db
```

```
docker run -d -p 2048:2048 -v /path/to/my/db/dir/:/data/ assafmo/sqliteproxy --readonly --db /data/my.db
```

# License

[MIT](/LICENSE)
