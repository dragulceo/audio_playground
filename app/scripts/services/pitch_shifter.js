angular.module('audioApp')
     .service('pitchShifter', ['pitchShift',

function pitchShifter(pitchShift) {
     'use strict';
     var globalPitchShiftedBuffers = [],
          CHANNELS_NUMBER = 2,
          globalProgress = [],
          eventListeners = [],
          events = {
               PITCH_SHIFTER_STARTED: 'onPitchShifterStarted',
               PITCH_SHIFTER_ENDED: 'onPitchShifterEnded',
               PITCH_SHIFTER_PROGRESS: 'onPitchShifterProgress'
          };

     function getCurrentProgress(progressList) {
          var n = progressList.length,
               sum = 0;
          while (n--) {
               sum += progressList[n];
          }
          return sum / progressList.length;
     }

     function onAllPitchShiferWorkersEnded() {
          notifyListeners(events.PITCH_SHIFTER_ENDED, {
               data: globalPitchShiftedBuffers
          });
     }

     function setProgressForIndex(progress, index) {
          var finalProgress;
          globalProgress[index] = progress;
          finalProgress = getCurrentProgress(globalProgress);
          notifyListeners(events.PITCH_SHIFTER_PROGRESS, {
               'progress': finalProgress
          });
          if (finalProgress >= 100) {
               onAllPitchShiferWorkersEnded();
          }
     }

     function onPitchShifterWorkerProgress(index, progress) {
          setProgressForIndex(progress, index);
     }

     function onPitchShifterWorkerEnded(index, pitchShiftedBuffer) {
          globalPitchShiftedBuffers[index] = pitchShiftedBuffer;
          setProgressForIndex(100, index);
     }

     function createPitchShiftedBuffer(node, pitch) {
          var worker = [],
               data, sendBuffer, buffer, withWorker = true,
               config, workerCallback, n;
          pitch = pitch || 2.0;
          config = {
               frameSize: 2048,
               sampleRate: node.context.sampleRate,
               osamp: 4,
               pitch: pitch
          };

          if (node && 'buffer' in node) {
               buffer = node.buffer;

               workerCallback = function(index) {
                    return function(e) {
                         if ('debug' in e.data) {
                              //console.log('debug', e.data);
                         } else if ('progress' in e.data) {
                              onPitchShifterWorkerProgress(index, e.data.progress);
                         } else {
                              onPitchShifterWorkerEnded(index, new Float32Array(e.data));
                         }
                    };
               };

               //TODO use a channel merger
               //var merger = node.context.createChannelMerger(2);
               //merger = audioContext.createChannelMerger(2);
               //buffer = merger.buffer;
               data = [buffer.getChannelData(0), buffer.getChannelData(1)];

               if (!withWorker) {
                    //console.time('pitch');
                    ////data = buffer.getChannelData(0);
                    //pitchShifted = new Float32Array(data);
                    ////pitchShift.PitchShiftEx(2, data.length, 1024, 32, 44100 / 2, data);
                    notifyListeners(events.PITCH_SHIFTER_ENDED, {
                         buffer0: pitchShift.pitchShiftEx(config.pitch, data[0].length, config.frameSize, config.osamp, config.sampleRate, data[0]),
                         buffer1: pitchShift.pitchShiftEx(config.pitch, data[1].length, config.frameSize, config.osamp, config.sampleRate, data[1])
                    });

                    //console.timeEnd('pitch');
                    //// pitchShiftJava.init(1024);
                    //// pitchShiftJava.setPitchShift(1.4);
                    //// pitchShiftJava.smbPitchShift(data, data, 0, data.length);

                    //console.log('done');
               } else {
                    n = data.length;
                    while (n--) {
                         worker[n] = new Worker('scripts/services/pitch_shift.js');
                         worker[n].addEventListener('message', workerCallback(n), false);
                         worker[n].postMessage(config);
                         worker[n].postMessage(data[n].buffer);
                    }
               }
          }
     }

     function addEventListener(object) {
          eventListeners.push(object);
     }

     function notifyListeners(event, data) {
          var n = eventListeners.length;
          while (n--) {
               if ('$emit' in eventListeners[n]) {
                    eventListeners[n].$emit(event, data);
               }
          }
     }

     function removeEventListener(object) {
          var n = eventListeners.length;
          while (n--) {
               if (eventListeners[n] === object) {
                    eventListeners.splice(n, 1);
               }
          }
     }

     function getPitchShiftedBuffer(channel) {
          return globalPitchShiftedBuffers[channel];
     }

     return {
          events: events,
          addEventListener: addEventListener,
          removeEventListener: removeEventListener,
          createPitchShiftedBuffer: createPitchShiftedBuffer,
          getPitchShiftedBuffer: getPitchShiftedBuffer
     };

}]);
