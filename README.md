What is Radical?
================
Radical is a client API framework, designed to simplify the creation and maintenance of React/Redux applications.
Radical allows you to model your client API and state via the composition of Actions and Namespaces.

* Actions are the basic unit of functionality; anything that influences state is an Action.
* Namespaces provide a mechanism for organizing and grouping actions.  Namespaces also define the state hierarchy, and
provide state locality for actions.

Why Radical?
============
Writing web applications with React and Redux offers a lot of advantages in terms of conceptual simplicity and
testability.  Unfortunately, the cost of this simplicity is a layer of indirection between initiation of an action and
its resolution.  Additionally, because state is non-local, you are forced to consider the entire state structure when
performing updates; even worse, if you decide to change its structure, you have to update your all the reducers that
traverse that portion of the state.

Radical was designed solve these problems.

Using Actions, you can group initiation and resolution functionality
together.  Even better, by default Actions only have to deal with localized state, and most of the initiation/reduction
boilerplate has been handled for you.  That doesn't mean Actions are limiting - most of the default behavior of Actions
can be easily overridden in the event you need to do something unanticipated.

Using Namespaces, you have the ability to compose the structure of your API and state from modules.  Because state is
modular and composable, you are free to design it from the bottom up, rather than having to plan your entire state
structure ahead of time.  If you decide to change how your state is organized, all you need to do is change how you
compose Namespaces; all your reducers will just work.  Of course, if you don't want your state model to match your
Namespace structure, you can override the default Namespace sub-state resolution behavior easily, and Actions associated
with that Namespace will still support state locality.

Installation
============

Just `npm install radical` and you're up and running.  The primary way to consume it is via webpack, or as an internal
typescript module. If you want to consume it via AMD you can rebuild via `npm run-script build-amd`.

Documentation can be generated using Typedoc, just do `npm run-script document` and it will be built in the docs
directory.  If something in the documentation is confusing or needs additional explanation feel free to create an issue
and I will do my best to address it.

There is a (meager) test suite, you can run it via `karma start karma.conf.js`.  If you run into any bugs I would
greatly appreciate if you could include code for a demonstration test case when creating an issue.

Quick Start
===========

Radical is authored in Typescript, and I've made every effort to maintain type safety and editor support for things like
smart code completion while providing dynamic composability.  There are a few cases where you have to make a choice
between expressiveness and full type safety, or you have to include type hints, but these are limited (don't worry, I'll
highlight them in the examples).

The first thing you need to do is define a Namespace; there are several ways to do it, lets start off simply, using
Javascript semantics:

```typescript
    var store = Redux.createStore(state => state);

    /* You can just create an instance of the Namespace class.  If you do this, you
     * should provide a value for the name attribute, as this is used when
     * constructing Redux action types.  Note that since this is going to be a "root"
     * Namespace, you must also specify a state retrieval function, and the action
     * dispatch function.  This is not necessary for child Namespaces, by default
     * they recursively search ancestor Namespaces for the appropriate values.  You
     * can also pass a defaultState object, which can house Namespace specific
     * configuration.
     *
     * Note: I'm creating and populating Namespace here in a step by step fashion to
     * ease you into Radical gradually, but you don't get type safety or IDE
     * auto-completion this way; I'll show you a better way in a bit.
     */

    var apiRoot = Radical.Namespace.create({
        name: "My root namespace",
        getState: store.getState,
        dispatch: store.dispatch,
        // Note, if you do not specify defaultState, an empty object is assumed
        defaultState: {greeting: "hello", target: "world"}
    });

    /* Namespaces provide a reduce function that automatically dispatches relevant
     * portions of state to child components, so you only need to specify the root
     * reducer here.
     */
    store.replaceReducer(apiRoot.reduce);
```

Now lets provide some actions on our Namespace:

