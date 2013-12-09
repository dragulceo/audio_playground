'use strict';

describe('Service: PitchShifter', function () {

  // load the service's module
  beforeEach(module('audioApp'));

  // instantiate service
  var PitchShifter;
  beforeEach(inject(function (_PitchShifter_) {
    PitchShifter = _PitchShifter_;
  }));

  it('should do something', function () {
    expect(!!PitchShifter).toBe(true);
  });

});
