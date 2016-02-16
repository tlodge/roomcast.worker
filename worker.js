var amqp= require('amqplib');
var config = require('./config');
var ampqlib = require('amqplib');
var request = require('superagent');


var connect = function(){
   ampqlib.connect(config.amqpurl).then(function(conn){
      listen(conn);
   },function(err){
      console.log("hmm--- errror!!!");
      setTimeout(connect, 5000);
   });
}

var listen = function(conn){
  console.log("OPENED");
  process.once('SIGINT', function(){conn.close();});

  return conn.createChannel().then(function(ch){
      var ok = ch.assertQueue('tasks');

      ok = ok.then(function(_qok){

          return ch.consume('tasks', function(msg){
                console.log("[x] received object '%s'", msg.content);


                var endpoint = JSON.parse(msg.content);//{mymessage:'hello'};
                console.log(endpoint);
                //'/red/posttest'
                request.post(endpoint.url)
                       .send(endpoint.parameters)
                       .set('Accept', 'application/json')
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

      });
  });
}
connect();
