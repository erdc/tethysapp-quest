from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import CustomSetting


class DataBrowser(TethysAppBase):
    """
    Tethys app class for DataBrowser.
    """

    name = 'Data Browser'
    index = 'data_browser:home'
    icon = 'data_browser/images/DataBrowserIcon.png'
    package = 'data_browser'
    root_url = 'data-browser'
    color = '#1A334C'
        
    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (UrlMap(name='home',
                           url='data-browser',
                           controller='data_browser.controllers.home'),

                    ####################################################
                    #                                                  #
                    #                 REST Endpoints                   #
                    #                                                  #
                    ####################################################

                    #-----------------  Workflows  ---------------------

                    UrlMap(name='new_collection_workflow',
                           url='data-browser/rest/workflows/new-collection',
                           controller='data_browser.controllers.new_collection_workflow'),
                    UrlMap(name='add_features_workflow',
                           url='data-browser/rest/workflows/add-features',
                           controller='data_browser.controllers.add_features_workflow'),

                    UrlMap(name='get_download_options_workflow',
                           url='data-browser/rest/workflows/download-options',
                           controller='data_browser.controllers.get_download_options_workflow'),
                    UrlMap(name='get_filter_list_workflow',
                           url='data-browser/rest/workflows/filter-list',
                           controller='data_browser.controllers.get_filter_list_workflow'),
                    UrlMap(name='get_filter_options_workflow',
                           url='data-browser/rest/workflows/filter-options',
                           controller='data_browser.controllers.get_filter_options_workflow'),
                    UrlMap(name='get_visualize_options_workflow',
                           url='data-browser/rest/workflows/visualize-options',
                           controller='data_browser.controllers.get_visualize_options_workflow'),

                    UrlMap(name='retrieve_dataset_workflow',
                           url='data-browser/rest/workflows/retrieve-dataset',
                           controller='data_browser.controllers.retrieve_dataset_workflow'),
                    UrlMap(name='apply_filter_workflow',
                           url='data-browser/rest/workflows/apply-filter',
                           controller='data_browser.controllers.apply_filter_workflow'),
                    UrlMap(name='visualize_dataset_workflow',
                           url='data-browser/rest/workflows/visualize-dataset',
                           controller='data_browser.controllers.visualize_dataset_workflow'),
                    UrlMap(name='show_metadata_workflow',
                           url='data-browser/rest/workflows/show-metadata',
                           controller='data_browser.controllers.show_metadata_workflow'),
                    UrlMap(name='delete_dataset_workflow',
                           url='data-browser/rest/workflows/delete-dataset',
                           controller='data_browser.controllers.delete_dataset_workflow'),

                    UrlMap(name='add_data_workflow',
                           url='data-browser/rest/workflows/add-data',
                           controller='data_browser.controllers.add_data_workflow'),
                    UrlMap(name='delete_feature_workflow',
                           url='data-browser/rest/workflows/delete-feature',
                           controller='data_browser.controllers.delete_feature_workflow'),



                    # -------------------  API  -----------------------
                    UrlMap(name='settings',
                           url='data-browser/rest/settings',
                           controller='data_browser.controllers.get_settings'),

                    # Collection Endpoints
                    UrlMap(name='new_collection',
                           url='data-browser/rest/collection/new',
                           controller='data_browser.controllers.new_collection'),
                    UrlMap(name='get_collection',
                           url='data-browser/rest/collection/get/{name}',
                           controller='data_browser.controllers.get_collection'),
                    UrlMap(name='update_collection',
                           url='data-browser/rest/collection/update/{name}',
                           controller='data_browser.controllers.update_collection'),
                    UrlMap(name='delete_collection',
                           url='data-browser/rest/collection/delete/{name}',
                           controller='data_browser.controllers.delete_collection'),

                    # Feature Endpoints
                    UrlMap(name='get_features',
                           url='data-browser/rest/features/get',
                           controller='data_browser.controllers.get_features'),
                    UrlMap(name='add_features',
                           url='data-browser/rest/features/add',
                           controller='data_browser.controllers.add_features'),

                    # Dataset Endpoints
                    # UrlMap(name='get_download_options',
                    #        url='data-browser/rest/datasets/download-options',
                    #        controller='data_browser.controllers.get_download_options'),
                    UrlMap(name='retrieve_datasets',
                           url='data-browser/rest/datasets/retrieve-datasets',
                           controller='data_browser.controllers.retrieve_datasets'),

                    UrlMap(name='export_dataset',
                           url='data-browser/rest/datasets/export-dataset',
                           controller='data_browser.controllers.export_dataset'),
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
