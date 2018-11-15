##########################################################################

#        WORKFLOW CONTROLLERS

############################################################################

# python imports
import os

# 3rd-party imports
import quest
from django.contrib import messages
from quest.util import NamedString
import plotly.graph_objs as go
import param

# django imports
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.core.urlresolvers import reverse
from django.shortcuts import render, redirect

# tethys imports
from tethys_sdk.gizmos import (
    PlotlyView,
    TableView
)

# local imports
from ..app import Quest as app
from ..widgets import widgets_form
from .. import utilities



user_services = app.get_custom_setting('user_services')


def activate_user_settings(func):

    def wrapper(request, *args, **kwargs):

        # change settings to point at users worksapce
        quest.api.update_settings({'BASE_DIR': app.get_user_workspace(request.user).path,
                                   'CACHE_DIR': os.path.join(app.get_app_workspace().path, 'cache'),
                                   })

        # read in any saved settings for user
        settings_file = quest.util.config._default_config_file()
        if os.path.exists(settings_file):
            quest.api.update_settings_from_file(settings_file)
        else:
            quest.api.save_settings(settings_file)

        return func(request, *args, **kwargs)

    return wrapper


@login_required()
@activate_user_settings
def get_raster_image(request):
    dataset = request.GET['dataset']
    success = False
    try:
        metadata = quest.api.get_metadata(dataset)[dataset]
        success = True
    except:
        pass

    from django.utils.encoding import smart_str


    file_path = quest.api.visualize_dataset(dataset,reproject=True,crs='EPSG:3857')

    file_name = os.path.basename(file_path)
    import rasterio

    f = open(file_path, 'rb')
    # workspace_path = app.get_app_workspace().path
    # workspace_path = os.path.dirname(workspace_path)
    # file_path = os.path.relpath(file_path, workspace_path)
    # file_path = os.path.join('/workspaces', app.package, file_path)

    response = HttpResponse(f)
    response['Content-Type'] = 'image/jpeg'  # TODO figure out mimetype
    response['Content-Disposition'] = 'attachment; filename=%s' % smart_str(file_name)
    # response['X-Accel-Redirect'] = smart_str(file_path)
    # It's usually a good idea to set the 'Content-Length' header too.
    # You can also set any other required headers: Cache-Control, etc.
    return response


@login_required()
@activate_user_settings
def get_collections(request):

    collections = list(quest.api.get_collections(expand=True).values())

    result = {'success': True,
              'collections': collections,
              }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_collection_data(request):
    collection = request.GET.get('collection')

    collection = utilities.get_collection_with_metadata(collection)

    html = get_collection_html(request, collection)

    result = {'success': True,
              'collection': collection,
              'html': html,
              }

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


def get_collection_html(request, collection):

    context = {'collection': collection}
    collection_html = render(request, 'quest/collection.html', context).content.decode('utf-8')
    details_table_html = render(request, 'quest/details_table.html', context).content.decode('utf-8')
    details_table_tab_html = render(request, 'quest/details_table_tab.html', context).content.decode('utf-8')

    result = {'success': True,
              'collection_html': collection_html,
              'details_table_html': details_table_html,
              'details_table_tab_html': details_table_tab_html,
              'collection': collection,
              }
    return result


@login_required()
@activate_user_settings
def new_collection_workflow(request):
    collection_name = request.POST.get('collection_name')
    collection_description = request.POST.get('collection_description', "")
    collection = utilities.generate_new_collection(collection_name,
                                                   collection_description)
    try:
        result = get_collection_html(request, collection)
        result['success'] = True
        alert_context = {
            'alert_style': 'success',
            'alert_message': 'The collection was successfully created.'
        }
        alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
    # Added code here to alert user if collection was not created successfully
    except ValueError as e:
        print(e)
        result['success'] = False
        result['error_message'] = str(e)
        alert_context = {
            'alert_style': 'danger',
            'alert_message': 'The collection was NOT successfully created'

        }

        alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
        result['messages'] = alert_html
    finally:
        pass

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})

    # return JsonResponse(result)


