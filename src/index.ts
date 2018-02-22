import { ApolloLink, NextLink, Observable, Operation } from 'apollo-link';
import { Span, Tracer, TracerConfiguration } from '@convoy/tracer';

export default class ApolloLinkTracer extends ApolloLink {
  private service: string;
  private tracerConfig: TracerConfiguration;
  private name?: string;

  constructor({
    service,
    tracerConfig,
    name,
  }: {
    service: string;
    tracerConfig: TracerConfiguration;
    name?: string;
  }) {
    super();
    this.service = service;
    this.tracerConfig = tracerConfig;
    this.name = name;
  }

  request(operation: Operation, forward: NextLink) {
    const context = operation.getContext();

    if (context.avoidTrace) return forward(operation);

    const service = context.traceService || this.service;
    const name = context.traceName || this.name || 'apollo-link-tracer';

    let tracer = context.tracer;

    let span: Span;
    if (tracer) {
      const resource = context.traceResource || tracer.get().resource;
      span = tracer.startNestedSpan(resource, name, service);
    } else {
      tracer = new Tracer({
        ...this.tracerConfig,
        ...context.traceConfig,
      });
      operation.setContext({ tracer });
      const resource = context.traceResource || operation.operationName;
      span = tracer.start(resource, name, service);
    }
    return new Observable(observer => {
      const sub = forward(operation).subscribe({
        next: result => {
          if (result.errors) {
            span.setError(result.errors[0]);
          }
          if (tracer.get() === span) {
            tracer.end();
          } else {
            span.end();
          }
          observer.next(result);
        },
        error: networkError => {
          span.setError(networkError);
          if (tracer.get() === span) {
            tracer.end();
          } else {
            span.end();
          }
          observer.error(networkError);
        },
        complete: observer.complete.bind(observer),
      });

      return () => {
        sub.unsubscribe();
      };
    });
  }
}
