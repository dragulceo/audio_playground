angular.module('audioApp').directive('canvasVisualiser', function () {
     'use strict';
     return {
          template: '<canvas></canvas>',
          restrict: 'E',
          scope: {
               analyser: '=?analyserInstance'
          },
          link: function postLink(scope, element) {
               var canvasContext, canvas, drawWidth, drawHeight, analyser, requestAnimationFrameLoopRunning;

               function initCanvasContext(width, height) {
                    drawWidth = width;
                    drawHeight = height;
                    canvasContext.clearRect(0, 0, drawWidth, drawHeight);
                    canvasContext.fillStyle = 'rgba(' + parseInt(Math.random() * 255, 10) + ',' + parseInt(Math.random() * 255, 10) + ',' + parseInt(Math.random() * 255, 10) + ',1)';
               }

               function render() {
                    var data = [1],
                         n, val;
                    if (canvasContext) {
                         canvasContext.clearRect(0, 0, drawWidth, drawHeight);
                         if (scope.analyser && scope.analyser.instance) {
                              analyser = scope.analyser.instance;
                              n = analyser.frequencyBinCount;
                              data = new Uint8Array(n);
                              analyser.getByteFrequencyData(data);
                              while (n--) {
                                   val = data[n] / 3;
                                   canvasContext.fillRect(n * 2, drawHeight - val, 1, val);
                              }

                         } else {
							 //Should do something here
                         }
                    }
                    if(requestAnimationFrameLoopRunning) {
                         window.requestAnimationFrame(render);
                    }
               }

               scope.$watch('analyser.instance', function (newValue) {
                    //render();
                    if(newValue) {
                         requestAnimationFrameLoopRunning = true;
                         window.requestAnimationFrame(render);
                    } else {
                         requestAnimationFrameLoopRunning = false;
                    }
               });



               canvas = element[0].firstChild;
               canvasContext = canvas.getContext('2d');
               initCanvasContext(canvas.width, canvas.height);
          }
     };
});
