'use strict';

angular.module('singleConceptAuthoringApp')
  .factory('aagService', function ($http, $q) {

    var apiEndpoint = null;

    function setEndpoint(url) {
      apiEndpoint = url;
    }

    function getAllWhitelistItems() {
      var deferred = $q.defer();
      $http.get(apiEndpoint + 'whitelist-items?page=0&size=10000').then(function (response) {
        deferred.resolve(response.data.content);
      }, function (error) {
        if (error.status === 404) {
          deferred.resolve([]);
        } else {
          deferred.reject('Error retrieving all whitelist items. Error: ' + error.message);
        }
      });
      return deferred.promise;
    }

    function getWhitelistItemsByBranchAndDate(branch, date, exceptionType) {
      var deferred = $q.defer();
      let args = '';
      if(date && date !== null && date !== undefined){
          args = date +'&page=0&size=10000'
      }
      else{
          args = '&page=0&size=10000';
      }
      if (exceptionType) {
        args += '&type=' + exceptionType;
      }
      $http.get(apiEndpoint + 'whitelist-items/' + branch + '?creationDate=' + args).then(function (response) {
        deferred.resolve(Array.isArray(response.data) ? response.data : []);
      }, function (error) {
        if (error.status === 404) {
          deferred.resolve([]);
        } else {
          deferred.reject('Error retrieving all whitelist items. Error: ' + error.message);
        }
      });
      return deferred.promise;
    }

    function addToWhitelist(whitelistItem) {
      var deferred = $q.defer();
      $http.post(apiEndpoint + 'whitelist-items', whitelistItem).then(function (data) {
        deferred.resolve(data);
      }, function (error) {
          deferred.reject('Error adding item to whitelist. Error: ' + error.message);
      });
      return deferred.promise;
    }

    function updateWhitelistItem(whitelistItem) {
      var deferred = $q.defer();
      $http.put(apiEndpoint + 'whitelist-items/item/' + whitelistItem.id, whitelistItem).then(function (data) {
        deferred.resolve(data);
      }, function (error) {
          deferred.reject('Error updating whitelist item. Error: ' + error.message);
      });
      return deferred.promise;
    }

    function removeFromWhitelist(id) {
      var deferred = $q.defer();
      $http.delete(apiEndpoint + 'whitelist-items/item/' + id).then(function () {
        deferred.resolve();
      }, function (error) {
          deferred.reject('Error deleting item from whitelist. Error: ' + error.message);
      });
      return deferred.promise;
    }

    // Retrieve SAC items for a branch
      // GET /acceptance/{branch}
      function getBranchSAC(branch, matchAuthorFlags) {
        return $http.get(apiEndpoint + 'acceptance/' + branch + '?matchAuthorFlags=' + (typeof matchAuthorFlags !== 'undefined' ? matchAuthorFlags : true)).then(function (response) {
          return response.data;
        }, function (error) {
        });

      }

      // Retrieve SAC items
      // GET /acceptance
      function getSAC(branch) {
        return $http.get(apiEndpoint + 'criteria-items/' + branch).then(function (response) {
          return response.data;
        }, function (error) {
        });

      }

      // Accept an SAC item on a branch
      // POST /acceptance/{branch}/item/{item-id}/accept
      function acceptBranchSAC(branch, id) {
        return $http.post(apiEndpoint + 'acceptance/' + branch + '/item/' + id + '/accept', {}).then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

      // Unaccept an SAC item on a branch
      // DELETE /acceptance/{branch}/item/{item-id}/accept
      function unacceptBranchSAC(branch, id) {
          console.log('delete');
        return $http.delete(apiEndpoint + 'acceptance/' + branch + '/item/' + id + '/accept').then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

      // Update Branch SAC
      // PUT /criteria/{branch}
      function getBranchCriteria(branch) {
        return $http.get(apiEndpoint + 'criteria/' + branch).then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

      // Update Branch SAC
      // PUT /criteria/{branch}
      function updateBranchSAC(branch, sac) {
        return $http.put(apiEndpoint + 'criteria/' + branch, sac).then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

      // Create Branch SAC
      // POST /criteria/{branch}
      function createBranchSAC(branch, sac) {
        return $http.post(apiEndpoint + 'criteria', sac).then(function (response) {
          return response.data;
        }, function (error) {
        });
      }

//
// Function exposure
//
    return {
      getSAC: getSAC,
      getBranchSAC: getBranchSAC,
      acceptBranchSAC: acceptBranchSAC,
      unacceptBranchSAC: unacceptBranchSAC,
      getBranchCriteria: getBranchCriteria,
      updateBranchSAC: updateBranchSAC,
      createBranchSAC: createBranchSAC,
      setEndpoint: setEndpoint,
      getWhitelistItemsByBranchAndDate: getWhitelistItemsByBranchAndDate,
      getAllWhitelistItems: getAllWhitelistItems,
      addToWhitelist: addToWhitelist,
      updateWhitelistItem: updateWhitelistItem,
      removeFromWhitelist: removeFromWhitelist
    };

  })
;
