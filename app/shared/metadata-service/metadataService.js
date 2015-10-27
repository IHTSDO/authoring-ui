'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', 'snowowlService', function ($http, $rootScope, snowowlService) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // root branch for metadata computations
    var rootBranch = null;

    // relationship metadata
    var isaRelationshipId = '116680003';

    // component inactivation metadata
    var conceptInactivationParent = '900000000000481005';
    var conceptAssociationTargetInactivationParent = '900000000000522004';
    var conceptInactivationReasons = null;
    var conceptAssociationTargetInactivationReasons = null;

    function setConceptInactivationReasons() {
      // NOTE: Use inbound relationships and filter for children to prevent
      // requirement to
      // TODO Revisit if/when descendants call is changed to
      // include fsns
      return snowowlService.getConceptRelationshipsInbound(conceptInactivationParent, 'MAIN', 0, -1).then(function (items) {
        return items;
      });

    }

    return {

      isIsaRelationship: function (typeId) {
        return typeId === isaRelationshipId;
      },

      getConceptInactivationReasons: function () {
       return conceptInactivationReasons;
      },

      getConceptAssociationTargetInactivationReasons: function() {
        return conceptAssociationTargetInactivationReasons;
      },

      initialize: function (branch) {
        var rootBranch = branch;
        setConceptInactivationReasons();
      }

    };

  }])
;
