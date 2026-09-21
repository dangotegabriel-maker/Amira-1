// No provider has been selected. This legacy boundary fails closed so callers
// cannot present fabricated text as a successful translation.
const unavailable = () => { const error = new Error('Translation is not available yet.'); error.code = 'translation/unavailable'; throw error; };
export const translationService = { translateMessage: async () => unavailable(), clearCache: async () => undefined };
