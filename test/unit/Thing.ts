import Thing from '../../src/Thing';

describe(`Thing`, () => {

  let thing: Thing;
  beforeEach(() => {
    thing = new Thing();
  });

  it(`starts off not having done anything`, () => {
    expect(thing.done).to.eq(false);
    expect(thing.stuff).to.eq(null);
  });

  it(`does things`, () => {
    thing.do();
    expect(thing.done).to.eq(true);
  });

  it(`does things with stuff`, () => {
    thing.doWithStuff('ohai');
    expect(thing.done).to.eq(true);
    expect(thing.stuff).to.eq('ohai');
  });

});
