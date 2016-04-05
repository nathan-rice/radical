var Redux = require('redux');

describe("Namespace", function () {
    var store = Redux.createStore(function (s) { return s });
    it("", function () {
        var ns = Radical.Namespace.create({
                defaultState: {greeting: "hello", target: "world"},
                store: store,
                getState: store.getState
            }),
            action = Radical.Action.create(function (action) {
                var state = this.getState();
                return state.greeting + " " + state.target;
            });
        store.replaceReducer(ns.reduce);
        ns.mount("greetTarget", action);
        expect(ns.greetTarget()).toEqual("hello world");
    });
});