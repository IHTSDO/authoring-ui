'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Helper service for handling customized layouts
 * TODO ELement widths currently stored in $rootScope, not thrilling, fix
 */
  .service('layoutHandler', function ($rootScope) {


    // the layout variable (initialized blank)
    $rootScope.layout = {};
    $rootScope.layoutWidths = {};

    /**
     * Recursive helper function to start at a layout level and check
     * children for matching element name
     * @param name
     * @param node the node to check
     * @param parentNode the node's parent node, for returning siblings and
     *   position
     * @returns {*} object containing the element and the element + its
     *   siblings
     */
    function getLayoutHelper(name, node, parentNode) {

      if (!node) {
        node = $rootScope.layout;
      }

      // check if this node matches -- do not set other variables, if this
      // object is finally returned, indicates
      if (node.name === name) {
        return {
          'element': node,
          'levelElements': parentNode ? parentNode.children : null,
          'levelPosition': parentNode ? parentNode.children.indexOf(node) : -1
        };
      }

      // cycle over children
      if (node.children && node.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          var childResult = getLayoutHelper(name, node.children[i], node);
          if (childResult) {
            return childResult;
          }
        }
      }
      return null;
    }

    ///////////////////////////////////////
    // Layout stuffs
    // TODO:  Move this stuff into a location service
    ///////////////////////////////////////

    /**
     * Increment the size of a layout column element
     * @param name unique name of the element
     * @param increment columns increased (positive) or decreased (negative)
     */
    function resizeLayoutElement(name, increment) {


      if (!name || !increment) {
        console.error('resizeLayoutElement requires both name and increment specified');
      }

      // get the element, level, and position information
      var layoutObj = getLayoutHelper(name, $rootScope.layout);

      if (!layoutObj) {
        console.error('Could not retrieve required layout object information, got instead:', layoutObj);
      }

      // check that at least two elements exist
      if (layoutObj.levelElements.length < 3) {
        console.warn('Less than 2 elements, aborting resizing');
      }

      // if the element is the last element on the level, pick element to the
      // left
      if (layoutObj.levelPosition === layoutObj.levelElements.length - 1) {
        console.warn('Cannot use resize controls on last element of level, aborting resizing');
        return;
      }

      // extract the element and its neighbor right for convenience
      var elem = layoutObj.element;
      var pairedElement = layoutObj.levelElements[layoutObj.levelPosition + 1];

      // check width requirements for both elements
      if (elem.width + increment < 2) {
        console.warn('Cannot resize selected element below width 2, aborting resizing');
        return;
      }
      if (pairedElement.width - increment < 2) {
        console.warn('Resizing selected element reduces another element below width 2, aborting resizing');
        return;
      }

      // if all checks pass, resize
      elem.width += increment;
      pairedElement.width -= increment;


      // set and apply the layout
      setLayout($rootScope.layout);
    };

    /**
     * Recursive helper function called when setting new layout.
     * Flattens the tree structure into a single map of column names->bootstrap width
     * @param name
     */
    function applyLayout(node) {

      if (!node) {
        return;
      }

      angular.forEach(node.children, function (child) {

        if ( $rootScope.layoutWidths.hasOwnProperty(child.name)) {
          console.error('Duplicate node names detected:', child.name);
          return;
        }

        $rootScope.layoutWidths[child.name] = child.width;
        applyLayout(child);
      });
    };

    function setLayout(newLayout) {
      if (!newLayout) {
        console.warn('Attempted to set new layout with empty object; use {} to clear the layout');
      }

      else {

        console.log('Set new layout:', newLayout);
        // set the layout
        $rootScope.layout = newLayout;

        // construct the flattened widths
        $rootScope.layoutWidths = {};
        applyLayout($rootScope.layout);
      }

    }

    /**
     * Function to get the layout object
     * TODO Placeholder for when rootScope dependencies are removed
     * @returns {*}
     */
    function getLayout() {
      return $rootScope.layout;
    }

    function getLayoutWidths(name) {

      if (!$rootScope.layoutWidths || !$rootScope.layoutWidths[name]) {
        return;
      }

      var width = $rootScope.layoutWidths[name];
      var colClasses = [
        'col-xs-12',
        'col-sm-' + width,
        'col-md-' + width,
        'col-lg-' + width,
        'col-xl-' + width
      ];
      return colClasses;
    };

    return {
      resizeLayoutElement: resizeLayoutElement,
      setLayout: setLayout,
      getLayout: getLayout,
      getLayoutWidths: getLayoutWidths
    }

  })
;
