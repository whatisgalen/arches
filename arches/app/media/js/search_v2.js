require(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'views/search/term-filter', 
    'views/search/map-filter',
    'views/search/time-filter-v2',
    'views/search/search-results_v2',
    'knockout',
    'views/forms/sections/branch-list',
    'resource-types',
    'openlayers',
    'views/related-resources-graph',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2', 
    'plugins/cube-portfolio/jquery.cubeportfolio.min',
    'plugins/cube-portfolio/cube-portfolio-3-ns'], 
    function($, _, Backbone, bootstrap, arches, select2, TermFilter, MapFilter, TimeFilter, SearchResults, ko, BranchList, resourceTypes, ol, RelatedResourcesGraph) {
    $(document).ready(function() {
        var wkt = new ol.format.WKT();

        var SearchView = Backbone.View.extend({
            el: $('body'),
            updateRequest: '',

            events: {
                'click #sliding-panel-control' : 'slideList',
                'click .show-map' : 'showMap',
                'click .show-list' : 'showList',
                // 'click #view-saved-searches': 'showSavedSearches',
                'click .clear-search': 'showSavedSearches',
                // 'click #map-filter-button': 'toggleMapFilter',
                // 'click #time-filter-button': 'toggleTimeFilter',
                // 'click a.dataexport': 'exportSearch'
            },

            initialize: function(options) { 
                var mapFilterText, timeFilterText;
                var self = this;
                this.PAGE_STATES = {'saved_searches_displayed': 'SAVED_SEARCHES_DISPLAYED', 'saved_searches_hidden': 'SAVED_SEARCHES_HIDDEN'};
                this.LIST_STATES = {'full': 'FULL', 'partial': 'PARTIAL', 'hidden': 'HIDDEN'};
                this.RIGHT_PANEL_STATES = {'map': 'MAP', 'graph': 'GRAPH'};

                this.saved_search = $("#saved-search");
                this.results_counter = $("#search-results-count");
                this.time_filter_toggle = $("#date-filter-control");
                this.search_results_and_filters_container = $('#search-results-and-filters-container');
                this.sliding_panel = $("#sliding-panel");
                this.sliding_panel_container = $("#sliding-panel-container");
                this.sliding_panel_control = $("#sliding-panel-control");
                this.sliding_panel_control_icon = $("#sliding-panel-control-icon");
                this.sliding_panel_tools = $("#sliding-panel-tools");
                this.saved_search_menu = $("#filters-container");
                this.time_filter = $("#time-scale");
                this.time_filter_container = $("#time-filter-container");
                this.right_panel = $("#right-panel");
                this.related_resource_graph_container = $("#related-resource-graph");
                this.graph_detail_panel = $("#graph-detail-panel");

                this.return_to;
                this.default_page_state = this.PAGE_STATES.saved_searches_displayed;
                //this.current_page_state = this.default_page_state;
                this.default_list_view_state = this.LIST_STATES.full;
                this.current_right_panel_state = this.RIGHT_PANEL_STATES.map;
                //this.current_list_view_state = this.default_list_view_state;


                this.termFilter = new TermFilter({
                    el: $.find('input.resource_search_widget')[0]
                });
                this.termFilter.on('change', function(){
                    if(this.saved_search.is(":visible")){
                        this.hideSavedSearches();
                    }

                    // //check if saved search panel is open.  If so, close and replace with search results
                    // if (this.saved_search.hasClass("saved-search-panel-full")) {

                    //     this.saved_search.removeClass("saved-search-panel-full");
                    //     this.sliding_panel.removeClass("sliding-panel-hidden");
                    //     this.sliding_panel.addClass("sliding-panel-full");

                    //     //center search items
                    //     this.sliding_panel_container.addClass("container");

                    //     //hide saved search menu, show time filter
                    //     this.saved_search_menu.addClass("hidden");
                    //     this.time_filter.removeClass("time-scale-hidden");
                    //     this.saved_search.removeClass("saved-search-panel-shim")

                    // }

                    // //if map panel is open, slide it over and show search results
                    // if (this.right_panel.hasClass("map-panel-full")) {

                    //     this.right_panel.addClass("map-panel-partial");
                    //     this.right_panel.removeClass("map-panel-full");


                    //     //update marker panel position
                    //     this.map_detail_panel.removeClass("pull-right");

                    //     //show partial search results panel
                    //     this.sliding_panel.removeClass("sliding-panel-hidden");
                    //     this.sliding_panel.addClass("sliding-panel-partial");

                    //     //show sliding panel control
                    //     this.sliding_panel_control.removeClass("sliding-panel-control-hidden");

                    //     //Update position of sliding panel tools
                    //     this.results_counter.addClass("results-counter-shim");
                    //     this.time_filter_toggle.addClass("date-filter-header-shim");
                    //     this.sliding_panel_tools.addClass("sliding-panel-tools-shim");
                    // }

                }, this);
                this.termFilter.on('filter-removed', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.clear();
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.clear();
                    }
                }, this);
                this.termFilter.on('filter-inverted', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.query.filter.inverted(item.inverted);
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.query.filter.inverted(item.inverted);
                    }
                }, this);


                this.mapFilter = new MapFilter({
                    el: $('#map-filter-container')[0],
                    expanded: true
                });
                this.mapFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(mapFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(mapFilterText);
                    }
                }, this);


                this.timeFilter = new TimeFilter({
                    el: $('#time-filter-container')[0]
                });
                this.timeFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(timeFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(timeFilterText);
                    }
                }, this);


                this.searchResults = new SearchResults({
                    el: $('#search-results-container')[0]
                });
                this.searchResults.on('mouseover', function(resourceid){
                    this.mapFilter.selectFeatureById(resourceid);
                }, this);
                this.searchResults.on('mouseout', function(){
                    this.mapFilter.unselectAllFeatures();
                }, this);
                this.searchResults.on('showrelatedresourcegraph', function(options){
                    this.showGraph();
                    if (!this.related_resource_graph) {
                        this.related_resource_graph = new RelatedResourcesGraph({
                            el: this.related_resource_graph_container[0],
                            resourceId: options.resourceId,
                            resourceName: options.resourceName,
                            resourceTypeId: options.resourceTypeId
                        });
                    }else{
                        this.related_resource_graph.loadResourceData(options.resourceId, options.resourceName, options.resourceTypeId);
                    }
                }, this);
                this.searchResults.on('find_on_map', function(resourceid, data){
                    var extent;
                    var expand = !this.mapFilter.expanded();

                    this.current_right_panel_state = this.RIGHT_PANEL_STATES.map
                    this.updateViewState();
                    
                    _.each(data.geometries, function (geometryData) {
                        var geomExtent = wkt.readGeometry(geometryData.label).getExtent();
                        geomExtent = ol.extent.applyTransform(geomExtent, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                        extent = extent ? ol.extent.extend(extent, geomExtent) : geomExtent;
                    });
                    if (extent) {
                        self.mapFilter.zoomToExtent(extent);
                        // _.delay(function() {
                        //     self.mapFilter.zoomToExtent(extent);
                        // }, expand ? 700 : 0);
                    }
                }, this);

               

                mapFilterText = this.mapFilter.$el.data().filtertext;
                timeFilterText = this.timeFilter.$el.data().filtertext;

                self.isNewQuery = true;
                this.searchQuery = {
                    queryString: function(){
                        var params = {
                            page: self.searchResults.page(),
                            termFilter: ko.toJSON(self.termFilter.query.filter.terms()),
                            temporalFilter: ko.toJSON({
                                year_min_max: self.timeFilter.query.filter.year_min_max(),
                                inverted: self.timeFilter.query.filter.inverted()
                            }),
                            spatialFilter: ko.toJSON(self.mapFilter.query.filter),
                            mapExpanded: self.mapFilter.expanded()//,
                            //timeExpanded: self.timeFilter.expanded()
                        };
                        if (self.termFilter.query.filter.terms().length === 0 &&
                            self.timeFilter.query.filter.year_min_max().length === 0 &&
                            self.mapFilter.query.filter.geometry.coordinates().length === 0) {
                            params.no_filters = true;
                        }

                        params.include_ids = self.isNewQuery;
                        return $.param(params).split('+').join('%20');
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.termFilter.query.changed()) +
                            ko.toJSON(this.timeFilter.query.changed()) +
                            ko.toJSON(this.mapFilter.query.changed());
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };

                //this.getSearchQuery();

                this.searchResults.page.subscribe(function(){
                    self.doQuery();
                });

                this.searchQuery.changed.subscribe(function(){
                    self.isNewQuery = true;
                    self.searchResults.page(1);
                    self.doQuery();
                });

                // $(window).resize(function(){
                //     self.handlePageResize();
                // })

                // this.handlePageResize();
            },

            doQuery: function () {
                var self = this;
                var queryString = this.searchQuery.queryString();
                if (this.updateRequest) {
                    this.updateRequest.abort();
                }

                $('.loading-mask').show();
                window.history.pushState({}, '', '?'+queryString);

                this.updateRequest = $.ajax({
                    type: "GET",
                    url: arches.urls.search_results,
                    data: queryString,
                    success: function(results){
                        var data = self.searchResults.updateResults(results);
                        self.mapFilter.highlightFeatures(data, $('.search-result-all-ids').data('results'));
                        self.mapFilter.applyBuffer();
                        self.isNewQuery = false;
                        $('.loading-mask').hide();
                    },
                    error: function(){}
                });
            },

            handlePageResize: function(){
                var offset = this.saved_search.offset() || this.search_results_and_filters_container.offset();
                var window_height = $(window).height();

                this.saved_search.height(window_height - offset.top);
                this.search_results_and_filters_container.height(window_height - offset.top);
            },

            getPageState: function(){
                if(this.saved_search.is(":visible")){
                    return this.PAGE_STATES.saved_searches_displayed;
                }
                return this.PAGE_STATES.saved_searches_hidden;
            },

            getListViewState: function(){
                if(!(this.sliding_panel.is(":visible"))){
                    return this.LIST_STATES.hidden;
                }
                if(this.sliding_panel.hasClass("col-xs-12")){
                    return this.LIST_STATES.full;
                }
                if(this.sliding_panel.hasClass("col-xs-4")){
                    return this.LIST_STATES.partial;
                }
            },

            showSavedSearches: function(){
                this.clear();
                // this.saved_search.show();
                // this.search_results_and_filters_container.css('margin-left', '100%');
                //this.search_results_and_filters_container.hide();
                this.saved_search.slideDown();
                this.search_results_and_filters_container.slideUp();
                //$('#search-results-and-filters-container').slideToggle()
            },

            hideSavedSearches: function(){
                var self = this;
                // this.saved_search.hide();
                // this.search_results_and_filters_container.css('margin-left', '');
                //this.search_results_and_filters_container.show();
                this.saved_search.slideUp();
                this.search_results_and_filters_container.slideDown(function(){
                    self.timeFilter.restoreState();
                });
                //$('#search-results-and-filters-container').slideToggle()
            },

            showList: function(){
                if(this.getPageState() === this.PAGE_STATES.saved_searches_displayed){
                    this.doQuery();
                    this.updateViewState(this.default_list_view_state);
                }else{
                    this.updateViewState(this.default_list_view_state);
                }
            },

            slideList:function(){
                if(this.getListViewState() === this.LIST_STATES.hidden){
                    this.updateViewState(this.LIST_STATES.partial);
                }else if(this.getListViewState() === this.LIST_STATES.partial){
                    this.updateViewState(this.LIST_STATES.hidden);
                }
            },

            showMap: function(){
                this.current_right_panel_state = this.RIGHT_PANEL_STATES.map;
                if(this.getPageState() === this.PAGE_STATES.saved_searches_displayed){
                    this.doQuery();
                    this.updateViewState(this.LIST_STATES.hidden);
                }else if(this.getPageState() === this.PAGE_STATES.saved_searches_hidden){
                    if(this.getListViewState() === this.LIST_STATES.full){
                        this.updateViewState(this.LIST_STATES.partial);
                    }
                }
            },

            showGraph: function(){
                this.current_right_panel_state = this.RIGHT_PANEL_STATES.graph;
                this.updateViewState(this.LIST_STATES.partial);
            },

            updateViewState: function(view_state){
                this.getSearchQuery();
                this.hideSavedSearches();

                view_state = view_state || this.getListViewState();

                if(view_state === this.LIST_STATES.full){
                    //Hide map panel
                    //this.right_panel.hide();
                    this.right_panel.hide();
                    this.mapFilter.expanded(false);
                    //this.map_footer.hide();

                    //Show search results panel
                    this.sliding_panel.addClass("col-xs-12");
                    this.sliding_panel.removeClass("col-xs-4");
                    this.sliding_panel.addClass("container");
                    // this.sliding_panel.addClass("sliding-panel-full");
                    // this.sliding_panel.removeClass("sliding-panel-partial");
                    // this.sliding_panel_container.addClass("container");

                    //hide sliding panel control
                    this.sliding_panel_control.hide();

                    //Update position of sliding panel tools
                    // this.results_counter.removeClass("results-counter-shim");
                    // this.time_filter_toggle.removeClass("date-filter-header-shim");
                    // this.sliding_panel_tools.removeClass("sliding-panel-tools-shim");

                }else if(view_state === this.LIST_STATES.partial){
                    //Show Partial Map Panel
                    this.right_panel.show();
                    // this.right_panel.css('margin-left', '');
                    //this.mapFilter.expanded(true);
                    this.right_panel.addClass("col-xs-8");
                    this.right_panel.removeClass("col-xs-12");
                    //this.map_footer.show();
                    if(this.current_right_panel_state === this.RIGHT_PANEL_STATES.map){
                        try{
                            this.related_resource_graph_container.hide();
                        }catch(e){}
                        this.mapFilter.expanded(true);
                        this.mapFilter.map.map.updateSize();
                    }else{
                        this.mapFilter.expanded(false);
                        this.related_resource_graph_container.show();
                        this.related_resource_graph_container.resize();
                    }
                    //this.right_panel.removeClass("map-panel-hidden");
                    // this.right_panel.removeClass("map-panel-full");
                    // this.right_panel.addClass("map-panel-partial");

                    //Show partial search results panel
                    this.sliding_panel.show();
                    this.sliding_panel.addClass("col-xs-4");
                    this.sliding_panel.removeClass("col-xs-12");
                    this.sliding_panel.removeClass("container");
                    // this.sliding_panel.removeClass("sliding-panel-full");
                    // this.sliding_panel.addClass("sliding-panel-partial");
                    // this.sliding_panel_container.removeClass("container");

                    //make sliding panel control visible
                    this.sliding_panel_control.show();
                    this.sliding_panel_control.addClass("col-xs-offset-4");
                    this.sliding_panel_control_icon.removeClass("fa-step-forward");
                    this.sliding_panel_control_icon.addClass("fa-step-backward");

                    //Update position of sliding panel tools
                    // this.results_counter.addClass("results-counter-shim");
                    // this.time_filter_toggle.addClass("date-filter-header-shim");
                    // this.sliding_panel_tools.addClass("sliding-panel-tools-shim");

                }else if(view_state === this.LIST_STATES.hidden){
                    //Show map panel
                    this.right_panel.show();
                    // this.right_panel.css('margin-left', '');
                    //this.mapFilter.expanded(true);
                    this.right_panel.addClass("col-xs-12");
                    this.right_panel.removeClass("col-xs-8");
                    //this.map_footer.show();
                    if(this.current_right_panel_state === this.RIGHT_PANEL_STATES.map){
                        try{
                            this.related_resource_graph_container.hide();
                        }catch(e){}
                        this.mapFilter.expanded(true);
                        this.mapFilter.map.map.updateSize();
                    }else{
                        this.mapFilter.expanded(false);
                        this.related_resource_graph_container.show();
                        this.related_resource_graph_container.resize();
                    }
                    // this.right_panel.removeClass("map-panel-partial");
                    // this.right_panel.addClass("map-panel-full");

                    //Hide search results panel
                    this.sliding_panel.hide()

                    //hide sliding panel control
                    this.sliding_panel_control.show();
                    this.sliding_panel_control.removeClass("col-xs-offset-4");
                    this.sliding_panel_control_icon.removeClass("fa-step-backward");
                    this.sliding_panel_control_icon.addClass("fa-step-forward");

                    //Update position of sliding panel tools
                    // this.results_counter.removeClass("results-counter-shim");
                    // this.time_filter_toggle.removeClass("date-filter-header-shim");
                    // this.sliding_panel_tools.removeClass("sliding-panel-tools-shim");
                }
                
            },

            // toggleMapFilter: function(){
            //     if($('#saved-searches').is(":visible")){
            //         this.doQuery();
            //         this.hideSavedSearches();
            //     }
            //     this.mapFilter.expanded(!this.mapFilter.expanded());
            //     window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            // },

            // toggleTimeFilter: function(){
            //     if($('#saved-searches').is(":visible")){
            //         this.doQuery();
            //         this.hideSavedSearches();
            //     }
            //     this.timeFilter.expanded(!this.timeFilter.expanded());
            //     window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            // },

            getSearchQuery: function(){
                var doQuery = false;
                var query = _.chain(decodeURIComponent(location.search).slice(1).split('&') )
                    // Split each array item into [key, value]
                    // ignore empty string if search is empty
                    .map(function(item) { if (item) return item.split('='); })
                    // Remove undefined in the case the search is empty
                    .compact()
                    // Turn [key, value] arrays into object parameters
                    .object()
                    // Return the value of the chain operation
                    .value();

                if('page' in query){
                    query.page = JSON.parse(query.page);
                    doQuery = true;
                }
                this.searchResults.restoreState(query.page);


                if('termFilter' in query){
                    query.termFilter = JSON.parse(query.termFilter);
                    doQuery = true;
                }
                this.termFilter.restoreState(query.termFilter);


                if('temporalFilter' in query){
                    query.temporalFilter = JSON.parse(query.temporalFilter);
                    doQuery = true;
                }
                // if('timeExpanded' in query){
                //     query.timeExpanded = JSON.parse(query.timeExpanded);
                //     doQuery = true;
                // }
                this.timeFilter.restoreState(query.temporalFilter);


                if('spatialFilter' in query){
                    query.spatialFilter = JSON.parse(query.spatialFilter);
                    doQuery = true;
                }
                if('mapExpanded' in query){
                    query.mapExpanded = JSON.parse(query.mapExpanded);
                    doQuery = true;
                }
                //query.mapExpanded = true;
                this.mapFilter.restoreState(query.spatialFilter, query.mapExpanded);
                

                if(doQuery){
                    this.doQuery();
                    //this.hideSavedSearches();
                    //this.slideSearchPanel();
                }
                
            },

            clear: function(){
                this.mapFilter.clear();
                this.timeFilter.clear();
                this.termFilter.clear();
            },

            exportSearch: function(e) {
                var export_format = e.currentTarget.id,
                    _href = $("a.dataexport").attr("href"),
                    format = 'export=' + export_format,
                    params_with_page = this.searchQuery.queryString(),
                    page_number_regex = /page=[0-9]+/;
                    params = params_with_page.replace(page_number_regex, format);
                $("a.dataexport").attr("href", arches.urls.search_results_export + '?' + params);
            }
        });
        new SearchView();
    });
});