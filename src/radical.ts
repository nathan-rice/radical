/// <reference path="definitions/redux/redux.d.ts" />

module Radical {

    export interface IReduxAction {
        type: string;
    }

    /**
     * This is the base for all inputs to a HTTP endpoint.  This includes both URL arguments, and body data for
     * POST/PUT requests.
     */
    export interface IEndpointInput {
        /**
         * This function should take a single argument of any type and return a string.
         */
        converter?: Function;
    }

    export class EndpointInput implements IEndpointInput {

        /**
         * This function should take a single argument of any type and return a string.  By default returns the result of
         * the toString method of argumentValue.
         *
         * @param argumentValue the value to be converted to a string.
         */
        converter: Function = (argumentValue) => argumentValue.toString();

        constructor(config?: IEndpointInput | Function) {
            if (config instanceof Function) {
                this.converter = config;
            } else if (config) {
                let config_: IEndpointInput = config;
                if (config_.converter) this.converter = config_.converter;
            }
        }
    }

    /**
     * This specifies body data input for POST/PUT requests.
     */
    export interface IEndpointBodyInput extends IEndpointInput {
        /**
         * The content type HTTP header that should be set for the endpoint request.
         */
        contentType?: string;
    }

    /**
     * This specifies the correct content type and converter for JSON data.
     */
    export class JsonBodyInput implements IEndpointBodyInput {
        contentType = "application/json; charset=utf-8";
        converter = JSON.stringify;
    }

    export interface IEndpointArgumentContainer {
        [key: string]: IEndpointInput;
    }

    /**
     * This class is used to represent HTTP request url arguments.
     */
    export class RequestArgument {
        constructor(public argument: string, public value: string) {
        }
    }

    export interface IEndpoint {
        url?: string;
        /**
         * The HTTP request method for the endpoint.
         */
        method?: string;
        arguments?: IEndpointArgumentContainer;
        /**
         * This should be an object, where the keys are the header names, and the values are the header values to be set.
         */
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

    /**
     * A declarative representation of a HTTP API endpoint.
     */
    export class Endpoint implements IEndpoint {
        url: string;
        /**
         * The HTTP request method for the endpoint.  Defaults to "GET"
         */
        method: string = "GET";
        arguments: IEndpointArgumentContainer = {};
        /**
         * This should be an object, where the keys are the header names, and the values are the header values to be set.
         */
        headers: Object;
        /**
         * The type of HTTP reqeust body input for this endpoint.  By default, converts the input data to form-urlencode
         * format.
         *
         * @type {{contentType: string, converter: (function((RequestArgument[]|Object)): string)}}
         */
        body: IEndpointBodyInput = {
            contentType: "application/x-www-form-urlencoded; charset=utf-8",
            converter: this.toQueryString
        };

        /**
         * A function which is called to transform the success response body data before it is passed to the success
         * callback.
         *
         * @param response The HTTP response body contents.
         */
        responseParser: (response: string) => any = (response) => response;

        /**
         * A function which is called to transform the error response body data before it is passed to the error callback.
         *
         * @param error The HTTP Error response body contents.
         */
        errorParser: (error: string) => any = (error) => error;

        /**
         *
         *
         * @param config
         * @returns {Endpoint}
         */
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

        /**
         * Converts a URL query argument value to a string using the converter specified by the arguments configuration, or
         * the value's toString method if no converter was specified.
         *
         * @param argument The argument name
         * @param value The argument value
         */
        private convert(argument, value): string {
            if (this.arguments[argument] && this.arguments[argument].converter) {
                return this.arguments[argument].converter(value);
            } else {
                return value.toString();
            }

        }

