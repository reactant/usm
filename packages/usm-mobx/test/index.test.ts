import { expect, test, vi } from 'vitest';
import { autorun, isAction, isComputedProp, isObservableProp } from 'mobx';
import { createStore, action, state, computed } from '../index';

test('base', () => {
  const computedFn = vi.fn();
  class Counter {
    @state
    count = { sum: 0 };

    @action
    increase() {
      this.count.sum += 1;
    }

    @computed
    get sum() {
      computedFn();
      return this.count.sum + 1;
    }
  }

  const counter = new Counter();

  const store = createStore({
    modules: [counter],
  });

  const oldState = Object.values(store.getState())[0] as Counter;
  expect(oldState.count).toEqual({ sum: 0 });
  const fn = vi.fn();
  store.subscribe(() => {
    fn();
  });
  expect(computedFn.mock.calls.length).toBe(1);
  expect(counter.sum).toBe(1);
  expect(counter.sum).toBe(1);
  expect(computedFn.mock.calls.length).toBe(1);
  counter.increase();
  const newState = Object.values(store.getState())[0] as Counter;
  expect(newState.count).toEqual({ sum: 1 });
  expect(fn.mock.calls.length).toBe(1);
  expect(computedFn.mock.calls.length).toBe(2);
  expect(counter.sum).toBe(2);
  expect(counter.sum).toBe(2);
  expect(computedFn.mock.calls.length).toBe(2);
});

test('legacy USM decorators batch observable collections with MobX 7', () => {
  class Inventory {
    name = 'inventory';

    @state
    quantities = new Map<string, number>();

    @state
    selected = new Set<string>();

    @computed
    get total() {
      return [...this.selected].reduce(
        (sum, key) => sum + (this.quantities.get(key) ?? 0),
        0
      );
    }

    @action
    select(key: string) {
      this.selected.add(key);
    }

    @action
    update(quantity: number) {
      this.quantities.set('book', quantity);
      this.select('book');
    }
  }

  const inventory = new Inventory();
  const store = createStore(
    { modules: [inventory], strict: false },
    { inventory: { quantities: new Map([['book', 2]]) } }
  );
  expect(isObservableProp(inventory, 'quantities')).toBe(true);
  expect(isComputedProp(inventory, 'total')).toBe(true);
  expect(isAction(inventory.update)).toBe(true);
  expect(inventory.quantities.get('book')).toBe(2);

  const values: number[] = [];
  const dispose = autorun(() => values.push(inventory.total));
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  try {
    inventory.update(3);
    expect(values).toEqual([0, 3]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().inventory.quantities).toBe(inventory.quantities);
    unsubscribe();
    inventory.update(4);
    expect(values).toEqual([0, 3, 4]);
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    dispose();
    unsubscribe();
  }
});
