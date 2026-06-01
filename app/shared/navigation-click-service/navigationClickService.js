'use strict';

angular.module('singleConceptAuthoringApp')
  .service('navigationClickService', function () {
    return {
      openInNewTab: function (hashUrl) {
        window.open(hashUrl, '_blank');
      },

      handleClick: function ($event, openInNewTabFn, navigateFn) {
        if ($event.ctrlKey || $event.metaKey) {
          $event.stopPropagation();
          $event.preventDefault();
          openInNewTabFn();
          return;
        }

        if ($event.target && $event.target.closest('.row-nav-trigger')) {
          navigateFn();
        }
      },

      handleAuxClick: function ($event, openInNewTabFn) {
        if ($event.button !== 1) {
          return;
        }
        $event.preventDefault();
        $event.stopPropagation();
        openInNewTabFn();
      }
    };
  });
