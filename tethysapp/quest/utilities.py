import random
import os
import geojson

import quest
from past.builtins import basestring  # for python 2 compatibility
from shapely.geometry.base import BaseGeometry
from tethys_gizmos.gizmo_options import TableView


from .app import Quest as app


ISO_DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ'

# global variable to cache the services metadata query
services_metadata = None


def get_random_color():
    def r(): return random.randint(0, 255)
    return '#%02X%02X%02X' % (r(), r(), r())


def get_rgba_color_from_hex(hex, a):
    def i(x): return int(x, 16)
    r = i(hex[1:3])
    g = i(hex[3:5])
    b = i(hex[5:7])
    return {'r': r, 'g': g, 'b': b, 'a': a}


def codify(name):
    name = name.lower().replace(' ', '_')
    return name


def get_quest_providers_with_services():
    providers = quest.api.get_providers(expand=True)
    for provider in providers.values():
        provider['services'] = list()

    services = quest.api.get_services(expand=True)

    for name, service in services.items():
        provider_name = name.split(':')[1].strip('//')
        providers[provider_name]['services'].append(service)

    return list(providers.values())


class CheckboxTree(object):
    def __init__(self, title=None, value=None, name=None):
        self._name = name
        self.title = title
        self.value = value
        self.sub_trees = []

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, name):
        self._name = name
        for sub_tree in self.sub_trees:
            sub_tree.name = name

    def append(self, sub_tree):
        sub_tree.name = self.name
        self.sub_trees.append(sub_tree)


def get_hierarchical_provider_list():
    providers = get_quest_providers_with_services()

    providers_tree = CheckboxTree(name='services')

    for provider in providers:
        provider_tree = CheckboxTree(provider['display_name'], None)
        for service in provider['services']:
            service_tree = CheckboxTree(service['display_name'],
                                        service['name'])
            # for parameter in service['parameters']:
            #     service_tree.sub_options.append(CheckboxTree(parameter))
            provider_tree.append(service_tree)
        if len(provider_tree.sub_trees) > 0:
            providers_tree.append(provider_tree)

    return providers_tree


def get_feature_source(feature):
    global services_metadata

    metadata = quest.api.get_metadata(feature)[feature]
    location = metadata['display_name']
    service = metadata['service']

    if not services_metadata:
        services_metadata = quest.api.get_services(expand=True)

    if service:
        source = services_metadata[service]['display_name']
    else:
        source = None
    return location, source


def get_display_name(feature, parameter):
    metadata = quest.api.get_metadata(feature)[feature]
    service = metadata['service']
    provider = quest.util.parse_service_uri(service)[0]
    parameter = parameter.split(':')[0]
    display_name = '{0}|{1}'.format(provider.upper(), parameter.title())
    return display_name


def stage_dataset_for_download(uri, options):
    dataset_id = quest.api.stage_for_download(uri, options)[0]
    parameter = None
    if options is not None:
        parameter = options.get('parameter')
    if parameter is None:
        parameter = get_dataset_parameter(quest.api.get_metadata(dataset_id)[dataset_id])
    if uri.startswith('f'):
        feature = uri
    else:
        feature = quest.api.get_metadata(dataset_id)[dataset_id]['feature']
    # quest.api.update_metadata(dataset_id, display_name=get_display_name(feature, parameter))
    return dataset_id


def get_dataset_parameter(dataset):
    parameter = dataset.get('parameter')
    if not parameter:
        download_options = dataset.get('options')
        if download_options:
            parameter = download_options.get('parameter')
        else:
            dataset_id = dataset.get('name')
            feature = quest.api.get_metadata(dataset_id)[dataset_id]['feature']
            feature = quest.api.get_metadata(feature)[feature]
            parameters = feature.get('parameters').split(',')
            if len(parameters) == 1:
                parameter = parameters[0]

    return parameter


def get_dataset_columns():
    return ('Name', 'Created At', 'Parameter', 'Location', 'Source',
            'Data Type', 'Status')


def get_dataset_status(dataset):
    download_btn = ('<button type="button" class ="btn btn-primary btn-lg" '
                    'data-toggle="modal" data-target="#myModal">'
                    'Download</button>')
    status_switch = {'staged for download': download_btn}

    status = dataset['download_status']

    return status_switch[status]


def get_dataset_rows(datasets):
    rows = []
    for dataset in datasets:
        name = dataset['display_name'] or dataset['name']
        location, source = get_feature_source(dataset['feature'])
        parameter = get_dataset_parameter(dataset)
        data_type = dataset['datatype']
        status = dataset['status']
        created_time = dataset['created_at']
        auxiliary = {k: v for k, v in dataset.items() if k in {'name', 'feature', 'message', 'status'}}
        rows.append((auxiliary, name, created_time, parameter, location, source, data_type, status))

    return rows


def get_datasets_table_options(collection):
    return TableView(column_names=get_dataset_columns(),
                     rows=get_dataset_rows(collection['datasets']),
                     hover=True,
                     striped=False,
                     bordered=False,
                     condensed=False
                     )


def pre_jsonify(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    elif isinstance(obj, BaseGeometry):
        return geojson.Feature(geometry=obj, properties={})


def add_metadata_to_collection(collection):
    collection['features'] = \
        list(quest.api.get_features(collection['name'], expand=True).values())
    collection['datasets'] = \
        list(quest.api.get_datasets(expand=True,
                                    filters={'collection': collection['name']},
                                    ).values())
    collection['table_view_options'] = get_datasets_table_options(collection)


def generate_new_collection(collection_name, collection_description,
                            metadata=True):
    code_name = codify(collection_name)
    color = get_random_color()
    collection = quest.api.new_collection(code_name,
                                          display_name=collection_name,
                                          description=collection_description,
                                          metadata={'color': color})

    if metadata:
        add_metadata_to_collection(collection)

    return collection


def get_collections_with_metadata(collection_names=None):
    collections = quest.api.get_collections(expand=True)
    if collection_names:
        collections = [metadata for name, metadata in collections.items()
                       if name in collection_names]
    else:
        collections = list(collections.values())

    for collection in collections:
        add_metadata_to_collection(collection)

    return collections


def get_collection_with_metadata(collection_name):
    return get_collections_with_metadata([collection_name])[0]


def update_quest_cache():
    cache_dir = os.path.join(app.get_app_workspace().path, 'cache')
    quest.api.update_settings({'CACHE_DIR': cache_dir, })
    services = quest.api.get_services()
    for service in services:
        try:
            quest.api.get_features(service, update_cache=True)
        except:
            print("Error with {0}".format(service))


def listify(*args):
    l = list()
    for arg in args:
        if arg is None:
            pass
        elif isinstance(arg, list) or isinstance(arg, tuple):
            l.extend(arg)
        elif isinstance(arg, basestring):
            l.append(arg)
        else:
            raise ValueError('{0} is not listifyable.'.format(arg))

    return l
