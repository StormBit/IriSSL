import qwebirc.config as config
from ajaxengine import AJAXEngine
from athemeengine import AthemeEngine
from adminengine import AdminEngine
from staticengine import StaticEngine
if config.feedbackengine["enabled"]:
    from feedbackengine import FeedbackEngine