@login_required()
@activate_user_settings
def manage_project_workflow(request):
    if request.POST:
        project_name = request.POST.get('new_project_name')
        project_description = request.POST.get('project_description')
        result = {}
        if project_name:
            try:
                project = quest.api.new_project(project_name, description=project_description)
                result = project
                result['success'] = True
                alert_context = {
                    'alert_style': 'success',
                    'alert_message': 'The project was successfully created.'
                }
                alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
            # Added code here to alert user if project was not created successfully
            except ValueError as e:
                result['success'] = False
                result['error_message'] = str(e)
                alert_context = {
                    'alert_style': 'danger',
                    'alert_message': 'The project was NOT successfully created: ' + str(result['error_message'])

                }

                alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
                result['messages'] = alert_html
                request.session['messages'] = [alert_context]
            finally:
                pass
        elif request.POST.get('project'):
            project_name = request.POST.get('project')
            quest.api.set_active_project(project_name)

        elif request.POST.get('delete_project'):
            project_name = request.POST.get('delete_project')

            quest.api.delete_project(project_name)

    return redirect('quest:home')

@login_required()
@activate_user_settings
def add_dataprovider_workflow(request):
    if request.POST:
        providerUrl = request.POST.get('data-provider-url')
        if providerUrl:
            quest.api.add_user_provider(providerUrl)
            settings_file = quest.util.config._default_config_file()
            quest.api.save_settings(settings_file)
    return redirect('quest:home')


@login_required()
@activate_user_settings
def add_features_workflow(request):

    collection_name = request.GET.get('collection')
    features = request.GET['features']
    parameter = request.GET['parameter']
    context = {}

    # add new colleciton if needed
    new_collection_added = False
    new_collection_name = request.GET.get('new_collection_name')
    new_collection_description = request.GET.get('new_collection_description')
    if new_collection_name:
        # create new colleciton
        new_collection = utilities.generate_new_collection(new_collection_name,
                                                       new_collection_description)

        collection_name = new_collection['name']
        new_collection_added = True

    success = False
    result = {}

    try:
        features = quest.api.add_datasets(collection_name, features)
        options = {'parameter': parameter}
        for feature in features:
            utilities.stage_dataset_for_download(feature, options)

        collection = utilities.get_collection_with_metadata(collection_name)

        success = True
        result['success'] = False
        alert_context = {
            'alert_style': 'success',
            'alert_message': 'The feature(s) was successfully created.'
        }
        alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
    except ValueError as e:
        result['success'] = False
        result['error_message'] = str(e)
        alert_context = {
            'alert_style': 'danger',
            'alert_message': 'The feature(s) was NOT successfully created'

        }

        alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
        result['messages'] = alert_html
    # except Exception as e:
    #     print('Ignoring Exception: {0}'.format(str(e)))
    #     pass
    finally:
        pass

    # context = {'collection': collection}
    result = {'collection': collection}
    result['details_table_html'] = \
        render(request, 'quest/details_table.html', result).content.decode('utf-8')

    if new_collection_added:
        result['collection_html'] = \
            render(request, 'quest/collection.html', result).content.decode('utf-8')
        result['details_table_tab_html'] = \
            render(request, 'quest/details_table_tab.html',
                   result).content.decode('utf-8')

    result['success'] = success

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


def get_select_options_html(request, uri, dataset_id, title, options, set_options, options_type, submit_controller_name):
    form = widgets_form(options, set_options)()

    context = {'options_type': options_type,
               'action': reverse('quest:{0}'.format(submit_controller_name)),
               'uri': uri,
               'dataset_id': dataset_id,
               'form_fields': form,
               'title': title
               }

    html = render(request, 'quest/select_options.html', context).content.decode('utf-8')

    return html


def get_options_html(request, uri, dataset_id, title, options, set_options, options_type, submit_controller_name, submit_btn_text):
    form = widgets_form(options, set_options)()

    context = {'options_type': options_type,
               'action': reverse('quest:{0}'.format(submit_controller_name)),
               'uri': uri,
               'dataset_id': dataset_id,
               'submit_btn_text': submit_btn_text,
               'form_fields': form,
               'title': title
               }

    # html = render_to_string('quest/options.html', context)
    html = render(request, 'quest/options.html', context).content.decode('utf-8')

    return html


@login_required()
@activate_user_settings
def get_download_options_workflow(request):
    dataset_id = request.GET['dataset']
    success = False
    try:
        options = quest.api.get_download_options(dataset_id, fmt='param')
        has_options = len(quest.api.get_download_options(dataset_id)[dataset_id]) > 0
        success = True
    except Exception as e:
        raise e

    options_metadata_name = 'options'
    set_options = {}
    metadata = quest.api.get_metadata(dataset_id)[dataset_id]
    if options_metadata_name in metadata:
        set_options = metadata[options_metadata_name]
        if not set_options:
            set_options = {}

    html = get_options_html(request,
                            uri=dataset_id,
                            dataset_id=dataset_id,
                            title=options[dataset_id].title,
                            options=options,
                            set_options=set_options,
                            options_type='retrieve',
                            submit_controller_name='retrieve_dataset_workflow',
                            submit_btn_text='Retrieve')

    result = {
        'has_options': has_options,
        'success': success,
        'html': html,
    }

    return JsonResponse(result)


