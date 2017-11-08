from django.shortcuts import render
from arches.app.models import models
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer

def index(request):
    # import ipdb
    # ipdb.set_trace()
    projects = models.MobileProject.objects.all().order_by('name')
    context = {
        "projects": projects
    }

    return render(request, 'pouch_demo.htm', context)