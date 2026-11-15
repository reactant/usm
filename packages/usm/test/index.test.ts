import { apply } from 'mutative';
import { createStore, action, state, computed, Action } from '../index';

test('base', () => {
  class Counter {
    @state
    count = { sum: 0 };

    @action
    increase() {
      this.count.sum += 1;
    }
  }

  const counter = new Counter();

  const store = createStore({
    modules: [counter],
  });
  const [oldState] = Object.values(store.getState());
  expect(oldState).toEqual({ count: { sum: 0 } });
  const fn = jest.fn();
  store.subscribe(() => {
    fn();
  });
  counter.increase();
  const [newState] = Object.values(store.getState());
  expect(newState).toEqual({ count: { sum: 1 } });
  expect(fn.mock.calls.length).toBe(1);
  expect(newState === oldState).toBe(false);
});

test('enablePatches', () => {
  class Counter {
    @state
    count = { sum: 0 };

    @action
    increase() {
      this.count.sum += 1;
    }
  }

  const counter = new Counter();

  const snapshots: Record<string, any>[] = [];

  const store = createStore(
    {
      modules: [counter],
    },
    undefined,
    {
      enablePatches: true,
      hook: ({ getState }, action) => {
        const lastState = getState();
        snapshots.push(apply(lastState, action._patches!));
        return action;
      },
    }
  );
  counter.increase();
  expect(Object.values(snapshots[0])).toEqual([{ count: { sum: 1 } }]);
});

test.each([false, true])(
  'replays moved array drafts and nested actions with strict=%s',
  (strict) => {
    class List {
      @state
      rows = [
        { id: 'a', count: 0 },
        { id: 'b', count: 0 },
        { id: 'c', count: 0 },
      ];

      @state
      unchanged = { count: 0 };

      @action
      increment() {
        this.rows[0].count += 1;
      }

      @action
      rearrange() {
        this.rows[0].count += 1;
        this.rows.reverse();
        this.rows.splice(1, 1);
        this.increment();
      }
    }

    const list = new List();
    const actions: Action[] = [];
    const store = createStore({ modules: [list], strict }, undefined, {
      enablePatches: true,
      hook: (_, dispatchedAction) => {
        actions.push(dispatchedAction);
        return dispatchedAction;
      },
    });
    const initialState = store.getState();
    const initialList = Object.values(initialState)[0] as List;
    const listener = jest.fn();
    store.subscribe(listener);

    list.rearrange();

    const nextState = store.getState();
    expect(list.rows).toEqual([
      { id: 'c', count: 1 },
      { id: 'a', count: 1 },
    ]);
    expect(initialList.rows).toEqual([
      { id: 'a', count: 0 },
      { id: 'b', count: 0 },
      { id: 'c', count: 0 },
    ]);
    expect(list.unchanged).toBe(initialList.unchanged);
    expect(Object.isFrozen(list.rows)).toBe(strict);
    expect(Object.isFrozen(list.rows[0])).toBe(strict);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(actions).toHaveLength(1);
    expect(apply(initialState, actions[0]._patches!)).toEqual(nextState);
    expect(apply(nextState, actions[0]._inversePatches!)).toEqual(initialState);

    list.increment();

    expect(list.rows[0].count).toBe(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(actions).toHaveLength(2);
    expect(apply(nextState, actions[1]._patches!)).toEqual(store.getState());
    expect(apply(store.getState(), actions[1]._inversePatches!)).toEqual(
      nextState
    );
  }
);
