'use strict';

angular.module('singleConceptAuthoringApp')
  .service('metadataService', ['$http', '$rootScope', function ($http, $rootScope) {

    // TODO Wire this to endpoint service, endpoint config
    var apiEndpoint = '../snowowl/ihtsdo-sca/';

    // project cache (still used?)
    var projects = [];

    // whether mrcm is currently enabled (default true)
    var mrcmEnabled = true;
      
    var productCode = '';
      
    var templatesEnabled = false;
      
    var spellcheckDisabled = false;

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
      {id: 'ERRONEOUS', text: 'Erroneous component', display: [6]},    
      {id: 'OUTDATED', text: 'Outdated component', display: [6]},     
      {id: 'NONCONFORMANCE_TO_EDITORIAL_POLICY', text: 'Non-conformance to editorial policy', display: []}
      //{id: 'RETIRED', text: 'Reason not stated', display: [6, 9]}
    ];
    // var inactivationParent = '900000000000481005';

    //
    // Historical Association Reference Set
    // Restriction notes:
    // type - CONCEPT, NAMESPACE; if null, any component permitted
    // activeOnly - if true, only active components
    var associationInactivationReasons =
      [
        {
          id: 'MOVED_FROM',
          conceptId: '900000000000525002',
          text: 'MOVED FROM association reference set',
          display: 2,
          restrict: {}
        },
        {
          id: 'MOVED_TO',
          conceptId: '900000000000524003',
          text: 'MOVED TO association reference set',
          display: 3,
          restrict: {
            type: 'NAMESPACE'
          }
        },
        {
          id: 'POSSIBLY_EQUIVALENT_TO',
          conceptId: '900000000000523009',
          text: 'POSSIBLY EQUIVALENT TO association reference set',
          display: 4,
          restrict: {
            activeOnly: true
          }
        },
        {
          id: 'REFERS_TO',
          conceptId: '900000000000531004',
          text: 'REFERS TO concept association reference set',
          display: 5,
          restrict: {
            type: 'CONCEPT'
          }
        },
        {
          id: 'REPLACED_BY',
          conceptId: '900000000000526001',
          text: 'REPLACED BY association reference set',
          display: 6,
          restrict: {
            activeOnly: true
          }
        },
        {
          id: 'SAME_AS',
          conceptId: '900000000000527005',
          text: 'SAME AS association reference set',
          display: 7,
          restrict: {
            activeOnly: true
          }
        },
        {
          id: 'SIMILAR_TO',
          conceptId: '900000000000529008',
          text: 'SIMILAR TO association reference set',
          display: 8,
          restrict: {} // NOTE: Not currently used according to TIG
        }
      ];
    // var associationInactivationParent = '900000000000522004';

    // description inactivation metadata
    var descriptionInactivationReasons = [
      //{id: 'MOVED_ELSEWHERE', text: 'Component moved elsewhere'},
      //{id: 'CONCEPT_NON_CURRENT', text: 'Concept non-current'},
      {id: 'ERRONEOUS', text: 'Erroneous component', display: []},
      //{id: 'INAPPROPRIATE', text: 'Inappropriate component'},
      //{id: 'LIMITED', text: 'Limited component'},
      {id: 'OUTDATED', text: 'Outdated component', display: []},
      //{id: 'PENDING_MOVE', text: 'Pending move'},
      {id: 'NONCONFORMANCE_TO_EDITORIAL_POLICY', text: 'Non-conformance to editorial policy', display: []},
      {id: 'NOT_SEMANTICALLY_EQUIVALENT', text: 'Not Semantically Equivalent', display: [5]}

    ];
      
    var drugsModelOrdering = [
      {id: '127489000', display: 1},
      {id: '732943007', display: 2},
      {id: '733724008', display: 3},
      {id: '733725009', display: 4},
      {id: '733723002', display: 5},
      {id: '733722007', display: 6},
      {id: '732944001', display: 7},
      {id: '732945000', display: 8},
      {id: '732946004', display: 9},
      {id: '732947008', display: 10},
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
      }, {
        id: '715515008',
        name: 'LOINC - SNOMED CT Cooperation Project module (core metadata concept)'
      }],
      acceptLanguageMap: 'en-us;q=0.8,en-gb;q=0.5',
      defaultLanguages: 'en',
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
        var defaultLanguages = [];
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
              if (defaultLanguages.length === 0) {
                defaultLanguages.push(match[1]);
              }
            } else {
              match = key.match(/requiredLanguageRefsets/);
              if (match) {
                var requiredLanguageRefsets = metadata['requiredLanguageRefsets'];
                requiredLanguageRefsets.forEach(function(lang) {
                  languages.push(Object.keys(lang)[0]);
                  dialects[lang[Object.keys(lang)[0]]] = Object.keys(lang)[0];
                    console.log(lang);
                  if(lang.default === "true"){
                      defaultLanguages.push(Object.keys(lang)[0]);
                  }
                });

                // set the default refset id if not already set
                if (!defaultLanguageRefsetId && languages.length === 2) {                
                for (var langRefSetId in dialects){
                  if(languages[1] === dialects[langRefSetId]) {
                    defaultLanguageRefsetId = langRefSetId;
                  }
                }
                } else {
                  defaultLanguageRefsetId = '900000000000509007';
                }

//                // set the default language if not already set
//                if (!defaultLanguages && languages.length === 2) {
//                    defaultLanguages =[];
//                  defaultLanguages.push(languages[1]);
//                } else {
//                  defaultLanguages.push(languages[0]);
//                }
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
          console.error('Error setting extension metadata: module was specified but no languages/dialects found, defaulting');
          defaultLanguages.push(languages[0]);
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
          shortname: metadata.shortname,
          acceptLanguageMap: defaultLanguages[0] + '-' + (metadata.shortname ? metadata.shortname.toUpperCase() : 'XX') + '-x-' + defaultLanguageRefsetId + ';q=0.8,en-US;q=0.5',
          defaultLanguages: defaultLanguages,
          languages: languages,
          dialects: dialects
        };
        if(metadata.languageSearch){
            extensionMetadata.acceptLanguageMap = metadata.languageSearch;
        };
        if(metadata.languageEdit){
            console.log(metadata.languageEdit);
            
        };
          console.log(extensionMetadata);
        }
