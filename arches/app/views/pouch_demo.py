from django.shortcuts import render
from arches.app.models import models
from arches.app.models.project import Project
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer
from arches.app.utils.JSONResponse import JSONResponse

def index(request):
    # import ipdb
    # ipdb.set_trace()
    projects = models.MobileProject.objects.all().order_by('name')
    context = {
        "projects": projects
    }

    return render(request, 'pouch_demo.htm', context)

def push_edits_to_db(request):
    project_id = request.GET.get('project_id', None)
    # read all docs that have changes
    # save back to postgres db
    project = Project.objects.get(pk=project_id)
    return JSONResponse(project.push_edits_to_db(), indent=4)