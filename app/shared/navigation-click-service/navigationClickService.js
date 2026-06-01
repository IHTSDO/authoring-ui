'use strict';

angular.module('singleConceptAuthoringApp')
  .service('navigationClickService', function () {

    function ignoresRowNavigation($event) {
       return $event.target && $event.target.closest && !!$event.target.closest('.row-action-link');
    }

    return {
      openInNewTab: function (hashUrl) {
        window.open(hashUrl, '_blank');
      },

      handleClick: function ($event, openInNewTabFn, navigateFn) {
        if (ignoresRowNavigation($event)) {
          return;
        }

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
        if (ignoresRowNavigation($event)) {
          return;
        }

        if ($event.button !== 1) {
          return;
        }

        $event.preventDefault();
        $event.stopPropagation();
        openInNewTabFn();
      }
    };
  });
