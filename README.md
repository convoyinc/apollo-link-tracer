# Apollo Link Tracer

Trace your apollo queries and mutations with [apollo-link](https://github.com/apollographql/apollo-link).

Relies on [@convoy/tracer](https://github.com/convoyinc/tracer).

## Getting started

```
npm install apollo-link-tracer --save
```

```js
import ApolloLinkTracer from 'apollo-link-tracer';
import { Reporter } from '@convoy/tracer';

const apiReporter = new Reporter({
  flushHandler: async (timings, traces) => {
    // Report traces to API
  },
});

new ApolloClient({
  link: ApolloLink.from([
    new ApolloLinkTracer({
      service: 'my-service',
      tracerConfig: {
        reporter: apiReporter,
        fullTraceSampleRate: 1,
      },
      name: 'apollo-link',
    }),

    new ApolloLink((operation, forward) => {
      const { tracer } = operation.getContext().tracer;
      const requestId = tracer.getTraceId();

      operation.setContext({
        headers: {
          'x-req-id': requestId,
        },
      });

      return forward(operation);
    }),

    new RetryLink(retryOptions),

    new ApolloLinkTracer({
      service: 'my-service',
      tracerConfig: {
        reporter: apiReporter,
        fullTraceSampleRate: 1,
      },
      name: 'apollo-link-retry',
    }),

    new HttpLink({ uri, fetch }),
  ]),
});
```

Applying apollo-link-tracer both before and after the retry link lets you separately measure each retry, but provides a single trace across all of them.

A Tracer object is added to the operation context, which can then be used to pass a trace id to the HTTP headers to support cross service tracing.

### Advanced options

On a per GQL request basis you can alter how the trace is captured.

```js
api.mutate({
  mutation,
  variables,
  context: {
    tracerConfig: {
      fullTraceSampleRate: 1 / 20,
    },
    traceService: 'my-service',
    traceName: 'apollo-link-mutate',
    traceResource: 'getSomething',
    avoidTrace: false, // If true, skips tracing
  },
});
```

#### Filtering Sensitive Variables

To avoid reporting the contents of sensitive variables, you can specify variable filters.

```js
new ApolloLinkTracer({
  service: 'my-service',
  tracerConfig: {
    reporter: apiReporter,
    fullTraceSampleRate: 1,
  },
  name: 'apollo-link-retry',
  variableFilters: ['password', /secret.*sauce/],
}),
```

Variable filters can be either string matches or regular expressions. Any variables whose names match these filters will have their values filtered out, e.g.

```js
{ username: 'bob', password: 'hunter2', secret_hot_sauce: 'sri racha'}
```

becomes

```js
{ username: 'bob', password: '<filtered>', secret_hot_sauce: '<filtered>'}
```
