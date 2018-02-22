/**
 * A thing. For stuff.
 */
export default class Thing {

    /** Whether a thing was done. */
    done = false;
    /** Whether stuff as done to a thing. */
    stuff: string|null = null;

    /**
     * Do a thing.
     */
    do(): void {
      this.done = true;
    }

    /**
     * Do a thing with stuff.
     */
    doWithStuff(stuff: string): void {
      this.do();
      this.stuff = stuff;
    }

  }
