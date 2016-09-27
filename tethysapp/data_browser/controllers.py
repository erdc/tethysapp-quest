from datetime import datetime
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie

from tethys_sdk.gizmos import (MapView,
                               MVDraw,
                               MVView,
                               MVLayer,
                               MVLegendClass,
                               SelectInput,
                               TableView,
                               DatePicker,
                               TextInput,
                               TimeSeries,
                               ToggleSwitch,
                               )

from app import DataBrowser as app
import utilities

import dsl
import json
import os


@ensure_csrf_cookie
@login_required()
def home(request):
    """
    Controller for the app home page.
    """
    dsl.api.update_settings({'BASE_DIR': app.get_user_workspace(request.user).path,
                             'CACHE_DIR': os.path.join(app.get_app_workspace().path, 'cache'),
                             })
    print(dsl.api.get_settings())

    collections = utilities.get_collections_with_metadata()
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
                               legend=False
                               )

    collection_select_options = SelectInput(display_text='Select Collection',
                                            name='collection',
                                            multiple=False,
                                            options=[(collection['display_name'], collection['name']) for collection in collections],
                                            )

    select_mode_toggle = ToggleSwitch(display_text='Select Mode',
                                      name='select_mode',
                                      on_label='Locations',
                                      off_label='Datasets',
                                      on_style='success',
                                      off_style='danger',
                                      initial=True,
                                      size='large',
                                      classes='map-toggle-control')

    plot_view_options = TimeSeries(height='100%',
                                   width='100%',
                                   title=' ',
                                   engine='highcharts',
                                   y_axis_title='',
                                   y_axis_units='',
                                   series=[]
                                   )


    context = {'collections': collections,
               'collections_json': json.dumps(collections),
               'services': services,
               'parameters': parameters,
               'providers': providers,
               'checkbox_tree': checkbox_tree,
               'geom_types': [('Points', 'point'), ('Lines', 'line'), ('Polygon', 'polygon'), ('Any', '')],
               'map_view_options': map_view_options,
               'plot_view_options': plot_view_options,
               'collection_select_options': collection_select_options,
               'select_mode_toggle': select_mode_toggle,
               }

    return render(request, 'data_browser/home.html', context)


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

    collection_name = request.POST.get('collection_name')
    code_name = utilities.codify(collection_name)
    color = utilities.get_random_color()
    description = request.POST['description']
    dsl.api.new_collection(code_name,
                           display_name=collection_name,
                           description=description,
                           metadata={'color': color})

    collection = utilities.get_collection_with_metadata(code_name)

    context = {'collection': collection}

    collection_html = render(request, 'data_browser/collection.html', context).content
    details_table_html = render(request, 'data_browser/details_table.html', context).content
    details_table_tab_html = render(request, 'data_browser/details_table_tab.html', context).content
    success = True

    result = {'success': success,
              'collection_html': collection_html,
              'details_table_html': details_table_html,
              'details_table_tab_html': details_table_tab_html,
              'collection': collection,
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
        collection = utilities.get_collection_with_metadata(collection)
    except:
        pass

    context = {'collection': collection}

    details_table_html = render(request, 'data_browser/details_table.html', context).content

    result = {'success': success,
              'collection': collection,
              'details_table_html': details_table_html,
              }

    return JsonResponse(result)


def get_options_form(request, options_type, get_options_function, options_metadata_name, submit_controller_name, submit_btn_text):

    dataset = request.GET['dataset']
    context = {'options_type': options_type,
               'action': reverse('data_browser:{}'.format(submit_controller_name)),
               'dataset_id': dataset,
               'submit_btn_text': submit_btn_text,
               }
    success = False
    try:
        options = get_options_function(dataset)
        if dataset in options:
            options = options[dataset]
        context['properties'] = options.get('properties', None)
        context['title'] = options.get('title', '')

        success = True
    except Exception as e:
        raise(e)

    if context['properties'] is None:
        return download_dataset(request, dataset)

    set_options = {}
    metadata = dsl.api.get_metadata(dataset)[dataset]
    if options_metadata_name in metadata:
        set_options = json.loads(metadata[options_metadata_name])

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

    # html = render_to_string('data_browser/options.html', context)
    html = render(request, 'data_browser/options.html', context).content

    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
def get_download_options_workflow(request):
    return get_options_form(request,
                              options_type='download',
                              get_options_function=dsl.api.download_options,
                              options_metadata_name='_download_options',
                              submit_controller_name='download_dataset_workflow',
                              submit_btn_text='Download')


@login_required()
def get_filter_options_workflow(request):
    return get_options_form(request,
                              options_type='filter',
                              get_options_function=dsl.api.apply_filter_options,
                              options_metadata_name='_apply_filter_options',
                              submit_controller_name='apply_filter_workflow',
                              submit_btn_text='Apply Filter')


@login_required()
def get_visualize_options_workflow(request):
    return get_options_form(request,
                              options_type='visualize',
                              get_options_function=dsl.api.visualize_dataset_options,
                              options_metadata_name='_visualize_options',
                              submit_controller_name='visualize_dataset_workflow',
                              submit_btn_text='Visualize')

def get_details_table(request, collection):
    collection = utilities.get_collection_with_metadata(collection)
    context = {'collection': collection}

    details_table_html = render(request, 'data_browser/details_table.html', context).content
    return details_table_html


def download_dataset(request, dataset, options=None):
    success = False
    result = {}
    try:
        dsl.api.stage_for_download(dataset, download_options=options)
        response = dsl.api.download_datasets(dataset)
        collection = dsl.api.get_datasets(metadata=True)[dataset]['collection']
        success = True
    except Exception as e:
        result['error_message'] = str(e)

    result['success'] = success
    result['details_table_html'] = get_details_table(request, collection)
    result['collection_name'] = collection

    return JsonResponse(result)


@login_required()
def download_dataset_workflow(request):
    download_options = dict(request.POST.items())
    dataset = download_options.pop('dataset')
    download_options.pop('csrfmiddlewaretoken')
    for key, value in download_options.items():
        if not value:
            download_options.pop(key)

    return download_dataset(request, dataset, download_options)


@login_required()
def apply_filter_workflow(request):
    pass


@login_required()
def visualize_dataset_workflow(request):
    dataset = request.GET['dataset']
    data = dsl.api.open_dataset(dataset, fmt='dict')
    metadata = data['metadata']
    parameter = metadata['parameter']
    timeseries = data['data'][parameter]
    timeseries = [(datetime.strptime(date, utilities.ISO_DATETIME_FORMAT), value) for date, value in timeseries]
    title = 'Plot View'
    success = True
    '''
    engine = 'd3'
    '''
    engine = 'highcharts'
    # '''

    plot_view_options = TimeSeries(
        height='100%',
        width='100%',
        title=' ',
        engine=engine,
        y_axis_title=parameter,
        y_axis_units=metadata['units'],
        series=[{
            'name': dataset,
            'data': timeseries,
        }]
    )

    context = {'title': title,
              'plot_view_options': plot_view_options,
               }

    html = render(request, 'data_browser/visualize.html', context).content

    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
def show_metadata_workflow(request):
    dataset = request.GET['dataset']

    title = 'Metadata'

    dataset = dsl.api.get_datasets(metadata=True)[dataset]
    rows = [(k, v) for k, v in dataset.items()]

    table_view_options = TableView(column_names=('Property', 'Value'),
                                   rows=rows,
                                   hover=True,
                                   striped=True,
                                   bordered=False,
                                   condensed=False)

    context = {'title': title,
               'table_view_options': table_view_options,
               }

    html = render(request, 'data_browser/metadata.html', context).content

    result = {'success': True,
              'html': html,
              }

    return JsonResponse(result)

@login_required()
def delete_dataset_workflow(request):
    result = {'success': False}
    dataset = request.POST['dataset'] # or request.GET.get('dataset')  #TODO pick one
    try:
        # get the name of the collection before deleting dataset
        collection = dsl.api.get_datasets(metadata=True)[dataset]['collection']

        dsl.api.delete(dataset)

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the dataset has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error_message'] = str(e)

    return JsonResponse(result)

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
    except Exception as e:
        features = {'error_message': str(e)}

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