def get_select_object(options):
    class SelectParam(param.Parameterized):
        select = param.ObjectSelector(objects=options)

    return SelectParam


@login_required()
@activate_user_settings
def get_publisher_list_workflow(request):
    dataset_id = request.GET['dataset']
    options_type = 'publish'
    submit_controller_name = 'authenticate_options_workflow'
    title = 'Select Publisher'

    success = False
    try:
        publishers = quest.api.get_publishers(expand=True)
        publishers = [NamedString(k, v['display_name']) for k, v in publishers.items()]
        publishers.insert(0, 'select publisher')
        options = {'filters': get_select_object(publishers)}

        success = True
    except Exception as e:
        raise e

    html = get_select_options_html(
        request,
        uri=dataset_id,
        dataset_id=dataset_id,
        title=title,
        options=options,
        set_options={},
        options_type=options_type,
        submit_controller_name=submit_controller_name,
    )

    result = {
        'has_options': True,
        'success': success,
        'html': html,
    }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def authenticate_options_workflow(request):
    dataset_id = request.GET.get('dataset_id')
    publisher = request.GET.get('select')
    publisher_name = quest.api.get_publishers(expand=True)[publisher]['display_name']
    provider, pub, _ = quest.util.parse_service_uri(publisher)

    if quest.api.get_auth_status(provider):
        request.GET._mutable = True
        request.GET['uri'] = publisher
        request.GET._mutable = False
        return get_publish_options_workflow(request)

    context = {
        'publisher': publisher_name,
        'uri': publisher,
        'dataset_id': dataset_id,
        'action': reverse('quest:{0}'.format('authenticate_provider_workflow')),
        'submit_btn_text': 'Authenticate'
    }

    html = render(request, 'quest/authenticate.html', context).content.decode('utf-8')

    result = {'success': True,
              'html': html,
              }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def authenticate_provider_workflow(request):
    publisher = request.POST.get('uri')
    username = request.POST.get('username')
    password = request.POST.get('password')

    provider, publisher, _ = quest.util.parse_service_uri(publisher)
    quest.api.authenticate_provider(provider, username=username, password=password)
    request.GET = request.POST

    return get_publish_options_workflow(request)

