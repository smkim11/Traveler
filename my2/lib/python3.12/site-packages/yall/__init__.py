#
# This file is part of yall (Yet Another Lazy Loader).
#

import sys
import importlib

def _single_lazy_import(name, path=None):
    if path is None:
        fullname = name
    else:
        fullname = path + '.' + name
    try:
        return sys.modules[fullname]
    except KeyError:
        spec = importlib.util.find_spec(fullname)
        loader = importlib.util.LazyLoader(spec.loader)

        module = importlib.util.module_from_spec(spec)
        loader.exec_module(module)
        return module

def lazy_import(name, path=None):
    if not isinstance(name, (list, tuple)):
        return _single_lazy_import(name, path=path)

    out = []
    for n in name:
        out.append(_single_lazy_import(n, path=path))

    return tuple(out)
