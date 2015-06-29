'use strict';
/*jshint -W117 */
/**
 * Tests sit right alongside the file they are testing, which is more intuitive
 * and portable than separating `src` and `test` directories. Additionally, the
 * build process will exclude all `.spec.js` files from the build
 * automatically.
 */
describe( 'about section', function() {
  beforeEach( module( 'scaService' ) );

  it( 'should have a dummy test', inject( function() {
    expect( true ).toBeTruthy();
  }));

  // TODO Add test for projects retrieval -- requires authentication
});
