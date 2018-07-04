import {
  ApolloLink,
  FetchResult,
  NextLink,
  Observable,
  Operation,
} from 'apollo-link';
import {
  AnnotatorFunction,
  SpanMeta,
  Span,
  SpanTags,
  Tracer,
  TracerConfiguration,
} from '@convoy/tracer';

export type ErrorAnnotatorFunction = (span: Span, error: Error) => void;
export type GraphQLErrorAnnotatorFunction = (
  span: Span,
  result: FetchResult,
) => void;
export type VariableFilter = string | RegExp;

export default class ApolloLinkTracer extends ApolloLink {
  private service: string;
  private tracerConfig: TracerConfiguration;
  private name?: string;
  private annotator?: AnnotatorFunction;
  private metadata?: SpanMeta;
  private tags?: SpanTags;
  private networkErrorAnnotator: ErrorAnnotatorFunction;
  private graphQLErrorAnnotator: GraphQLErrorAnnotatorFunction;
  private variableFilters: VariableFilter[];

  constructor({
    service,
    tracerConfig,
    name,
    annotator,
    metadata,
    tags,
    networkErrorAnnotator = baseErrorAnnotator,
    graphQLErrorAnnotator = baseGQLAnnotator,
    variableFilters = [],
  }: {
    service: string;
    tracerConfig: TracerConfiguration;
    name?: string;
    annotator?: AnnotatorFunction;
    metadata?: SpanMeta;
    tags?: SpanTags;
    networkErrorAnnotator?: ErrorAnnotatorFunction;
    graphQLErrorAnnotator?: GraphQLErrorAnnotatorFunction;
    variableFilters?: VariableFilter[];
  }) {
    super();
    this.service = service;
    this.tracerConfig = tracerConfig;
    this.name = name;
    this.metadata = metadata;
    this.tags = tags;
    this.annotator = annotator;
    this.networkErrorAnnotator = networkErrorAnnotator;
    this.graphQLErrorAnnotator = graphQLErrorAnnotator;
    this.variableFilters = variableFilters;
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
      ...context.traceMetadata,
      ...this.metadata,
      variables: variablesToMetaTag(operation.variables, this.variableFilters),
    });
    span.setTags({
      ...context.traceTags,
      ...this.tags,
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
          const annotator = context.traceAnnotator || this.annotator;
          if (annotator) {
            annotator(span);
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

function variablesToMetaTag(variables: {}, variableFilters: VariableFilter[]) {
  const filteredVariables = { ...variables };
  for (const varName of Object.keys(filteredVariables)) {
    for (const filter of variableFilters) {
      if (
        (filter instanceof RegExp && filter.test(varName)) ||
        (typeof filter === 'string' && filter === varName)
      ) {
        filteredVariables[varName] = '<filtered>';
      }
    }
  }
  return JSON.stringify(filteredVariables);
}

function baseErrorAnnotator(span: Span, error: Error) {
  span.setError(error);
}

export function baseGQLAnnotator(span: Span, result: FetchResult) {
  if (!result.errors) return;
  span.error = 1;
  span.setTags({
    error: '1',
    [`error.name`]: result.errors[0].name,
  });
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
