define(['jquery', 'backbone', 'underscore', 'arches', 'resource-types', 'd3', 'plugins/d3-tip', 'knockout', 'knockout-mapping'], function($, Backbone, _, arches, resourceTypes, d3, d3Tip, ko, koMapping) {
    return Backbone.View.extend({
        resourceId: null,
        resourceName: '',
        resourceTypeId: '',
        newNodeId: 0,
        events: {
            'click .load-more-relations-link': 'loadMoreRelations',
            'keyup #graph-filter': 'filterGraph',
            'mouseover .inner-results': 'highlightNode'
        },

        initialize: function(options) {
            var self = this;
            this.width = this.$el.width();
            this.height = this.$el.height();

            _.extend(this, _.pick(options, 'resourceId', 'resourceName', 'resourceTypeId'));
            
            this.nodeMap = {};
            this.nodeList = koMapping.fromJS([]);
            ko.applyBindings(this.nodeList, $('#graph-detail-panel')[0]);
            this.linkMap = {};
            this.data = {
                nodes: [],
                links: []
            };

            self.force = d3.layout.force()
                .charge(-2750)
                .linkDistance(200)
                .gravity(0.05)
                .friction(0.55)
                .linkStrength(function(l, i) {return 1; })
                .theta(0.8)
                .size([this.width, this.height]);

            var redraw = function() {
                self.vis.attr("transform",
                    "translate(" + d3.event.translate + ")" +
                    " scale(" + d3.event.scale + ")");
                if (self.sourceTip) {
                    self.sourceTip.hide();
                }
                if (self.targetTip) {
                    self.targetTip.hide();
                }
                if (self.nodeTip) {
                    self.nodeTip.hide();
                }
            };

            self.svg = d3.select(this.el).append("svg:svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .call(d3.behavior.zoom().on("zoom", redraw));
            self.vis = self.svg.append('svg:g');


            self.sourceTip = d3Tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html(function (d) {
                    return  '<span class="graph-tooltip-name">' + d.name + "</span> " + d.relationship + "...</span>";
            });
            self.targetTip = d3Tip()
                .attr('class', 'd3-tip')
                .direction('s')
                .offset([10, 0])
                .html(function (d) {
                    return  '<span class="graph-tooltip-name">' + d.name + "</span> " + d.relationship + "...</span>";
            });
            self.nodeTip = d3Tip()
                .attr('class', 'd3-tip')
                .direction('n')
                .offset([-10, 0])
                .html(function (d) {
                    return  '<span class="graph-tooltip-name">' + d.name + "</span>";
            });

            self.vis.call(self.sourceTip)
                .call(self.targetTip)
                .call(self.nodeTip);

            if (self.resourceId) {
                self.loadResourceData(self.resourceId, this.resourceName, self.resourceTypeId);
            }
            
            $(window).on("resize", function() {
                self.resize();
            }).trigger("resize");

            self.$el.addClass('view-created');
        },

        resize: function(){
            this.width = this.$el.width();
            this.height = this.$el.height();
            this.svg.attr("width", this.width);
            this.svg.attr("height", this.height);    
        },

        loadResourceData: function(resourceId, resourceName, resourceTypeId){
            var self = this;
            this.nodeMap = {};
            this.nodeList.removeAll();
            this.$el.find('.node_info').hide();
            this.$el.addClass('loading');
            this.getResourceData(resourceId, resourceName, resourceTypeId, function (data) {
                self.$el.removeClass('loading');
                self.data = data;
                self.data.nodes[0].x = self.width/2;
                self.data.nodes[0].y = self.height/2;
                self.update();
            }, true);
        },

        update: function () {
            var self = this;

            self.data = {
                nodes: self.force.nodes(self.data.nodes).nodes(),
                links: self.force.links(self.data.links).links()
            };

            var link = self.vis.selectAll("line")
                .data(self.data.links);
            link.enter()
                .insert("line", "circle")
                .attr("class", "link")
                .on("mouseover", function(d) {
                    d3.select(this).attr("class", "linkMouseover");
                    self.vis.selectAll("circle").attr("class", function(d1){
                        var className = 'node-' + (d1.isRoot ? 'current' : 'ancestor');
                        if (d.source === d1 || d.target === d1) {
                            var tip = (d.target === d1) ? self.targetTip : self.sourceTip;
                            className += '-neighbor';
                            d1.relationship = (d.target === d1) ? d.relationshipTarget : d.relationshipSource;
                            tip.show(d1, this);
                        } else if (d1 === self.selectedNode) {
                            className += '-over';
                        }
                        return className;
                    });
                })
                .on("mouseout", function(d) {
                    d3.select(this).attr("class", "link");
                    self.vis.selectAll("circle").attr("class", function(d1){
                        var className = 'node-' + (d1.isRoot ? 'current' : 'ancestor');
                        if (d1 === self.selectedNode) {
                            className += '-over';
                        }
                        return className;
                    });
                    self.sourceTip.hide();
                    self.targetTip.hide();
                });
            link.exit()
                .remove();

            var drag = self.force.drag()
                .on("dragstart", function(d) {
                    d3.event.sourceEvent.stopPropagation();
                    d3.event.sourceEvent.preventDefault();
                });

            var node = self.vis.selectAll("circle")
                .data(self.data.nodes, function(d) { return d.id; });
            node.enter()
                .append("circle")
                .attr("r",function(d){
                    return d.isRoot ? 24 : 18;
                })
                .attr("class", function(d){
                    return 'node-' + (d.isRoot ? 'current' : 'ancestor');
                })
                .attr("style", function(d){
                    return "fill:" + resourceTypes[d.entitytypeid].fillColor + ";stroke:" + resourceTypes[d.entitytypeid].strokeColor;
                })
                .on("mouseover", function(d){
                    self.vis.selectAll("circle")
                        .attr("class", function(d1){
                            var className = 'node-' + (d.isRoot ? 'current' : 'ancestor');
                            if (d1 === d) {
                                className += '-over';
                            } else if (self.linkMap[d1.id+'_'+d.id] || self.linkMap[d.id+'_'+d1.id]){
                                className += '-neighbor';
                            }
                            return className;
                        })
                        .attr("style", function(d1){
                            return "fill:" + resourceTypes[d1.entitytypeid].fillColor + ";stroke:" + resourceTypes[d1.entitytypeid].strokeColor;
                        });
                    self.vis.selectAll("line")
                        .attr('class', function(l) {
                            return (l.source === d || l.target === d) ? 'linkMouseover' : 'link';
                        });
                    self.nodeTip.show(d, this);
                })
                .on('mouseout', function (d) {
                    self.vis.selectAll("circle")
                        .attr("class", function(d1){
                            var className = 'node-' + (d.isRoot ? 'current' : 'ancestor');
                            if (d1 === self.selectedNode) {
                                className += '-over';
                            }
                            return className;
                        });
                    self.vis.selectAll("line")
                        .attr('class', 'link');
                    self.nodeTip.hide();
                })
                .on("click", function (d) {
                    if (!d3.event.defaultPrevented){
                        self.getResourceDataForNode(d);
                    }
                })
                .call(drag);
            node.exit()
                .remove();
            
            if (self.texts){
                self.texts.remove();
            }

            self.texts = self.vis.selectAll("text.nodeLabels")
                .data(self.data.nodes);

            self.texts.enter().append("text")
                .attr("class", 'root-node-label')
                .attr("dy", ".35em")
                .text(function(d) {
                    return d.isRoot ? d.name : '';
                });

            self.force.on("tick", function() {
                link.attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });
         
                node.attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; });

                self.texts
                    .attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y; });
         
            });

            self.force.start();
        },

        highlightNode: function(e){
            var self = this;
            if(e.currentTarget){
                var d = $(e.currentTarget).data();
                self.vis.selectAll("circle")
                    .attr("class", function(d1){
                        var className = 'node-ancestor';// + (d.isRoot ? 'current' : 'ancestor');
                        if (d1.entityid === d.entityid) {
                            className += '-over';
                        }
                        return className;
                    });
            }
        },

        filterGraph: function(e){
            var text = $(e.currentTarget).val().toLowerCase();

            var data = _.filter(_.toArray(this.nodeMap), function(item){ 
                if(item.name.toLowerCase().indexOf(text) > -1 || item.isRoot){
                    return item;
                }
                if(item.typeName.toLowerCase().indexOf(text) > -1){
                    return item;
                }
            });
            koMapping.fromJS(data, this.nodeList);
        },

        updateNodeInfo: function (d) {
            koMapping.fromJS(_.toArray(this.nodeMap), this.nodeList);
            this.$el.find('.node_info').show();
        },

        loadMoreRelations: function () {
            var data = $(arguments[0].currentTarget).data() || this.selectedNode;
            this.getResourceDataForNode(data);
        },

        getResourceDataForNode: function(d) {
            var self = this;
            self.getResourceData(d.entityid, d.name, d.entitytypeid, function (newData) {
                if (newData.nodes.length > 0 || newData.links.length > 0) {
                    self.data.nodes = self.data.nodes.concat(newData.nodes);
                    self.data.links = self.data.links.concat(newData.links);
                    self.update(self.data);
                }
            }, false);
        },

        getResourceData: function (resourceId, resourceName, resourceTypeId, callback, isRoot) {
            var load = true;
            var self = this;
            var start = 0;
            var rootNode = this.nodeMap[resourceId];

            if (rootNode) {
                if (rootNode.relationCount.total) {
                    load = (rootNode.relationCount.total > rootNode.relationCount.loaded && !rootNode.loading);
                    start = rootNode.relationCount.loaded;
                }
            }

            if (load) {
                if (rootNode) {
                    rootNode.loading = true;
                }
                $.ajax({
                    url: arches.urls.related_resources + resourceId,
                    data: {
                        start: start
                    },
                    success: function(response) {
                        var links = [],
                            nodes = [];

                        if (isRoot){
                            rootNode = {
                                id: self.newNodeId,
                                entityid: resourceId,
                                name: resourceName,
                                entitytypeid: resourceTypeId,
                                typeIcon: resourceTypes[resourceTypeId].icon,
                                typeName: resourceTypes[resourceTypeId].name,
                                isRoot: true,
                                relationType: 'Current',
                                relationCount: {
                                    total: response.total,
                                    loaded: response.resource_relationships.length
                                }
                            };
                            nodes.push(rootNode);
                            self.nodeMap[resourceId] = rootNode;
                            self.newNodeId += 1;
                        } else if (rootNode.relationCount.total) {
                            rootNode.relationCount.loaded = rootNode.relationCount.loaded + response.resource_relationships.length;
                        } else {
                            rootNode.relationCount = {
                                total: response.total,
                                loaded: response.resource_relationships.length
                            };
                        }

                        rootNode.loading = false;
                        _.each(response.related_resources, function (related_resource) {
                            if (!self.nodeMap[related_resource.entityid]) {
                                var node = {
                                    id: self.newNodeId,
                                    entityid: related_resource.entityid,
                                    entitytypeid: related_resource.entitytypeid,
                                    typeIcon: resourceTypes[related_resource.entitytypeid].icon,
                                    typeName: resourceTypes[related_resource.entitytypeid].name,
                                    name: related_resource.primaryname,
                                    isRoot: false,
                                    relationType: 'Ancestor',
                                    relationCount: {
                                        total: undefined,
                                        loaded: 0
                                    }
                                };
                                nodes.push(node);
                                self.nodeMap[related_resource.entityid] = node;
                                self.newNodeId += 1;
                            }
                        });

                        self.updateNodeInfo(rootNode);

                        _.each(response.resource_relationships, function (resource_relationships) {
                            var sourceId = self.nodeMap[resource_relationships.entityid1];
                            var targetId = self.nodeMap[resource_relationships.entityid2];
                            var linkExists = _.find(self.data.links, function(link){
                                return (link.source === sourceId && link.target === targetId);
                            });
                            var relationshipSource = resource_relationships.preflabel.value;
                            var relationshipTarget = resource_relationships.preflabel.value;
                            if (resource_relationships.preflabel.value.split('/').length === 2) {
                                relationshipSource = resource_relationships.preflabel.value.split('/')[0].trim();
                                relationshipTarget = resource_relationships.preflabel.value.split('/')[1].trim();
                            }
                            if (!linkExists) {
                                links.push({
                                    source: sourceId,
                                    target: targetId,
                                    relationshipSource: relationshipSource,
                                    relationshipTarget: relationshipTarget,
                                    weight: 1
                                });
                                self.linkMap[sourceId.id+'_'+targetId.id] = true;
                            }
                        });

                        callback({
                            nodes: nodes,
                            links: links
                        });
                    }
                });
            }
        }
    });
});

