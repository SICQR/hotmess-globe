import { describe, it, expect } from 'vitest';
import { canOpenSheet } from '@/lib/sheetPolicy';

describe('canOpenSheet', () => {
  it('allows non-gated sheet types anywhere', () => {
    expect(canOpenSheet('profile', '/', [])).toBe(true);
    expect(canOpenSheet('event', '/market', [])).toBe(true);
    expect(canOpenSheet('shop', '/pulse', [])).toBe(true);
    expect(canOpenSheet('product', '/', [])).toBe(true);
  });

  it('blocks chat outside /ghosted with no profile in stack', () => {
    expect(canOpenSheet('chat', '/', [])).toBe(false);
    expect(canOpenSheet('chat', '/market', [])).toBe(false);
    expect(canOpenSheet('chat', '/pulse', [])).toBe(false);
    expect(canOpenSheet('chat', '/profile', [])).toBe(false);
  });

  it('blocks video outside /ghosted with no profile in stack', () => {
    expect(canOpenSheet('video', '/', [])).toBe(false);
    expect(canOpenSheet('video', '/market', [])).toBe(false);
    expect(canOpenSheet('video', '/profile', [])).toBe(false);
  });

  it('blocks travel outside /ghosted with no profile in stack', () => {
    expect(canOpenSheet('travel', '/', [])).toBe(false);
    expect(canOpenSheet('travel', '/pulse', [])).toBe(false);
    expect(canOpenSheet('travel', '/profile', [])).toBe(false);
  });

  it('allows chat on /ghosted', () => {
    expect(canOpenSheet('chat', '/ghosted', [])).toBe(true);
  });

  it('allows video on /ghosted', () => {
    expect(canOpenSheet('video', '/ghosted', [])).toBe(true);
  });

  it('allows travel on /ghosted', () => {
    expect(canOpenSheet('travel', '/ghosted', [])).toBe(true);
  });

  it('allows gated sheets on /ghosted sub-paths', () => {
    expect(canOpenSheet('chat', '/ghosted/nearby', [])).toBe(true);
    expect(canOpenSheet('video', '/ghosted/filter', [])).toBe(true);
  });

  it('allows chat when profile sheet is in stack', () => {
    expect(canOpenSheet('chat', '/', [{ type: 'profile' }])).toBe(true);
  });

  it('allows video when profile sheet is in stack', () => {
    expect(canOpenSheet('video', '/market', [{ type: 'profile' }])).toBe(true);
  });

  it('allows travel when profile sheet is in stack', () => {
    expect(canOpenSheet('travel', '/pulse', [{ type: 'profile' }])).toBe(true);
  });

  it('blocks gated sheets with non-profile items in stack but not on ghosted', () => {
    expect(canOpenSheet('chat', '/', [{ type: 'event' }])).toBe(false);
    expect(canOpenSheet('video', '/market', [{ type: 'cart' }])).toBe(false);
  });

  it('allows gated sheets when profile is anywhere in a multi-item stack', () => {
    expect(canOpenSheet('chat', '/', [{ type: 'event' }, { type: 'profile' }])).toBe(true);
    expect(canOpenSheet('travel', '/pulse', [{ type: 'profile' }, { type: 'event' }])).toBe(true);
  });
});
