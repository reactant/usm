import { expect, test, vi } from 'vitest';
import { createPinia, disposePinia, getStores } from 'pinia';
import { createApp } from 'vue';
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
  expect(computedFn.mock.calls.length).toBe(0);
  expect(counter.sum).toBe(1);
  expect(counter.sum).toBe(1);
  expect(computedFn.mock.calls.length).toBe(1);
  counter.increase();
  const newState = Object.values(store.getState())[0] as Counter;
  expect(newState.count).toEqual({ sum: 1 });
  expect(fn.mock.calls.length).toBe(1);
  expect(computedFn.mock.calls.length).toBe(1);
  expect(counter.sum).toBe(2);
  expect(counter.sum).toBe(2);
  expect(computedFn.mock.calls.length).toBe(2);
});

test('uses an installed Pinia 4 instance, plugins, and hydrated state', () => {
  class Counter {
    name = 'counter';

    @state
    count = 0;

    @computed
    get doubled() {
      return this.count * 2;
    }

    @action
    increase() {
      this.count += 1;
    }
  }

  const pinia = createPinia();
  createApp({}).use(pinia);
  const counter = new Counter();
  const plugin = vi.fn(() => ({ marker: 'installed' }));
  try {
    const store = createStore(
      { modules: [counter] },
      { counter: { count: 4 } },
      { pinia, plugins: [plugin] }
    );
    expect(store).toBe(pinia);
    expect(plugin).toHaveBeenCalledTimes(1);
    const [nativeStore] = getStores(pinia);
    expect(nativeStore.$id).toBe('counter');
    expect(nativeStore.marker).toBe('installed');
    expect(counter.doubled).toBe(8);
    const onAction = vi.fn();
    nativeStore.$onAction(onAction);
    counter.increase();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(nativeStore.doubled).toBe(10);
    expect(store.getState().counter.count).toBe(5);
    nativeStore.$patch((state) => {
      state.count = 6;
    });
    expect(counter.count).toBe(6);
    expect(counter.doubled).toBe(12);
  } finally {
    disposePinia(pinia);
  }
});
