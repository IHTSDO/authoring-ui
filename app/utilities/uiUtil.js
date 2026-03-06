'use strict';

angular.module('singleConceptAuthoringApp')
  .service('uiUtil', [function () {

    /**
     * Decide left popover placement based on element position in the viewport.
     * Returns one of: 'left-top', 'left'
     */
    this.getValidationPopoverPlacement = function ($event) {
      var defaultPlacement = 'left-top';

      if (!$event || !$event.target || !$event.target.getBoundingClientRect) {
        return defaultPlacement;
      }

      var rect = $event.target.getBoundingClientRect();
      var viewportHeight = window.innerHeight ||
        (document && document.documentElement && document.documentElement.clientHeight) || 0;

      if (!viewportHeight) {
        return defaultPlacement;
      }

      var topThreshold = viewportHeight * 0.3;
      var bottomThreshold = viewportHeight * 0.7;

      console.log(rect.top, topThreshold, rect.bottom, bottomThreshold);
      if (rect.top < topThreshold) {
        return 'left-top';
      } else {
        return 'left';
      }
    };

  }]);