@login_required()
@activate_user_settings
def get_publish_options_workflow(request):
    dataset_id = request.GET.get('dataset_id')
    publisher = request.GET.get('uri')
    success = False
    try:
        options = quest.api.get_publish_options(publisher, fmt='param')
        success = True
    except Exception as e:
        raise e

    html = get_options_html(request,
                            uri=publisher,
                            dataset_id=dataset_id,
                            title='Publish Dataset',
                            options=options,
                            set_options={'dataset': dataset_id},
                            options_type='publish',
                            submit_controller_name='publish_dataset_workflow',
                            submit_btn_text='Publish')

    result = {'success': success,
              'html': html,
              }
    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_filter_list_workflow(request):
    dataset_id = request.GET['dataset']
    options_type = 'filter'
    # submit_controller_name = 'apply_filter_workflow'
    submit_controller_name = 'get_filter_options_workflow'
    # submit_btn_text = 'Apply Filter'
    title = 'Apply Filter'

    success = False
    try:
        filters = quest.api.get_tools(filters={'dataset': dataset_id})
        filters.insert(0, 'select filter')
        # options = {f: quest.api.apply_filter_options(f, fmt='param') for f in filters}
        options = {'filters': get_select_object(filters)}

        success = True
    except Exception as e:
        raise e

    html = get_select_options_html(
        request,
        uri=dataset_id,
        dataset_id=dataset_id,
        title=title,
        options=options,
        set_options={},
        options_type=options_type,
        submit_controller_name=submit_controller_name,
        # submit_btn_text=submit_btn_text
    )

    result = {
        'has_options': True,
        'success': success,
        'html': html,
    }

    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_filter_options_workflow(request):
    dataset_id = request.GET.get('uri')
    filter = request.GET.get('select')
    options_metadata_name = 'options'
    options_type = 'filter'
    submit_controller_name = 'apply_filter_workflow'
    submit_btn_text = 'Apply Filter'
    title = 'Filter Options'

    get_options_function = quest.api.get_tool_options

    success = False
    try:
        options = {filter: quest.api.get_tool_options(filter, fmt='param')}

        success = True
    except Exception as e:
        raise e

    set_options = {'dataset': dataset_id}
    # metadata = quest.api.get_metadata(dataset_id)[dataset_id]
    # if options_metadata_name in metadata:
    #     set_options = json.loads(metadata[options_metadata_name])
    #     if not set_options:
    #         set_options = {}

    html = get_options_html(request,
                            uri=filter,
                            dataset_id=dataset_id,
                            title=title,
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
    get_options_function = quest.api.visualize_dataset_options
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
        raise e

    set_options = {}
    # metadata = quest.api.get_metadata(dataset_id)[dataset_id]
    # if options_metadata_name in metadata:
    #     set_options = json.loads(metadata[options_metadata_name])
    #     if not set_options:
    #         set_options = {}

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
        options = quest.api.download_options(feature, fmt='param')
        options = options[feature]

        success = True
    except Exception as e:
        raise e

    if 'properties' not in options:
        return retrieve_dataset(request, feature)

    html = get_options_html(request,
                            uri=feature,
                            dataset_id=None,
                            title='Download Data',
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

    details_table_html = render(request, 'quest/details_table.html', context).content.decode('utf-8')
    return details_table_html


def retrieve_dataset(request, uri, options=None):
    success = False
    result = {}

    try:
        dataset_id = utilities.stage_dataset_for_download(uri, options=options)
        quest.api.download_datasets(dataset_id, raise_on_error=False)
        collection = quest.api.get_datasets(expand=True)[dataset_id]['collection']
        result['details_table_html'] = get_details_table(request, collection)
        result['collection_name'] = collection
        result['collection'] = utilities.get_collection_with_metadata(collection)
        success = True
    except Exception as e:
        result['error'] = str(e)

    result['success'] = success

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


@login_required()
@activate_user_settings
def retrieve_dataset_workflow(request):
    retrieve_options = dict(request.POST.items())
    dataset = retrieve_options.pop('uri')
    retrieve_options.pop('csrfmiddlewaretoken')
    retrieve_options = {k: v for k, v in retrieve_options.items() if v}

    return retrieve_dataset(request, dataset, retrieve_options)

@login_required()
@activate_user_settings
def publish_dataset_workflow(request):
    options = dict(request.POST.items())
    options['keywords'] = quest.util.listify(request.POST.get('keywords'))
    publisher = options['uri']
    publish_options = [p['name'] for p in quest.api.get_publish_options(publisher)[publisher]['properties']]

    for k in options.keys():
        if k not in publish_options:
            del options[k]

    quest.api.publish(publisher, **options)

    alert_context = {
        'alert_style': 'success',
        'alert_message': 'The dataset {} was successfully published to {}.'.format(options['dataset'], publisher)
    }
    alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')

    return JsonResponse({'success': True, 'messages': alert_html}, json_dumps_params={'default': utilities.pre_jsonify})


@login_required()
@activate_user_settings
def apply_filter_workflow(request):
    result = {'success': False}
    filter = request.POST.get('uri')
    filter_options = [p['name'] for p in quest.api.get_tool_options(filter)['properties']]

    new_filter_options = dict()

    for k, v in request.POST.items():
        if k in filter_options and v:
            new_filter_options[k] = v
    if 'datasets' in new_filter_options:
        new_filter_options['datasets'] = quest.util.listify(new_filter_options['datasets'])

    try:
        results = quest.api.run_tool(filter, options=new_filter_options)
        dataset_id = results['datasets'][0]
        collection = quest.api.get_metadata(dataset_id)[dataset_id]['collection']


        result['collection_name'] = collection
        result['collection'] = utilities.get_collection_with_metadata(collection)
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
        alert_context = {
            'alert_style': 'success',
            'alert_message': 'The dataset {} was successfully created by filter {}.'.format(dataset_id, filter)
        }
    except:
        alert_context = {
            'alert_style': 'danger',
            'alert_message': 'The filter has an Invalid input'

        }
    finally:

        alert_html = render(request, 'quest/alert.html', alert_context).content.decode('utf-8')
        result['messages'] = alert_html

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


@login_required()
@activate_user_settings
def visualize_dataset_workflow(request):
    '''
    This controler is for visualizing
    time series data in a plot
    '''
    dataset = request.GET['dataset']
    # datatype = request.GET['dataset_datatype']

    datatype = quest.api.get_metadata(dataset)[dataset]['datatype']

    # load data
    if not datatype:
        raise ValueError('Cannot visualize a dataset without a datytype')

    if datatype == 'timeseries':
        df = quest.api.open_dataset(dataset, fmt='dataframe')
        parameter = df.metadata['parameter']
        units = df.metadata.get('unit')
        data_col = parameter if parameter in df.columns else df.columns[0]  # TODO fix this in quest

        x = df.index
        if hasattr(x, 'to_timestamp'):
            x = x.to_timestamp()

        # create plotly plot
        scatter_series = go.Scatter(
            x=x,
            y=df[data_col],
            name=dataset,
            fill='tozeroy'
        )
        plotly_layout = go.Layout(
            showlegend=True,
            height=350,
            margin=go.Margin(
                l=50,
                r=0,
                b=30,
                t=0,
                pad=4
            ),
            legend=dict(
                orientation='h',
            ),
            yaxis=dict(
                title="{0}{1}".format(data_col, " ({0})".format(units) if units else ''),
            ),
        )
        # create plotly gizmo
        plot_view_options = PlotlyView(go.Figure(data=[scatter_series],
                                                 layout=plotly_layout),
                                       height='100%',
                                       attributes={'id': 'plot-content',
                                                   'data-dataset_id': dataset},
                                       )

        context = {'plot_view_options': plot_view_options, }

        html = render(request, 'quest/visualize.html', context).content.decode('utf-8')

        result = {'success': True,
                  'html': html,

                  }

    else:
        try:
            metadata = quest.api.get_metadata(dataset)[dataset]
            file_path = metadata['file_path']
            result = {'success': True}
        except Exception as e:

            result['error'] = e

        from django.utils.encoding import smart_str
        import rasterio
        import rasterio.warp

        with rasterio.open(file_path) as src:

            if src.crs.to_string() != '+init=epsg:3857':
                file_extents = rasterio.warp.transform_bounds(src.crs.to_string(), 'EPSG:3857', *src.bounds)
            else:
                file_extents = src.bounds

        result['file_extents'] = file_extents

    result['datatype'] = datatype

    return JsonResponse(result)


def get_metadata_table_html(request, title, metadata, boarders=False):
    """
    Create HTML table for metadata property and value pairs. Any values that are dictionaries will (recursively) be
    converted into sub-tables.
    """

    sub_tables = dict()
    rows = list()
    for k, v in metadata.items():
        value = v
        if isinstance(v, dict):
            try:
                # convert keys that can be integers to get around limitation in string formatting syntax
                k = int(k)
            except ValueError:
                # if key cannot be cast as an integer then just use the original key
                pass
            value = '{{sub_tables[{0}]}}'.format(k)
            sub_tables[k] = get_metadata_table_html(request, None, v, True)
        if isinstance(v, str):
            # this is required so the '{}' characters render correctly after string formatting
            value = v.replace('{', '{{').replace('}', '}}')
        rows.append((k, value))

    column_names = ('Property', 'Value')

    table_view_options = TableView(column_names=column_names,
                                   rows=rows,
                                   hover=True,
                                   striped=True,
                                   bordered=boarders,
                                   condensed=False)

    context = {'title': title,
               'table_view_options': table_view_options,
               }

    html = render(request, 'quest/metadata.html', context).content.decode('utf-8')
    html = html.format(sub_tables=sub_tables)

    return html


@login_required()
@activate_user_settings
def show_metadata_workflow(request):
    uri = request.GET['uri']

    title = 'Details'
    metadata = quest.api.get_metadata(uri)[uri]
    metadata.pop('file_path', None)
    metadata.pop('visualization_path', None)

    html = get_metadata_table_html(request, title, metadata)

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
        collection = quest.api.get_datasets(expand=True)[dataset]['collection']

        quest.api.delete(dataset)

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the dataset has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error'] = str(e)

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


@login_required()
@activate_user_settings
def delete_feature_workflow(request):
    result = {'success': False}
    feature = request.POST['feature']
    try:
        # get the name of the collection before deleting feature
        collection = quest.api.get_metadata(feature)[feature]['collection']

        quest.api.delete(feature)

        result['collection'] = utilities.get_collection_with_metadata(collection)

        # get the updated collection details after the feature has been deleted
        result['details_table_html'] = get_details_table(request, collection)
        result['success'] = True
    except Exception as e:
        result['success'] = False
        result['error'] = str(e)

    return JsonResponse(result, json_dumps_params={'default': utilities.pre_jsonify})


@login_required()
@activate_user_settings
def export_dataset(request):
    dataset = request.GET['dataset']
    success = False
    try:
        metadata = quest.api.get_metadata(dataset)[dataset]
        success = True
    except:
        pass

    from django.utils.encoding import smart_str

    file_path = metadata['file_path']

    # hack to get around how quest is saving time series files
    if metadata['file_format'] == 'timeseries-hdf5':
        file_path = '{0}'.format(file_path)
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
