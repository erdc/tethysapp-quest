import random
import json

import dsl

def get_random_color():
    r = lambda: random.randint(0,255)
    return '#%02X%02X%02X' % (r(),r(),r())


def get_rgba_color_from_hex(hex, a):
    i = lambda x: int(x, 16)
    r = i(hex[1:3])
    g = i(hex[3:5])
    b = i(hex[5:7])
    return {'r': r, 'g': g, 'b': b, 'a': a}


def codify(name):
    name = name.lower().replace(' ', '_')
    return name


def get_dsl_providers_with_services():
    providers = dsl.api.get_providers(metadata=True)
    for provider in providers.values():
        provider['services'] = list()

    services = dsl.api.get_services(metadata=True)

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
            service_tree = CheckboxTree(service['display_name'], service['name'])
            # for parameter in service['parameters']:
            #     service_tree.sub_options.append(CheckboxTree(parameter))
            provider_tree.append(service_tree)
        providers_tree.append(provider_tree)

    return providers_tree


def get_feature_source(feature):
    metadata = dsl.api.get_metadata(feature)
    location = metadata[feature]['_display_name']
    service = metadata[feature]['_service']
    service_metadata = dsl.api.get_services(metadata=True)[service]
    source = service_metadata['display_name']
    return location, source


def get_dataset_parameter(dataset):
    parameter = dataset['parameter']
    if not parameter:
        download_options = dataset.get('download_options')
        download_options = json.loads(download_options)
        parameter = download_options.get('parameter')

    return parameter


def get_dataset_columns():
    return ('Name', 'Location', 'Source', 'Source Type', 'Parameter', 'Data Type', 'Status')


def get_dataset_status(dataset):
    download_btn = '< button type = "button" class ="btn btn-primary btn-lg" data-toggle="modal" data-target="#myModal" >Download< / button >'
    status_switch = {'staged for download': download_btn}

    status = dataset['download_status']

    return status_switch[status]


def get_dataset_rows(datasets):
    rows = []
    for dataset in datasets:
        name = dataset['display_name'] or dataset['name']
        location, source = get_feature_source(dataset['feature'])
        source_type = dataset['dataset_type']
        parameter = get_dataset_parameter(dataset)
        data_type = None
        status = dataset['download_status']
        rows.append((name, location, source, source_type, parameter, data_type, status))

    return rows
