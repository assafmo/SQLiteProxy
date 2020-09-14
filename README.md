# SQLiteProxy

A simple HTTP JSON proxy for SQLite.  
This probably should not be exposed to end users. :-)

[![npm version](https://badge.fury.io/js/sqliteproxy.svg)](https://badge.fury.io/js/sqliteproxy)

# Installation

```bash
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
  --cors: CORS URLs to allow requests from
    (default: [])
  --requestlimit: request body limit for HTTP POSTs
    (default: "1mb")
```

# Usage examples

## Existing DB

```console
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

```console
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

```console
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

## Parameterized Queries

Must use HTTP POST with content-type=application/json. 'params' element must be an array in request body

```console
$ sqliteproxy --db currenttime.sqlite &
$ curl -H "Content-Type: application/json" -d '{"sql":"select DATETIME(?) AS UTC_ISO","params":["now"]}' http://localhost:2048
[{"UTC_ISO":"2020-09-10 02:06:02"}]
```

## BLOB Handling

Blobs via http POST/GET can be treated as byte arrays or base64-encoded text. This is handled via the blobtype variable in the HTTP GET request, or a blobtype object member in the request body for an HTTP POST. Allowable values for blobtype are "base64" and "array". If blobtype is omitted, "base64" is the default.

This also affects how your parameterized SQLite statements are sent to the server. BLOB query parameters must be structured as {"data": value}, whereas other parameter types (e.g. text, numberic) are treated as primitives in the params array (see exables below).

```
# EXAMPLES
###############################################################################

GET http://localhost:2048?sql=select BLOB_FIELD from BLOB_TABLE&blobtype=base64
>> returns BLOB fields as base64 strings

###############################################################################

GET http://localhost:2048?sql=select BLOB_FIELD from BLOB_TABLE&blobtype=array
>> returns BLOB fields as Buffer objects

###############################################################################

POST (application/json) http://localhost:2048
BODY:
{
    "blobtype": "base64",
    "sql": "insert into BLOB_TABLE(KEY,BLOB_FIELD) values (?,?)",
    "params": [1,{"data": "base64string"}]
}
>> base64 data is automatically converted to buffers before inserting the record

###############################################################################

POST (application/json) http://localhost:2048
BODY:
{
    "blobtype": "array",
    "sql": "insert into BLOB_TABLE(KEY,BLOB_FIELD) values (?,?)",
    "params": [1,{"data": bytearray[]}]
}
>> byte data is converted to buffer before inserting the record

```

## CORS

```console
$ sqliteproxy --db myNewDb.sqlite --cors http://example1.com --cors http://example2.com
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

```

```
