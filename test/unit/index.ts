import { Reporter } from '@convoy/tracer';
import { ApolloLink, execute, GraphQLRequest } from 'apollo-link';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

import ApolloLinkTracer from '../../src';

function getOperationName(doc: DocumentNode): string | null {
  let res: string | null = null;
  doc.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition' && definition.name) {
      res = definition.name.value;
    }
  });
  return res;
}

describe(`ApolloLinkTracer`, () => {
  let reporter: Reporter;
  let tracer: ApolloLinkTracer;

  beforeEach(() => {
    reporter = new Reporter({
      flushHandler: () => {},
    });

    tracer = new ApolloLinkTracer({
      service: 'my-service',
      tracerConfig: {
        reporter,
      },
    });
  });

  it(`does not affect different queries`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Goodbye World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document)!,
    };

    const request2: GraphQLRequest = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document)!,
    };

    let called = 0;
    const link = ApolloLink.from([
      tracer,
      new ApolloLink(() => {
        called += 1;
        return null;
      }),
    ]);

    execute(link, request1);
    execute(link, request2);
    expect(called).to.be.eq(2);
  });
});
