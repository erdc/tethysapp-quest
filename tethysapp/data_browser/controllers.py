from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from tethys_sdk.gizmos import (MapView,
                               MVDraw,
                               MVView,
                               MVLayer,
                               MVLegendClass,
                               SelectInput,
                               TableView,
                               DatePicker,
                               TextInput,
                               )

import utilities

import dsl
import json

@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    # features = dsl.api.get_features(services=dsl.api.get_services()[0])

    collections = list(dsl.api.get_collections(metadata=True).values())
    for collection in collections:
        collection['features'] = list(dsl.api.get_features(metadata=True, collections=collection['name']).values())
        collection['datasets'] = list(dsl.api.get_datasets(metadata=True, filters={'collection': collection['name']}).values())
        collection['table_view_options'] = get_datasets_table_options(collection)


    parameters = dsl.api.get_mapped_parameters()
    providers = utilities.get_dsl_providers_with_services()


    checkbox_tree = utilities.get_hierarchical_provider_list()
    services = json.dumps(list(dsl.api.get_services(metadata=True).values()))

    # Define view options
    view_options = MVView(
        projection='EPSG:4326',
        center=[-90.856665, 32.309082],
        zoom=5,
        maxZoom=18,
        minZoom=2
    )

    layers = []

    # for collection in collections:
    #     collection_color = collection['metadata']['color']
    #     collection_fill_color = utilities.get_rgba_color_from_hex(collection_color, 0.3)
    #
    #     geojson_object = dsl.api.get_features(collections=collection['name'], metadata=True)
    #
    #
    #     geojson_layer = MVLayer(source='GeoJSON',
    #                             options=geojson_object,
    #                             legend_title=collection['display_name'],
    #                             # layer_options=layer_options,
    #                             # legend_extent=[-46.7, -48.5, 74, 59],
    #                             legend_classes=[
    #                                 MVLegendClass('polygon', 'Polygons', fill='rgba({r}, {g}, {b}, {a})'.format(**collection_fill_color), stroke=collection_color),
    #                                 MVLegendClass('line', 'Lines', stroke=collection_color),
    #                                 MVLegendClass('point', 'Points', fill='rgba({r}, {g}, {b}, {a})'.format(**collection_fill_color), stroke=collection_color)]
    #                             )
    #
    #     layers.append(geojson_layer)

    map_view_options = MapView(height='100%',
                               width='100%',
                               controls=['ZoomSlider', 'Rotate', 'FullScreen',
                                         {'MousePosition': {'projection': 'EPSG:4326'}},
                                         {'ZoomToExtent': {'projection': 'EPSG:4326', 'extent': [-130, 22, -10, 54]}}
                                         ],
                               layers=layers,
                               view=view_options,
                               basemap='OpenStreetMap',
                               draw=None,
                               legend=True
                               )

    collection_select_options = SelectInput(display_text='Select Collection',
                                            name='collection',
                                            multiple=False,
                                            options=[(collection['display_name'], collection['name']) for collection in collections],
                                            )


    context = {'collections': collections,
               'collections_json': json.dumps(collections),
               'services': services,
               'parameters': parameters,
               'providers': providers,
               'checkbox_tree': checkbox_tree,
               'geom_types': [('Points', 'point'), ('Lines', 'line'), ('Polygon', 'polygon'), ('Any', '')],
               'map_view_options': map_view_options,
               'collection_select_options': collection_select_options,
               }

    return render(request, 'data_browser/home.html', context)


def get_datasets_table_options(collection):
    return TableView(column_names=utilities.get_dataset_columns(),
                     rows=utilities.get_dataset_rows(collection['datasets']),
                     hover=True,
                     striped=False,
                     bordered=False,
                     condensed=False
                     )




from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.core.urlresolvers import reverse

import utilities

############################################################################

#        REST WORKFLOW CONTROLLERS

############################################################################


@login_required()
def new_collection_workflow(request):
    success = False
    html = None
    name = None
    display_name = None

    if request.POST:
        collection_name = request.POST.get('collection_name')
        if collection_name:
            code_name = utilities.codify(collection_name)
            color = utilities.get_random_color()
            description = request.POST['description']
            dsl.api.new_collection(code_name,
                                   display_name=collection_name,
                                   description=description,
                                   metadata={'color': color})

            collection = dsl.api.get_collections(metadata=True)[code_name]
            html = render(request, 'data_browser/collection.html', {'collection': collection}).content
            success = True
            name = code_name
            display_name = collection['display_name']

    result = {'success': success,
              'html': html,
              'name': name,
              'display_name': display_name,
              }

    return JsonResponse(result)


