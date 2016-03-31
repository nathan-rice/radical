/// <reference path="definitions/redux/redux.d.ts" />

interface IReduxAction {
    type: string;
}

interface IEndpointInput {
    description?: string;
    converter?: (argumentValue) => string;
}

class EndpointInput {
    description: string;
    converter = (argumentValue) => argumentValue.toString();

    constructor(config?: IEndpointInput) {
        if (config.description) this.description = config.description;
        if (config.converter) this.converter = config.converter;
    }
}

interface IEndpointBodyInput extends IEndpointInput {
    contentType?: string;
    converter?: (bodyObject) => string;
    schema?: string;
}

class JsonBodyInput implements IEndpointBodyInput {
    contentType = "application/json; charset=utf-8";
    converter = JSON.stringify;
}

interface IEndpointArgumentContainer {
    [key: string]: IEndpointInput;
}

export class RequestArgument {
    constructor(public argument: string, public value: string) {}
}

interface IEndpoint {
    url?: string;
    method?: string;
    arguments?: IEndpointArgumentContainer;
    headers?: Object;
    body?: IEndpointBodyInput;
}

export interface IEndpointExecutionParameters {
    arguments?: Object;
    data?: Object;
    success?: Function;
    error?: Function;
    headers?: Object;
}

export class Endpoint implements IEndpoint {
    url: string;
    method: string = "GET";
    arguments: IEndpointArgumentContainer = {};
    headers: Object;
    body: IEndpointBodyInput = {
        contentType: "application/x-www-form-urlencoded; charset=utf-8",
        converter: this.toQueryString
    };
    responseParser: (response: string) => any = (response) => response;
    errorParser: (error: string) => any = (error) => error;

    configure(config: IEndpoint) {
        if (config.method) this.method = config.method;
        if (config.arguments) this.arguments = config.arguments;
        if (config.headers) this.headers = config.headers;
        if (config.body) this.body = config.body;
        if (config.url) this.url = config.url;
        return this;
    }

    constructor(config?: IEndpoint) {
        if (config) {
            this.configure(config);
        }
    }

    private convert(argument, value) {
        if (this.arguments[argument] && this.arguments[argument].converter) {
            return this.arguments[argument].converter(value);
        } else {
            return value.toString();
        }

    }

    private toQueryString = (data: Object) => {
        let key, arg, value, queryArgs = [];
        for (key in data) {
            // Handle array-like
            if (data[key] instanceof RequestArgument) {
                arg = data[key].argument;
                value = this.convert(data[key].argument, data[key].value);
            } else {
                arg = key;
                value = this.convert(key, data[key]);
            }
            queryArgs.push(arg + "=" + encodeURIComponent(value));

        }
        return queryArgs.join("&");
    };

    private setHeaders(request: XMLHttpRequest, headers: Object = {}) {
        for (let header in headers) {
            request.setRequestHeader(header, headers[header]);
        }
    }

