import {
  ApolloLink,
  FetchResult,
  NextLink,
  Observable,
  Operation,
} from 'apollo-link';
import { Span, Tracer, TracerConfiguration } from '@convoy/tracer';

export type ErrorAnnotatorFunction = (span: Span, error: Error) => void;
export type GraphQLErrorAnnotatorFunction = (
  span: Span,
  result: FetchResult,
) => void;

export default class ApolloLinkTracer extends ApolloLink {
  private service: string;
  private tracerConfig: TracerConfiguration;
  private name?: string;
  private networkErrorAnnotator: ErrorAnnotatorFunction;
  private graphQLErrorAnnotator: GraphQLErrorAnnotatorFunction;

  constructor({
    service,
    tracerConfig,
    name,
    networkErrorAnnotator = baseErrorAnnotator,
    graphQLErrorAnnotator = baseGQLAnnotator,
  }: {
    service: string;
    tracerConfig: TracerConfiguration;
    name?: string;
    networkErrorAnnotator?: ErrorAnnotatorFunction;
    graphQLErrorAnnotator?: GraphQLErrorAnnotatorFunction;
  }) {
    super();
    this.service = service;
    this.tracerConfig = tracerConfig;
    this.name = name;
    this.networkErrorAnnotator = networkErrorAnnotator;
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
    span.setMeta({
      variables: JSON.stringify(operation.variables),
    });
    return new Observable(observer => {
      const sub = forward(operation).subscribe({
        next: result => {
          if (result.errors) {
            this.graphQLErrorAnnotator(span, result);
          }
          if (tracer.get() === span) {
            tracer.end();
          } else {
            span.end();
          }
          observer.next(result);
        },
        error: networkError => {
          this.networkErrorAnnotator(span, networkError);
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

function baseErrorAnnotator(span: Span, error: Error) {
  span.setError(error);
}

export function baseGQLAnnotator(span: Span, result: FetchResult) {
  if (!result.errors) return;
  span.error = 1;
  result.errors.forEach((error, index) => {
    span.setMeta({
      [`error${index ? index + 1 : ''}.name`]: error.name,
      [`error${index ? index + 1 : ''}.message`]: error.message,
      [`error${index ? index + 1 : ''}.path`]: error.path
        ? error.path.join('')
        : '',
    });
  });
}
