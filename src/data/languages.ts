/**
 * Supported languages for website content generation
 * The 'code' property uses ISO 639-1 language codes when possible
 */
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'da', name: 'Danish' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'other', name: 'Other' }, // Added "Other" option for unlisted languages
];

/**
 * Get language name from language code
 * @param code ISO language code
 * @returns Language name or "Other" if not found
 */
export const getLanguageName = (code: string): string => {
  const language = languages.find(lang => lang.code === code);
  return language ? language.name : 'Other';
}; 