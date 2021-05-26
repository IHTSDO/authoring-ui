'use strict';

angular.module('singleConceptAuthoringApp')
  .service('permissionService', [
    function () {
      this.branch = null;
      this.roles = [];

      function setRolesForBranch(branch, roles) {
        this.branch = branch;
        this.roles = roles;
      }

      function getRolesForBranch(branch) {
        if (this.branch !== branch) {
          console.error('The roles have not been set for branch ' + branch + '.');
          return [];
        }
        return this.roles;
      }

      function hasRoleOnBranch(branch, role) {
        if (this.branch !== branch) {
          console.error('The roles have not been set for branch ' + branch + '.');
          return false;
        }

        return this.roles.includes(role);
      }

      return {
        setRolesForBranch: setRolesForBranch,
        getRolesForBranch: getRolesForBranch,
        hasRoleOnBranch: hasRoleOnBranch
      }
    }])
;
