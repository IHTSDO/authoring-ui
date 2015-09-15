'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.taxonomy', [])

  .controller('taxonomyCtrl', ['$scope', '$routeParams', '$location', '$compile', 'endpointService', function AppCtrl($scope, $routeParams, $location, $compile, endpointService) {

    $scope.branch = "MAIN/" + $routeParams.projectKey + "/" + $routeParams.taskKey;
    var options = {
      serverUrl: "/snowowl",
      edition: "snomed-ct/v2/browser",
      release: "MAIN",
      selectedView: "inferred",
      displayChildren: false,
      langRefset: "900000000000509007",
      closeButton: false,
      collapseButton: false,
      linkerButton: false,
      subscribersMarker: true,
      searchMode: "partialMatching",
      searchLang: "english",
      diagrammingMarkupEnabled: false,
      statusSearchFilter: "activeOnly",
      highlightByEffectiveTime: "false",
      taskSet: false,
      taskKey: null
    };
    var globalMarkerColor = 'black';
    var componentsRegistry = [];
    var tpt = new taxonomyPanel(document.getElementById("bp-taxonomy_canvas"), 138875005, options);

    // drag and drop object
    // NOTE: Taxonomy plugin is unreliable when it comes to FSNs
    // therefore only send the concept Id and let the drop target
    // function handle name retrieval
    $scope.getConceptPropertiesObj = function (conceptId) {
      console.debug('Getting concept properties obj', conceptId);
      return {id: conceptId, name: null};
    };

    /*
     * To change this license header, choose License Headers in Project Properties.
     * To change this template file, choose Tools | Templates
     * and open the template in the editor.
     */

    function taxonomyPanel(divElement, conceptId, options) {
      var nodeCount = 0;
      var panel = this;
      this.subscribers = [];
      var xhr = null;
      if (typeof componentsRegistry == "undefined") {
        componentsRegistry = [];
      }

      this.markerColor = 'black';
      this.type = "taxonomy";
      this.divElement = divElement;
      this.options = jQuery.extend(true, {}, options);
      var componentLoaded = false;
      $.each(componentsRegistry, function (i, field) {
        if (field.divElement.id == panel.divElement.id) {
          componentLoaded = true;
        }
      });
      if (componentLoaded == false) {
        componentsRegistry.push(panel);
      }

      this.history = [];

      this.setupCanvas = function () {
        var taxonomyHtml = "<div class='panel panel-default' id='" + panel.divElement.id + "-mainPanel'>";
        taxonomyHtml = taxonomyHtml + "<div class='panel-body' id='" + panel.divElement.id + "-panelBody'>";
        taxonomyHtml = taxonomyHtml + "</div>";
        taxonomyHtml = taxonomyHtml + "</div>";
        $(divElement).html(taxonomyHtml);
        $("#" + panel.divElement.id + "-expandButton").hide();
        $("#" + panel.divElement.id + "-subscribersMarker").hide();

        $("#" + panel.divElement.id + "-closeButton").click(function (event) {
          $(divElement).remove();
        });

        $("#" + panel.divElement.id + "-configButton").click(function (event) {
          $("#" + panel.divElement.id + "-taxonomyConfigBar").slideToggle('slow');
        });

        if (typeof panel.options.closeButton != "undefined" && panel.options.closeButton == false) {
          $("#" + panel.divElement.id + "-closeButton").hide();
        }

        if (typeof panel.options.linkerButton != "undefined" && panel.options.linkerButton == false) {
          $("#" + panel.divElement.id + "-linkerButton").hide();
        }

        if (typeof panel.options.subscribersMarker != "undefined" && panel.options.subscribersMarker == false) {
          $("#" + panel.divElement.id + "-subscribersMarker").remove();
        }

        if (typeof panel.options.collapseButton != "undefined" && panel.options.collapseButton == false) {
          $("#" + panel.divElement.id + "-expandButton").hide();
          $("#" + panel.divElement.id + "-collapseButton").hide();
        }

        $("#" + panel.divElement.id + "-expandButton").click(function (event) {
          $("#" + panel.divElement.id + "-panelBody").slideDown("fast");
          $("#" + panel.divElement.id + "-expandButton").hide();
          $("#" + panel.divElement.id + "-collapseButton").show();
        });
        $("#" + panel.divElement.id + "-collapseButton").click(function (event) {
          $("#" + panel.divElement.id + "-panelBody").slideUp("fast");
          $("#" + panel.divElement.id + "-expandButton").show();
          $("#" + panel.divElement.id + "-collapseButton").hide();
        });
        $("#" + panel.divElement.id + "-configButton").tooltip({
          placement: 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });
        $("#" + panel.divElement.id + "-resetButton").tooltip({
          placement: 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });
        $("#" + panel.divElement.id + "-linkerButton").tooltip({
          placement: 'left',
          trigger: 'hover',
          animation: true,
          delay: 1000
        });
        $("#" + panel.divElement.id + "-linkerButton").draggable({
          cancel: false,
          appendTo: 'body',
          helper: 'clone',
          delay: 500,
          revert: false
        });

        $("#" + panel.divElement.id + "-panelBody").droppable({
          drop: panel.handleDropEvent,
          hoverClass: "bg-info"
        });

        $("#" + panel.divElement.id + "-panelHeading").droppable({
          drop: panel.handleDropEvent,
          hoverClass: "bg-info"
        });

        $("#" + panel.divElement.id + "-resetButton").click(function () {
          panel.setupParents([], {
            conceptId: 138875005,
            defaultTerm: "SNOMED CT Concept",
            definitionStatus: "PRIMITIVE"
          });
        });

        $("#" + panel.divElement.id + "-apply-button").click(function () {
          //console.log("apply!");
          panel.readOptionsPanel();
          panel.setupParents([], {
            conceptId: 138875005,
            defaultTerm: "SNOMED CT Concept",
            definitionStatus: "PRIMITIVE"
          });
        });

        $("#" + panel.divElement.id + "-linkerButton").click(function (event) {
          $("#" + panel.divElement.id + "-linkerButton").popover({
            trigger: 'manual',
            placement: 'bottomRight',
            html: true,
            content: function () {
              linkerHtml = '<div class="text-center text-muted"><em>Drag to link with other panels<br>';
              if (panel.subscribers.length == 1) {
                linkerHtml = linkerHtml + panel.subscribers.length + ' link established</em></div>';
              } else {
                linkerHtml = linkerHtml + panel.subscribers.length + ' links established</em></div>';
              }
              linkerHtml = linkerHtml + '<div class="text-center"><a href="javascript:void(0);" onclick="clearTaxonomyPanelSubscriptions(\'' + panel.divElement.id + '\');">Clear links</a></div>';
              return linkerHtml;
            }
          });
          $("#" + panel.divElement.id + "-linkerButton").popover('toggle');
        });

        $("#" + panel.divElement.id + "-inferredViewButton").click(function (event) {
          panel.options.selectedView = 'inferred';
          $("#" + panel.divElement.id + '-txViewLabel').html("<span class='i18n' data-i18n-id='i18n_inferred_view'>Inferred view</span>");
          panel.setupParents([], {
            conceptId: 138875005,
            defaultTerm: "SNOMED CT Concept",
            definitionStatus: "PRIMITIVE"
          });
        });

        $("#" + panel.divElement.id + "-statedViewButton").click(function (event) {
          panel.options.selectedView = 'stated';
          $("#" + panel.divElement.id + '-txViewLabel').html("<span class='i18n' data-i18n-id='i18n_stated_view'>Stated view</span>");
          panel.setupParents([], {
            conceptId: 138875005,
            defaultTerm: "SNOMED CT Concept",
            definitionStatus: "PRIMITIVE"
          });
        });
      }

      this.setupParents = function (parents, focusConcept) {
        var treeHtml = "<div>";
        treeHtml = treeHtml + "<ul>";
        var lastParent;
        $.each(parents, function (i, parent) {
          lastParent = parent;
          treeHtml = treeHtml + "<li data-concept-id='" + parent.conceptId + "' data-term='" + parent.defaultTerm + "' class='treeLabel'>";
          treeHtml = treeHtml + "<button class='btn btn-link btn-xs treeButton'><i class='glyphicon glyphicon-chevron-up treeButton'  id='" + panel.divElement.id + "-treeicon-" + parent.conceptId + "'></i></button>";
          if (parent.definitionStatus == "PRIMITIVE") {
            treeHtml = treeHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
          } else {
            treeHtml = treeHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
          }
          treeHtml = treeHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + parent.conceptId + '" data-term="' + parent.defaultTerm + '" class="treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + parent.conceptId + '">' + parent.defaultTerm + '</span></a>';
          treeHtml = treeHtml + "</li>";
        });
        if (parents.length > 0) {
          treeHtml = treeHtml.slice(0, -5);
        }
        treeHtml = treeHtml + "<ul>";

        //ui-draggable='true' drag='getConceptPropertiesObj(" + focusConcept.conceptId + ")' drag-channel='conceptPropertiesObj' drop-channel=''
        treeHtml = treeHtml + "<li data-concept-id='" + focusConcept.conceptId + "' data-term='" + focusConcept.defaultTerm + "' class='treeLabel'>";
        treeHtml = treeHtml + "<button class='btn btn-link btn-xs treeButton'><i class='glyphicon glyphicon-chevron-right treeButton'  id='" + panel.divElement.id + "-treeicon-" + focusConcept.conceptId + "'></i></button>";
        if (focusConcept.definitionStatus == "PRIMITIVE") {
          treeHtml = treeHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
        } else {
          treeHtml = treeHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
        }
        treeHtml = treeHtml + '<a style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + focusConcept.conceptId + '" data-term="' + focusConcept.defaultTerm + '" class="treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + focusConcept.conceptId + '">' + focusConcept.defaultTerm + "</span></a>";
        treeHtml = treeHtml + "</li>";
        treeHtml = treeHtml + "</ul>";
        if (parents.length > 0) {
          treeHtml = treeHtml + "</li>";
        }
        treeHtml = treeHtml + "</ul>";
        treeHtml = treeHtml + "</div>";
        $("#" + panel.divElement.id + "-panelBody").html(
          $compile(treeHtml)($scope)
        );

        $("#" + panel.divElement.id + "-panelBody").unbind("dblclick");
        $("#" + panel.divElement.id + "-panelBody").dblclick(function (event) {
          if ($(event.target).hasClass("treeLabel")) {
            var selectedId = $(event.target).attr('data-concept-id');
            var selectedLabel = $(event.target).attr('data-term');
            if (typeof selectedId != "undefined") {
              $.getJSON(options.serverUrl + "/" + options.edition + "/" + $scope.branch + "/concepts/" + selectedId + "/parents?form=" + panel.options.selectedView, function (result) {
                // done
              }).done(function (result) {
                panel.setupParents(result, {
                  conceptId: selectedId,
                  defaultTerm: selectedLabel,
                  definitionStatus: "PRIMITIVE"
                });
              }).fail(function () {
              });
            }
          }
        });
        $("#" + panel.divElement.id + "-panelBody").unbind("click");
        $("#" + panel.divElement.id + "-panelBody").click(function (event) {
          if ($(event.target).hasClass("treeButton")) {
            var conceptId = $(event.target).closest("li").attr('data-concept-id');
            var iconId = panel.divElement.id + "-treeicon-" + conceptId;
            event.preventDefault();
            if ($("#" + iconId).hasClass("glyphicon-chevron-down")) {
              //console.log("close");
              $(event.target).closest("li").find("ul").remove();
              $("#" + iconId).removeClass("glyphicon-chevron-down");
              $("#" + iconId).addClass("glyphicon-chevron-right");
            } else if ($("#" + iconId).hasClass("glyphicon-chevron-right")) {
              //console.log("open");
              $("#" + iconId).removeClass("glyphicon-chevron-right");
              $("#" + iconId).addClass("glyphicon-refresh");
              $("#" + iconId).addClass("icon-spin");
              panel.getChildren($(event.target).closest("li").attr('data-concept-id'));
            } else if ($("#" + iconId).hasClass("glyphicon-chevron-up")) {
              $("#" + iconId).removeClass("glyphicon-chevron-up");
              $("#" + iconId).addClass("glyphicon-refresh");
              $("#" + iconId).addClass("icon-spin");
              panel.wrapInParents($(event.target).closest("li").attr('data-concept-id'), $(event.target).closest("li"));
            } else if ($("#" + iconId).hasClass("glyphicon-minus")) {
            }

          } else if ($(event.target).hasClass("treeLabel")) {
            var selectedId = $(event.target).attr('data-concept-id');
            if (typeof selectedId != "undefined") {
              $.each(panel.subscribers, function (i, suscriberPanel) {
                if (suscriberPanel.conceptId != selectedId) {
                  suscriberPanel.conceptId = selectedId;
                  suscriberPanel.updateCanvas();
                }
              });
            }
          }

        });

        var iconId = panel.divElement.id + "-treeicon-" + focusConcept.conceptId;
        $("#" + iconId).removeClass("glyphicon-chevron-right");
        $("#" + iconId).addClass("glyphicon-refresh");
        $("#" + iconId).addClass("icon-spin");
        //console.log("getChildren..." + focusConcept.conceptId);
        panel.getChildren(focusConcept.conceptId);
      }

      this.getChildren = function (conceptId) {
        if (typeof panel.options.selectedView == "undefined") {
          panel.options.selectedView = "inferred";
        }

        if (panel.options.selectedView == "inferred") {
          $("#" + panel.divElement.id + "-txViewLabel").html("<span class='i18n' data-i18n-id='i18n_inferred_view'>Inferred view</span>");
        } else {
          $("#" + panel.divElement.id + "-txViewLabel").html("<span class='i18n' data-i18n-id='i18n_stated_view'>Stated view</span>");
        }

        $.getJSON(options.serverUrl + "/" + options.edition + "/" + $scope.branch + "/concepts/" + conceptId + "/children?form=" + panel.options.selectedView, function (result) {
        }).done(function (result) {
          var nodeHtml = "<ul style='list-style-type: none; padding-left: 15px;'>";
          result.sort(function (a, b) {
            if (a.fsn.toLowerCase() < b.fsn.toLowerCase())
              return -1;
            if (a.fsn.toLowerCase() > b.fsn.toLowerCase())
              return 1;
            return 0;
          })
          //console.log(JSON.stringify(result));
          var listIconIds = [];
          $.each(result, function (i, field) {
            if (field.active == true) {
              nodeHtml = nodeHtml + "<li data-concept-id='" + field.conceptId + "' data-term='" + field.fsn + "' class='treeLabel'>";
              if (field.hasChild === true) {
                nodeHtml = nodeHtml + "<button class='btn btn-link btn-xs treeButton'><i class='glyphicon glyphicon-chevron-right treeButton' id='" + panel.divElement.id + "-treeicon-" + field.conceptId + "'></i></button>";
              }
              else {
                nodeHtml = nodeHtml + "<button class='btn btn-link btn-xs treeButton'><i class='glyphicon glyphicon-minus treeButton' id='" + panel.divElement.id + "-treeicon-" + field.conceptId + "'></i></button>";
              }
              if (field.definitionStatus == "PRIMITIVE") {
                nodeHtml = nodeHtml + "<span class='badge alert-warning'>&nbsp;</span>&nbsp;&nbsp;";
              } else {
                nodeHtml = nodeHtml + "<span class='badge alert-warning'>&equiv;</span>&nbsp;&nbsp;";
              }
              nodeHtml = nodeHtml + "<span ui-draggable='true' drag='getConceptPropertiesObj(" + field.conceptId + ")' drag-channel='conceptPropertiesObj' drop-channel='' class='treeLabel selectable-row' data-concept-id='" + field.conceptId + "' data-term='" + field.fsn + "' id='" + panel.divElement.id + "-treenode-" + field.conceptId + "'>" + field.fsn + "</span>";
              listIconIds.push(field.conceptId);
            }
          });
          nodeHtml = nodeHtml + "</li>";
          nodeHtml = nodeHtml + "</ul>";
          $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
          $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
          if (result.length > 0) {
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-down");
          } else {
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-minus");
          }
          $("#" + panel.divElement.id + "-treenode-" + conceptId).after(
            $compile(nodeHtml)($scope));
          //console.log(JSON.stringify(listIconIds));
          $.each(listIconIds, function (i, nodeId) {
            $('#' + panel.divElement.id + "-treenode-" + nodeId).draggable({
              appendTo: 'body',
              helper: 'clone',
              delay: 500,
              revert: false
            });
          });
        }).fail(function () {
        });
      }

      this.wrapInParents = function (conceptId, liItem) {
        var topUl = $("#" + panel.divElement.id + "-panelBody").find('ul:first');
        $.getJSON(options.serverUrl + "/" + options.edition + "/" + $scope.branch + "/concepts/" + conceptId + "/parents?form=" + panel.options.selectedView, function (parents) {
          // done
        }).done(function (parents) {
          if (parents.length > 0) {
            var firstParent = "empty";
            var parentsStrs = [];
            $.each(parents, function (i, parent) {
              var parentLiHtml = "<li data-concept-id='" + parent.conceptId + "' data-term='" + parent.fsn + "' class='treeLabel'>";
              parentLiHtml = parentLiHtml + "<button class='btn btn-link btn-xs treeButton'><i class='glyphicon glyphicon-chevron-up treeButton'  id='" + panel.divElement.id + "-treeicon-" + parent.conceptId + "'></i></button>";
              if (parent.definitionStatus == "PRIMITIVE") {
                parentLiHtml = parentLiHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
              } else {
                parentLiHtml = parentLiHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
              }
              parentLiHtml = parentLiHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + parent.conceptId + '" data-term="' + parent.fsn + '" class="treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + parent.conceptId + '">' + parent.fsn + '</span></a>';
              parentLiHtml = parentLiHtml + "</li>";
              parentsStrs.push(parentLiHtml);
              if (firstParent == "empty") {
                firstParent = parent.conceptId;
              }
            });

            var staticChildren = topUl.children().slice(0);
            topUl.append(parentsStrs[0]);
            $('#' + panel.divElement.id + '-treenode-' + firstParent).closest('li').append("<ul id='parent-ul-id-" + firstParent + "' style='list-style-type: none; padding-left: 15px;'></ul>");
            var newMainChild;
            $.each(staticChildren, function (i, child) {
              if ($(child).attr('data-concept-id') == conceptId) {
                newMainChild = $(child);
                var newUl = $('#' + panel.divElement.id + '-treenode-' + firstParent).closest('li').find('ul:first');
                newUl.append($(child));
                $(child).find('i:first').removeClass("glyphicon-chevron-up");
                $(child).find('i:first').addClass("glyphicon-chevron-down");
              }
            });
            $.each(staticChildren, function (i, child) {
              if ($(child).attr('data-concept-id') != conceptId) {
                $.each($(child).children(), function (i, subchild) {
                  if ($(subchild).is('ul')) {
                    newMainChild.append(subchild);
                  }
                });
                $('#' + panel.divElement.id + '-treenode-' + $(child).attr('data-concept-id')).closest('li').remove();
              }
            });
            $.each(parentsStrs, function (i, parentsStr) {
              if (parentsStr != parentsStrs[0]) {
                topUl.prepend(parentsStr);
              }
            });
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-down");
          } else {
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-up");
          }
        }).fail(function () {
        });
      }

      this.setToConcept = function (conceptId, term, definitionStatus) {
        $("#" + panel.divElement.id + "-panelBody").html("<i class='glyphicon glyphicon-refresh icon-spin'></i>");
        $.getJSON(options.serverUrl + "/" + options.edition + "/" + $scope.branch + "/concepts/" + conceptId + "/parents?form=inferred", function (result) {
          // done
        }).done(function (result) {
          if (definitionStatus != "PRIMITIVE" && definitionStatus != "Fully defined") {
            definitionStatus = "PRIMITIVE";
          }
          panel.setupParents(result, {
            conceptId: conceptId,
            defaultTerm: term,
            definitionStatus: definitionStatus
          });
        }).fail(function () {
        });
      }

      this.handleDropEvent = function (event, ui) {
        var draggable = ui.draggable;

        //console.log(draggable.html() + " |  " +
        // draggable.attr('data-concept-id') + ' was dropped onto me!');
        if (!draggable.attr('data-concept-id')) {
          //console.log("ignore");
        } else {
          var conceptId = draggable.attr('data-concept-id');
          var term = draggable.attr('data-term');
          var definitionStatus = draggable.attr('data-def-status');
          if (panel.options.selectedView == "undefined") {
            panel.options.selectedView = "inferred";
          }
          if (typeof conceptId != "undefined") {
            panel.setToConcept(conceptId, term, definitionStatus);
          }
          $(ui.helper).remove(); //destroy clone
        }

        if (!draggable.attr('data-panel')) {
          //console.log("ignore");
        } else {
          //console.log("OK : " + draggable.attr('data-panel'));
          $.each(componentsRegistry, function (i, field) {
            if (field.divElement.id == draggable.attr('data-panel')) {
              if (field.type == "concept-details") {
                panel.subscribe(field);
              }
            }
          });
        }
      }

      this.subscribe = function (subscriber) {
        var alreadySubscribed = false;
        $.each(panel.subscribers, function (i, field) {
          if (subscriber.divElement.id == field.divElement.id) {
            alreadySubscribed = true;
          }
        });
        if (!alreadySubscribed) {
          if (panel.subscribers.length == 0) {
            if (typeof globalMarkerColor == "undefined") {
              globalMarkerColor = 'black';
            }
            panel.markerColor = panel.getNextMarkerColor(globalMarkerColor);
            //console.log(panel.markerColor);
            $("#" + panel.divElement.id + "-subscribersMarker").css('color', panel.markerColor);
            $("#" + panel.divElement.id + "-subscribersMarker").show();
          }
          panel.subscribers.push(subscriber);
          subscriber.setSubscription(panel);
        }
      }

      this.unsubscribe = function (subscriber) {
        var indexToRemove = -1;
        var i = 0;
        $.each(panel.subscribers, function (i, field) {
          if (subscriber.divElement.id == field.divElement.id) {
            indexToRemove = i;
          }
          i = i + 1;
        });
        if (indexToRemove > -1) {
          panel.subscribers.splice(indexToRemove, 1);
        }
        if (panel.subscribers.length == 0) {
          $("#" + panel.divElement.id + "-subscribersMarker").hide();
        }
        subscriber.clearSubscription();
      }

      this.unsubscribeAll = function () {
        var subscribersClone = panel.subscribers.slice(0);
        $.each(subscribersClone, function (i, field) {
          panel.unsubscribe(field);
        });
      }

      this.getNextMarkerColor = function (color) {
//console.log(color);
        var returnColor = 'black';
        if (color == 'black') {
          returnColor = 'green';
        } else if (color == 'green') {
          returnColor = 'purple';
        } else if (color == 'purple') {
          returnColor = 'red';
        } else if (color == 'red') {
          returnColor = 'blue';
        } else if (color == 'blue') {
          returnColor = 'green';
        }
//console.log(returnColor);
        globalMarkerColor = returnColor;
        return returnColor;
      }

      this.setupCanvas();
      if (!conceptId || conceptId == 138875005) {
        this.setupParents([], {
          conceptId: 138875005,
          defaultTerm: "SNOMED CT Concept",
          definitionStatus: "PRIMITIVE"
        });
      } else {
        if (xhr != null) {
          xhr.abort();
          console.log("aborting call...");
        }
        xhr = $.getJSON(options.serverUrl + "/" + options.edition + "/" + $scope.branch + "/concepts/" + conceptId, function (result) {

        }).done(function (result) {
          panel.setToConcept(conceptId, result.defaultTerm);
        }).fail(function () {
          console.log("Error");
        });
      }
    }

    function clearTaxonomyPanelSubscriptions(divElementId1) {
      var d1;
      $.each(componentsRegistry, function (i, field) {
        if (field.divElement.id == divElementId1) {
          d1 = field;
        }
      });
      d1.unsubscribeAll();
    }

    (function ($) {
      $.fn.addTaxonomy = function (options) {
        this.filter("div").each(function () {
          var tx = new conceptDetails(this, options);
        });
      };
    }(jQuery));

    $(document).on('dragend', function () {
      removeHighlight();
    });

    function removeHighlight() {
      $(document).find('.drop-highlighted').removeClass('drop-highlighted');
    }

    function allowDrop(ev) {
      ev.preventDefault();

      var aux;
      if ($(ev.target).attr("data-droppable") == "true") {
        aux = $(ev.target);
      } else {
        aux = $(ev.target).closest("div");
      }
      //    while (typeof $(aux).closest('div').attr('ondrop') != "undefined"){
      //        aux = $(aux).closest('div');
      //    }
      $(aux).addClass("drop-highlighted");
    }

    function iconToDrag(text) {
      var CVS = document.createElement('canvas'),
        ctx = CVS.getContext('2d');
      CVS.width = 300;
      CVS.height = 300;
      ctx.font = "15px sans-serif";
      ctx.strokeText(text, 10, 20);
      var icon = document.createElement("img");
      icon.src = CVS.toDataURL();
      return icon;
    }

    function drag(ev, id) {
      var dataText = "";
      var term = "", conceptId = "";
      $.each(ev.target.attributes, function () {
        if (this.name.substr(0, 4) == "data") {
          ev.dataTransfer.setData(this.name.substr(5), this.value);
          if (this.name.substr(5) == "concept-id") {
            conceptId = this.value;
          }
          if (this.name.substr(5) == "term") {
            term = this.value;
          }
        }
      });
      icon = iconToDrag(term);
      if (navigator.userAgent.indexOf("Chrome") > -1) {
        icon = iconToDrag(term);
        ev.dataTransfer.setDragImage(icon, 0, 0);
      } else {
        //            icon = iconToDrag(term);
      }
      ev.dataTransfer.setDragImage(icon, 0, 0);
      dataText = conceptId + "|" + term;
      ev.dataTransfer.setData("Text", dataText);
      ev.dataTransfer.setData("divElementId", id);
    }

    function dropS(ev) {
      $(document).find('.drop-highlighted').removeClass('drop-highlighted');
      ev.preventDefault();
      var text = ev.dataTransfer.getData("Text");
      if (text != "javascript:void(0);") {
        var i = 0;
        while (text.charAt(i) != "|") {
          i++;
        }
        var conceptId = ev.dataTransfer.getData("concept-id");
        if (typeof conceptId == "undefined") {
          conceptId = text.substr(0, i);
        }
        var term = ev.dataTransfer.getData("term");
        if (typeof term == "undefined") {
          term = text.substr(i);
        }
        $(ev.target).val(term);
        var id = $(ev.target).attr("id").replace("-searchBox", "");
        $.each(componentsRegistry, function (i, field) {
          if (field.divElement.id == id) {
            field.search(term, 0, 100, false);
          }
        });
      }
    }

    var disableTextSelect = function () {
      return this.each(function () {
        $(this).css({
          'MozUserSelect': 'none',
          'webkitUserSelect': 'none'
        }).attr('unselectable', 'on').bind('selectstart', function () {
          return false;
        });
      });
    };

    function dropC(ev, id) {
      $(document).find('.drop-highlighted').removeClass('drop-highlighted');
      ev.preventDefault();
      var text = ev.dataTransfer.getData("Text");
      if (text != "javascript:void(0);") {
        var i = 0;
        while (text.charAt(i) != "|") {
          i++;
        }
        var conceptId = ev.dataTransfer.getData("concept-id");
        if (typeof conceptId == "undefined") {
          conceptId = text.substr(0, i);
        }
        var term = ev.dataTransfer.getData("term");
        if (typeof term == "undefined") {
          term = text.substr(i);
        }
        var panelD = ev.dataTransfer.getData("panel");
        var divElementID = id;
        var panelAct;
        $.each(componentsRegistry, function (i, field) {
          if (field.divElement.id == divElementID) {
            panelAct = field;
          }
        });
        if (!conceptId) {
          if (!panelD) {
          } else {
            $.each(componentsRegistry, function (i, field) {
              if (field.divElement.id == panelD) {
                if (field.type == "search" || field.type == "taxonomy") {
                  panelAct.subscribe(field);
                  panelAct.setupOptionsPanel();
                }
              }
            });
          }
        } else {
          if (panelAct.conceptId != conceptId) {
            panelAct.conceptId = conceptId;
            panelAct.updateCanvas();
            channel.publish(panelAct.divElement.id, {
              term: term,
              conceptId: panelAct.conceptId,
              source: panelAct.divElement.id
            });
          }
        }
      }

    }

    function dropF(ev, id) {
      var text = ev.dataTransfer.getData("Text");
      if (text != "javascript:void(0);") {
        var i = 0;
        while (text.charAt(i) != "|") {
          i++;
        }
        var conceptId = ev.dataTransfer.getData("concept-id");
        if (typeof conceptId == "undefined") {
          conceptId = text.substr(0, i);
        }
        var term = ev.dataTransfer.getData("term");
        var module = ev.dataTransfer.getData("module");
        if (typeof term == "undefined") {
          term = text.substr(i);
        }
        var favs = stringToArray(localStorage.getItem("favs")), found = false;
        $.each(favs, function (i, field) {
          if (field == conceptId) {
            found = true;
          }
        });
        var concept = {
          fsn: term,
          conceptId: conceptId,
          module: module
        };
        if (!found) {
          //            console.log(concept);
          favs.push(conceptId);
          localStorage.setItem("favs", favs);
          localStorage.setItem("conceptId:" + conceptId, JSON.stringify(concept));
        }
        channel.publish("favsAction");
      }
    }

    function dropT(ev, id) {
      $(document).find('.drop-highlighted').removeClass('drop-highlighted');
      ev.preventDefault();
      var text = ev.dataTransfer.getData("Text");
      if (text != "javascript:void(0);") {
        var i = 0;
        while (text.charAt(i) != "|") {
          i++;
        }
        var divElementId = id;
        var panel;
        var panelD = ev.dataTransfer.getData("panel");
        var conceptId = ev.dataTransfer.getData("concept-id");
        if (typeof conceptId == "undefined") {
          conceptId = text.substr(0, i);
        }
        var term = ev.dataTransfer.getData("term");
        if (typeof term == "undefined") {
          term = text.substr(i);
        }
        var definitionStatus = ev.dataTransfer.getData("def-status");
        var module = ev.dataTransfer.getData("module");

        $.each(componentsRegistry, function (i, field) {
          if (field.divElement.id == divElementId) {
            panel = field;
          }
        });

        if (!conceptId) {
        } else {
          if (panel.options.selectedView == "undefined") {
            panel.options.selectedView = "inferred";
          }
          if (typeof conceptId != "undefined") {
            var d = new Date();
            var time = d.getTime();
            panel.history.push({term: term, conceptId: conceptId, time: time});
            panel.setToConcept(conceptId, term, definitionStatus, module);
            channel.publish(panel.divElement.id, {
              term: term,
              conceptId: conceptId,
              source: panel.divElement.id
            });
          }
        }
        if (!panelD) {
        } else {
          //console.log("OK : " + draggable.attr('data-panel'));
          $.each(componentsRegistry, function (i, field) {
            if (field.divElement.id == panelD) {
              if (field.type == "concept-details") {
                panel.subscribe(field);
                field.setupOptionsPanel();
              }
            }
          });
        }
      }
    }

    function stringToArray(string) {
      if (typeof string == "string") {
        var ind = 0, auxString, array = [];
        while (ind < string.length) {
          auxString = "";
          while (string.substr(ind, 1) != "," && ind < string.length) {
            auxString = auxString + string.substr(ind, 1);
            ind++;
          }
          array.push(auxString);
          ind++;
        }
        return (array);
      } else {
        return false;
      }
    }

    function alertEvent(message, type) {
      $.notify(message, type);
    }

  }]);


