//#############################################
//##                  SETUP                  ##
//#############################################

let IOTA = require('../node_modules/iota.lib.js/lib/iota');
let MAM = require('./mam.node.js');

//#############################################
//##            STREAM CONSTRUCTOR           ##
//#############################################

function STREAM(_stream) {

  this.host = _stream.host || 'localhost';
  this.port = _stream.port || 14265;

  this.id = _stream.id || 'raspNode';
  this.location = _stream.location || '';
  this.sources = [];

  this.root = '';
  this.mamState = null;
  this.seed = _stream.seed || generateSeed();

  this.initNode();
}

//#############################################
//##            ADD DATA SOURCE              ##
//#############################################

STREAM.prototype.addSource = function(_s) {
  this.sources.push(_s);
}

//#############################################
//##              HANDLE SOURCES             ##
//#############################################

STREAM.prototype.handle = function() {

  let self = this;
  var data = []

  self.sources.forEach(function(s) {
    s().then(result => {
    data.push(result);
       if (data.length == self.sources.length)
       	self.send(data);
   }).catch(err => { console.error(err); });
  })

}

//#############################################
//##              INITIATE MAM               ##
//#############################################

STREAM.prototype.send = function(_data) {

const scope = this;
const time = Date.now();

let json = {
    'id':         this.id,
    'location':   this.location,
    'timestamp':  time,
    'data':       _data,
 }

 // Initiate the mam state with the given seed at index 0.
 this.mamState = MAM.init(this.iota, this.seed, 2, 0);
 //mamState = MAM.changeMode(mamState, 'restricted', password)

 // Fetch all the messages in the stream.
 fetchStartCount(json, scope).then(v => {
   // Log the messages.
   let startCount = v.messages.length;

   // To add messages at the end we need to set the startCount for the mam state to the current amount of messages.
   this.mamState = MAM.init(this.iota, this.seed, 2, startCount);
   //mamState = MAM.changeMode(mamState, 'restricted', password)

   let newMessage = JSON.stringify(json);

   publish(newMessage, scope).then(res => {
    /* let hash = res[0].hash; */
    console.log('\x1b[32mMESSAGE (@ ' + time + ') SENT\x1b[0m');
   }).catch(err => {
    console.log('\x1b[41mERROR\x1b[0m (' + err + ')');
   })
 }).catch(err => {
    console.log(err);
 });

}

//#############################################
//##            INITIALISE IOTA              ##
//#############################################

STREAM.prototype.initNode = function() {
  this.iota = new IOTA({
      'host': this.host,
      'port': this.port
  });
}

//#############################################
//##                  MaM                    ##
//#############################################

async function fetchStartCount(json, scope){
    let trytes = scope.iota.utils.toTrytes('START');
    let message = MAM.create(scope.mamState, trytes);

    if (scope.root == '') {
      console.log('\n\x1b[45mThe first root:\x1b[0m');
      console.log(message.root);
      scope.root = message.root;
    }

    console.log('\nJSON:');
    console.log(json);
    console.log();

    // Fetch all the messages upward from the first root.
    console.log('\x1b[93m[fetching]\x1b[0m');
    return await MAM.fetch(scope.root, 'public', null, null);
    //return await MAM.fetch(message.root, 'restricted', password, null);
}

async function publish(packet, scope){
    // Create the message.
    let trytes = scope.iota.utils.toTrytes(packet)
    let message = MAM.create(scope.mamState, trytes);
    // Set the mam state so we can keep adding messages.
    scope.mamState = message.state;
    // Attach the message.
    console.log('\x1b[93m[sending]\x1b[0m\n');
    return await MAM.attach(message.payload, message.address);
}

//#############################################
//##                 HELPER                  ##
//#############################################

function generateSeed () {
 var seed = "";
 var trytes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9";

 for (var i = 0; i < 81; i++)
   seed += trytes.charAt(Math.floor(Math.random() * trytes.length));

 return seed;
}

//#############################################
//##                   EXPORTS               ##
//#############################################

module.exports = STREAM;
