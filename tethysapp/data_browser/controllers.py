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


def activate_user_settings(func):

    def wrapper(request, *args, **kwargs):

        # change settings to point at users worksapce
        dsl.api.update_settings({'BASE_DIR': app.get_user_workspace(request.user).path,
                                 'CACHE_DIR': os.path.join(app.get_app_workspace().path, 'cache'),
                                 })

        # read in any saved settings for user
        settings_file = dsl.util.config._default_config_file()
        if os.path.exists(settings_file):
            dsl.api.update_settings_from_file(settings_file)
        else:
            dsl.api.save_settings(settings_file)

        return func(request, *args, **kwargs)

    return wrapper


@ensure_csrf_cookie
@login_required()
@activate_user_settings
def home(request):
    """
    Controller for the app home page.
    """
    print(dsl.api.get_settings())
    collections = utilities.get_collections_with_metadata()
    parameters = dsl.api.get_mapped_parameters()
    providers = utilities.get_dsl_providers_with_services()
    checkbox_tree = utilities.get_hierarchical_provider_list()
    services = json.dumps(list(dsl.api.get_services(expand=True).values()))

    # Define view options
    view_options = MVView(
        projection='EPSG:4326',
        center=[-90.856665, 32.309082],
        zoom=5,
        maxZoom=18,
        minZoom=2
    )

    map_view_options = MapView(height='100%',
                               width='100%',
                               controls=['ZoomSlider', 'Rotate', 'FullScreen',
                                         {'MousePosition': {'projection': 'EPSG:4326'}},
                                         {'ZoomToExtent': {'projection': 'EPSG:4326', 'extent': [-130, 22, -10, 54]}}
                                         ],
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
               'collections_json': json.dumps(collections, default=utilities.pre_jsonify),
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


from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.core.urlresolvers import reverse

import utilities

############################################################################

#        REST WORKFLOW CONTROLLERS

############################################################################


@login_required()
@activate_user_settings
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
@activate_user_settings
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

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


def get_options_html(request, uri, options, set_options, options_type, submit_controller_name, submit_btn_text):
    context = {'options_type': options_type,
               'action': reverse('data_browser:{}'.format(submit_controller_name)),
               'uri': uri,
               'submit_btn_text': submit_btn_text,
               'properties': options.get('properties', None),
               'title': options.get('title', ''),
               }

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
                                      initial=set_options.get(property, '')
                                      )

        context['properties'][property]['input_type'] = input_type
        context['properties'][property]['input_options'] = input_options

    # html = render_to_string('data_browser/options.html', context)
    html = render(request, 'data_browser/options.html', context).content

    return html


@login_required()
@activate_user_settings
def get_download_options_workflow(request):
    dataset = request.GET['dataset']
    success = False
    # try:
    if True:
        options = dsl.api.download_options(dataset)
        if dataset in options:
            options = options[dataset]

        success = True
    # except Exception as e:
        # raise(e)

    if 'properties' not in options:
        return retrieve_dataset(request, dataset)

    options_metadata_name = 'options'
    set_options = {}
    metadata = dsl.api.get_metadata(dataset)[dataset]
    if options_metadata_name in metadata:
        set_options = json.loads(metadata[options_metadata_name])
        if not set_options:
            set_options = {}

    html = get_options_html(request,
                            uri=dataset,
                            options=options,
                            set_options=set_options,
                            options_type='retrieve',
                            submit_controller_name='retrieve_dataset_workflow',
                            submit_btn_text='Retrieve')

    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)

