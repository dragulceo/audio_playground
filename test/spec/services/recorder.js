'use strict';

describe('Service: Recorder', function () {

  // load the service's module
  beforeEach(module('audioApp'));

  // instantiate service
  var Recorder;
  beforeEach(inject(function (_Recorder_) {
    Recorder = _Recorder_;
  }));

  it('should do something', function () {
    expect(!!Recorder).toBe(true);
  });

});
