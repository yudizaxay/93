import { describe, it, expect } from 'vitest';
import { WinnerStore } from './WinnerStore';

function makeMemoryAdapter(initial?: unknown) {
  let value = initial;
  return { read: () => value, write: (v: unknown) => { value = v; } };
}

describe('WinnerStore', () => {
  it('starts empty when adapter has no stored value', () => {
    const store = new WinnerStore(makeMemoryAdapter(undefined));
    expect(store.getAll()).toEqual([]);
  });

  it('falls back to empty list when stored value is corrupt', () => {
    const store = new WinnerStore(makeMemoryAdapter('not-an-array'));
    expect(store.getAll()).toEqual([]);
  });

  it('add() appends a winner with generated id and ISO timestamp', () => {
    const store = new WinnerStore(makeMemoryAdapter(undefined));
    const winner = store.add('John Doe', 'ABC Law Firm', 'john@example.com', 0.93182, '0.93');
    expect(winner.name).toBe('John Doe');
    expect(winner.lawFirm).toBe('ABC Law Firm');
    expect(winner.email).toBe('john@example.com');
    expect(winner.id).toBeTruthy();
    expect(winner.category).toBe('WIN'); // defaults to WIN when not passed
    expect(new Date(winner.createdAt).toString()).not.toBe('Invalid Date');
    expect(store.getAll()).toHaveLength(1);
  });

  it('add() stores the category when passed (leads captured after a loss)', () => {
    const store = new WinnerStore(makeMemoryAdapter(undefined));
    const lead = store.add('Jane Roe', 'XYZ Firm', 'jane@example.com', 1.2, '1.20', 'OTHER');
    expect(lead.category).toBe('OTHER');
  });

  it('add() persists across store instances sharing the same adapter', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store1 = new WinnerStore(adapter);
    store1.add('Jane Roe', 'XYZ Firm', 'jane@example.com', 0.929, '0.93');
    const store2 = new WinnerStore(adapter);
    expect(store2.getAll()).toHaveLength(1);
  });

  it('clear() empties the winner list and persists the change', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store = new WinnerStore(adapter);
    store.add('John Doe', 'ABC Law Firm', 'john@example.com', 0.93, '0.93');
    store.clear();
    expect(store.getAll()).toEqual([]);
    const store2 = new WinnerStore(adapter);
    expect(store2.getAll()).toEqual([]);
  });

  it('does not throw if the adapter write() throws', () => {
    const adapter = {
      read: () => undefined,
      write: () => { throw new Error('disk full'); },
    };
    const store = new WinnerStore(adapter);
    expect(() => store.add('John', 'Firm', 'john@example.com', 0.93, '0.93')).not.toThrow();
  });
});
