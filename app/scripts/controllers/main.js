angular.module('audioApp').controller('MainCtrl', ['$scope', 'audio', 'effect', 'recorder', 'pitchShifter',

function($scope, audioFactory, effectFactory, recorder, pitchShifter) {
     'use strict';
     var audio = audioFactory.newAudio(),
          originalBuffer = [],
          effects = {};
     $scope.hasOriginalBuffer = false;
     $scope.gain = 1;
     $scope.reverbSeconds = 0.0;
     $scope.reverbDecay = 0.0;
     $scope.reverbReverse = 0;
     $scope.delay = 0.0;
     $scope.wave = 0.0;
     $scope.filterType = 0;
     $scope.filterFreq = 0;
     $scope.filterQ = 0;
     $scope.pitchShiftValue = 1.6;
     $scope.pitchShiftProgress = 0;
     $scope.recording = false;
     $scope.hasPlayable = false;
     $scope.pitchShifting = false;
     $scope.pitchShifted = false;
     $scope.playing = false;
     $scope.micAnalyser = {
          instance: false
     };
     $scope.playAnalyser = {
          instance: false
     };
     audio.setOnEndedHandler(function() {
          $scope.playing = false;
          $scope.$apply();
     });

     function onEffectSliderChanged(effectName, remove) {
          var params = Array.prototype.slice.call(arguments, 2),
               currentEffect = effects[effectName];
          if (remove) {
               if (currentEffect) {
                    //remove effect node
                    audio.removeNode(currentEffect);
                    effects[effectName] = null;
               }
          } else {
               if (!currentEffect) {
                    params.splice(0, 0, effectName, audio.getAudioContext());
                    currentEffect = effects[effectName] = effectFactory.getEffectWithName.apply(effectFactory, params);
                    audio.addProcessingNode(currentEffect);
               } else {
                    currentEffect.updateParams.apply(currentEffect, params);
               }
          }
     }
     $scope.onReverbChange = function() {
          var remove = false;
          if (parseFloat($scope.reverbSeconds) === 0 && parseFloat($scope.reverbDecay) === 0) {
               remove = true;
          }
          onEffectSliderChanged(effectFactory.list.REVERB, remove, $scope.reverbSeconds, $scope.reverbDecay, $scope.reverbReverse);
     };
     $scope.onDelayChange = function() {
          onEffectSliderChanged(effectFactory.list.DELAY, parseFloat($scope.delay) === 0, $scope.delay);
     };
     $scope.onWaveChange = function() {
          onEffectSliderChanged(effectFactory.list.WAVE, parseFloat($scope.wave) === 0, $scope.wave);
     };
     $scope.onFilterChange = function() {
          var remove = false;
          if (parseFloat($scope.filterFreq) === 0 && parseFloat($scope.filterFreq) === 0) {
               remove = true;
          }
          onEffectSliderChanged(effectFactory.list.FILTER, remove, $scope.filterType, $scope.filterFreq, $scope.filterFreq);
     };
     $scope.onGainChange = function() {
          onEffectSliderChanged(effectFactory.list.GAIN, parseFloat($scope.gain) >= 1.0, $scope.gain);
     };
     $scope.onLoopChange = function() {
          audio.setLoop($scope.loop);
     };
     $scope.onPitchClick = function() {
          if ($scope.pitchActive) {
               audio.doPitch();
          }
     };
     $scope.onStartRecordButtonClick = function() {
          $scope.onStopButtonClick();
          $scope.hasPlayable = false;
          $scope.micAnalyser.instance = recorder.getCurrentAudioManager().getAnalyser();
          recorder.startRecording();
          $scope.recording = true;
     };

     $scope.setPlayable = function() {
          audio.startOutput();
          $scope.hasPlayable = true;
          if (!$scope.$$phase) {
               $scope.$apply();
          }
     };
     $scope.setBufferToPlay = function(buffer) {
          audio.setBufferSource(buffer);
          $scope.setPlayable();
     };
     $scope.onStopRecordButtonClick = function() {
          recorder.stopRecording($scope.setBufferToPlay);
          $scope.recording = false;
          $scope.micAnalyser.instance = false;
     };
     $scope.onLoadTestData = function() {
          $scope.onStopButtonClick();
          audio.setURLInput('./assets/itsmylife.mp3', $scope.setPlayable);
          $scope.pitchShifted = false;
     };
     $scope.onLoadFile = function() {
          var reader, files = document.querySelector('#loadFilename').files;
          if (files.length > 0) {
               reader = new FileReader();
               reader.onload = function(e) {
                    audio.setRawLoadedData(e.currentTarget.result, function() {
                         $scope.setPlayable();
                    });
               };
               reader.readAsArrayBuffer(files[0]);
          }
     };
     $scope.onStartButtonClick = function() {
          $scope.playAnalyser.instance = audio.getAnalyser();
          audio.play($scope.loop);
          $scope.playing = true;
     };
     $scope.onStopButtonClick = function() {
          audio.stop();
          $scope.playing = false;
          $scope.playAnalyser.instance = false;
     };
     $scope.onPitchShiftButtonClick = function() {
          $scope.onStopButtonClick();
          //$scope.onUndoPitchButtonClick();
          if (audio.hasSource()) {
               originalBuffer.push([audio.getSource().buffer.getChannelData(0), audio.getSource().buffer.getChannelData(1)]);
               $scope.hasOriginalBuffer = true;

               pitchShifter.addEventListener($scope);
               $scope.$on(pitchShifter.events.PITCH_SHIFTER_PROGRESS, $scope.updatePitchShiftProgressBar);
               $scope.$on(pitchShifter.events.PITCH_SHIFTER_ENDED, $scope.setPitchShiftedBufferToPlay);
               pitchShifter.createPitchShiftedBuffer(audio.getSource(), $scope.pitchShiftValue);
          }
     };

     $scope.onUndoPitchButtonClick = function() {
          if (originalBuffer.length > 0) {
               $scope.onStopButtonClick();
               audio.setFloat32ArrayBuffers(originalBuffer.pop());
               $scope.hasOriginalBuffer = originalBuffer.length;
               $scope.setPlayable();
          }
     };
     $scope.updatePitchShiftProgressBar = function(e, data) {
          var pitchShiftProgress = data.progress / 100;
          if (pitchShiftProgress > 0 && pitchShiftProgress < 1) {
               $scope.pitchShifting = true;
          } else {
               $scope.pitchShifting = false;
               if (pitchShiftProgress === 1) {
                    $scope.pitchShifted = true;
               }
          }
          $scope.pitchShiftProgress = pitchShiftProgress;
          $scope.$apply();
     };
     $scope.setPitchShiftedBufferToPlay = function(e, data) {
          pitchShifter.removeEventListener($scope);
          audio.setFloat32ArrayBuffers(data.data);
          $scope.setPlayable();
     };

     $scope.onDownloadButtonClick = function() {
          audio.save();
     };
     //console.log(analyser);
     //analyser = recorder.getCurrentAudioManager() ?  recorder.getCurrentAudioManager().getAnalyser() : false;
     //analyser = audio.getAnalyser();
}]);
