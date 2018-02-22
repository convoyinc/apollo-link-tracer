import Thing from '../../src/Thing';

describe(`Thing`, () => {

  let thing: Thing;
  beforeEach(() => {
    thing = new Thing();
  });

  it(`can have side effects that we will test`, () => {
    expect(thing.do).to.be.ok;
  });

});
