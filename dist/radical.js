"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var EndpointInput = (function () {
    function EndpointInput(config) {
        this.converter = function (argumentValue) { return argumentValue.toString(); };
        if (config instanceof Function) {
            this.converter = config;
        }
        else if (config) {
            var config_ = config;
            if (config_.converter)
                this.converter = config_.converter;
        }
    }
    return EndpointInput;
}());
exports.EndpointInput = EndpointInput;
var JsonBodyInput = (function () {
    function JsonBodyInput() {
        this.contentType = "application/json; charset=utf-8";
        this.converter = JSON.stringify;
    }
    return JsonBodyInput;
}());
exports.JsonBodyInput = JsonBodyInput;
var RequestArgument = (function () {
    function RequestArgument(argument, value) {
        this.argument = argument;
        this.value = value;
    }
    return RequestArgument;
}());
exports.RequestArgument = RequestArgument;
var Endpoint = (function () {
    function Endpoint(config) {
        var _this = this;
        this.method = "GET";
        this.arguments = {};
        this.body = {
            contentType: "application/x-www-form-urlencoded; charset=utf-8",
            converter: this.toQueryString
        };
        this.responseParser = function (response) { return response; };
        this.errorParser = function (error) { return error; };
        this.toQueryString = function (data) {
            var key, arg, value, queryArgs = [];
            for (key in data) {
                if (data[key] instanceof RequestArgument) {
                    arg = data[key].argument;
                    value = _this.convert(data[key].argument, data[key].value);
                }
                else {
                    arg = key;
                    value = _this.convert(key, data[key]);
                }
                queryArgs.push(arg + "=" + encodeURIComponent(value));
            }
            return queryArgs.join("&");
        };
        if (config) {
            this.configure(config);
        }
    }
    Endpoint.prototype.configure = function (config) {
        if (config.method)
            this.method = config.method;
        if (config.arguments)
            this.arguments = config.arguments;
        if (config.headers)
            this.headers = config.headers;
        if (config.body)
            this.body = config.body;
        if (config.url)
            this.url = config.url;
        return this;
    };
    Endpoint.prototype.convert = function (argument, value) {
        if (this.arguments[argument] && this.arguments[argument].converter) {
            return this.arguments[argument].converter(value);
        }
        else {
            return value.toString();
        }
    };
    Endpoint.prototype.setHeaders = function (request, headers) {
        if (headers === void 0) { headers = {}; }
        for (var header in headers) {
            request.setRequestHeader(header, headers[header]);
        }
    };
    Endpoint.prototype.execute = function (parameters) {
        var request = new XMLHttpRequest(), url = this.url, data = "", endpoint = this;
        if (parameters) {
            if (parameters.arguments) {
                url = this.url + "?" + this.toQueryString(parameters.arguments);
            }
            request.onload = function () {
                if (this.status >= 200 && this.status < 400) {
                    if (parameters.success)
                        parameters.success(endpoint.responseParser(this.response), this.status);
                }
                else {
                    if (parameters.error)
                        parameters.error(endpoint.errorParser(this.response), this.status);
                }
            };
            if (parameters.data) {
                data = this.body.converter(parameters.data);
            }
        }
        request.open(this.method, url, true);
        this.setHeaders(request, this.headers);
        this.setHeaders(request, parameters.headers);
        request.setRequestHeader("Content-Type", this.body.contentType);
        request.send(data);
    };
    Endpoint.create = function (config) {
        return new this().configure(config);
    };
    return Endpoint;
}());
exports.Endpoint = Endpoint;
var JsonEndpoint = (function (_super) {
    __extends(JsonEndpoint, _super);
    function JsonEndpoint() {
        _super.apply(this, arguments);
        this.body = new JsonBodyInput();
        this.responseParser = JSON.parse;
        this.errorParser = JSON.parse;
    }
    return JsonEndpoint;
}(Endpoint));
exports.JsonEndpoint = JsonEndpoint;
var ApiComponent = (function () {
    function ApiComponent() {
        var _this = this;
        this.dispatch = function (action) { return _this.parent.dispatch(action); };
        this.getState = function () {
            if (!_this.parent)
                return null;
            else
                return _this.getSubState(_this.parent.getState(), _this.parent.stateLocation(_this));
        };
    }
    ApiComponent.prototype.getSubState = function (state, location) {
        if (location)
            return state[location];
        else
            return state;
    };
    ApiComponent.prototype.configure = function (config) {
        if (config) {
            if (config.parent)
                this.parent = config.parent;
            if (config.getState)
                this.getState = config.getState;
            if (config.dispatch)
                this.dispatch = config.dispatch;
            if (config.defaultState)
                this.defaultState = config.defaultState;
            if (config.name)
                this.name = config.name;
        }
        if (!this.name)
            this.name = this.constructor.name;
        return this;
    };
    ApiComponent.create = function (config) {
        return new this().configure(config);
    };
    return ApiComponent;
}());
exports.ApiComponent = ApiComponent;
var Action = (function (_super) {
    __extends(Action, _super);
    function Action() {
        var _this = this;
        _super.apply(this, arguments);
        this.initiator = function (action, data) {
            var reduxAction = {}, key;
            for (key in data) {
                reduxAction[key] = data[key];
            }
            reduxAction["type"] = action.name;
            action.dispatch(reduxAction);
            return this;
        };
        this.reducer = function (state, action) {
            for (var key in action) {
                if (key != "type") {
                    state[key] = action[key];
                }
            }
            return state;
        };
        this.apply = function (thisArg, argArray) { return _this.initiator.apply(thisArg, argArray); };
        this.call = function (thisArg) {
            var argArray = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                argArray[_i - 1] = arguments[_i];
            }
            return (_a = _this.initiator).call.apply(_a, [thisArg].concat(argArray));
            var _a;
        };
        this.bind = function (thisArg) {
            var argArray = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                argArray[_i - 1] = arguments[_i];
            }
            return (_a = _this.initiator).bind.apply(_a, [thisArg].concat(argArray));
            var _a;
        };
        this.dispatch = function (action) {
            if (action) {
                if (!action.hasOwnProperty("type"))
                    action["type"] = _this.name;
            }
            else {
                action = { type: _this.name };
            }
            _this.parent.dispatch(action);
            return _this.parent;
        };
        this.reduce = function (state, action) {
            if (!state) {
                return _this.defaultState;
            }
            else if (action.type != _this.name || !_this.reducer) {
                return state;
            }
            else {
                if (_this.reducer instanceof Function) {
                    return _this.reducer(state, action);
                }
                else {
                    return _this.reducer.reduce(function (s, f) { return f(s, action); }, state);
                }
            }
        };
    }
    Action.prototype.configure = function (config) {
        if (config) {
            if (config instanceof Function) {
                this.initiator = config;
            }
            else {
                var conf = config;
                _super.prototype.configure.call(this, conf);
                var endpoint = conf.endpoint;
                if (endpoint) {
                    if (typeof endpoint === "string") {
                        this.endpoint = new Endpoint({ url: endpoint });
                    }
                    else {
                        this.endpoint = endpoint;
                    }
                }
                if (conf.reducer)
                    this.reducer = conf.reducer;
                if (conf.initiator)
                    this.initiator = conf.initiator;
            }
        }
        return this;
    };
    Action.create = function (config) {
        return new this().configure(config);
    };
    return Action;
}(ApiComponent));
exports.Action = Action;
var Namespace = (function (_super) {
    __extends(Namespace, _super);
    function Namespace() {
        var _this = this;
        _super.apply(this, arguments);
        this.components = {};
        this.defaultState = {};
        this._stateLocation = {};
        this.reduce = function (state, action) {
            if (!state)
                return _this.defaultState;
            else {
                var newState = {}, location_1, stateLocation = void 0;
                for (var key in state) {
                    newState[key] = state[key];
                }
                for (location_1 in _this.components) {
                    stateLocation = _this._stateLocation[location_1];
                    if (stateLocation) {
                        newState[stateLocation] = _this.components[location_1].reduce(newState[stateLocation], action);
                    }
                    else {
                        newState = _this.components[location_1].reduce(newState, action);
                    }
                }
                return newState;
            }
        };
    }
    Namespace.prototype.configure = function (config) {
        _super.prototype.configure.call(this, config);
        var key;
        for (key in this) {
            if (this[key] instanceof ApiComponent && !this.mountLocation(this[key]))
                this.components[key] = this[key];
        }
        if (config && config.components) {
            for (key in config.components)
                this.components[key] = config.components[key];
        }
        this.mountAll(this.components);
        return this;
    };
    Namespace.prototype.updateDefaultState = function (stateLocation, state) {
        if (stateLocation) {
            this.defaultState[stateLocation] = state;
        }
        else {
            for (var key in state) {
                this.defaultState[key] = state[key];
            }
        }
        return this;
    };
    Namespace.prototype.nameComponent = function (component, location) {
        component.configure({ name: this.name + ": " + location });
    };
    Namespace.prototype.mount = function (location, component, stateLocation) {
        component.parent = this;
        if (!this.components[location])
            this.components[location] = component;
        if (component instanceof Action) {
            this._stateLocation[location] = stateLocation;
            this[location] = component.initiator.bind(this, component);
            if (!component.name)
                this.nameComponent(component, location);
        }
        else {
            this._stateLocation[location] = stateLocation || location;
            this[location] = component;
        }
        if (component.defaultState)
            this.updateDefaultState(this._stateLocation[location], component.defaultState);
        return this;
    };
    Namespace.prototype.mountAll = function (components) {
        var key, component;
        for (key in components) {
            component = components[key];
            if (component instanceof ApiComponent) {
                this.mount(key, component);
            }
            else {
                this.mount(component.location, component.component, component.stateLocation);
            }
        }
        return this;
    };
    Namespace.prototype.unmount = function (location) {
        this.components[location].parent = undefined;
        delete this.components[location];
        delete this.defaultState[location];
        delete this[location];
        return this;
    };
    Namespace.prototype.mountLocation = function (component) {
        for (var location_2 in this.components) {
            if (component == this.components[location_2])
                return location_2;
        }
        return null;
    };
    Namespace.prototype.stateLocation = function (component) {
        var mountLocation = this.mountLocation(component);
        return this._stateLocation[mountLocation];
    };
    return Namespace;
}(ApiComponent));
exports.Namespace = Namespace;
var CollectionAction = (function (_super) {
    __extends(CollectionAction, _super);
    function CollectionAction() {
        _super.apply(this, arguments);
        this.reducer = function (state, action) {
            for (var key in action) {
                if (key != "type") {
                    state = state.set(key, action[key]);
                }
            }
            return state;
        };
    }
    CollectionAction.prototype.getSubState = function (state, location) {
        if (location)
            return state.get(location);
        else
            return state;
    };
    return CollectionAction;
}(Action));
exports.CollectionAction = CollectionAction;
var CollectionNamespace = (function (_super) {
    __extends(CollectionNamespace, _super);
    function CollectionNamespace() {
        var _this = this;
        _super.apply(this, arguments);
        this.reduce = function (state, action) {
            if (!state)
                return _this.defaultState;
            else {
                var location_3, stateLocation = void 0, reducer = void 0;
                for (location_3 in _this.components) {
                    stateLocation = _this._stateLocation[location_3];
                    reducer = _this.components[location_3].reduce;
                    if (stateLocation) {
                        state = state.set(stateLocation, reducer(state.get(stateLocation), action));
                    }
                    else {
                        state = reducer(state, action);
                    }
                }
                return state;
            }
        };
    }
    CollectionNamespace.prototype.getSubState = function (state, location) {
        if (location)
            return state.get(location);
        else
            return state;
    };
    CollectionNamespace.prototype.updateDefaultState = function (stateLocation, state) {
        if (stateLocation) {
            this.defaultState = this.defaultState.set(stateLocation, state);
        }
        else {
            this.defaultState = this.defaultState.merge(state);
        }
        return this;
    };
    return CollectionNamespace;
}(Namespace));
exports.CollectionNamespace = CollectionNamespace;
//# sourceMappingURL=radical.js.map