```typescript
    /* If your Action only reads state, the configuration is very simple - just pass
     * it a function.  The function being passed here is called the initiator.  By
     * default, actions have access to their parent Namespace's portion of the state
     * tree.
     *
     * Important note: you cannot use the arrow notation when defining the
     * initiator.  This is because the initiator is bound to the Namespace where it
     * is mounted.  This is also why the function for greetTarget has action as an
     * argument; the first argument of Action initiators is bound to the Action
     * itself.
     */
    var greetTarget = Radical.Action.create(function (action) {
        /* Generally, you are going to want to use the getState method of this.
         * The reason is that this is bound to the parent Namespace of the Action.
         */
        let state = this.getState();
        return state.greeting + " " + state.target + "!";
    });

    /* If your Action needs to modify state, you usually need to specify a reducer;
     * however, if all you want to do is set a value in state, you the default
     * reducer handles that case for you.  The default Action reducer copies all
     * properties of the dispatched Redux action (besides type) to the state object.
     *
     * Note: I'm using an object argument to the create method here just to expose
     * you to more of the interface.
     */
    var setGreeting = Radical.Action.create({
        initiator: function (action, newGreeting) {
            /* Note that I am dispatching without an action type.  The dispatch
             * method automatically adds a type property to the passed object
             * (if one is not already present) with the Action's name property
             * as a value.  Actions that do not have an explicitly set name
             * property have one automatically generated via a combination of
             * the containing Namespace's name and the mount location for the
             * action.
             *
             * Note: An Action's dispatch method returns a reference to its
             * parent Namespace, to enable fluent-style method chaining.
             */
            return action.dispatch({greeting: newGreeting});
        }
    })

    // For this action I'll specify the reducer manually.
    var setTarget = Radical.Action.create({
        initiator: function (action, newTarget) {
            return action.dispatch({target: newTarget});
        },
        /* Note that you can directly mutate the passed state, since Radical
         * passes each reducer a shallow copy of the parent Namespace's state. Thus
         * as long as you don't directly alter any mutable children of the passed
         * state, any references to old versions of state remain pristine.
         *
         * Note: you can also specify an array of reducer functions, and they will
         * be applied sequentially.
         */
        reducer: (state, action) => {
            state[target] = action.target;
            return state;
        }
    }

    var rootConfig = {
        components: {
            greetTarget: greetTarget,
            setGreeting: setGreeting
        }
    };

    // You can attach Actions to a Namespace using the configure method
    apiRoot.configure(rootConfig);

    // You can also use the mount method
    apiRoot.mount("setTarget", setTarget);

    apiRoot.greetTarget(); // -> "hello world!"
    apiRoot.setTarget("hacker news").greetTarget(); // -> "hello hacker news!"
```

You might have noticed that I use a create factory function rather than the new keyword.  This is the preferred method
of creating new Radical components.  The reason for this is that when we get into defining Namespaces and Actions using
Typescript class semantics with instance properties, components created with the new keyword must have their configure
method called *after* all constructor functions have resolved or they are not properly instrumented; the create method
does this for you automatically.

In Typescript, it is much better to use class semantics to define Namespaces and Actions.  There are a couple of ways of
going about this, depending on whether you value brevity and uncluttered code or full type safety.

