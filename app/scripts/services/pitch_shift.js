
(function (context) {
	'use strict';
     var pitchShifter = (function () {
          //Code translated from https://sites.google.com/site/mikescoderama/pitch-shifting
          var MAX_FRAME_LENGTH = 16000;
          var gInFIFO = new Float32Array(MAX_FRAME_LENGTH);
          var gOutFIFO = new Float32Array(MAX_FRAME_LENGTH);
          var gFFTworksp = new Float32Array(2 * MAX_FRAME_LENGTH);
          var gLastPhase = new Float32Array(MAX_FRAME_LENGTH / 2 + 1);
          var gSumPhase = new Float32Array(MAX_FRAME_LENGTH / 2 + 1);
          var gOutputAccum = new Float32Array(2 * MAX_FRAME_LENGTH);
          var gAnaFreq = new Float32Array(MAX_FRAME_LENGTH);
          var gAnaMagn = new Float32Array(MAX_FRAME_LENGTH);
          var gSynFreq = new Float32Array(MAX_FRAME_LENGTH);
          var gSynMagn = new Float32Array(MAX_FRAME_LENGTH);
          var gRover = 0;

          var progressCallback = function () {};

          function reset() {
               var n = MAX_FRAME_LENGTH;
               gLastPhase[n * 2] = 0;
               gSumPhase[n * 2] = 0;
               gFFTworksp[n * 2 - 1] = 0;
               gOutputAccum[n * 2 - 1] = 0;
               while (n--) {
                    gInFIFO[n] = gOutFIFO[n] = gFFTworksp[n] = gFFTworksp[2 * n] = gLastPhase[n] = gLastPhase[2 * n] = gSumPhase[n] = gSumPhase[2 * n] = gOutputAccum[n] = gOutputAccum[2 * n] = gAnaFreq[n] = gAnaMagn[n] = gSynFreq[n] = gSynMagn[n] = 0;
               }
          }

          function roundTowardsZero(value) {
               if (value > 0) {
                    return Math.floor(value);
               }
               return Math.ceil(value);
          }

          function pitchShift(pitchShiftValue, numSampsToProcess, sampleRate, indata) {
               return pitchShiftEx(pitchShiftValue, numSampsToProcess, 2048, 10, sampleRate, indata);
          }

          function pitchShiftEx(pitchShiftValue, numSampsToProcess, fftFrameSize, osamp, sampleRate, indata) {
               var magn, phase, tmp, wnd, real, imag;
               var freqPerBin, expct;
               var i, k, qpd, index, inFifoLatency, stepSize, fftFrameSize2;
               var previousPercent = 0, percent;

               reset();

               var outdata = indata;
               /* set up some handy variables */
               fftFrameSize2 = roundTowardsZero(fftFrameSize / 2);
               stepSize = roundTowardsZero(fftFrameSize / osamp);
               freqPerBin = sampleRate / fftFrameSize;
               expct = 2.0 * Math.PI * stepSize / fftFrameSize;
               inFifoLatency = roundTowardsZero(fftFrameSize - stepSize);
               if (gRover === 0) {
                    gRover = inFifoLatency;
               }

               /* main processing loop */
               for (i = 0; i < numSampsToProcess; i++) {

                    percent = Math.floor(i / numSampsToProcess * 100);
                    if (percent !== previousPercent) {
                         previousPercent = percent;
                         progressCallback(percent);
                    }

                    /* As long as we have not yet collected enough data just read in */
                    gInFIFO[gRover] = indata[i];
                    outdata[i] = gOutFIFO[gRover - inFifoLatency];
                    gRover++;

                    /* now we have enough data for processing */
                    if (gRover >= fftFrameSize) {
                         gRover = inFifoLatency;

                         /* do wnding and re,im interleave */
                         for (k = 0; k < fftFrameSize; k++) {
                              wnd = -0.5 * Math.cos(2.0 * Math.PI * k / fftFrameSize) + 0.5;
                              gFFTworksp[2 * k] = (gInFIFO[k] * wnd);
                              gFFTworksp[2 * k + 1] = 0.0;
                         }


                         /* ***************** ANALYSIS ******************* */
                         /* do transform */
                         shortTimeFourierTransform(gFFTworksp, fftFrameSize, -1);

                         /* this is the analysis step */
                         for (k = 0; k <= fftFrameSize2; k++) {

                              /* de-interlace FFT buffer */
                              real = gFFTworksp[2 * k];
                              imag = gFFTworksp[2 * k + 1];

                              /* compute magnitude and phase */
                              magn = 2.0 * Math.sqrt(real * real + imag * imag);
                              phase = Math.atan2(imag, real);

                              /* compute phase difference */
                              tmp = phase - gLastPhase[k];
                              gLastPhase[k] = phase;

                              /* subtract expected phase difference */
                              tmp -= k * expct;

                              /* map delta phase into +/- Pi interval */
                              qpd = roundTowardsZero(tmp / Math.PI);
                              /* jshint bitwise:false */
                              if (qpd >= 0) {
                                   qpd += qpd & 1;
                              } else {
                                   qpd -= qpd & 1;
                              }
                              /* jshint bitwise:true */
                              tmp -= Math.PI * qpd;

                              qpd = roundTowardsZero(qpd);

                              /* get deviation from bin frequency from the +/- Pi interval */
                              tmp = osamp * tmp / (2.0 * Math.PI);

                              /* compute the k-th partials' true frequency */
                              tmp = k * freqPerBin + tmp * freqPerBin;

                              /* store magnitude and true frequency in analysis arrays */
                              gAnaMagn[k] = magn;
                              gAnaFreq[k] = tmp;

                         }

                         /* ***************** PROCESSING ******************* */
                         /* this does the actual pitch shifting */
                         for (var zero = 0; zero < fftFrameSize; zero++) {
                              gSynMagn[zero] = 0;
                              gSynFreq[zero] = 0;
                         }

                         for (k = 0; k <= fftFrameSize2; k++) {
                              index = roundTowardsZero(k * pitchShiftValue);
                              if (index <= fftFrameSize2) {
                                   gSynMagn[index] += gAnaMagn[k];
                                   gSynFreq[index] = gAnaFreq[k] * pitchShiftValue;
                              }
                         }

                         /* ***************** SYNTHESIS ******************* */
                         /* this is the synthesis step */
                         for (k = 0; k <= fftFrameSize2; k++) {

                              /* get magnitude and true frequency from synthesis arrays */
                              magn = gSynMagn[k];
                              tmp = gSynFreq[k];

                              /* subtract bin mid frequency */
                              tmp -= k * freqPerBin;

                              /* get bin deviation from freq deviation */
                              tmp /= freqPerBin;

                              /* take osamp into account */
                              tmp = 2.0 * Math.PI * tmp / osamp;

                              /* add the overlap phase advance back in */
                              tmp += k * expct;

                              /* accumulate delta phase to get bin phase */
                              gSumPhase[k] += tmp;
                              phase = gSumPhase[k];

                              /* get real and imag part and re-interleave */
                              gFFTworksp[2 * k] = (magn * Math.cos(phase));
                              gFFTworksp[2 * k + 1] = (magn * Math.sin(phase));
                         }

                         /* zero negative frequencies */
                         for (k = fftFrameSize + 2; k < 2 * fftFrameSize; k++) {
                              gFFTworksp[k] = 0.0;
                         }

                         /* do inverse transform */
                         shortTimeFourierTransform(gFFTworksp, fftFrameSize, 1);

                         /* do wnding and add to output accumulator */
                         for (k = 0; k < fftFrameSize; k++) {
                              wnd = -0.5 * Math.cos(2.0 * Math.PI * k / fftFrameSize) + 0.5;
                              gOutputAccum[k] += (2.0 * wnd * gFFTworksp[2 * k] / (fftFrameSize2 * osamp));
                         }
                         for (k = 0; k < stepSize; k++) {
                              gOutFIFO[k] = gOutputAccum[k];
                         }

                         /* shift accumulator */
                         //memmove(gOutputAccum, gOutputAccum + stepSize, fftFrameSize * sizeof(float));
                         for (k = 0; k < fftFrameSize; k++) {
                              gOutputAccum[k] = gOutputAccum[k + stepSize];
                         }

                         /* move input FIFO */
                         for (k = 0; k < inFifoLatency; k++) {
                              gInFIFO[k] = gInFIFO[k + stepSize];
                         }
                    }
               }
               return outdata;
          }

          function shortTimeFourierTransform(fftBuffer, fftFrameSize, sign) {
               var wr, wi, arg, temp,
               tr, ti, ur, ui,
               i, bitm, j, le, le2, k,
               max;

               for (i = 2; i < 2 * fftFrameSize - 2; i += 2) {
                    /*jshint bitwise: false */
                    for (bitm = 2, j = 0; bitm < 2 * fftFrameSize; bitm <<= 1) {
                         if ((i & bitm) !== 0) {
                              j++;
                         }
                         j <<= 1;
                    }
                    /* jshint bitwise: true */
                    if (i < j) {
                         temp = fftBuffer[i];
                         fftBuffer[i] = fftBuffer[j];
                         fftBuffer[j] = temp;
                         temp = fftBuffer[i + 1];
                         fftBuffer[i + 1] = fftBuffer[j + 1];
                         fftBuffer[j + 1] = temp;
                    }
               }
               max = roundTowardsZero(Math.log(fftFrameSize) / Math.log(2.0) + 0.5);
               for (k = 0, le = 2; k < max; k++) {
                    /*jshint bitwise: false */
                    le <<= 1;
                    le2 = le >> 1;
                    arg = Math.PI / (le2 >> 1);
                    /*jshint bitwise: true */
                    ur = 1.0;
                    ui = 0.0;
                    wr = Math.cos(arg);
                    wi = (sign * Math.sin(arg));
                    for (j = 0; j < le2; j += 2) {

                         for (i = j; i < 2 * fftFrameSize; i += le) {
                              tr = fftBuffer[i + le2] * ur - fftBuffer[i + le2 + 1] * ui;
                              ti = fftBuffer[i + le2] * ui + fftBuffer[i + le2 + 1] * ur;
                              fftBuffer[i + le2] = fftBuffer[i] - tr;
                              fftBuffer[i + le2 + 1] = fftBuffer[i + 1] - ti;
                              fftBuffer[i] += tr;
                              fftBuffer[i + 1] += ti;

                         }
                         tr = ur * wr - ui * wi;
                         ui = ur * wi + ui * wr;
                         ur = tr;
                    }
               }
          }

          function setProgressCallback(callback) {
               progressCallback = callback;
          }

          // Public API here
          return {
               pitchShift: pitchShift,
               pitchShiftEx: pitchShiftEx,
               setProgressCallback: setProgressCallback
          };
     })();

     //is angular service
     if (context && ('angular' in context)) {
          angular.module('audioApp').factory('pitchShift', function () {
               return pitchShifter;
          });
     }

     //is worker
     if (context && ('self' in context) && context.self.addEventListener) {
          var cache = {}, self = context.self,
               messages = 2,
               onComplete;

          onComplete = function () {
               if (messages === 0) {
                    pitchShifter.setProgressCallback(function (percent) {
                         self.postMessage({
                              'progress': percent
                         });
                    });
                    pitchShifter.pitchShiftEx(parseFloat(cache.pitch),
                    cache.buffer.length,
                    parseInt(cache.frameSize, 10),
                    parseInt(cache.osamp, 10),
                    parseInt(cache.sampleRate, 19),
                    cache.buffer);
                    //self.postMessage({
                    //     'debug': cache.buffer.length
                    //});
                    self.postMessage(cache.buffer.buffer);
               }
          };

          self.addEventListener('message', function (e) {
               var data = e.data,
                    obj,
                    keys = ['pitch', 'frameSize', 'osamp', 'sampleRate'],
                    n = keys.length;
               while (n--) {
                    if (keys[n] in data) {
                         obj = true;
                         cache[keys[n]] = data[keys[n]];
                    }
               }
               if (!obj) {
                    cache.buffer = new Float32Array(data);
                    messages--;
               } else {
                    messages--;
               }
               onComplete();

          }, false);
     }
})(this);
