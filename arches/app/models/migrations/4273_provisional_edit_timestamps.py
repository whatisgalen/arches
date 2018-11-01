# -*- coding: utf-8 -*-
# Generated by Django 1.11.10 on 2018-11-01 05:30
from __future__ import unicode_literals

from django.db import migrations, models
from datetime import datetime
from arches.app.models.system_settings import settings
import pytz


class Migration(migrations.Migration):


    dependencies = [
        ('models', '4264_online_msm_basemap'),
    ]


    def forwards_func():
        tz = pytz.timezone(settings.TIME_ZONE)
        utc = pytz.utc
        TileModel = apps.get_model("models", "TileModel")
        tiles_w_provisional_edits = TileModel.objects.filter(provisionaledits__isnull = False)
        for tile in tiles_w_provisional_edits:
            for k, v in iter(tile.provisionaledits.items()):
                print v['timestamp']
                # datetime.now(tz).astimezone(utc)

    def reverse_func():
        pass

    operations = [
        migrations.RunPython(forwards_func, reverse_func),
    ]