@login_required()
@activate_user_settings
def get_filter_list_workflow(request):
    dataset_id = request.GET['dataset']
    options_type = 'filter',
    submit_controller_name = 'apply_filter_workflow',
    submit_btn_text = 'Apply Filter'
    options = {'title': 'Apply Filter',
               }

    success = False
    try:
        # filters = dsl.api.get_filters(filters={'dataset': dataset_id})
        filters = utilities.get_filters(dataset_id)
        options['properties'] = filters

        success = True
    except Exception as e:
        raise(e)

    html = get_options_html(request,
                            uri=dataset_id,
                            options=options,
                            set_options={},
                            options_type=options_type,
                            submit_controller_name=submit_controller_name,
                            submit_btn_text=submit_btn_text)


    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_filter_options_workflow(request):
    dataset_id = request.GET['dataset']
    options_metadata_name = 'options',
    options_type = 'filter',
    submit_controller_name = 'apply_filter_workflow',
    submit_btn_text = 'Apply Filter'

    get_options_function = dsl.api.apply_filter_options

    success = False
    try:
        options = get_options_function(dataset_id)
        if dataset_id in options:
            options = options[dataset_id]

        success = True
    except Exception as e:
        raise(e)

    set_options = {}
    metadata = dsl.api.get_metadata(dataset_id)[dataset_id]
    if options_metadata_name in metadata:
        set_options = json.loads(metadata[options_metadata_name])
        if not set_options:
            set_options = {}

    html = get_options_html(request,
                            uri=dataset_id,
                            options=options,
                            set_options=set_options,
                            options_type=options_type,
                            submit_controller_name=submit_controller_name,
                            submit_btn_text=submit_btn_text)


    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_visualize_options_workflow(request):
    dataset_id = request.GET['dataset']
    options_type = 'visualize'
    get_options_function = dsl.api.visualize_dataset_options
    options_metadata_name = 'visualize_options'
    submit_controller_name = 'visualize_dataset_workflow'
    submit_btn_text = 'Visualize'

    success = False
    try:
        options = get_options_function(dataset_id)
        if dataset_id in options:
            options = options[dataset_id]

        success = True
    except Exception as e:
        raise(e)

    set_options = {}
    metadata = dsl.api.get_metadata(dataset_id)[dataset_id]
    if options_metadata_name in metadata:
        set_options = json.loads(metadata[options_metadata_name])
        if not set_options:
            set_options = {}

    html = get_options_html(request,
                            uri=dataset_id,
                            options=options,
                            set_options=set_options,
                            options_type=options_type,
                            submit_controller_name=submit_controller_name,
                            submit_btn_text=submit_btn_text)


    result = {'success': success,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def add_data_workflow(request):
    feature = request.POST['feature']

    success = False
    try:
        options = dsl.api.download_options(feature)
        options = options[feature]

        success = True
    except Exception as e:
        raise (e)

    if 'properties' not in options:
        return retrieve_dataset(request, feature)


    html = get_options_html(request,
                            uri=feature,
                            options=options,
                            set_options={},
                            options_type='retrieve',
                            submit_controller_name='retrieve_dataset_workflow',
                            submit_btn_text='Retrieve')

    result = {'success': success,
              'html': html,
              }


    return JsonResponse(result)


def get_details_table(request, collection):
    collection = utilities.get_collection_with_metadata(collection)
    context = {'collection': collection}

    details_table_html = render(request, 'data_browser/details_table.html', context).content
    return details_table_html


def retrieve_dataset(request, uri, options=None):
    success = False
    result = {}
    try:
        if uri.startswith('f'):
            dataset_id = dsl.api.new_dataset(uri, dataset_type='download')
        elif uri.startswith('d'):
            dataset_id = uri
        else:
            dataset_id = None

        dsl.api.stage_for_download(dataset_id, download_options=options)
        response = dsl.api.download_datasets(dataset_id)
        collection = dsl.api.get_datasets(expand=True)[dataset_id]['collection']
        result['details_table_html'] = get_details_table(request, collection)
        result['collection_name'] = collection
        success = True
    except Exception as e:
        result['error_message'] = str(e)

    result['success'] = success

    return JsonResponse(result)


@login_required()
@activate_user_settings
def retrieve_dataset_workflow(request):
    retrieve_options = dict(request.POST.items())
    dataset = retrieve_options.pop('uri')
    retrieve_options.pop('csrfmiddlewaretoken')
    for key, value in retrieve_options.items():
        if not value:
            retrieve_options.pop(key)

    return retrieve_dataset(request, dataset, retrieve_options)


@login_required()
@activate_user_settings
def apply_filter_workflow(request):
    result = {'success': False}
    dataset_id = request.POST['uri']
    filter = request.POST.get('filter')
    try:
        # get the name of the collection before deleting feature
        collection = dsl.api.get_datasets(expand=True)[dataset_id]['collection']

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the feature has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error_message'] = str(e)

    return JsonResponse(result)


@login_required()
@activate_user_settings
def visualize_dataset_workflow(request):
    dataset = request.GET['dataset']
    data = dsl.api.open_dataset(dataset, fmt='dict')
    metadata = data['metadata']
    parameter = metadata['parameter']
    # timeseries = data['data'][parameter]
    timeseries = data['data'].values()[0]
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
@activate_user_settings
def show_metadata_workflow(request):
    uri = request.GET['uri']

    title = 'Metadata'

    if uri.startswith('f'):
        metadata = dsl.api.get_features(features=uri, expand=True)['features'][0]['properties']
    elif uri.startswith('d'):
        metadata = dsl.api.get_datasets(expand=True)[uri]
    rows = [(k, v) for k, v in metadata.items()]

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
@activate_user_settings
def delete_dataset_workflow(request):
    result = {'success': False}
    dataset = request.POST['dataset']
    try:
        # get the name of the collection before deleting dataset
        collection = dsl.api.get_datasets(expand=True)[dataset]['collection']

        dsl.api.delete(dataset)

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the dataset has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error_message'] = str(e)

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})

