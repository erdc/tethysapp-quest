from django import forms
import param
from tethys_sdk.gizmos import DatePicker
from datetimewidget.widgets import DateWidget
from django_select2.forms import Select2Widget, Select2MultipleWidget
from quest.util import param_util


class DatePickerWidget(forms.DateInput):
    template_name = 'date_picker.html'

    def get_context(self, name, value, attrs):
        context = super(forms.DateInput, self).get_context(name, value, attrs)
        print(context)
        date_picker = DatePicker(name=name,
                                 display_text='',
                                 autoclose=True,
                                 format='MM d, yyyy',
                                 start_date='2/15/2014',
                                 # start_view='decade',
                                 today_button=True,
                                 initial=context['widget'].get('value', ''),
                                 attributes=attrs)

        context['gizmo_options'] = date_picker

        return context


widget_map = {
    param.Foldername:
        lambda p, initial: forms.FilePathField(
            initial=initial or p.default,
        ),
    param.Boolean:
        lambda p, initial: forms.BooleanField(
            initial=initial or p.default,
        ),
    # param.Array: ,
    # param.Dynamic: ,
    param.Filename:
        lambda p, initial: forms.FileField(
            initial=initial or p.default,
        ),
    param.Dict:
        lambda p, initial: forms.CharField(
            initial=initial or p.default,
        ),
    param.XYCoordinates:
        lambda p, initial: forms.MultiValueField(
            initial=initial or p.default,
        ),
    param.Selector:
        lambda p, initial: forms.ChoiceField(
            initial=initial or p.default,
        ),
    # param.HookList,
    # param.Action: ,
    param.parameterized.String:
        lambda p, initial: forms.CharField(
            initial=initial or p.default,
        ),
    param.Magnitude:
        lambda p, initial: forms.FloatField(
            initial=initial or p.default,
        ),
    # param.Composite,
    param.Color:
        lambda p, initial: forms.CharField(
            initial=initial or p.default,
        ),
    param.ObjectSelector:
        lambda p, initial: forms.ChoiceField(
            initial=initial or p.default,
            widget=Select2Widget,
            choices=p.get_range().items(),
        ),
    param_util.DatasetSelector:
        lambda p, initial: forms.ChoiceField(
            initial=initial or p.default,
            widget=Select2Widget,
            choices=p.get_range().items(),
        ),
    param.Number:
        lambda p, initial: forms.FloatField(
            initial=initial or p.default,
        ),
    param.Range:
        lambda p, initial: forms.MultiValueField(
            initial=initial or p.default,
        ),
    param.NumericTuple:
        lambda p, initial: forms.MultiValueField(
            initial=initial or p.default,
        ),
    param.Date:
        lambda p, initial: forms.DateTimeField(
            initial=initial or p.default,
            widget=DateWidget(options={
                'startDate': p.bounds[0].strftime('%Y-%m-%d') if p.bounds else '0000-01-01',  # start of supported time
                'endDate': p.bounds[1].strftime('%Y-%m-%d') if p.bounds else '9999-12-31',  # the end of supported time
                'format': 'mm/dd/yyyy',
                'autoclose': True,
                # 'showMeridian': False,
                'minView': 2,  # month view
                'maxView': 4,  # 10-year overview
                'todayBtn': 'true',
                'clearBtn': True,
                'todayHighlight': True,
                'minuteStep': 5,
                'pickerPosition': 'bottom-left',
                'forceParse': 'true',
                'keyboardNavigation': 'true',
                },
                bootstrap_version=3),
        ),
    param.List:
        lambda p, initial: forms.CharField(
            initial=initial or p.default,
        ),
    param.Path:
        lambda p, initial: forms.FilePathField(
            initial=initial or p.default,
        ),
    param.MultiFileSelector:
        lambda p, initial: forms.MultipleChoiceField(
            initial=initial or p.default,
        ),
    param.ClassSelector:
        lambda p, initial: forms.ChoiceField(
            initial=initial or p.default,
        ),
    param.FileSelector:
        lambda p, initial: forms.ChoiceField(
            initial=initial or p.default,
        ),
    param.ListSelector:
        lambda p, initial: forms.MultipleChoiceField(
            initial=initial or p.default,
        ),
    # param.Callable,
    param.Tuple:
        lambda p, initial: forms.MultiValueField(
            initial=initial or p.default,
        ),
    param.Integer:
        lambda p, initial: forms.IntegerField(
            initial=initial or p.default,
        )
}


def widgets(paramitarized_obj, set_options):
    print(paramitarized_obj)

    class_name = '{}Form'.format(paramitarized_obj.name.title())
    form_class = type(class_name, (forms.Form,), dict(forms.Form.__dict__))

    params = list(filter(lambda x: (x.precedence is None or x.precedence >= 0) and not x.constant,
                         paramitarized_obj.params().values()))

    for p in sorted(params, key=lambda p: p.precedence or 9999):
        form_class.base_fields[p._attrib_name] = widget_map[type(p)](p, set_options.get(p._attrib_name))

    return form_class
