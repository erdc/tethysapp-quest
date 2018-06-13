############################################################################

#        REST CONTROLLERS

############################################################################

# 3rd party imports
import quest

# django imports
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

# local imports
from .quest_workflows import activate_user_settings
from .. import utilities


@login_required()
# @activate_user_settings
def get_settings(request):
    return JsonResponse(quest.api.get_settings())


@login_required()
@activate_user_settings
def new_collection(request):
    if request.POST:
        collection_name = request.POST.get('collection_name')
        if collection_name:
            collection_description = request.POST.get('description') or ""
            collection = utilities.generate_new_collection(collection_name,
                                                           collection_description,
                                                           metadata=False)

            return JsonResponse({'collection': collection})
    return JsonResponse({'error': 'Invalid request ...'})


@login_required()
@activate_user_settings
def get_collection(request, name):
    success = False
    collection = None
    collections = quest.api.get_collections(expand=True)
    if name in collections.keys():
        try:
            collection = collections[name]
            success = True
        except:
            pass
    return JsonResponse({'success': success, 'collection': collection})


@login_required()
@activate_user_settings
def update_collection(request):
    collection_name = request.POST.get('collection_name')
    collection_color = request.POST.get('color')
    quest.api.update_metadata(collection_name, metadata={'color': collection_color})[collection_name]

    return JsonResponse({'color': collection_color})


@login_required()
@activate_user_settings
def delete_collection(request, name):
    success = False
    collections = quest.api.get_collections()
    if name in collections:
        try:
            quest.api.delete(name)
            success = True
        except:
            pass

    result = {'success': success}

    return JsonResponse(result)


@login_required()
@activate_user_settings
def get_features(request):

    uris = request.GET.get('uris')
    services = request.GET.get('services')
    uris = utilities.listify(uris, services)
    filters = {}
    for filter_name in ['geom_type', 'parameter', 'bbox']:
        value = request.GET.get(filter_name)
        if value is not None:
            filters[filter_name] = value

    # try:
    features = quest.api.get_features(uris=uris, filters=filters, as_geojson=True)

    # except Exception as e:
    #     features = {'error': str(e)}

    return JsonResponse(features)


@login_required()
@activate_user_settings
def add_features(request):
    collection = request.GET.get('collection')
    features = request.GET.get('features')

    success = False
    try:
        quest.api.add_features(collection, features)
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
        quest.api.download_datasets(dataset)
        success = True
    except Exception as e:
        print(e)

    result = {'success': success}

    return JsonResponse(result)
