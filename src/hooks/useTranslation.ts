// src/hooks/useTranslation.ts
import { useTheme } from '../contexts/ThemeContext';
import { getTranslation, type TranslationKey } from '../locales/translations';

export const useTranslation = () => {
  const { language } = useTheme();
  
  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
  };
  
  return { t, language };
};
