import { Reporter } from '@convoy/tracer';
import { ApolloLink, execute, GraphQLRequest, Observable } from 'apollo-link';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';
import * as sinon from 'sinon';

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
  let stub: sinon.SinonStub;

  beforeEach(() => {
    stub = sinon.stub();

    reporter = new Reporter({
      flushHandler: stub,
    });

    tracer = new ApolloLinkTracer({
      service: 'my-service',
      tracerConfig: {
        fullTraceSampleRate: 1,
        reporter,
      },
    });
  });

  it(`successfully links the next link and completes trace`, done => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document)!,
    };

    let called = 0;
    const link = ApolloLink.from([
      tracer,
      new ApolloLink(operation => {
        called += 1;
        return new Observable(observer => {
          observer.next({});
          observer.complete();
        });
      }),
    ]);

    execute(link, request1).subscribe(async result => {
      expect(called).to.be.eq(1);
      await reporter.flushIfNeeded();
      expect(stub).to.have.been.called;
      done();
      return null;
    });
  });

  it(`doesnt do trace if avoidTrace specified`, done => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document)!,
      context: {
        avoidTrace: true,
      },
    };

    let called = 0;
    const link = ApolloLink.from([
      tracer,
      new ApolloLink(operation => {
        called += 1;
        return new Observable(observer => {
          observer.next({});
          observer.complete();
        });
      }),
    ]);

    execute(link, request1).subscribe(async result => {
      expect(called).to.be.eq(1);
      await reporter.flushIfNeeded();
      expect(stub).to.not.have.been.called;
      done();
      return null;
    });
  });
});