@login_required()
@activate_user_settings
def delete_feature_workflow(request):
    result = {'success': False}
    feature = request.POST['feature']
    try:
        # get the name of the collection before deleting feature
        collection = dsl.api.get_metadata(feature)[feature]['collection']

        dsl.api.delete(feature)

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the feature has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error_message'] = str(e)

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})

############################################################################

#        REST CONTROLLERS

############################################################################

@login_required()
# @activate_user_settings
def get_settings(request):
    return JsonResponse(dsl.api.get_settings())


@login_required()
@activate_user_settings
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
@activate_user_settings
def get_collection(request, name):
    success = False
    collection = None
    collections = dsl.api.get_collections(expand=True)
    if name in collections.keys():
        try:
            collection = collections[name]
            success = True
        except:
            pass
    return JsonResponse({'success': success, 'collection': collection})


@login_required()
@activate_user_settings
def update_collection(request, name):
    pass


@login_required()
@activate_user_settings
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
@activate_user_settings
def get_features(request):

    services = request.GET.get('services')
    collections = request.GET.get('collections')
    filters = {}
    for filter_name in ['geom_type', 'parameter', 'bbox']:
        value = request.GET.get(filter_name)
        if value is not None:
            filters[filter_name] = value

    try:
        features = dsl.api.get_features(services=services, collections=collections, filters=filters, as_geojson=True)

    except Exception as e:
        features = {'error_message': str(e)}

    return JsonResponse(features)


@login_required()
@activate_user_settings
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
@activate_user_settings
def retrieve_datasets(request):
    dataset = request.GET['dataset']
    success = False
    try:
        dsl.api.download_datasets(dataset)
        success = True
    except:
        pass

    result = {'success': success}

    return JsonResponse(result)

@login_required()
@activate_user_settings
def export_dataset(request):
    dataset = request.GET['dataset']
    success = False
    try:
        metadata = dsl.api.get_metadata(dataset)[dataset]
        success = True
    except:
        pass

    from django.utils.encoding import smart_str

    file_path = metadata['file_path']

    # hack to get around how DSL is saving time series files
    if metadata['file_format'] == 'timeseries-hdf5':
        file_path = '{0}.h5'.format(file_path)
    file_name = os.path.basename(file_path)
    f = open(file_path, 'rb')
    # workspace_path = app.get_app_workspace().path
    # workspace_path = os.path.dirname(workspace_path)
    # file_path = os.path.relpath(file_path, workspace_path)
    # file_path = os.path.join('/workspaces', app.package, file_path)

    response = HttpResponse(f)
    response['Content-Type'] = 'application/force-download'  # TODO figure out mimetype
    response['Content-Disposition'] = 'attachment; filename=%s' % smart_str(file_name)
    # response['X-Accel-Redirect'] = smart_str(file_path)
    # It's usually a good idea to set the 'Content-Length' header too.
    # You can also set any other required headers: Cache-Control, etc.
    return response