@login_required()
def add_features_workflow(request):
    collection = request.GET['collection']
    features = request.GET['features']
    parameter = request.GET['parameter']

    success = False
    try:
        features = dsl.api.add_features(collection, features)
        for feature in features:
            dataset = dsl.api.new_dataset(feature, dataset_type='download')
            dsl.api.stage_for_download(dataset, download_options={'parameter': parameter})
        success = True
    except:
        pass

    result = {'success': success}

    return JsonResponse(result)


@login_required()
def download_dataset_workflow(request):
    download_options = dict(request.POST.items())
    dataset = download_options.pop('dataset')
    for key, value in download_options.items():
        if not value:
            download_options.pop(key)
    download_options.pop('csrfmiddlewaretoken')
    print(download_options)
    success = False
    result = {}

    try:
        dsl.api.stage_for_download(dataset, download_options=download_options)
        response = dsl.api.download_datasets(dataset)
        print(response)
        success = True
    except Exception as e:
        result['error_message'] = str(e)

    result['success'] = success

    # return JsonResponse(result)
    return redirect('data_browser:home')


############################################################################

#        REST CONTROLLERS

############################################################################

@login_required()
def new_collection(request):
    if request.POST:
        collection_name = request.POST.get('collection_name')
        if collection_name:
            code_name = utilities.codify(collection_name)
            color = utilities.get_random_color()
            description = request.POST.get('description')
            collection = dsl.api.new_collection(code_name,
                                                display_name=collection_name,
                                                description=description,
                                                metadata={'color': color})


    return JsonResponse({'collection': collection})


@login_required()
def get_collection(request, name):
    success = False
    collection = None
    collections = dsl.api.get_collections(metadata=True)
    if name in collections.keys():
        try:
            collection = collections[name]
            success = True
        except:
            pass
    return JsonResponse({'success': success, 'collection': collection})


@login_required()
def update_collection(request, name):
    pass


@login_required()
def delete_collection(request, name):
    success = False
    collections = dsl.api.get_collections()
    if name in collections:
        try:
            dsl.api.delete(name)
            success = True
        except:
            pass

    result = {'success': success}

    return JsonResponse(result)


@login_required()
def get_features(request):
    services = request.GET.get('services')
    collections = request.GET.get('collections')
    filters = {}
    for filter in ['geom_type', 'parameter', 'bbox']:
        value = request.GET.get(filter)
        if value is not None:
            filters[filter] = request.GET.get(filter)

    try:
        features = dsl.api.get_features(services=services, collections=collections, filters=filters, metadata=True)
    except:
        pass

    return JsonResponse(features)


@login_required()
def add_features(request):
    collection = request.GET['collection']
    features = request.GET['features']

    success = False
    try:
        dsl.api.add_features(collection, features)
        success = True
    except:
        pass

    result = {'success': success}

    return JsonResponse(result)

@login_required()
def get_download_options(request):
    dataset = request.GET['dataset']
    success = False
    try:
        download_options = dsl.api.download_options(dataset)
        context = download_options[dataset]
        context['name'] = dataset
        context.setdefault('properties', {})
        context.setdefault('title', )
        success = True
    except:
        pass

    set_options = json.loads(dsl.api.get_metadata(dataset)[dataset]['_download_options'])

    for property, property_options in context['properties'].items():
        if 'enum' in property_options:
            input_type = 'select'
            input_options = SelectInput(display_text=property_options['description'],
                                        name=property_options['description'],
                                        multiple=False,
                                        options=[(option, option,) for option in property_options['enum']],
                                        initial=set_options.get(property, ''),
                                        )

        elif 'date' in property_options['description']:
            input_type = 'date'
            input_options = DatePicker(name=property_options['description'],
                                       display_text=property_options['description'],
                                       autoclose=True,
                                       format='m/d/yyyy',
                                       today_button=True,
                                       initial=set_options.get(property, '')
                                       )

        else:
            input_type = 'text'
            input_options = TextInput(display_text=property_options['description'],
                                      name=property_options['description'],
                                      placeholder='',
                                      initial=set_options(property, '')
                                      )


        context['properties'][property]['input_type'] = input_type
        context['properties'][property]['input_options'] = input_options
        context['action'] = reverse('data_browser:download_dataset_workflow')


    # html = render_to_string('data_browser/options.html', download_options)
    html = render(request, 'data_browser/options.html', context).content

    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)

@login_required()
def download_datasets(request):
    dataset = request.GET['dataset']
    success = False
    try:
        dsl.api.download_datasets(dataset)
        success = True
    except:
        pass

    result = {'success': success}

    return JsonResponse(result)

