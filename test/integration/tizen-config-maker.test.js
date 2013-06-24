var path = require('path');
var chai = require('chai');

chai.should();
var expect = chai.expect;

var tizenConfigMaker = require('../../lib/tizen-config-maker');

describe('tizenConfigMaker', function () {
  it('should default config.configFile to config.xml', function () {
    var tizenConfig = tizenConfigMaker({});
    tizenConfig.configFile.should.equal('config.xml');
  });

  it('should use config.configFile if defined', function () {
    var tizenConfig = tizenConfigMaker({
      configFile: 'data/splat.xml'
    });
    tizenConfig.configFile.should.equal('data/splat.xml');
  });

  // this is testing that the xml2js parser returns objects in
  // the correct format such that they are retrieved into the correct
  // properties on the returned meta object
  it('should parse config.xml and return the correct ID and URI', function (done) {
    var tizenConfig = tizenConfigMaker({
      configFile: path.join(__dirname, 'data/config.xml')
    });

    tizenConfig.getMeta(function (err, result) {
      expect(err).to.be.null;

      result.should.eql({
        uri: 'https://bogus.url/bogusappln',
        id: 'bogusappln'
      });

      done();
    });
  });
});
