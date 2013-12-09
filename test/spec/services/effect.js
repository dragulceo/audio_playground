'use strict';

describe('Service: Effect', function () {

  // load the service's module
  beforeEach(module('audioApp'));

  // instantiate service
  var Effect;
  beforeEach(inject(function (_Effect_) {
    Effect = _Effect_;
  }));

  it('should do something', function () {
    expect(!!Effect).toBe(true);
  });

});
