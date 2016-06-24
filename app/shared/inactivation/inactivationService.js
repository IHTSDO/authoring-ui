'use strict';

//
// Service for concept inactivation
//
angular.module('singleConceptAuthoringApp')
  .service('inactivationService', ['$http', '$rootScope', 'scaService', 'snowowlService', 'notificationService', function ($http, $rootScope, scaService, snowowlService, notificationService) {

    // the concept selected for inactivation in this session
    var conceptToInactivate = null;

    //
    // Getters & setters
    //
    function isInactivation() {
      return conceptToInactivate != null && conceptToInactivate != undefined;
    }

    function setConceptToInactivate(concept) {
      conceptToInactivate = concept;
      $rootScope.$broadcast('inactivationConcept', {inactivationConcept: concept});
    }

    function getConceptToInactivate() {
      return conceptToInactivate;
    }

    //
    // Actions
    //

    function inactivateConcept() {
      var deferred = $q.defer();
      if (conceptToInactivate) {
        deferred.reject('Inactivation called without selecting concept');
      } else {

        // TODO Decide whether to return the inactivated concept here, or to use getter
        deferred.resolve(true);
      }

      return deferred.promise;

      // TODO Perform validations as required
      // TODO Perform necessary actions here
      /*
       NOTE: Earlier found in conceptEdit.js, moved here

       // validate the concept
       snowowlService.validateConcept($routeParams.projectKey, $routeParams.taskKey, conceptCopy).then(function (validationResults) {
       // check for errors -- NOTE: Currently unused, but errors are
       // printed to log if detected
       var errors = validationResults.filter(
       function (result) {
       return result.type === 'ERROR';
       });

       if (errors.length > 0) {
       console.log('Detected errors in concept when inactivating', errors);
       } else {
       console.log('No errors detected');
       }

       selectInactivationReason('Concept', inactivateConceptReasons, inactivateAssociationReasons, scope.concept.conceptId, scope.branch).then(function (results) {

       notificationService.sendMessage('Inactivating concept (' + results.reason.text + ')');

       snowowlService.inactivateConcept(scope.branch, scope.concept.conceptId, results.reason.id, results.associationTarget).then(function () {

       scope.concept.active = false;

       // if reason is selected, deactivate all descriptions and
       // relationships
       if (results.reason) {

       // straightforward inactivation of relationships
       // NOTE: Descriptions stay active so a FSN can still be
       // found
       angular.forEach(scope.concept.relationships, function (relationship) {
       relationship.active = false;
       });

       // save concept but bypass validation checks
       saveHelper().then(function () {
       notificationService.sendMessage('Concept inactivated');
       }, function (error) {
       notificationService.sendError('Concept inactivation indicator persisted, but concept could not be saved');
       });
       }
       }, function () {
       notificationService.sendError('Could not save inactivation reason for concept, concept will remain active');
       });

       });
       */

    }

    function cancelInactivation() {
      // clear the concept to inactivate
      setConceptToInactivate(null);

      // TOOD Perform whatever else is necessary here
    }

    //
    // Method visibility
    //

    return {
      isInactivation: isInactivation,
      setConceptToInactivate: setConceptToInactivate,
      getConceptToInactivate: getConceptToInactivate,
      inactivateConcept: inactivateConcept,
      cancelInactivation: cancelInactivation
    }

  }])
;
