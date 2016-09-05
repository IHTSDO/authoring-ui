'use strict';

//
// Service for concept inactivation
//
angular.module('singleConceptAuthoringApp')
  .service('inactivationService', ['$http', '$q', '$rootScope', 'scaService', 'snowowlService', 'notificationService', function ($http, $q, $rootScope, scaService, snowowlService, notificationService) {

    var parameters = {
      project : null,
      task : null,
      concept : null,
      reasonId : null,
      assocMembers : null
    };


    //
    // Getters & setters
    //
    function isInactivation() {

      //return false;

      // TODO REENABLE once inactivation is desired, this is used to trigger state detection
      return parameters.concept !== null &&  parameters.concept !== undefined;
    }

    function setParameters(branch, concept, reasonId, assocRefsetMembers, deletion) {
      console.debug('inactivationService setParameters', branch, concept, reasonId, assocRefsetMembers);
        parameters = {};
        parameters.concept = concept;
        parameters.branch = branch;
        parameters.reasonId = reasonId;
        parameters.assocMembers = assocRefsetMembers;
        parameters.deletion = false;
        if(deletion)
        {
            parameters.deletion = deletion;
        }
      
    }

    function getConcept() {
      return parameters.concept;
    }
      
    function getDeletion() {
      return parameters.deletion;
    }

    function getReasonId() {
      return parameters.reasonId;
    }
    function getAssocs() {
      return parameters.assocMembers;
    }


    //
    // Actions
    //

    function inactivateConcept() {
      var deferred = $q.defer();
      if (!parameters.concept) {
        deferred.reject('Inactivation called without selecting concept');
      } else if (!parameters.reasonId) {
        deferred.reject('Inactivation called without setting reason');
      } else {
        snowowlService.inactivateConcept(parameters.branch,  parameters.concept.conceptId,  parameters.reasonId,  parameters.assocMembers).then(function () {

          deferred.resolve();
        });
      }
      return deferred.promise;
    }

    function cancelInactivation() {
      parameters = {
        branch : null,
        concept : null,
        reasonId : null,
        assocMembers : null
      };
    }

    //
    // Method visibility
    //

    return {
      isInactivation: isInactivation,
      setParameters: setParameters,
      getConcept: getConcept,
      getReasonId: getReasonId,
      getDeletion: getDeletion,
      getAssocs: getAssocs,
      inactivateConcept: inactivateConcept,
      cancelInactivation: cancelInactivation
    };

  }])
;
