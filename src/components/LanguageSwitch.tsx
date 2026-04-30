import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';
import type { Locale } from '@/types/activity';

const languages: Array<{ label: string; value: Locale }> = [
  { label: 'EN', value: 'en' },
  { label: '中文', value: 'zh' },
  { label: 'BM', value: 'ms' },
];

export const LanguageSwitch = () => {
  const { i18n, t } = useTranslation();

  const handleChange = async (locale: Locale) => {
    window.localStorage.setItem('bello-activity-locale', locale);
    await i18n.changeLanguage(locale);
  };

  return (
    <div className="language-switch" aria-label={t('language')}>
      <FaGlobe aria-hidden="true" />
      {languages.map((language) => (
        <button
          className={i18n.language === language.value ? 'is-active' : ''}
          key={language.value}
          onClick={() => void handleChange(language.value)}
          type="button"
        >
          {language.label}
        </button>
      ))}
    </div>
  );
};
