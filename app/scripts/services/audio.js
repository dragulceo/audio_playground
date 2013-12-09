angular.module('audioApp').factory('audio', function audio() {
     'use strict';
     var userMediaInputStream = null,
          emptyFunction = function() {};

     function getNewAudioContext() {
          var AudioContextClass = window.AudioContext || window.webkitAudioContext,
               audioContextInstance = new AudioContextClass();
          //fixed renaming in web api createJavascriptNode became createScriptProcessor
          if (!audioContextInstance.createJavaScriptNode && audioContextInstance.createScriptProcessor) {
               audioContextInstance.createJavaScriptNode = audioContextInstance.createScriptProcessor;
          }
          return audioContextInstance;
     }

     function AudioManager() {
          //Intermediary nodes
          this.nodes = [];
          //The source node - can be created from audio input, from a loaded file, or from an array buffer
          this.source = null;
          //TODO analyser could be moved and many analyser nodes can be added
          this.analyser = null;
          //The audio output node - usualy present when playing
          this.output = null;
          this.playing = false;
          //Callback for oneneded event of a playing node
          this.onended = emptyFunction;
     }
     angular.extend(AudioManager.prototype, {
          getAudioContext: function() {
               if (!this.audioContext) {
                    this.audioContext = getNewAudioContext();
               }
               return this.audioContext;
          },
          setSource: function(node) {
               var nextNode = null;
               if (this.nodes.length > 0) {
                    nextNode = this.nodes[0];
               } else {
                    if (this.hasOutput()) {
                         nextNode = this.getOutput();
                    }
               }
               if (nextNode) {
                    node.connect(nextNode);
               }
               this.source = node;
          },
          getSource: function() {
               return this.source;
          },
          hasSource: function() {
               return this.source !== null;
          },
          setOutput: function(node) {
               var prevNode = this.getLastNode();
               if (node === this.output) {
                    return;
               }
               if (!prevNode) {
                    prevNode = this.getSource();
               }
               if (prevNode) {
                    if (node === null) {
                         prevNode.disconnect();
                    } else {
                         prevNode.connect(node);
                    }
               }
               this.output = node;
          },
          getOutput: function() {
               return this.output;
          },
          hasOutput: function() {
               return this.output !== null;
          },
          stopOutput: function() {
               this.setOutput(null);
          },
          startOutput: function() {
               this.setOutput(this.getAudioContext().destination);
          },
          insertNodeAtIndex: function(newNode, index) {
               var previousNode, nextNode;
               if (this.nodes.length >= index && index >= 0) {
                    //Connect previous node
                    if (index > 0) {
                         previousNode = this.nodes[index - 1];
                    } else {
                         if (this.hasSource()) {
                              previousNode = this.getSource();
                         }
                    }
                    if (index < this.nodes.length) {
                         nextNode = this.nodes[index];
                    } else {
                         if (this.getOutput()) {
                              nextNode = this.getOutput();
                         }
                    }
                    if (previousNode) {
                         previousNode.disconnect();
                         previousNode.connect(newNode);
                    }
                    if (nextNode) {
                         newNode.connect(nextNode);
                    }
                    this.nodes.splice(index, 0, newNode);
               } else {
                    throw new Error('Invalid index. Can\'t insert at ' + index + ' position.');
               }
          },
          removeNode: function(node) {
               var n = this.nodes.length,
                    index;
               for (index = 0; index < n; index++) {
                    if (this.nodes[index] === node) {
                         node.disconnect();
                         if (n === 1) {
                              if (this.hasSource()) {
                                   this.getSource().disconnect();
                                   if (this.hasOutput()) {
                                        this.getSource().connect(this.getOutput());
                                   }
                              }
                         } else {
                              //more than one node in the array
                              if (index === 0) {
                                   //if this is the first node
                                   this.getSource().disconnect();
                                   this.getSource().connect(this.nodes[1]);
                              } else if (index === n - 1) {
                                   //if this is the last node
                                   this.nodes[n - 2].disconnect();
                                   if (this.hasOutput()) {
                                        this.nodes[n - 2].connect(this.getOutput());
                                   }
                              } else {
                                   //if this isn't at margin of the array
                                   this.nodes[index - 1].disconnect();
                                   this.nodes[index - 1].connect(this.nodes[index + 1]);
                              }
                         }
                         this.nodes.splice(index, 1);
                         break;
                    }
               }
          },
          pushNode: function(newNode) {
               this.insertNodeAtIndex(newNode, this.nodes.length);
          },
          addProcessingNode: function(newNode) {
               this.insertNodeAtIndex(newNode, 0);
          },
          getLastNode: function() {
               return this.nodes[this.nodes.length - 1];
          },
          //
          createAnalyser: function() {
               var analyser;
               analyser = this.getAudioContext().createAnalyser();
               analyser.fftSize = 512;
               return analyser;
          },
          getAnalyser: function() {
               if (!this.analyser) {
                    this.analyser = this.createAnalyser();
                    this.pushNode(this.analyser);
               }
               return this.analyser;
          },
          setOnEndedHandler: function(callback) {
               this.playing = false;
               if (angular.isFunction(callback)) {
                    this.onended = callback;
               }
          },
          setSourceFromInputStream: function(stream, onUserMediaAvailalbleCallback) {
               this.setSource(this.getAudioContext().createMediaStreamSource(stream));
               if (angular.isFunction(onUserMediaAvailalbleCallback)) {
                    onUserMediaAvailalbleCallback();
               }
          },
          setUserMediaInput: function(onUserMediaAvailalbleCallback) {
               var self = this,
                    GetUserMedia;
               if (!userMediaInputStream) {
                    GetUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
                    GetUserMedia.call(navigator, {
                         audio: true
                    }, function(stream) {
                         userMediaInputStream = stream;
                         self.setSourceFromInputStream(stream, onUserMediaAvailalbleCallback);
                    }, function() {
                         if ('console' in window) {
                              console.error(arguments);
                         }
                    });
               } else {
                    this.setSourceFromInputStream(userMediaInputStream, onUserMediaAvailalbleCallback);
               }
          },
          setBufferSource: function(buffer) {
               var audioContext = this.getAudioContext(),
                    audioBuffer = audioContext.createBufferSource();
               audioBuffer.buffer = buffer;
               audioBuffer.playbackRate.value = 1.0;
               audioBuffer.onended = this.onended;
               this.setSource(audioBuffer);
               return audioBuffer;
          },
          setRawLoadedData: function(data, callback) {
               var self = this;
               this.getAudioContext().decodeAudioData(data, function(buffer) {
                    self.setBufferSource(buffer);
                    if (angular.isFunction(callback)) {
                         callback();
                    }
               });
          },
          setURLInput: function(url, onDataLoaded) {
               var request = new XMLHttpRequest(),
                    self = this;
               request.open('GET', url, true);
               request.responseType = 'arraybuffer';
               // Decode asynchronously
               request.onload = function() {
                    self.setRawLoadedData(request.response, onDataLoaded);
               };
               request.send();
          },
          setFloat32ArrayBuffers: function(data) {
               var n,
               audioBuffer;
               if (angular.isArray(data)) {
                    n = data.length;
                    if (n > 0) {
                         audioBuffer = this.getAudioContext().createBuffer(n, data[0].length, 44100);
                         while (n--) {
                              audioBuffer.getChannelData(n).set(data[n]);
                         }
                         this.setBufferSource(audioBuffer);
                    }
               }
          },
          setLoop: function(loop) {
               if (this.hasSource()) {
                    this.getSource().loop = loop;
               }
          },
          setState: function(state, loop) {
               var source, buffer;
               if (this.hasSource()) {
                    if (state === 'start') {
                         this.playing = true;
                         buffer = this.getSource().buffer;
                         if (buffer) {
                              source = this.setBufferSource(this.getSource().buffer);
                         } else {
                              source = this.getSource();
                         }
                         this.startOutput();
                    } else {
                         //source can't be stopped if it's already stopped - triggers an error on chrome
                         if (!this.playing) {
                              return;
                         }
                         this.playing = false;
                         source = this.getSource();
                         //this.stopOutput();
                    }
                    source.curentTime = 0;
                    source.loop = loop;
                    if (state in source) {
                         source[state](0);
                    } else {
                         if (state === 'start') {
                              source.noteOn(0);
                         } else {
                              source.noteOff(0);
                         }
                    }
               }
          },
          play: function(loop) {
               this.setState('start', loop);
          },
          stop: function() {
               this.setState('stop');
          },
          //code from Recorderjs
          forceDownload: function(blob, filename) {
               var url = (window.URL || window.webkitURL).createObjectURL(blob);
               var link = window.document.createElement('a');
               link.href = url;
               link.download = filename || 'output.wav';
               var click = document.createEvent("Event");
               click.initEvent("click", true, true);
               link.dispatchEvent(click);
          },
          save: function() {
               var self = this,
                    worker;
               worker = new Worker('scripts/workers/export.js');
               worker.postMessage({
                    type: 'audio/wav',
                    bufferL: this.getSource().buffer.getChannelData(0),
                    bufferR: this.getSource().buffer.getChannelData(1),
                    sampleRate: this.getAudioContext().sampleRate
               });
               worker.addEventListener('message', function(e) {
                    self.forceDownload(e.data);
               }, false);
          }
     });
     return {
          newAudio: function() {
               return new AudioManager();
          }
     };
});
