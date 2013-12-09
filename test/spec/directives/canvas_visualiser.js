'use strict';

describe('Directive: canvasVisualiser', function () {

  // load the directive's module
  beforeEach(module('audioApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<canvas-visualiser></canvas-visualiser>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the canvasVisualiser directive');
  }));
});
