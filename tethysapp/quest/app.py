from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import CustomSetting


class Quest(TethysAppBase):
    """
    Tethys app class for Quest.
    """

    name = 'Quest'
    index = 'quest:home'
    icon = 'quest/images/QuestAppIcon.png'
    package = 'quest'
    root_url = 'quest'
    color = '#1A334C'
    enable_feedback = True
    feedback_emails = ['scott.d.christensen@erdc.dren.mil']
        
    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (UrlMap(name='home',
                           url='quest',
                           controller='quest.controllers.home'),

                    ####################################################
                    #                                                  #
                    #                 REST Endpoints                   #
                    #                                                  #
                    ####################################################

                    #-----------------  Workflows  ---------------------
                    UrlMap(name='new_project_workflow',
                           url='quest/rest/workflows/new-project',
                           controller='quest.controllers.new_project_workflow'),

                    UrlMap(name='get_collections',
                           url='quest/rest/workflows/get_collections',
                           controller='quest.controllers.get_collections'),
                    UrlMap(name='get_collection_data',
                           url='quest/rest/workflows/get_collection_data',
                           controller='quest.controllers.get_collection_data'),
                    UrlMap(name='new_collection_workflow',
                           url='quest/rest/workflows/new-collection',
                           controller='quest.controllers.new_collection_workflow'),
                    UrlMap(name='add_features_workflow',
                           url='quest/rest/workflows/add-features',
                           controller='quest.controllers.add_features_workflow'),

                    UrlMap(name='get_download_options_workflow',
                           url='quest/rest/workflows/download-options',
                           controller='quest.controllers.get_download_options_workflow'),
                    UrlMap(name='get_publisher_list_workflow',
                           url='quest/rest/workflows/publisher-list',
                           controller='quest.controllers.get_publisher_list_workflow'),
                    UrlMap(name='authenticate_options_workflow',
                           url='quest/rest/workflows/authenticate-options',
                           controller='quest.controllers.authenticate_options_workflow'),
                    UrlMap(name='authenticate_provider_workflow',
                           url='quest/rest/workflows/authenticate-provider',
                           controller='quest.controllers.authenticate_provider_workflow'),
                    UrlMap(name='get_publish_options_workflow',
                           url='quest/rest/workflows/publish-options',
                           controller='quest.controllers.get_publish_options_workflow'),
                    UrlMap(name='get_filter_list_workflow',
                           url='quest/rest/workflows/filter-list',
                           controller='quest.controllers.get_filter_list_workflow'),
                    UrlMap(name='get_filter_options_workflow',
                           url='quest/rest/workflows/filter-options',
                           controller='quest.controllers.get_filter_options_workflow'),
                    UrlMap(name='get_visualize_options_workflow',
                           url='quest/rest/workflows/visualize-options',
                           controller='quest.controllers.get_visualize_options_workflow'),

                    UrlMap(name='retrieve_dataset_workflow',
                           url='quest/rest/workflows/retrieve-dataset',
                           controller='quest.controllers.retrieve_dataset_workflow'),
                    UrlMap(name='publish_dataset_workflow',
                           url='quest/rest/workflows/publish-dataset',
                           controller='quest.controllers.publish_dataset_workflow'),
                    UrlMap(name='apply_filter_workflow',
                           url='quest/rest/workflows/apply-filter',
                           controller='quest.controllers.apply_filter_workflow'),
                    UrlMap(name='visualize_dataset_workflow',
                           url='quest/rest/workflows/visualize-dataset',
                           controller='quest.controllers.visualize_dataset_workflow'),
                    UrlMap(name='get_raster_image',
                           url='quest/rest/workflows/get-raster',
                           controller='quest.controllers.get_raster_image'),
                    UrlMap(name='show_metadata_workflow',
                           url='quest/rest/workflows/show-metadata',
                           controller='quest.controllers.show_metadata_workflow'),
                    UrlMap(name='delete_dataset_workflow',
                           url='quest/rest/workflows/delete-dataset',
                           controller='quest.controllers.delete_dataset_workflow'),

                    UrlMap(name='add_data_workflow',
                           url='quest/rest/workflows/add-data',
                           controller='quest.controllers.add_data_workflow'),
                    UrlMap(name='delete_feature_workflow',
                           url='quest/rest/workflows/delete-feature',
                           controller='quest.controllers.delete_feature_workflow'),



                    # -------------------  API  -----------------------
                    UrlMap(name='settings',
                           url='quest/rest/settings',
                           controller='quest.controllers.get_settings'),

                    # Collection Endpoints
                    UrlMap(name='new_collection',
                           url='quest/rest/collection/new',
                           controller='quest.controllers.new_collection'),
                    UrlMap(name='get_collection',
                           url='quest/rest/collection/get/{name}',
                           controller='quest.controllers.get_collection'),
                    UrlMap(name='update_collection',
                           url='quest/rest/collection/update',
                           controller='quest.controllers.update_collection'),
                    UrlMap(name='delete_collection',
                           url='quest/rest/collection/delete/{name}',
                           controller='quest.controllers.delete_collection'),

                    # Feature Endpoints
                    UrlMap(name='get_features',
                           url='quest/rest/features/get',
                           controller='quest.controllers.get_features'),
                    UrlMap(name='add_features',
                           url='quest/rest/features/add',
                           controller='quest.controllers.add_features'),

                    # Dataset Endpoints
                    # UrlMap(name='get_download_options',
                    #        url='quest/rest/datasets/download-options',
                    #        controller='quest.controllers.get_download_options'),
                    UrlMap(name='retrieve_datasets',
                           url='quest/rest/datasets/retrieve-datasets',
                           controller='quest.controllers.retrieve_datasets'),

                    UrlMap(name='export_dataset',
                           url='quest/rest/datasets/export-dataset',
                           controller='quest.controllers.export_dataset'),

                    UrlMap(name='test_form',
                           url='quest/form',
                           controller='quest.controllers.test_form'),
        )

        return url_maps

    def custom_settings(self):
        """
        Example custom_settings method.
        """
        custom_settings = (
            CustomSetting(
                name='user_services',
                type=CustomSetting.TYPE_STRING,
                description='Comma separated list of user services urls.',
                required=False
            ),
        )

        return custom_settings
