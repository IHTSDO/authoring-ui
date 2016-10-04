'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // project cache (still used?)
    var projects = [];

    // whether mrcm is currently enabled (default true)
    var mrcmEnabled = true;

    // relationship metadata
    var isaRelationshipId = '116680003';

    var snomedCtRootId = '138875005';

    function getSnomedCtRootId() {
      return snomedCtRootId;
    }


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
          conceptId: '900000000000530003',
          text: 'ALTERNATIVE association reference set',
          display: 1
        },
        {
          id: 'MOVED_FROM',
          conceptId: '900000000000525002',
          text: 'MOVED FROM association reference set',
          display: 2
        },
        {
          id: 'MOVED_TO',
          conceptId: '900000000000524003',
          text: 'MOVED TO association reference set',
          display: 3
        },
        {
          id: 'POSSIBLY_EQUIVALENT_TO',
          conceptId: '900000000000523009',
          text: 'POSSIBLY EQUIVALENT TO association reference set',
          display: 4
        },
        {
          id: 'REFERS_TO',
          conceptId: '900000000000531004',
          text: 'REFERS TO concept association reference set',
          display: 5
        },
        {
          id: 'REPLACED_BY',
          conceptId: '900000000000526001',
          text: 'REPLACED BY association reference set',
          display: 6
        },
        {
          id: 'SAME_AS',
          conceptId: '900000000000527005',
          text: 'SAME AS association reference set',
          display: 7
        },
        {
          id: 'SIMILAR_TO',
          conceptId: '900000000000529008',
          text: 'SIMILAR TO association reference set',
          display: 8
        },
        {
          id: 'WAS_A',
          conceptId: '900000000000528000',
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
      acceptLanguageMap: 'en-us;q=0.8,en-gb;q=0.5',
      defaultLanguage: 'en',
      languages: ['en'],
      dialects: {
        '900000000000509007': 'en-us', '900000000000508004': 'en-gb'
      }
    };

    //
    // Extension metadata
    //
    var extensionMetadata = null;


    // Branch/Task-level metadata
    // Task level information
    // and should be automatically set by edit.js
    // and similar views
    var branchMetadata = {};


    //
    // Metadata setters
    //

    // Extension metadata
    function setExtensionMetadata(metadata) {

      // only set extension metadata if defaultModuleId is present
      if (!metadata || !metadata.hasOwnProperty('defaultModuleId')) {
        extensionMetadata = null;
      } else {

        // temporary variables used in parsing metadata
        var dialects = {'900000000000509007': 'en-us'};
        var languages = ['en'];
        var defaultLanguage = null;
        var defaultLanguageRefsetId = null;

        // extract the available language refset ids, dialect ids, language codes
        for (var key in metadata) {
          if (metadata.hasOwnProperty(key)) {
            var match = key.match(/requiredLanguageRefset\.(.+)/);
            if (match && match[1]) {
              languages.push(match[1]);
              dialects[metadata[key]] = match[1];

              // set the default refset id if not already set
              if (!defaultLanguageRefsetId) {
                defaultLanguageRefsetId = metadata[key];
              }

              // set the default language if not already set
              if (!defaultLanguage) {
                defaultLanguage = match[1];
              }
            }
          }
        }

        //
        // Validate extracted values
        //
        if (!metadata.shortname) {
          console.warn('No country code (shortname) supplied for extension metadata');
        }
        if (languages.length === 1) {
          console.error('Error setting extension metadata: module was specified but no languages/dialects found');
        }
        if (!defaultLanguageRefsetId) {
          console.error('Could not determine language refset for extension metadata');
        }


        // populate the cached extension metadata from passed metadata and temporary variables
        extensionMetadata = {
          modules: [
            {
              id: metadata.defaultModuleId,
              name: metadata.defaultModuleName
            }
          ],

          acceptLanguageMap: defaultLanguage + '-' + (metadata.shortname ? metadata.shortname.toUpperCase() : 'XX') + '-x-' + defaultLanguageRefsetId + ';q=0.8,en-US;q=0.5',
          defaultLanguage: defaultLanguage,
          languages: languages,
          dialects: dialects
        };
        $rootScope.$broadcast('setExtensionMetadata');

      }
    }

    // Set the branch metadata from project or task
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

    // return the international module id
    function getInternationalModuleId() {
      return internationalMetadata.modules[0].id;
    }

    // checks if specified module is part of extension
    function isExtensionModule(moduleId) {
      if (!extensionMetadata || !Array.isArray(extensionMetadata.modules)) {
        return false;
      }
      return extensionMetadata.modules.filter(function (module) {
          return module.id === moduleId;
        }).length > 0;
    }

    function isUsDialect(dialectId) {
      return dialectId === '900000000000509007';
    }

    function isGbDialect(dialectId) {
      return dialectId === '900000000000508004';
    }

    // checks if specified dialect belongs to extension
    function isExtensionDialect(dialectId) {
      if (!extensionMetadata || !extensionMetadata.dialects) {
        return false;
      } else {
        return dialectId !== '900000000000509007' && extensionMetadata.dialects.hasOwnProperty(dialectId);
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

    // setter for display name by module id
    function setModuleName(moduleId, moduleName) {
      angular.forEach(extensionMetadata.modules, function (module) {
        if (module.id === moduleId) {
          module.name = moduleName;
        }
      });
      angular.forEach(internationalMetadata.modules, function (module) {
        if (module.id === moduleId) {
          module.name = moduleName;
        }
      });
    }

    function clearBranchMetadata() {
      extensionMetadata = null;
      branchMetadata = null;
    }

    //
    // Branch functions -- only used for branchPath resolution
    //

    function getBranch() {
      if (!branchMetadata) {
        console.error('Branch metadata not set, could not determine branch');
        return null;
      }
      return branchMetadata.branchPath;
    }

    function getBranchRoot() {
      // if branch metadata has a project key, match for task: BRANCH_ROOT/pkey/tkey
      if (branchMetadata.projectKey) {
        return branchMetadata.branchPath.match(/(.*)\/[^\/]+\/[^\/]+$/)[1];
      }

      // otherwise, match for project: BRANCH_ROOT/pKey
      else {
        return branchMetadata.branchPath.match(/(.*)\/[^\/]+$/)[1];
      }
    }

    // returns extension dialects plus international dialects
    // NOTE: Extension dialects override international
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

    // get available dialects from extension metadata
    // NOTE: Return international dialects for FSNs
    function getDialectsForModuleId(moduleId, FSN) {
      if (extensionMetadata && !FSN) {
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

    function getDefaultLanguageForModuleId(moduleId) {
      if (isExtensionModule(moduleId)) {
        return extensionMetadata.defaultLanguage ? extensionMetadata.defaultLanguage : extensionMetadata.languages[0];
      } else {
        return internationalMetadata.defaultLanguage ? internationalMetadata.defaultLanguage : internationalMetadata.languages[0];
      }
    }

    function getAcceptLanguageValueForModuleId(moduleId) {
      if (isExtensionModule(moduleId)) {
        return extensionMetadata.acceptLanguageMap;
      } else {
        return internationalMetadata.acceptLanguageMap;
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

    function getProjectForKey(key) {
      for (var i = 0; i < projects ? projects.length : -1; i++) {
        if (projects[i].key === key) {
          return projects[i];
        }
      }
      return null;
    }

    function setProjects(projectsList) {
      projects = projectsList;
    }

    function setMrcmEnabled(value) {
      console.log('MRCM validation enforced', value);
      mrcmEnabled = value;
    }

    function isMrcmEnabled() {
      return mrcmEnabled;
    }

    return {

      // relationship functions
      isIsaRelationship: isIsaRelationship,
      getSnomedCtRootId: getSnomedCtRootId,

      // project cache getters/setters
      setProjects: setProjects,
      getProjects: getProjects,
      getProjectForKey: getProjectForKey,

      // inactivation reason retrieval
      getConceptInactivationReasons: getConceptInactivationReasons,
      getDescriptionInactivationReasons: getDescriptionInactivationReasons,
      getAssociationInactivationReasons: getAssociationInactivationReasons,

      // boolean checks exposed for use
      isLockedModule: isLockedModule,
      isUsDialect: isUsDialect,
      isGbDialect: isGbDialect,
      isExtensionDialect: isExtensionDialect,
      isMrcmEnabled: isMrcmEnabled,

      // extension module-dependent retrieval functions

      getCurrentModuleId: getCurrentModuleId,
      getInternationalModuleId: getInternationalModuleId,
      getModulesForModuleId: getModulesForModuleId,
      getDefaultLanguageForModuleId: getDefaultLanguageForModuleId,
      getLanguagesForModuleId: getLanguagesForModuleId,
      getDialectsForModuleId: getDialectsForModuleId,
      getAcceptLanguageValueForModuleId: getAcceptLanguageValueForModuleId,
      getAllDialects: getAllDialects,
      isExtensionSet: function () {
        return extensionMetadata !== null;
      },

      // module and branch metadata setters
      setExtensionMetadata: setExtensionMetadata,
      setBranchMetadata: setBranchMetadata,
      clearBranchMetadata: clearBranchMetadata,
      setMrcmEnabled: setMrcmEnabled,
      setModuleName: setModuleName,

      // branch/task fupath retrieval functions
      getBranch: getBranch,
      getBranchRoot: getBranchRoot,

      // TODO Functions exposed for dev work, remove when complete

      getInternationalMetadata: function () {
        return internationalMetadata;
      },

      getExtensionMetadata: function () {
        return extensionMetadata;
      },
      getBranchMetadata: function () {
        return branchMetadata;
      }


    };

  }])
;