    execute(parameters?: IEndpointExecutionParameters) {
        var request = new XMLHttpRequest(),
            url = this.url,
            data = "",
            endpoint = this;
        if (parameters) {
            if (parameters.arguments) {
                url = this.url + "?" + this.toQueryString(parameters.arguments);
            }
            request.onload = function () {
                if (this.status >= 200 && this.status < 400) {
                    if (parameters.success) parameters.success(endpoint.responseParser(this.response));
                } else {
                    if (parameters.error) parameters.error(endpoint.errorParser(this.response));
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
    }

    static create(config?: IEndpoint) {
        return new this().configure(config);
    }
}

export class JsonEndpoint extends Endpoint {
    body = new JsonBodyInput();
    responseParser = JSON.parse;
    errorParser = JSON.parse;
}

interface IApiComponent {
    name?: string;
    description?: string;
    parent?: Namespace;
    defaultState?: Object;
    store?: Redux.Store;
    getState?: Function;
}

export interface IAction extends IApiComponent {
    endpoint?: Endpoint | string;
    initiator?: Function;
    reducer?: ((state, action: IReduxAction) => Object) | ((state, action: IReduxAction) => Object)[];
}

export class ApiComponent {
    name: string;
    description: string;
    parent: Namespace;
    defaultState: Object;
    store: Redux.Store;
    reduce: Function;

    getState: Function = () => {
        if (!this.parent) return null;
        else return this._get(this.parent.getState(), this.parent.stateLocation(this));
    };

    protected _get(state, location) {
        if (location) return state[location];
        else return state;
    }

    configure(config?: IApiComponent) {
        if (config) {
            if (config.description) this.description = config.description;
            if (config.parent) this.parent = config.parent;
            if (config.getState) this.getState = config.getState;
            if (config.store) this.store = config.store;
            if (config.defaultState) this.defaultState = config.defaultState;
            if (config.name) this.name = config.name;
        }
        if (!this.name) this.name = (this.constructor as any).name;
        return this;
    }

    static create(config?: IApiComponent) {
        return new this().configure(config);
    }

    getStore(): Redux.Store {
        return this.store || this.parent.getStore();
    }

}


export class Action extends ApiComponent implements IAction, Function {

    endpoint: Endpoint;

    initiator: Function = function(action: Action, data) {
        let reduxAction = {}, key;
        for (key in data) {
            reduxAction[key] = data[key];
        }
        // Set the type property of the reduxAction after copying data properties in case type is a data property
        reduxAction["type"] = action.name;
        action.getStore().dispatch(reduxAction);
        return this;
    };

    reducer: ((state, action: IReduxAction) => Object) |
             ((state, action: IReduxAction) => Object)[] = (state, action) => {
        for (let key in action) {
            if (key != "type") {
                state[key] = action[key];
            }
        }
        return state;
    };

    /*
     * Required in order to masquerade as a function for the purpose of type checking
     */
    apply = (thisArg: any, argArray?: any) => this.initiator.apply(thisArg, argArray);
    call = (thisArg: any, ...argArray: any[]) => this.initiator.call(thisArg, ...argArray);
    bind = (thisArg: any, ...argArray: any[]) => this.initiator.bind(thisArg, ...argArray);
    prototype: any;
    length: number;
    arguments: any;
    caller: Function;

    configure(config?: IAction | Function) {
        if (config) {
            if (config instanceof Function) {
                this.initiator = config;
            }
            else {
                let conf: IAction = config;
                super.configure(conf);
                let endpoint = conf.endpoint;
                if (endpoint) {
                    if (typeof endpoint === "string") {
                        this.endpoint = new Endpoint({url: endpoint});
                    } else {
                        this.endpoint = endpoint;
                    }
                }
                if (conf.reducer) this.reducer = conf.reducer;
                if (conf.initiator) this.initiator = conf.initiator;
            }
        }
        return this;
    }

    static create(config?) {
        return new this().configure(config);
    }

    reduce: Function = (state, action) => {
        if (!state) {
            return this.defaultState;
        } else if (action.type != this.name || !this.reducer) {
            return state;
        } else {
            if (this.reducer instanceof Function) {
                return (this.reducer as (state, action: IReduxAction) => Object)(state, action);
            } else {
                return (this.reducer as ((state, action: IReduxAction) => Object)[]).reduce((s, f) => f(s, action), state);
            }
        }
    }
}

interface IComponentContainer {
    [key: string]: ApiComponent;
}

export interface INamespace extends IApiComponent {
    components?: IComponentMountConfiguration[] | IComponentContainer | Object;
    store?: Redux.Store;
}

interface IComponentMountConfiguration {
    location: string;
    component: ApiComponent;
    stateLocation?: string;
}

export class Namespace extends ApiComponent implements INamespace {
    components: IComponentContainer | Object = {};
    defaultState = {};
    protected _stateLocation = {};

    configure(config?: INamespace) {
        super.configure(config);
        let key;
        for (key in this) {
            // This ensures consistent behavior for ApiComponents defined on a namespace as part of a class declaration
            if (this[key] instanceof ApiComponent && !this.mountLocation(this[key])) this.components[key] = this[key];
        }
        if (config) {
            for (key in config.components) this.components[key] = config.components[key];
        }
        this.mountAll(this.components);
        return this;
    }

    protected updateDefaultState(stateLocation, state): Namespace {
        if (stateLocation) {
            this.defaultState[stateLocation] = state;
        } else {
            for (let key in state) {
                this.defaultState[key] = state[key];
            }
        }
        return this;
    }

    protected nameComponent(component, location) {
        component.configure({name: this.name + ": " + location})
    }

    mount(location: string, component: ApiComponent, stateLocation?: string): Namespace {
        component.parent = this;
        if (component instanceof Action) {
            // Actions with an undefined state location operate on the parent Namespace's entire state
            this._stateLocation[location] = stateLocation;
            this[location] = component.initiator.bind(this, component);
            if (!component.name) this.nameComponent(component, location);
        } else {
            // Namespaces *must* have a state location, we'll use the mount location if necessary
            this._stateLocation[location] = stateLocation || location;
            this[location] = component;
        }
        if (component.defaultState) this.updateDefaultState(this._stateLocation[location], component.defaultState);
        return this;
    }

    mountAll(components: IComponentMountConfiguration[] | IComponentContainer | Object) {
        let key, component;
        for (key in components) {
            component = components[key];
            if (component instanceof ApiComponent) {
                this.mount(key, component);
            } else {
                this.mount(component.location, component.component, component.stateLocation)
            }
        }
        return this;
    }

    unmount(location: string): Namespace {
        this.components[location].parent = undefined;
        delete this.components[location];
        delete this.defaultState[location];
        delete this[location];
        return this;
    }

    mountLocation(component: ApiComponent): string {
        for (let location in this.components) {
            if (component == this.components[location]) return location;
        }
        return null;
    }

    stateLocation(component: ApiComponent): string {
        var mountLocation = this.mountLocation(component);
        return this._stateLocation[mountLocation];
    }

    reduce = (state, action) => {
        if (!state) return this.defaultState;
        else {
            let newState = {}, location, stateLocation;
            for (let key in state) {
                newState[key] = state[key];
            }
            for (location in this.components) {
                stateLocation = this._stateLocation[location];
                if (stateLocation) {
                    newState[stateLocation] = this.components[location].reduce(newState[stateLocation], action);
                } else {
                    newState = this.components[location].reduce(state, action)
                }
            }
            return newState;
        }
    }
}

interface ICollection<K, V> {
    get: (key: K) => V;
    set: (key: K, value: V) => ICollection<K, V>;
    merge: (...iterables: ICollection<K, V>[]) => ICollection<K, V>;
}

export class CollectionAction extends Action {

    defaultState: ICollection<any, any>;

    reducer: (state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any> |
             ((state: ICollection<any, any>, action: IReduxAction) => ICollection<any, any>)[] = (state, action) => {
        for (let key in action) {
            if (key != "type") {
                state = state.set(key, action[key]);
            }
        }
        return state;
    };

    protected _get(state, location) {
        if (location) return state.get(location);
        else return state;
    }
}

export class CollectionNamespace extends Namespace {
    defaultState: ICollection<any, any>;

    protected _get(state, location) {
        if (location) return state.get(location);
        else return state;
    }

    protected updateDefaultState(stateLocation, state: ICollection<any, any>): CollectionNamespace {
        if (stateLocation) {
            this.defaultState = this.defaultState.set(stateLocation, state);
        } else {
            this.defaultState = this.defaultState.merge(state);
        }
        return this;
    }

    reduce = (state: ICollection<any, any>, action): ICollection<any, any> => {
        if (!state) return this.defaultState;
        else {
            // applying to a new object here to retain state set by actions with a non-standard getState
            let location, stateLocation, reducer;
            for (location in this.components) {
                stateLocation = this._stateLocation[location];
                reducer = this.components[location].reduce;
                if (stateLocation) {
                    state = state.set(stateLocation, reducer(state.get(stateLocation), action));
                } else {
                    state = reducer(state, action);
                }
            }
            return state;
        }
    }
}