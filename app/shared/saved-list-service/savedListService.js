'use strict';

angular.module('singleConceptAuthoringApp')
  .service('savedListService', ['$http', '$rootScope', '$location', '$q', '$interval', 'scaService','metadataService',
    function ($http, $rootScope, $location, $q, $interval, scaService,metadataService) {
      this.favorites = {items: []};
      this.savedList = {items: []};

      function getAcceptabilityByLanguage(acceptabilityMap, lang) {
        var acceptability = '';
        var dialects = metadataService.getAllDialects();
        angular.forEach(Object.keys(dialects), function (dialectId) {
          if (dialects[dialectId] === lang) {
           acceptability = acceptabilityMap[dialectId];
          }
        });
        return acceptability;       
      }
      
      return {

        addToFavorites : function (item,projectKey) {
          if (!item) {
            return;
          }
          var found = false;
          for (var i = 0, len = this.favorites.items.length; i < len; i++) {
            if (this.favorites.items[i].concept.conceptId === item.conceptId) {
              found =  true;
              break;
            }
          }        
          if (!found) {
            this.favorites.items.push(item);
            scaService.saveUiStateForUser('my-favorites-' + projectKey, this.favorites);
          }         
        },        

        removeItemFromFavorites : function (item,projectKey) {
          if (item) {
            for (var i = 0, len = this.favorites.items.length; i < len; i++) {
              if (this.favorites.items[i].concept.conceptId === item.concept.conceptId) {
                this.favorites.items.splice(this.favorites.items.indexOf(this.favorites.items[i]), 1);   
                scaService.saveUiStateForUser('my-favorites-' + projectKey, this.favorites);
                return;
              }
            }           
          }
        },

        updateConceptInFavorites : function (concept,projectKey) {
          var found = false;
          angular.forEach(this.favorites.items, function (item) {

            // if concept on list, update the relevant display fields
            if (item.concept.conceptId === concept.conceptId) {             
              item.active = concept.active;
              item.concept.definitionStatus = concept.definitionStatus;
              
              if (metadataService.isExtensionSet()) {
                var preferredSynonym = '';
                var availableLanguages = metadataService.getLanguagesForModuleId(concept.moduleId);

                // en and extension languages
                if (availableLanguages.length === 2) {
                  angular.forEach(concept.descriptions, function (description) {
                    if (description.type === 'SYNONYM' 
                      && description.lang === availableLanguages[1]
                      && getAcceptabilityByLanguage(description.acceptabilityMap,availableLanguages[1]) === 'PREFERRED') {
                      preferredSynonym = description.term;
                    }
                  });
                }
                if (!preferredSynonym) {
                  // Take US preferred term
                  angular.forEach(concept.descriptions, function (description) {
                    if (description.type === 'SYNONYM' 
                      && description.lang === 'en'
                      && description.acceptabilityMap['900000000000509007'] === 'PREFERRED') {
                      preferredSynonym = description.term;
                    }
                  });
                }                

                item.concept.preferredSynonym = preferredSynonym;
              } else {
                item.concept.fsn = concept.fsn;
              }

              found = true;             
            }
          });
          if (found) {
            scaService.saveUiStateForUser('my-favorites-' + projectKey, this.favorites);
          }          
        },

        updateCrsConceptInFavorites : function (data,projectKey) {
          angular.forEach(this.favorites, function (item) {

            if (item.conceptId === data.crsConceptId) {
              item.concept.conceptId = data.concept.conceptId;
              this.updateConceptInFavorites(data.concept,projectKey);
            }
          });
        },

        addItemToSavedList : function (item,projectKey,taskKey) {
          if (!item) {
            return;
          }
          var found = false;
          for (var i = 0, len = this.savedList.items.length; i < len; i++) {
            if (this.savedList.items[i].concept.conceptId === item.conceptId) {
              found =  true;
              break;
            }
          }        
          if (!found) {           
            this.savedList.items.push(item);
            scaService.saveUiStateForTask(projectKey, taskKey, 'saved-list', this.savedList);
          }          
        },

        removeItemFromSavedList : function (item,projectKey,taskKey) {
          if (item) {
            for (var i = 0, len = this.savedList.items.length; i < len; i++) {
              if (this.savedList.items[i].concept.conceptId === item.concept.conceptId) {
                this.savedList.items.splice(this.savedList.items.indexOf(this.savedList.items[i]), 1);   
                $rootScope.$broadcast('savedListRemove', {conceptId: item.concept.conceptId});
                scaService.saveUiStateForTask(projectKey, taskKey, 'saved-list', this.savedList );
                return;
              }
            }           
          }
        },

        updateConceptInSavedList : function (concept,projectKey,taskKey) {         
          var found = false;
          angular.forEach(this.savedList.items, function (item) {

            // if concept on list, update the relevant display fields
            if (item.concept.conceptId === concept.conceptId) {
              item.active = concept.active;
              item.concept.definitionStatus = concept.definitionStatus;

              if (metadataService.isExtensionSet()) {
                var preferredSynonym = '';
                var availableLanguages = metadataService.getLanguagesForModuleId(concept.moduleId);

                // en and extension languages
                if (availableLanguages.length === 2) {
                  angular.forEach(concept.descriptions, function (description) {
                    if (description.type === 'SYNONYM' 
                      && description.lang === availableLanguages[1]
                      && getAcceptabilityByLanguage(description.acceptabilityMap,availableLanguages[1]) === 'PREFERRED') {
                      preferredSynonym = description.term;
                    }
                  });
                }
                if (!preferredSynonym) {
                  // Take US preferred term
                  angular.forEach(concept.descriptions, function (description) {
                    if (description.type === 'SYNONYM' 
                      && description.lang === 'en'
                      && description.acceptabilityMap['900000000000509007'] === 'PREFERRED') {
                      preferredSynonym = description.term;
                    }
                  });
                }                

                item.concept.preferredSynonym = preferredSynonym;
              } else {
                item.concept.fsn = concept.fsn;
              }
             
              item.editing = true;
              found = true;
            }
          });

          if (found) {
            scaService.saveUiStateForTask(projectKey, taskKey, 'saved-list', this.savedList);
          }
        },

        updateCrsConceptInSavedList : function (data,projectKey,taskKey) {
          angular.forEach(this.savedList, function (item) {
            if (item.conceptId === data.crsConceptId) {
              item.concept.conceptId = data.conceptId;
              this.updateConceptInSavedList(data.concept,projectKey,taskKey);
            }
          });
        },

        stopEditingInSavedList : function (data) {
          angular.forEach(this.savedList.items, function (item) {
            if (item.concept.conceptId === data.concept.conceptId) {
              item.editing = false;
            }
          });
        },

        initializeSavedList : function(projectKey,taskKey) {
          // get favorite list
          var self = this;
          scaService.getUiStateForUser('my-favorites-' + projectKey)
              .then(function (uiState) {
              if (!uiState) {
                self.favorites = {items: []};
              }
              else {
                self.favorites = uiState;
              }
            }
          );

          // get saved list
          scaService.getUiStateForTask(projectKey, taskKey, 'saved-list')
            .then(function (uiState) {
              if (!uiState) {
                self.savedList = {items: []};
              }
              else {
                self.savedList = uiState;
              }

            }
          );
        }

      }

    }])
;
