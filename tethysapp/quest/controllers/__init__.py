##########################################################################

#        Home Controller

############################################################################

# python imports
import json

# 3rd party imports
import quest

# django imports
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import HttpResponseRedirect, HttpResponse, Http404

# tethys imports
from tethys_sdk.gizmos import (
    MapView,
    MVView,
    SelectInput,
    TextInput,
)

# local imports
from .. import utilities
from .quest_workflows import activate_user_settings


@ensure_csrf_cookie
@login_required()
@activate_user_settings
def home(request):
    """
    Controller for the app home page.
    """
    # Define view options
    view_options = MVView(
        projection='EPSG:4326',
        center=[-90.856665, 32.309082],
        zoom=5,
        maxZoom=18,
        minZoom=2
    )

    esri_layer_names = [
        'NatGeo_World_Map',
        'Ocean_Basemap',
        'USA_Topo_Maps',
        'World_Imagery',
        'World_Physical_Map',
        'World_Shaded_Relief',
        'World_Street_Map',
        'World_Terrain_Base',
        'World_Topo_Map',
    ]
    esri_layers = [{'ESRI': {'layer': l}} for l in esri_layer_names]
    basemaps = [
        'Stamen',
        {'Stamen': {'layer': 'toner', 'control_label': 'Black and White'}},
        {'Stamen': {'layer': 'watercolor'}},
        'OpenStreetMap',
        'CartoDB',
        {'CartoDB': {'style': 'dark'}},
        {'CartoDB': {'style': 'light', 'labels': False, 'control_label': 'CartoDB-light-no-labels'}},
        'ESRI',
        {'XYZ': {'url': 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', 'control_label': 'Wikimedia'}}
    ]
    basemaps.extend(esri_layers)

    MapView.ol_version = '5.3.0'

    map_view_options = MapView(height='100%',
                               width='100%',
                               controls=['ZoomSlider', 'Rotate', 'FullScreen',
                                         {'MousePosition': {'projection': 'EPSG:4326'}},
                                         {'ZoomToExtent': {'projection': 'EPSG:4326', 'extent': [-130, 22, -10, 54]}}
                                         ],
                               view=view_options,
                               basemap=basemaps,
                               draw=None,
                               legend=False
                               )

    collection_select_options = SelectInput(display_text='Select Collection',
                                            name='collection',
                                            multiple=False,
                                            options=[],
                                            )

    new_collection_name_text_options = TextInput(display_text='New Collection Name',
                                                 name='new_collection_name',
                                                 )
    new_collection_description_text_options = TextInput(display_text='New Collection Description',
                                                        name='new_collection_description',
                                                        )
    act_project = quest.api.get_active_project()

    project_select_options = SelectInput(
        display_text='Set Active Project',
        name='project',
        multiple=False,
        select2_options={'placeholder': 'Select a Project'},
        options=[(v['display_name'],k) for k,v in quest.api.get_projects(expand=True).items() if k != act_project],
    )

    project_delete_select_options = SelectInput(
        display_text='Project to Delete',
        name='delete_project',
        multiple=False,
        select2_options={'placeholder': 'Select Project to Delete..'},
        options=[(v['display_name'], k) for k, v in quest.api.get_projects(expand=True).items() if k != act_project],
    )

    new_project_name_text_options = TextInput(display_text='New Project Name',
                                                 name='new_project_name',
                                                 )

    parameters_select_options = SelectInput(name='parameter',
                                            display_text='',
                                            options=[(p, p) for p in quest.api.get_mapped_parameters()],
                                            select2_options={'placeholder': 'Select a parameter'},
                                            )

    services = json.dumps(list(quest.api.get_services(expand=True).values()))

    checkbox_tree = utilities.get_hierarchical_provider_list()

    context = {'services': services,
               'parameters_select_options': parameters_select_options,
               'checkbox_tree': checkbox_tree,
               'geom_types': [('Points', 'point'), ('Lines', 'line'), ('Polygon', 'polygon'), ('Any', '')],
               'map_view_options': map_view_options,
               'collection_select_options': collection_select_options,
               'new_collection_name_text_options': new_collection_name_text_options,
               'new_collection_description_text_options': new_collection_description_text_options,
               'project_select_options': project_select_options,
               'project_delete_select_options': project_delete_select_options,
               'new_project_name_text_options': new_project_name_text_options,
               'active_project': quest.api.get_active_project(),
               'projects': quest.api.get_projects(expand=True)
               }

    return render(request, 'quest/home.html', context)
