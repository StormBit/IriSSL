import config
import qwebirc.util.qjson as json

def get_options():
  options = dict(
    networkName=config.NETWORK_NAME, 
    appTitle=config.APP_TITLE, 
    baseURL=config.BASE_URL, 
    staticBaseURL=config.STATIC_BASE_URL, 
    dynamicBaseURL=config.DYNAMIC_BASE_URL)
  return json.dumps(options)
