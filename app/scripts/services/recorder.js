angular.module('audioApp').service('recorder', ['audio',
     function recorder(audioFactory) {
          'use strict';
          var currentRecorder,
               audio = audioFactory.newAudio();

          function getNewRecorder(node, config) {
               return new window.Recorder(node, angular.extend({
                    workerPath: './bower_components/Recorderjs/recorderWorker.js'
               }, config || {}));
          }

          function startRecording() {
               if (currentRecorder) {
                    currentRecorder.stop();
                    currentRecorder = null;
               }
               audio.setUserMediaInput(function () {
                    currentRecorder = getNewRecorder(audio.getLastNode());
                    currentRecorder.record();
               });
          }

          function stopRecording(onRecordingBufferCallback) {
               if (currentRecorder) {
                    currentRecorder.stop();
                    currentRecorder.getBuffer(function (buffers) {
                         var audioContext = audio.getAudioContext(),
                              newBuffer = audioContext.createBuffer(2, buffers[0].length, audioContext.sampleRate);
                         newBuffer.getChannelData(0).set(buffers[0]);
                         newBuffer.getChannelData(1).set(buffers[1]);
                         //setBufferSource(newBuffer);
                         if (angular.isFunction(onRecordingBufferCallback)) {
                              onRecordingBufferCallback(newBuffer);
                         }
                    });
               }
          }

          function getCurrentAudioManager() {
               return audio;
          }
          return {
               //getNewRecorder: getNewRecorder,
               startRecording: startRecording,
               stopRecording: stopRecording,
               getCurrentAudioManager: getCurrentAudioManager
          };
     }
]);
