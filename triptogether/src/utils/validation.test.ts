import { describe, it, expect } from 'vitest';
import { isValidHttpUrl, sanitizeText, validateImageFile } from './validation';

describe('Validation Utilities', () => {
  it('validates http and https URLs correctly', () => {
    expect(isValidHttpUrl('https://maps.google.com/test')).toBe(true);
    expect(isValidHttpUrl('http://example.com/guide')).toBe(true);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('data:text/html,<script></script>')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('sanitizes text to strip dangerous HTML tags', () => {
    expect(sanitizeText('<script>alert("hacked")</script>Hello World')).toBe('Hello World');
    expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('');
    expect(sanitizeText('Normal Trip Name & Notes')).toBe('Normal Trip Name & Notes');
  });

  it('validates image files based on type and size limit', () => {
    const validFile = new File(['fake data'], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(validFile).valid).toBe(true);

    const invalidTypeFile = new File(['fake data'], 'exec.sh', { type: 'application/x-sh' });
    expect(validateImageFile(invalidTypeFile).valid).toBe(false);
  });
});
