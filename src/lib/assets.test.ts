import { describe, it, expect } from 'vitest';
import { assetUrl } from './assets';

describe('assetUrl', () => {
  it('works at the site root', () => {
    expect(assetUrl('crest.png', '/')).toBe('/crest.png');
  });

  it('works under a subpath', () => {
    expect(assetUrl('crest.png', '/Griffin-Grader/')).toBe('/Griffin-Grader/crest.png');
  });

  /* The real bug: actions/configure-pages emits base_path with no trailing
     slash, so plain concatenation produced /Griffin-Gradercrest.png and the
     crest showed as a broken-image icon on the first deploy. */
  it('inserts the missing slash when the base has none', () => {
    expect(assetUrl('crest.png', '/Griffin-Grader')).toBe('/Griffin-Grader/crest.png');
  });

  it('does not double the slash when the path has a leading one', () => {
    expect(assetUrl('/crest.png', '/Griffin-Grader/')).toBe('/Griffin-Grader/crest.png');
    expect(assetUrl('/crest.png', '/Griffin-Grader')).toBe('/Griffin-Grader/crest.png');
  });

  it('handles nested asset paths', () => {
    expect(assetUrl('icons/icon-192.png', '/Griffin-Grader')).toBe(
      '/Griffin-Grader/icons/icon-192.png',
    );
  });
});
