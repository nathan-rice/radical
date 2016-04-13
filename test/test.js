var Redux = require('redux');
var Immutable = require('immutable');
var Radical = require('../dist/radical.js');

describe("Namespace", function () {
    var store = Redux.createStore(function (s) { return s });
    it("can mount components, get and set state properly", function () {
        var ns = Radical.Namespace.create({
                name: "Greeter",
                defaultState: {greeting: "hello", target: "world"},
                dispatch: store.dispatch,
                getState: store.getState
            }),
            greetTarget = Radical.Action.create(function (action) {
                var state = this.getState();
                return state.greeting + " " + state.target;
            }),
            setTarget = Radical.Action.create(function (action, target) {
                return action.dispatch({target: target});
            }),
            setGreeting = Radical.Action.create(function (action, greeting) {
                return action.dispatch({greeting: greeting});
            });
        store.replaceReducer(ns.reduce);
        ns.mount("greetTarget", greetTarget);
        ns.configure({components: {setTarget: setTarget, setGreeting: setGreeting}});
        expect(ns.greetTarget()).toEqual("hello world");
        expect(ns.setTarget("everybody").greetTarget()).toEqual("hello everybody");
        expect(ns.setGreeting("hiya").greetTarget()).toEqual("hiya everybody");
        var state = ns.getState();
        expect(state.target).toEqual("everybody");
        expect(state.greeting).toEqual("hiya");
    });
});

describe("CollectionNamespace", function () {
    var store = Redux.createStore(function (s) { return s });
    it("can mount components, get and set state properly", function () {
        var ns = Radical.CollectionNamespace.create({
                name: "Collection Greeter",
                defaultState: Immutable.fromJS({greeting: "hello", target: "world"}),
                dispatch: store.dispatch,
                getState: store.getState
            }),
            greetTarget = Radical.CollectionAction.create(function (action) {
                var state = this.getState();
                return state.get("greeting") + " " + state.get("target");
            }),
            setTarget = Radical.CollectionAction.create(function (action, target) {
                return action.dispatch({target: target});
            }),
            setGreeting = Radical.CollectionAction.create(function (action, greeting) {
                return action.dispatch({greeting: greeting});
            });
        store.replaceReducer(ns.reduce);
        ns.mount("greetTarget", greetTarget);
        ns.configure({components: {setTarget: setTarget, setGreeting: setGreeting}});
        expect(ns.greetTarget()).toEqual("hello world");
        expect(ns.setTarget("everybody").greetTarget()).toEqual("hello everybody");
        expect(ns.setGreeting("hiya").greetTarget()).toEqual("hiya everybody");
        var state = ns.getState();
        expect(state.get("target")).toEqual("everybody");
        expect(state.get("greeting")).toEqual("hiya");
    });
});