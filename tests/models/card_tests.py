'''
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
'''

import os, json, uuid
from tests import test_settings
from tests.base_test import ArchesTestCase
from arches.app.models import models
from arches.app.models.card import Card
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer


class CardTests(ArchesTestCase):
    

    def test_card_doesnt_polute_db(self):
        """
        test that the mere act of creating a Card instance doesn't save anything to the database

        """

        card_obj = {
            "itemtext": None,
            "active": True,
            "functions": [],
            "graph_id": "b4629a19-7923-11e6-9412-14109fd34195",
            "visible": True,
            "description": None,
            "name": "TEST Graph",
            "nodegroup_id": "b46293c7-7923-11e6-93b9-14109fd34195",
            "cards": [],
            "helpenabled": False,
            "helptext": None,
            "sortorder": None,
            "id": "b465058c-7923-11e6-9994-14109fd34195",
            "cardid": "b465058c-7923-11e6-9994-14109fd34195",
            "helptitle": None,
            "cardinality": "1",
            "ontologyproperty": None,
            "instructions": None,
            "users": [
                {
                    "username": "anonymous",
                    "perms": {
                        "default": [
                            {
                                "codename": "read_nodegroup",
                                "name": "Read"
                            }
                        ],
                        "local": []
                    },
                    "type": "user",
                    "email": "",
                    "id": 2
                },
                {
                    "username": "admin",
                    "perms": {
                        "default": [
                            {
                                "codename": "delete_nodegroup",
                                "name": "Delete"
                            },
                            {
                                "codename": "write_nodegroup",
                                "name": "Create/Update"
                            },
                            {
                                "codename": "read_nodegroup",
                                "name": "Read"
                            }
                        ],
                        "local": []
                    },
                    "type": "user",
                    "email": "",
                    "id": 1
                }
            ],
            "groups": [
                {
                    "perms": {
                        "default": [
                            {
                                "codename": "delete_nodegroup",
                                "name": "Delete"
                            },
                            {
                                "codename": "read_nodegroup",
                                "name": "Read"
                            },
                            {
                                "codename": "write_nodegroup",
                                "name": "Create/Update"
                            }
                        ],
                        "local": []
                    },
                    "type": "group",
                    "name": "edit",
                    "id": 1
                },
                {
                    "perms": {
                        "default": [
                            {
                                "codename": "read_nodegroup",
                                "name": "Read"
                            }
                        ],
                        "local": []
                    },
                    "type": "group",
                    "name": "read",
                    "id": 2
                }
            ],
            "widgets": [
                {
                    "id": None,
                    "node_id": "ba195475-7923-11e6-8a08-14109fd34195",
                    "card_id": "b465058c-7923-11e6-9994-14109fd34195",
                    "widget_id": "10000000-0000-0000-0000-000000000001",
                    "config": "{\"width\":\"100%\",\"placeholder\":\"Enter text\",\"label\":\"Node\"}",
                    "label": "Node",
                    "sortorder": None,
                    "functions": []
                }
            ],
            "nodes": [
                {
                    "functions": [],
                    "graph_id": "b4629a19-7923-11e6-9412-14109fd34195",
                    "description": "Represents a single node in a graph",
                    "istopnode": False,
                    "ontologyclass": None,
                    "nodeid": "ba195475-7923-11e6-8a08-14109fd34195",
                    "datatype": "string",
                    "nodegroup_id": "b46293c7-7923-11e6-93b9-14109fd34195",
                    "config": None,
                    "name": "Node"
                }
            ]
        }

        models.GraphModel.objects.create(pk='b4629a19-7923-11e6-9412-14109fd34195', isresource=False, isactive=True)
        models.NodeGroup.objects.create(pk='b46293c7-7923-11e6-93b9-14109fd34195', cardinality='n')
        models.Node.objects.create(pk='b46293c7-7923-11e6-93b9-14109fd34195', istopnode=True, datatype='semantic', name='RootNode', graph_id='b4629a19-7923-11e6-9412-14109fd34195', nodegroup_id='b46293c7-7923-11e6-93b9-14109fd34195')
        models.Node.objects.create(pk='ba195475-7923-11e6-8a08-14109fd34195', istopnode=False, datatype='string', name='Node', graph_id='b4629a19-7923-11e6-9412-14109fd34195', nodegroup_id='b46293c7-7923-11e6-93b9-14109fd34195')

        cards_count_before = models.CardModel.objects.count()
        cardnodewidgets_count_before = models.CardXNodeXWidget.objects.count()
        nodes_count_before = models.Node.objects.count()

        card = Card(card_obj)

        self.assertEqual(models.CardModel.objects.count()-cards_count_before, 0)
        self.assertEqual(models.CardXNodeXWidget.objects.count()-cardnodewidgets_count_before, 0)
        self.assertEqual(models.Node.objects.count()-nodes_count_before, 0)
