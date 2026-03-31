import Millennium
import PluginUtils  # type: ignore
import os
import shutil

logger = PluginUtils.Logger()

WEBKIT_DIR = "EURPriceConverter"
WEBKIT_JS_FILE = "price-converter.js"


def get_plugin_dir() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(os.path.realpath(__file__)), ".."))


def register_browser_script() -> None:
    source_js = os.path.join(get_plugin_dir(), "frontend", "index.js")
    target_js = os.path.join(Millennium.steam_path(), "steamui", WEBKIT_DIR, WEBKIT_JS_FILE)

    if not os.path.isfile(source_js):
        logger.error(f"frontend script not found: {source_js}")
        return

    try:
        os.makedirs(os.path.dirname(target_js), exist_ok=True)
        shutil.copy(source_js, target_js)
        Millennium.add_browser_js(os.path.join(WEBKIT_DIR, WEBKIT_JS_FILE))
        logger.log(f"registered browser script: {target_js}")
    except Exception as error:
        logger.error(f"failed to register browser script: {error}")


class Plugin:
    def _load(self):
        logger.log("bootstrapping EUR Price Converter backend")
        register_browser_script()
        # Signal that backend initialization is complete.
        Millennium.ready()

    def _front_end_loaded(self):
        register_browser_script()

    def _unload(self):
        logger.log("unloading EUR Price Converter backend")
