'use strict';
/*jshint -W117 */
/**
 * Tests sit right alongside the file they are testing, which is more intuitive
 * and portable than separating `src` and `test` directories. Additionally, the
 * build process will exclude all `.spec.js` files from the build
 * automatically.
 */
describe( 'edit section', function() {
  beforeEach( module( 'singleConceptAuthoringApp.edit' ) );

  it( 'should have a dummy test', inject( function() {
    expect( true ).toBeTruthy();
  }));


  ////////////////////////////////////////////////////////
  // Test Group: Sidebar Elements Loaded
  ////////////////////////////////////////////////////////

  describe ('Edit Component: side bar elements loaded', function() {

  })

  // taxonomy loaded: tab and root concept exist

  // search loaded: tab and search field exist

  // saved list loaded:  tab exists

  // task detail loaded:  tab and classify button exist

  // feedback loaded:  tab exists


  ////////////////////////////////////////////////////////
  // Test Group: Views
  ////////////////////////////////////////////////////////

  describe ('Edit Component: setting views', function() {

  })
  // initial view parameters correct (default)

  // set view:  default

  // set view:  hide model

  // set view:  hide sidebar

  // set view:  classification

  // set view:  validation

  ////////////////////////////////////////////////////////
  // Test Group: Model Diagrams
  ////////////////////////////////////////////////////////

  // one model per concept

  // model stretches to fit row

  ////////////////////////////////////////////////////////
  // Test Group: UI States
  ////////////////////////////////////////////////////////

  // saved list returns 404 for non-existent task

  // saved list call made on load

  // save list updates on change

  // edit panel returns 404 for non-existent task

  // edit list call made on load

  // edit list updates on change

  ////////////////////////////////////////////////////////
  // Test Group: Edit Panel
  ////////////////////////////////////////////////////////

  // create new concept header exists

  // dummy concepts: one concept-edit directive exists per concept

  ////////////////////////////////////////////////////////
  // Test Group: Classifications
  ////////////////////////////////////////////////////////

  // classification loaded

  // dummy classification:  all relationshipChanges on first tab

  // dummy classification:  only redundant stated relationships on second tab

  ////////////////////////////////////////////////////////
  // Test Group: Validations
  ////////////////////////////////////////////////////////

  // validation loaded

  ////////////////////////////////////////////////////////
  // Test Group: Angular notifications
  ////////////////////////////////////////////////////////

   // saving concept
});