//        if(metadata.languageDisplay){
//            angular.forEach(metadata.languageDisplay, function(lan){
////                var obj = {lan}
////                dialects.push(lan)
//            })
//        }
        if(getCurrentModuleId() !== '900000000000207008'){
            for(var i = 0; i < descriptionInactivationReasons.length; i++) {
                if (descriptionInactivationReasons[i].id == 'DUPLICATE') {
                    found = true;
                }
                if(i === descriptionInactivationReasons.length && !found){
                    descriptionInactivationReasons.push({id: 'DUPLICATE', text: 'Duplicate component'});
                }
            }
        }
        $rootScope.$broadcast('setExtensionMetadata');

      };

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
      
    function hasLanguageSpecified(){
        
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

    function isUSExtension(moduleId) {
      return isExtensionModule(moduleId) && moduleId === '731000124108';
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
      if (extensionMetadata && !FSN && extensionMetadata.dialects !== null) {
        return extensionMetadata.dialects;
      } else {
        return internationalMetadata.dialects;
      }
    }

    function getLanguagesForModuleId(moduleId) {
      if (isExtensionModule(moduleId) && extensionMetadata.languages !== null) {
        return extensionMetadata.languages;
      } else {
        return internationalMetadata.languages;
      }
    }

    function getDefaultLanguageForModuleId(moduleId) {
      if (isExtensionModule(moduleId) && extensionMetadata.defaultLanguagess  !== null) {
        return extensionMetadata.defaultLanguages ? extensionMetadata.defaultLanguages : extensionMetadata.languages[0];
      } else {
        return internationalMetadata.defaultLanguages ? internationalMetadata.defaultLanguages : internationalMetadata.languages[0];
      }
    }

    function getAcceptLanguageValueForModuleId(moduleId) {
        
      if (isExtensionModule(moduleId) && extensionMetadata.acceptLanguageMap !== null) {
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
      
    function getdrugsModelOrdering() {
      return drugsModelOrdering;
    }


    function getAssociationInactivationReasons() {
      return associationInactivationReasons;
    }

    function getDescriptionInactivationReasons() {
      return descriptionInactivationReasons;
    }
      
//    function getDescriptionAssociationInactivationReasons() {
//      return descriptionAssociationInactivationReasons;
//    }

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
    
    function setTemplatesEnabled(value){
        templatesEnabled = value;
    }
      
    function setSpellcheckDisabled(value){
        spellcheckDisabled = value;
    }

    function isMrcmEnabled() {
      return mrcmEnabled;
    }
      
    function isTemplatesEnabled() {
      return templatesEnabled;
    }
    
    function isSpellcheckDisabled() {
      return spellcheckDisabled;
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
      getdrugsModelOrdering: getdrugsModelOrdering,
      //getDescriptionAssociationInactivationReasons: getDescriptionAssociationInactivationReasons,

      // boolean checks exposed for use
      isLockedModule: isLockedModule,
      isUsDialect: isUsDialect,
      isGbDialect: isGbDialect,
      isUSExtension: isUSExtension,
      isExtensionDialect: isExtensionDialect,
      isMrcmEnabled: isMrcmEnabled,
      isTemplatesEnabled: isTemplatesEnabled,
      isSpellcheckDisabled: isSpellcheckDisabled, 

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
      setTemplatesEnabled: setTemplatesEnabled,
      setSpellcheckDisabled: setSpellcheckDisabled,
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
