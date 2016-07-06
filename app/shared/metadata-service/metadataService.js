'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // project cache (still used?)
    var projects = [];

    // relationship metadata
    var isaRelationshipId = '116680003';

    // component inactivation metadata
    var conceptInactivationReasons = [
      {id: 'AMBIGUOUS', text: 'Ambiguous component', display: [4]},
      {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere', display: [3]},
      {id: 'DUPLICATE', text: 'Duplicate component', display: [7]},
      {id: 'ERRONEOUS', text: 'Erroneous component', display: [6, 9]},
      {id: 'LIMITED', text: 'Limited component', display: [9]},
      {id: 'OUTDATED', text: 'Outdated component', display: [6, 9]},
      {id: 'PENDING_MOVE', text: 'Pending move', display: [3]},
      {id: 'RETIRED', text: 'Reason not stated', display: [6, 9]}
    ];
    // var inactivationParent = '900000000000481005';

    var associationInactivationReasons =
      [
        {
          id: 'ALTERNATIVE',
          text: 'ALTERNATIVE association reference set',
          display: 1
        },
        {
          id: 'MOVED_FROM',
          text: 'MOVED FROM association reference set',
          display: 2
        },
        {
          id: 'MOVED_TO',
          text: 'MOVED TO association reference set',
          display: 3
        },
        {
          id: 'POSSIBLY_EQUIVALENT_TO',
          text: 'POSSIBLY EQUIVALENT TO association reference set',
          display: 4
        },
        {
          id: 'REFERS_TO',
          text: 'REFERS TO concept association reference set',
          display: 5
        },
        {
          id: 'REPLACED_BY',
          text: 'REPLACED BY association reference set',
          display: 6
        },
        {
          id: 'SAME_AS',
          text: 'SAME AS association reference set',
          display: 7
        },
        {
          id: 'SIMILAR_TO',
          text: 'SIMILAR TO association reference set',
          display: 8
        },
        {
          id: 'WAS_A',
          text: 'WAS A association reference set',
          display: 9
        }
      ];
    // var associationInactivationParent = '900000000000522004';

    // description inactivation metadata
    var descriptionInactivationReasons = [
      {id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere'},
      {id: 'CONCEPT_NON_CURRENT', text: 'Concept non-current'},
      {id: 'DUPLICATE', text: 'Duplicate component'},
      {id: 'ERRONEOUS', text: 'Erroneous component'},
      {id: 'INAPPROPRIATE', text: 'Inappropriate component'},
      {id: 'LIMITED', text: 'Limited component'},
      {id: 'OUTDATED', text: 'Outdated component'},
      {id: 'PENDING_MOVE', text: 'Pending move'},
      {id: 'RETIRED', text: 'Reason not stated'}

    ];

    //
    // International SNOMEDCT metadata
    //

    var internationalMetadata = {
      modules: [{
        id: '900000000000207008',
        name: 'SNOMED CT core module (core metadata concept)'
      }, {
        id: '900000000000012004',
        name: 'SNOMED CT model component module (core metadata concept)'
      }],
      languages: ['en'],
      dialects: {
        '900000000000509007': 'en-us', '900000000000508004': 'en-gb'
      }
    };

    //
    // Branch/Task-level metadata
    // Task level information
    // and should be automatically set by edit.js
    // and similar views
    var branchMetadata = {};

    var extensionMetadata = null;

    //
    // Metadata setters
    //

    // Extension metadata
    // TODO Chris Swires, this is the setter for use
    // by home.js, review-tasks.js, and project.js
    function setExtensionMetadata(metadata) {
      extensionMetadata = metadata;
    }

    // Branch metadata
    // TODO Chris Swires, this is the setter for use
    // by views like edit.js, and should already be
    // fully functional. Shouldn't need to worry about this.
    function setBranchMetadata(branchMetadataObj) {
      branchMetadata = branchMetadataObj;
    }

    //
    // Module retrieval functions
    //

    // retrieves the first extension module id if in extension
    // returns the first international module id if not
    // used by componentAuthoringUtil to set module on new components
    function getCurrentModuleId() {
      return extensionMetadata ?
        extensionMetadata.modules[0].id : internationalMetadata.modules[0].id;
    }

    // checks if specified module is part of extension
    function isExtensionModule(moduleId) {
      if (!extensionMetadata) {
        return false;
      }
      return extensionMetadata.modules.filter(function (module) {
          return module.id === moduleId;
        }).length > 0;
    }

    // checks if specified dialect belongs to extension
    function isExtensionDialect(dialectId) {
      if (!extensionMetadata) {
        return false;
      } else {
        return extensionMetadata.dialects.hasOwnProperty(dialectId);
      }
    }

    // checks if specified module is locked to editing
    function isLockedModule(moduleId) {
      if (!extensionMetadata) {
        return false;
      }
      return !isExtensionModule(moduleId);
    }


    // if released, return international edition, if not released
    function getModulesForModuleId(moduleId) {
      if (isExtensionModule(moduleId)) {

        return extensionMetadata.modules;
      } else {

        return internationalMetadata.modules;
      }
    }

    //
    // Branch functions -- only used for branchPath resolution
    //

    function getBranch() {
      return branchMetadata.branchPath;
    }

    function getBranchRoot() {
      return branchMetadata.branchPath.split('/')[0];
    }

    // returns branch dialects plus base dialects
    // NOTE: Branch dialects override defaults
    function getAllDialects() {
      // get the test branch dialects
      var dialects = angular.copy(internationalMetadata.dialects);
      if (extensionMetadata && extensionMetadata.dialects) {
        for (var key in extensionMetadata.dialects) {
          dialects[key] = extensionMetadata.dialects[key];
        }
      }
      return dialects;
    }

    function getDialectsForModuleId(moduleId) {
      // TODO Confirm this behavior (WRP-2808)
      // Always return the extension dialects if available
      // even for non-extension content, in order to allow
      // authors to add acceptabilities for existing descriptions
      // if (isExtensionModule(moduleId)) {
      if (extensionMetadata) {
        return extensionMetadata.dialects;
      } else {
        return internationalMetadata.dialects;
      }
    }

    function getLanguagesForModuleId(moduleId) {

      if (isExtensionModule(moduleId)) {
        return extensionMetadata.languages;
      } else {
        return internationalMetadata.languages;
      }
    }


    //
    // Relationship metadata functions
    //
    function isIsaRelationship(typeId) {
      return typeId === isaRelationshipId;
    }

    //
    // Inactivation reason retrieval functions
    //

    function getConceptInactivationReasons() {
      return conceptInactivationReasons;
    }


    function getAssociationInactivationReasons() {
      return associationInactivationReasons;
    }

    function getDescriptionInactivationReasons() {
      return descriptionInactivationReasons;
    }

    //
    // Cached project retrieval functions
    //

    function getProjects() {
      return projects;
    }

    function setProjects(projectsList) {
      projects = projectsList;
    }

    return {

      // relationship functions
      isIsaRelationship: isIsaRelationship,

      // project cache getters/setters
      setProjects: setProjects,
      getProjects: getProjects,

      // inactivation reason retrieval
      getConceptInactivationReasons: getConceptInactivationReasons,
      getDescriptionInactivationReasons: getDescriptionInactivationReasons,
      getAssociationInactivationReasons: getAssociationInactivationReasons,

      // boolean checks exposed for use
      isLockedModule: isLockedModule,
      isExtensionDialect: isExtensionDialect,

      // extension module-dependent retrieval functions
      getCurrentModuleId: getCurrentModuleId,
      getModulesForModuleId: getModulesForModuleId,
      getLanguagesForModuleId: getLanguagesForModuleId,
      getDialectsForModuleId: getDialectsForModuleId,
      getAllDialects: getAllDialects,

      // module and branch metadata setters
      setExtensionMetadata: setExtensionMetadata,
      setBranchMetadata: setBranchMetadata,

      // branch/task fupath retrieval functions
      getBranch: getBranch,
      getBranchRoot: getBranchRoot,

      // TODO Functions exposed for dev work, remove when complete

      getInternationalMetadata: function () {
        return internationalMetadata;
      },

      getExtensionMetadata: function () {
        console.debug('extension metadata', extensionMetadata);
        return extensionMetadata;
      },
      getBranchMetadata: function () {
        return branchMetadata;
      }


    };

  }])
;
