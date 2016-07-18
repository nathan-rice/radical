/// <reference path="../typings/index.d.ts" />
export interface IEndpointInput {
    converter?: Function;
}
export declare class EndpointInput implements IEndpointInput {
    converter: Function;
    constructor(config?: IEndpointInput | Function);
}
export interface IEndpointBodyInput extends IEndpointInput {
    contentType?: string;
}
export declare class JsonBodyInput implements IEndpointBodyInput {
    contentType: string;
    converter: {
        (value: any): string;
        (value: any, replacer: (key: string, value: any) => any): string;
        (value: any, replacer: any[]): string;
        (value: any, replacer: (key: string, value: any) => any, space: string | number): string;
        (value: any, replacer: any[], space: string | number): string;
    };
}
export interface IEndpointArgumentContainer {
    [key: string]: IEndpointInput;
}
export declare class RequestArgument {
    argument: string;
    value: string | number;
    constructor(argument: string, value: string | number);
}
export interface IEndpoint {
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
export declare class Endpoint implements IEndpoint {
    url: string;
    method: string;
    arguments: IEndpointArgumentContainer;
    headers: Object;
    body: IEndpointBodyInput;
    responseParser: (response: string) => any;
    errorParser: (error: string) => any;
    configure(config: IEndpoint): this;
    constructor(config?: IEndpoint);
    private convert(argument, value);
    private toQueryString;
    private setHeaders(request, headers?);
    execute(parameters?: IEndpointExecutionParameters): Promise<{}>;
    static create(config?: IEndpoint): Endpoint;
}
export declare class JsonEndpoint extends Endpoint {
    body: JsonBodyInput;
    responseParser: (text: string, reviver?: (key: any, value: any) => any) => any;
    errorParser: (text: string, reviver?: (key: any, value: any) => any) => any;
}
export interface IApiComponent {
    name?: string;
    parent?: Namespace;
    defaultState?: Object;
    dispatch?: Function;
    getState?: Function;
}
export interface IAction extends IApiComponent {
    endpoint?: Endpoint | string;
    initiator?: Function;
    reducer?: ((state, action) => Object) | ((state, action) => Object)[];
}
export declare class ApiComponent {
    name: string;
    parent: Namespace;
    defaultState: Object;
    dispatch: Function;
    reduce: Function;
    getState: Function;
    protected getSubState(state: any, location: any): any;
    configure(config?: IApiComponent): this;
    static create(config?: IApiComponent): ApiComponent;
}
export declare class Action extends ApiComponent implements IAction, Function {
    endpoint: Endpoint;
    initiator: Function;
    reducer: ((state, action) => Object) | ((state, action) => Object)[];
    apply: (thisArg: any, argArray?: any) => any;
    call: (thisArg: any, ...argArray: any[]) => any;
    bind: (thisArg: any, ...argArray: any[]) => any;
    prototype: any;
    length: number;
    arguments: any;
    caller: Function;
    dispatch: (action?: Object) => Namespace;
    configure(config?: IAction | Function): this;
    static create(config?: any): Action;
    reduce: Function;
}
export interface IComponentContainer {
    [key: string]: ApiComponent;
}
export interface INamespace extends IApiComponent {
    components?: IComponentMountConfiguration[] | IComponentContainer | Object;
}
export interface IComponentMountConfiguration {
    location: string;
    component: ApiComponent;
    stateLocation?: string;
}
export declare class Namespace extends ApiComponent implements INamespace {
    components: IComponentContainer | Object;
    defaultState: {};
    protected _stateLocation: {};
    protected nameSelf(): void;
    configure(config?: INamespace): this;
    protected updateDefaultState(stateLocation: any, state: any): Namespace;
    protected nameComponent(component: any, location: any): void;
    mount(location: string, component: ApiComponent, stateLocation?: string): Namespace;
    mountAll(components: IComponentMountConfiguration[] | IComponentContainer | Object): this;
    unmount(location: string): Namespace;
    mountLocation(component: ApiComponent): string;
    stateLocation(component: ApiComponent): string;
    reduce: (state: any, action: any) => {};
}
export interface ICollection<K, V> {
    get: (key: K) => V;
    set: (key: K, value: V) => ICollection<K, V>;
    merge: (...iterables: ICollection<K, V>[]) => ICollection<K, V>;
}
export declare class CollectionAction extends Action {
    defaultState: ICollection<any, any>;
    reducer: (state: ICollection<any, any>, action) => ICollection<any, any> | ((state: ICollection<any, any>, action) => ICollection<any, any>)[];
    protected getSubState(state: any, location: any): any;
}
export declare class CollectionNamespace extends Namespace {
    defaultState: ICollection<any, any>;
    protected getSubState(state: any, location: any): any;
    protected nameSelf(): void;
    protected updateDefaultState(stateLocation: any, state: ICollection<any, any>): CollectionNamespace;
    reduce: (state: ICollection<any, any>, action: any) => ICollection<any, any>;
}
