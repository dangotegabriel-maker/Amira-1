import { BIO_TEMPLATES } from '../bioTemplates';

describe('creator bio templates', () => {
  test('keeps every template editable, distinct and non-empty', () => {
    expect(BIO_TEMPLATES).toHaveLength(9);
    expect(new Set(BIO_TEMPLATES.map((template) => template.text)).size).toBe(BIO_TEMPLATES.length);
    BIO_TEMPLATES.forEach((template) => {
      expect(template.id).toBeTruthy();
      expect(template.tone).toBeTruthy();
      expect(template.text.length).toBeGreaterThanOrEqual(20);
    });
  });
});
