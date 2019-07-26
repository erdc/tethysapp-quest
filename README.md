Install quest::

    conda install -c conda-forge -c erdc quest

Install the following pip packages::

    pip install django-datetime-widget django-select2==6.1 django-taggit


Add the following to the ``INSTALLED_APPS`` list in the `settings.py` file::

    'datetimewidget',
    'django_select2',
    'taggit',


Note: django-datetime-widget is only compatible with django<2.0. It doesn't look like it's being maintained. 
django-select2 must be pinned because newest versions are only compatibly with django>2.1. Once a replacement for django-datemtime-widget is added then django-select2 can move to the most recent version.