        /**
         * Converts a set of URL query key, value pairs into an escaped query string.
         *
         * @param data The url query parameters
         * @returns {string} A URL-eescaped query string
         */
        private toQueryString = (data: RequestArgument[] | Object) => {
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

        /**
         * Sets the specified headers on the request object.
         *
         * @param request The request
         * @param headers The headers to set
         */
        private setHeaders(request: XMLHttpRequest, headers: Object = {}) {
            for (let header in headers) {
                request.setRequestHeader(header, headers[header]);
            }
        }

        /**
         * Call an API endpoint via HTTP request.
         *
         * @param parameters The parameters to the HTTP request
         */
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
                        if (parameters.success) parameters.success(endpoint.responseParser(this.response), this.status);
                    } else {
                        if (parameters.error) parameters.error(endpoint.errorParser(this.response), this.status);
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

    /**
     * Utility class for accessing API endpoints that send and receive data via JSON.
     */
    export class JsonEndpoint extends Endpoint {
        body = new JsonBodyInput();
        responseParser = JSON.parse;
        errorParser = JSON.parse;
    }

    export interface IApiComponent {
        name?: string;
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
        /**
         * The name of this component.  Used to automatically generate Redux action types.  If specified, it must be unique
         * among all instantiated `ApiComponents`.
         */
        name: string;

        /**
         * The parent `Namespace`, used for state and store resolution.
         */
        parent: Namespace;

        /**
         * The defaultState required for this component to function properly.
         */
        defaultState: Object;

        /**
         * The store to dispatch actions to.  Optional for child nodes, required for root nodes.
         */
        store: Redux.Store;

        /**
         * For root nodes, the reduce function which should be passed to the Redux store.
         */
        reduce: Function;

        /**
         * Returns the state object specified for this `ApiComponent` by its parent component.
         *
         * @returns {any} The localized state for this component
         */
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

        /**
         * Starting at the current node, traverses up the component tree searching for an `ApiComponent` with a defined
         * store.
         *
         * @returns {Redux.Store} The first store located during traversal of the component tree.
         */
        getStore(): Redux.Store {
            return this.store || this.parent.getStore();
        }

    }

    /**
     *
     */
    export class Action extends ApiComponent implements IAction, Function {

        /**
         * The API HTTP `Endpoint` for this action, if any.
         */
        endpoint: Endpoint;

        /**
         * The initiator function for this `Action`.  This is the function that should be invoked when you call the `Action`
         * via your client API.
         *
         * @param action Bound parameter, references the current `Action` in place of this, which is bound to the parent
         * namespace.
         * @param data
         * @returns {Namespace}
         */
        initiator: Function = function (action: Action, data) {
            let reduxAction = {}, key;
            for (key in data) {
                reduxAction[key] = data[key];
            }
            // Set the type property of the reduxAction after copying data properties in case type is a data property
            reduxAction["type"] = action.name;
            action.getStore().dispatch(reduxAction);
            return this;
        };

        /**
         * The function responsible for updating state as a result of an action.  If not specified, defaults
         * to copying all properties of the action object except type to the state object.
         *
         * @param state
         * @param action
         * @returns {any}
         */
        reducer: ((state, action: IReduxAction) => Object) |
            ((state, action: IReduxAction) => Object)[] = (state, action) => {
            for (let key in action) {
                if (key != "type") {
                    state[key] = action[key];
                }
            }
            return state;
        };

        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        apply = (thisArg: any, argArray?: any) => this.initiator.apply(thisArg, argArray);
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        call = (thisArg: any, ...argArray: any[]) => this.initiator.call(thisArg, ...argArray);
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        bind = (thisArg: any, ...argArray: any[]) => this.initiator.bind(thisArg, ...argArray);
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        prototype: any;
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        length: number;
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
        arguments: any;
        /**
         * Required in order to masquerade as a function for the purpose of type checking
         */
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
                            this.endpoint = endpoint as Endpoint;
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

        /**
         * This function is a pass-through for the reducer method that handles some common Redux boilerplate.
         *
         * @param state
         * @param action
         * @returns {any}
         */
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

    export interface IComponentContainer {
        [key: string]: ApiComponent;
    }

    export interface INamespace extends IApiComponent {
        components?: IComponentMountConfiguration[] | IComponentContainer | Object;
        store?: Redux.Store;
    }

    export interface IComponentMountConfiguration {
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
            if (config && config.components) {
                for (key in config.components) this.components[key] = config.components[key];
            }
            this.mountAll(this.components);
            return this;
        }

        /**
         * Merges child `ApiComponent` defaultState into the current `Namespace` defaultState.
         *
         * @param stateLocation
         * @param state
         * @returns {Namespace}
         */
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

        /**
         * Registers an  `ApiComponent` as a child of this `Namespace`.  Also names any unnamed child components, and
         * handles merging defaultState objects.
         *
         * @param location The bind point for
         * @param component The component to mount.
         * @param stateLocation An optional state location; used to provide an `Action` with an isolated state, or to
         * use a different name for a child `Namespace`'s sub-state tree.
         * @returns {Namespace}
         */
        mount(location: string, component: ApiComponent, stateLocation?: string): Namespace {
            component.parent = this;
            if (!this.components[location]) this.components[location] = component;
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

        /**
         * Returns the property name for the specified `ApiComponent` on this `Namespace`.
         *
         * @param component
         * @returns {any}
         */
        mountLocation(component: ApiComponent): string {
            for (let location in this.components) {
                if (component == this.components[location]) return location;
            }
            return null;
        }

        /**
         * Returns the property name for the portion of the state object specific to the specified `ApiComponent`, or
         * undefined for components that receive the entire local state object.
         *
         * @param component
         * @returns {any}
         */
        stateLocation(component: ApiComponent): string {
            var mountLocation = this.mountLocation(component);
            return this._stateLocation[mountLocation];
        }

        /**
         * Provides state locality by dispatching portions of the state tree to child `ApiComponent` reduce methods.
         *
         * @param state
         * @param action
         * @returns {{}}
         */
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
                        newState = this.components[location].reduce(newState, action)
                    }
                }
                return newState;
            }
        }
    }

    /**
     * Lightweight interface to support Immutable collections without requiring Immutable.
     */
    export interface ICollection<K, V> {
        get: (key: K) => V;
        set: (key: K, value: V) => ICollection<K, V>;
        merge: (...iterables: ICollection<K, V>[]) => ICollection<K, V>;
    }

    /**
     * Just a minor tweak of `Action` to support Immutable (or similar) state.
     */
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

    /**
     * Just a minor tweak of `Namespace to support Immutable (or similar) state.
     */
    export class CollectionNamespace extends Namespace {
        /**
         * The `CollectionNamespace`'s default state.  This property is **required**.
         */
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
}