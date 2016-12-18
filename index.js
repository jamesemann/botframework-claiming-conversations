var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var restify = require('restify');
var builder = require('botbuilder');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

function checkConversationIsntClaimedByHuman(session) {
  return new Promise(function (resolve, reject) {
    global.address = session.message.address;
    console.log(JSON.stringify(session.message));
    io.emit('chat message', { from: 'User ' + session.message.user.id, messageText: session.message.text });

    if (!global.claimed) {
      resolve(session);
    } else {
      reject(session);
    }
  });

}

bot.dialog('/', [ 
  function (session) {
    checkConversationIsntClaimedByHuman(session).then(function (session) {
      builder.Prompts.text(session, 'Hi! What is your name?');
      io.emit('chat message', { from: 'Bot', messageText: 'Hi! What is your name?' });
    });
  },
  function (session, results) {
    session.send('did something');
    checkConversationIsntClaimedByHuman(session).then(function (session) {
      session.send('great, thanks ' + results.response);
      io.emit('chat message', { from: 'Bot', messageText: result.response });
    });
  }
]);

app.get('/', function (req, res) {
  res.sendfile('index.html');
});

io.on('connection', function (socket) {
  socket.on('claim', function (msg) {
    console.log('claiming the conversation');
    global.claimed = true;
  });

  socket.on('relinquish', function (msg) {
    console.log('relinquish the conversation');
    global.claimed = false;
  });

  socket.on('chat message', function (msg) {
    io.emit('chat message', msg);
    if (global.address) {
      var botmsg = new builder.Message()
        .address(global.address)
        .text(msg.messageText);
      bot.send(botmsg, function (err) {
        console.log(err);
      });
    } else {
      console.log('dont have any participants to send to ');
    }
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});