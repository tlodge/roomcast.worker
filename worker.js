var ampqlib = require('amqplib');
var request = require('superagent');
var path = require('path');
var fs = require("fs");
var commandLineArgs = require('command-line-args');



const replaceurl = (url)=>{
  const stripped = url.replace("https://", "").replace("http://", "");
  const items = stripped.split(".");
  const sitename = items[0] ? items[0] : "";
  const kubservice = process.env[`BUTTONKIT_SERVICE_${sitename.toUpperCase()}_SERVICE_HOST`];

  if (kubservice){
    return  url.replace(`https://${sitename}.buttonkit.com`, `${kubservice}:8080`).replace(`http://${sitename}.buttonkit.com`, `${kubservice}:8080`); 
  }
  return url;
}

const resolveservice = (url)=>{
  try{
      if (url.includes(".buttonkit.com")){
          return replaceurl(url);
      }
      return url;
  }catch(err){
      return url;
  }
}


var optionDefinitions = [
  { name: 'config', alias: "f", type: String, multiple: false, defaultOption: true, defaultValue: path.join(__dirname, './conf/config.json') },
]
//var configFile = process.argv.length > 2 ? 
var options = commandLineArgs(optionDefinitions);
var configFile = options.config;
var config = JSON.parse(fs.readFileSync(configFile).toString());
console.log("running with config", config);

var defaultHeaders = { Accept: 'application/json' };

var reconnect = function () {
  console.log("reconnecting in 5s");
  setTimeout(connect, 5000);
}

var connect = function () {
  try {
    ampqlib.connect(config.amqpurl).then(function (conn) {
      listen(conn);
    }, function (err) {
      console.log(err);
      reconnect();
    });
  } catch (err) {
    reconnect();
  }
}

var listen = function (conn) {

  console.log("worker successfully listening");

  process.once('SIGINT', function () {
    console.log("seen a SIGINT,closing connection and trying reconnect");
    conn.close();
    reconnect();
  });

  return conn.createChannel().then(function (ch) {

    const post = (msg) => {
      console.log("[x] received object '%s'", msg.content);
      var endpoint = JSON.parse(msg.content);//{mymessage:'hello'};
      var headers = endpoint.headers || defaultHeaders;

      /*const url = Object.keys(replacements).reduce(function (acc, key){
          const value = replacements[key];
          return acc.replace(key,value);
      }, endpoint.url);*/

      const _url = resolveservice(endpoint.url);

      request.post(_url)
        .send(endpoint.parameters)
        .set(headers)
        .type(endpoint.format || 'json')
        .end(function (err, res) {
          if (err) {
            console.log(err);
            ch.ack(msg);
          } else {
            console.log("posted sucessfully!", endpoint.url);
            console.log(res.body);
            ch.ack(msg);
          }
        });
    }


    ch.assertQueue('tasks').then(function () {
      ch.prefetch(1);
      return ch.consume('tasks', post);
    }).then(function () {
      console.log(' [*] Awaiting RPC requests');
    }, (err) => {
      console.log(err);
      reconnect();
    }).catch((err) => {
      console.log(err);
      reconnect();
    });
  });

}

connect();

    /*var ok = ch.assertQueue('tasks');

    ok.then(function (_qok) {

      return ch.consume('tasks', function (msg) {
        console.log("[x] received object '%s'", msg.content);
        ch.prefetch(1);
        return ch.consume('tasks', msg);
      }, { noAck: true });
    }).then(function (_consumeOk) {
      console.log(" [*] waiting for messages.  To exit press ctrl-c");
    }, function (err) {
      console.log(err);
      reconnect();
    })
  }).catch((err) => {
    console.log(err);
    reconnect();
  });
}*/
