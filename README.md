# SQLite HTTP Proxy 
A simple HTTP JSON proxy for SQLite.  
This should probably not be exposed to end users. :-) 

# Usage
```bash
$ NODE_END=production node main.js --db ./examples/vt.sqlite 
^Z
[1]  + 23436 suspended  NODE_END=production node main.js --db ./examples/vt.sqlite
$ bg
[1]  + 23436 continued  NODE_END=production node main.js --db ./examples/vt.sqlite
$ curl 'http://localhost:2048/' -d sql='select * from vt where md5 = "0060cc2e24f259545558ebd8834dc345"' --compressed -s | jq . # POST /
[
  {
    "md5": "0060cc2e24f259545558ebd8834dc345",
    "av_score": "7/61"
  }
]
$ curl 'http://localhost:2048/' -G --data-urlencode sql='select * from vt where md5 = "0060cc2e24f259545558ebd8834dc345"' --compressed -s | jq . # GET /
[
  {
    "md5": "0060cc2e24f259545558ebd8834dc345",
    "av_score": "7/61"
  }
]
$ curl 'http://localhost:2048/' -d sql='create table x(a)' --compressed -s
[]
$ curl 'http://localhost:2048/' -d sql='drop table x' --compressed -s 
[]
$ fg
[1]  + 23436 running    NODE_END=production node main.js --db ./examples/vt.sqlite
^C
```