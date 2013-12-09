angular.module('audioApp').factory('effect', [
     function effect() {
          'use strict';
          var effectCreator = {}, effectsList = {
                    REVERB: 'reverb',
                    WAVE: 'wave',
                    DELAY: 'delay',
                    FILTER: 'filter',
                    GAIN: 'gain',
                    BUFFER: 'buffer',
                    PITCH: 'pitch'
               },
               getRandomImpulse;
          getRandomImpulse = function (context, seconds, decay, reverse) {
               //code from here
               //https://github.com/web-audio-components/simple-reverb/blob/master/index.js
               var rate = context.sampleRate,
                    length, impulse, impulseL, impulseR, n, i;
               length = rate * seconds || 1;
               impulse = context.createBuffer(2, length, rate);
               impulseL = impulse.getChannelData(0);
               impulseR = impulse.getChannelData(1);
               for (i = 0; i < length; i++) {
                    n = reverse ? length - i : i;
                    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
                    impulseR[i] = impulseL[i];
               }
               return impulse;
          };
          //NOT actual reverb
          effectCreator[effectsList.REVERB] = function (context, seconds, decay, reverse) {
               var effect = context.createConvolver();
               effect._context = context;
               effect.updateParams = effect.setSecondsAndDecay = function (seconds, decay, reverse) {
                    effect.buffer = getRandomImpulse(this._context, seconds, decay, reverse);
               };
               effect.setSecondsAndDecay(seconds, decay, reverse);
               return effect;
          };
          effectCreator[effectsList.WAVE] = function (context, curve) {
               var effect = context.createWaveShaper(),
                    samples = 2048,
                    curveArray = new Float32Array(samples);
               effect.updateParams = effect.setCurve = function (amount) {
                    //https://github.com/janesconference/MorningStar/blob/master/audio/WAAMorningStar.js
                    if ((amount >= 0) && (amount < 1)) {
                         var k = 2 * amount / (1 - amount),
                              x, i;
                         for (i = 0; i < samples; i += 1) {
                              // LINEAR INTERPOLATION: x := (c - a) * (z - y) / (b - a) + y
                              // a = 0, b = 2048, z = 1, y = -1, c = i
                              x = (i - 0) * (1 - (-1)) / (samples - 0) + (-1);
                              curveArray[i] = (1 + k) * x / (1 + k * Math.abs(x));
                         }
                    }
                    effect.curve = curveArray;
               };
               effect.setCurve(curve);
               return effect;
          };
          effectCreator[effectsList.DELAY] = function (context, seconds) {
               var effect;
               if ('createDelayNode' in context) {
                    effect = context.createDelayNode();
               } else if ('createDelay' in context) {
                    effect = context.createDelay();
               }
               effect.updateParams = effect.setDelay = function (seconds) {
                    effect.delayTime.value = parseFloat(seconds);
               };
               effect.setDelay(seconds);
               return effect;
          };
          effectCreator[effectsList.FILTER] = function (context, type, freq, Q) {
               //http://www.html5rocks.com/en/tutorials/webaudio/intro/js/filter-sample.js
               var effect, minValue, maxValue, numberOfOctaves;
               effect = context.createBiquadFilter();
               minValue = 40;
               maxValue = context.sampleRate / 2;
               // Logarithm (base 2) to compute how many octaves fall in the range.
               numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
               effect.updateParams = effect.setFilterWithTypeFrequencyAndQ = function (type, freq, Q) {
                    effect.type = parseInt(type, 10);
                    effect.frequency.value = maxValue * Math.pow(2, numberOfOctaves * (freq - 1.0)); //5.0;
                    effect.Q.value = Q;
               };
               effect.setFilterWithTypeFrequencyAndQ(type, freq, Q);
               return effect;
          };
          effectCreator[effectsList.GAIN] = function (context, gain) {
               var effect;
               if ('createGainNode' in context) {
                    effect = context.createGainNode();
               } else if ('createGain' in context) {
                    effect = context.createGain();
               }
               effect.updateParams = effect.setGain = function (gain) {
                    effect.gain.value = parseFloat(gain);
               };
               effect.setGain(gain);
               return effect;
          };
          effectCreator[effectsList.BUFFER] = function (context) {
               var effect = context.createBufferSource();
               effect.noteOn(0);
               return effect;
          };
          function getEffectWithName(effect) {
               var args = Array.prototype.slice.call(arguments, 1);
               return effectCreator[effect].apply(null, args);
          }
          // Public API here
          return {
               getReverb: function (audioContext, seconds, decay) {
                    return getEffectWithName(effectsList.REVERB, audioContext, seconds, decay);
               },
               getWave: function (audioContext, curve) {
                    return getEffectWithName(effectsList.WAVE, audioContext, curve);
               },
               getDelay: function (audioContext, seconds) {
                    return getEffectWithName(effectsList.DELAY, audioContext, seconds);
               },
               getFilter: function (audioContext, freq, Q) {
                    return getEffectWithName(effectsList.FILTER, audioContext, freq, Q);
               },
               getGain: function (audioContext, gain) {
                    return getEffectWithName(effectsList.GAIN, audioContext, gain);
               },
               getPitch: function (audioContext) {
                    return getEffectWithName(effectsList.PITCH, audioContext);
               },
               list: effectsList,
               getEffectWithName: getEffectWithName
          };
     }
]);
