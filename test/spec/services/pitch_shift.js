'use strict';

describe('Service: PitchShift', function () {

  // load the service's module
  beforeEach(module('audioApp'));

  // instantiate service
  var PitchShift;
  beforeEach(inject(function (_PitchShift_) {
    PitchShift = _PitchShift_;
  }));

  it('should do something', function () {
    expect(!!PitchShift).toBe(true);
  });

});
