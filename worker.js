var amqp= require('amqplib');
var ampqlib = require('amqplib');
var request = require('superagent');
var path = require('path');
var fs = require("fs");
var commandLineArgs = require('command-line-args');


var optionDefinitions = [
  { name: 'config',  alias: "f", type: String, multiple: false, defaultOption: true, defaultValue:path.join(__dirname, './conf/config.json')},
]
//var configFile = process.argv.length > 2 ? 
var options = commandLineArgs(optionDefinitions);
var configFile = options.config;
var config = JSON.parse(fs.readFileSync(configFile).toString());
console.log("running with config",config);

var defaultHeaders = {Accept: 'application/json'};

var connect = function(){
  try{
      ampqlib.connect(config.amqpurl).then(function(conn){
      listen(conn);
   },function(err){
      console.log("hmm--- errror!!!");
      setTimeout(connect, 5000);
   });
  }catch(err){
      console.log("error connecting - will try again!");
      setTimeout(connect, 5000);
  }
}

var listen = function(conn){
  console.log("starting to listen");
  process.once('SIGINT', function(){
        console.log("seen a SIGINT,closing connection and trying reconnect");
	conn.close();
        setTimeout(connect, 5000);
  });

  return conn.createChannel().then(function(ch){
      var ok = ch.assertQueue('tasks');

      ok = ok.then(function(_qok){

          return ch.consume('tasks', function(msg){
                console.log("[x] received object '%s'", msg.content);
                console.log("message headers are");
                console.log(msg.headers);

                var endpoint = JSON.parse(msg.content);//{mymessage:'hello'};
              
                var headers = msg.headers || defaultHeaders;
                request.post(endpoint.url)
                       .send(endpoint.parameters)
                       .set(headers)
                       .type(endpoint.format || 'json')
                       .end(function(err, res){
                        if (err){
                          console.log(err);
                        }else{
                          return "done";
                        }
                });
          }, {noAck: true});
      });

      return ok.then(function(_consumeOk){
            console.log(" [*] waiting for messages.  To exit press ctrl-c");

      },function(err){
         console.log("error, reconnecting in 5");
	 setTimeout(connect, 5000);		
      });
  });
}
connect();