```typescript
    /* First, with an emphasis on uncluttered brevity.  This method will get you editor
     * autocomplete for names, but you won't have type safety on the arguments and
     * return value of actions.  Since this Namespace is going to be a child of our
     * previously created apiRoot Namespace, we don't have to specify getState or
     * dispatch properties.
     *
     * Note: You don't need to specify a name for Namespaces defined this way unless
     * you plan to have more than one instance of it.  If no name attribute is
     * specified, Namespaces will derive a name from their class name.
     */
    class SpanishGreeter extends Radical.Namespace {

        defaultState = {greeting: "hola", target: "mundo"};

        greetTarget = Radical.Action.create(function (action) {
            let state = this.getState();
            return "¡" + state.greeting + " " + state.target + "!";
        });

        setTarget = Radical.Action.create(function (action, newTarget) {
            return action.dispatch({target: newTarget});
        });

        setGreeting = Radical.Action.create(function (action, newGreeting) {
            return action.dispatch({greeting: newGreeting});
        });
    }

    /* Now, with editor support for type safe usage and return values.  Note that you
     * still don't get compiler assurances that the initiator function of the Action
     * you supplied to the Namespace matches matches the signature definition on the
     * class.
     */
    class FrenchGreeter extends Radical.Namespace {

        defaultState = {greeting: "bonjour", target: "le monde"};

        components = {
            greetTarget: Radical.Action.create(function (action) {
                let state = this.getState();
                return state.greeting + " " + state.target + "!";
            }),

            setTarget: Radical.Action.create(function (action, newTarget) {
                return action.dispatch({target: newTarget});
            }),

            setGreeting: Radical.Action.create(function (action, newGreeting) {
                return action.dispatch({greeting: newGreeting});
            })
        }

        greetTarget: () => string;
        setTarget: (newTarget: string) => FrenchGreeter;
        setGreeting: (newGreeting: string) => FrenchGreeter;
    }

    /* You can attach Namespaces to other Namespaces in exactly the same way I attached
     * Actions previously.  Note that the configure method performs an update rather
     * than completely replacing the components on the Namespace.
     *
     * Note: You still won't get full editor autocomplete and type-safety if you attach
     * new Namespaces to a pre-existing Namespace in this way - you need to use class
     * semantics all the way down.
     */
     apiRoot.configure({components: {spanish: SpanishGreeter.create()});
     apiRoot.mount("french", FrenchGreeter.create());

     /* For best results in Typescript, just define a class.  This will provide
      * autocomplete and type safety (if you used signature style definitions).
      *
      * Note: I specify names here for the greeters because otherwise their actions
      * would have the same dispatch type as the previously created instances.
      */
     class GreeterContainer extends Radical.Namespace {
        spanish = SpanishGreeter.create({name: "alt spanish"}) as SpanishGreeter;
        french = FrenchGreeter.create({name: "alt french"}) as FrenchGreeter;
     }

     var newApiRoot = GreeterContainer.create({
        getState: store.getState,
        dispatch: store.dispatch
     });

     store.replaceReducer(newApiRoot.reduce);

     newApiRoot.getState();
     /* -> {
      *        spanish: {greeting: "hola", target: "mundo"},
      *        french: {greeting: "bonjour", target: "le monde"}
      *    }
      */
```

**Important**: Note that I type-cast SpanishGreeter and FrenchGreeter in the previous code.  This is unfortunately
necessary in order for the code to compile.  The reason for this is that Typescript doesn't currently support
returning polymorphic **this** from static methods.  If this offends you, I suggest leaving a note on the relevant
[Typescript Github Issue](https://github.com/Microsoft/TypeScript/issues/5863) mentioning how much you would like it if
they made this feature a slightly higher priority.

Radical includes a few more features for your development pleasure. For actions that need to make an ajax call to the
server, I've included a declarative endpoint description interface.  Additionally, since Immutable is commonly used
with React/Redux, there are version of Namespace and Action that work with it (or any library that implements a basic
collection interface) seamlessly.

```typescript

    /* CollectionNamespace supports Immutable (or any collection with get, set and
     * merge methods).
     */
    class AnotherDemoNamespace extends Radical.CollectionNamespace {
        /* Note that you MUST set a defaultState for CollectionNamespaces.  This is
         * because I don't assume anything about the type of collection you are
         * using.
         */
        defaultState = Immutable.fromJS({});

        actionWithGetEndpoint = Radical.CollectionAction({
            /* If your endpoint is accessed using the GET method, and returns text
             * which doesn't need to be transformed (or you want to handle the
             * transformation yourself) you can specify it using just the URL.
             */
            endpoint: "/get_endpoint_returning_text",
            initiator: function (action, arg1) {
                action.endpoint.execute({
                    arguments: {foo: arg1, bar: 2},
                    success: (data) => {
                        action.dispatch({newData: data});
                    }
                });
            }
        });

        actionWithJsonPostEndpoint = Radical.CollectionAction({
            endpoint: Radical.JsonEndpoint.create({
                url: "/post_json_endpoint",
                method: "POST"
            }),
            initiator: function (action, arg1) {
                action.endpoint.execute({
                    data: {foo: arg1, bar: 2},
                    // The data passed to the success function has already been parsed
                    success: (data) => {
                        action.dispatch({newData: data});
                    },
                    /* Note that JsonEndpoint assumes the server is delivering JSON
                     * error messages.  If this is not the case (it really should be!)
                     * you need to provide a function that returns its input unchanged
                     * (e.g. r => r) as the errorParser argument to the JsonEndpoint.
                     */
                    error: (data, status) => {
                        // handle your business
                    }
                });
            }
        });
    }
```