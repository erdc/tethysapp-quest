import random
import json
import os
import datetime
import geojson

import dsl
from shapely.geometry.base import BaseGeometry
from tethys_gizmos.gizmo_options import TableView


from app import DataBrowser as app


ISO_DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ'


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


def get_dsl_providers_with_services():
    providers = dsl.api.get_providers(expand=True)
    for provider in providers.values():
        provider['services'] = list()

    services = dsl.api.get_services(expand=True)

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
    providers = get_dsl_providers_with_services()

    providers_tree = CheckboxTree(name='services')

    for provider in providers:
        provider_tree = CheckboxTree(provider['display_name'], None)
        for service in provider['services']:
            service_tree = CheckboxTree(service['display_name'],
                                        service['name'])
            # for parameter in service['parameters']:
            #     service_tree.sub_options.append(CheckboxTree(parameter))
            provider_tree.append(service_tree)
        providers_tree.append(provider_tree)

    return providers_tree


def get_feature_source(feature):
    metadata = dsl.api.get_metadata(feature)
    location = metadata[feature]['display_name']
    service = metadata[feature]['service']
    service_metadata = dsl.api.get_services(expand=True)[service]
    source = service_metadata['display_name']
    return location, source


def get_dataset_parameter(dataset):
    parameter = dataset.get('parameter')
    if not parameter:
        download_options = dataset.get('options')
        download_options = json.loads(download_options)
        if download_options:
            parameter = download_options.get('parameter')

    return parameter


def get_dataset_columns():
    return ('Name', 'Location', 'Source', 'Source Type',
            'Parameter', 'Data Type', 'Status')


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
        source_type = dataset['datatype']
        parameter = get_dataset_parameter(dataset)
        data_type = None
        status = dataset['status']
        feature = dataset['feature']
        message = dataset['message']
        rows.append((feature, name, location, source,
                     source_type, parameter, data_type,
                     status, message))

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
        list(dsl.api.get_features(expand=True,
                                  collections=collection['name'],
                                  ).values())
    collection['datasets'] = \
        list(dsl.api.get_datasets(expand=True,
                                  filters={'collection': collection['name']},
                                  ).values())
    collection['table_view_options'] = get_datasets_table_options(collection)


def generate_new_collection(collection_name, collection_description,
                            metadata=True):
    code_name = codify(collection_name)
    color = get_random_color()
    collection = dsl.api.new_collection(code_name,
                                        display_name=collection_name,
                                        description=collection_description,
                                        metadata={'color': color})

    if metadata:
        collection = get_collection_with_metadata(collection_name)
        # add_metadata_to_collection(collection)

    return collection


def get_collections_with_metadata(collection_names=None):
    collections = dsl.api.get_collections(expand=True)
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


# TODO this is just a temporary workaround because filtering for the DSL
# get_filters function seems to be broken
def get_filters(dataset):
    # TODO filter list of filters by datatype instead of
    # having it hardcoded for ts-filters
    filters = {f: m for f, m in dsl.api.get_filters(expand=True)
               if f.startswith('ts')}
    return filters


def update_dsl_cache():
    cache_dir = os.path.join(app.get_app_workspace().path, 'cache')
    dsl.api.update_settings({'CACHE_DIR': cache_dir, })
    services = dsl.api.get_services()
    for service in services:
        try:
            dsl.api.get_features(services=service, update_cache=True)
        except:
            print("Error with {0}".format(service))
