# i18n Usage Examples

This document demonstrates how to use the i18n (internationalization) system in the Loyalty Program Platform.

## Basic Usage

### Using the useTranslation Hook

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(); // Default namespace: 'common'
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### Using Specific Namespaces

```jsx
import { useTranslation } from 'react-i18next';

function LoginForm() {
  // Use the 'auth' namespace
  const { t } = useTranslation('auth');
  
  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <input placeholder={t('login.emailPlaceholder')} />
      <input placeholder={t('login.passwordPlaceholder')} />
      <button>{t('login.loginButton')}</button>
    </div>
  );
}
```

### Using Multiple Namespaces

```jsx
import { useTranslation } from 'react-i18next';

function Dashboard() {
  // Load both 'common' and 'dashboard' namespaces
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <div>
      <h1>{t('dashboard:navigation.home')}</h1>
      <button>{t('common:save')}</button>
      <button>{t('common:cancel')}</button>
    </div>
  );
}
```

## Language Switching

### Language Switcher Component

```jsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button 
        onClick={() => changeLanguage('ar')}
        className={i18n.language === 'ar' ? 'active' : ''}
      >
        {t('common:arabic')}
      </button>
      <button 
        onClick={() => changeLanguage('en')}
        className={i18n.language === 'en' ? 'active' : ''}
      >
        {t('common:english')}
      </button>
    </div>
  );
}
```

### Get Current Language

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  
  const currentLanguage = i18n.language; // 'ar' or 'en'
  const isRTL = currentLanguage === 'ar';
  
  return (
    <div className={isRTL ? 'rtl-layout' : 'ltr-layout'}>
      Current language: {currentLanguage}
    </div>
  );
}
```

## Interpolation (Dynamic Values)

### Simple Interpolation

```jsx
const { t } = useTranslation();

// Translation: "itemCount": "{{count}} عنصر"
<p>{t('common:itemCount', { count: 5 })}</p>
// Output: "5 عنصر"
```

### Pluralization (English)

```jsx
const { t } = useTranslation();

// Translation: 
// "itemCount": "{{count}} item"
// "itemCount_plural": "{{count}} items"

<p>{t('common:itemCount', { count: 1 })}</p> // "1 item"
<p>{t('common:itemCount', { count: 5 })}</p> // "5 items"
```

### Complex Interpolation

```jsx
const { t } = useTranslation('dashboard');

// Translation: "showing": "عرض"
<p>
  {t('showing')} {startIndex} - {endIndex} {t('of')} {total} {t('results')}
</p>
```

## Validation Messages

```jsx
import { useTranslation } from 'react-i18next';

function FormField({ value, minLength }) {
  const { t } = useTranslation('auth');
  
  const validate = () => {
    if (!value) {
      return t('validation.required');
    }
    if (value.length < minLength) {
      return t('validation.minLength', { min: minLength });
    }
    return null;
  };
  
  const error = validate();
  
  return (
    <div>
      <input value={value} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## Namespaces by Feature

### Common Namespace
Use for: Buttons, labels, common actions, validation, dates
```jsx
const { t } = useTranslation(); // or useTranslation('common')
t('save'), t('cancel'), t('loading'), t('success')
```

### Auth Namespace
Use for: Login, registration, password reset, account management
```jsx
const { t } = useTranslation('auth');
t('login.title'), t('register.businessName'), t('validation.required')
```

### Dashboard Namespace
Use for: Business dashboard, offers, branches, customers, scanner, analytics
```jsx
const { t } = useTranslation('dashboard');
t('navigation.offers'), t('stats.totalCustomers'), t('scanner.title')
```

### Admin Namespace
Use for: Platform administration, business management, subscriptions, icon library
```jsx
const { t } = useTranslation('admin');
t('businessManagement.title'), t('iconLibrary.categories'), t('analytics.platformStats')
```

## RTL (Right-to-Left) Support

The platform automatically sets the HTML `dir` attribute based on language:
- Arabic (`ar`) → `dir="rtl"`
- English (`en`) → `dir="ltr"`

### CSS for RTL

```css
/* Automatic direction-aware margins */
.element {
  margin-inline-start: 16px; /* Works for both LTR and RTL */
}

/* Manual RTL adjustments */
[dir="rtl"] .element {
  text-align: right;
}

[dir="ltr"] .element {
  text-align: left;
}
```

## Migration from Inline Content

### Before (inline content)
```jsx
const content = {
  ar: { title: 'العنوان', description: 'الوصف' },
  en: { title: 'Title', description: 'Description' }
};

<h1>{content[selectedLanguage].title}</h1>
```

### After (i18n)
```jsx
const { t } = useTranslation();

<h1>{t('title')}</h1>
```

Add to translation files:
```json
// ar/common.json
{
  "title": "العنوان",
  "description": "الوصف"
}

// en/common.json
{
  "title": "Title",
  "description": "Description"
}
```

## Best Practices

1. **Always use keys, not hardcoded text**
   ```jsx
   ✅ {t('common:save')}
   ❌ {language === 'ar' ? 'حفظ' : 'Save'}
   ```

2. **Use descriptive keys**
   ```jsx
   ✅ {t('auth:login.emailPlaceholder')}
   ❌ {t('auth:email1')}
   ```

3. **Group related translations with nested objects**
   ```json
   {
     "login": {
       "title": "Login",
       "email": "Email",
       "password": "Password"
     }
   }
   ```

4. **Use appropriate namespaces**
   - Common UI elements → `common`
   - Authentication flows → `auth`
   - Business features → `dashboard`
   - Admin features → `admin`

5. **Keep keys consistent between languages**
   - All keys in `ar/common.json` must exist in `en/common.json`
   - Same structure, different translations

6. **Use interpolation for dynamic content**
   ```jsx
   ✅ {t('showing', { count: items.length })}
   ❌ {`Showing ${items.length} items`}
   ```

## Troubleshooting

### Translation key not found
If you see the key instead of the translation:
1. Check the key exists in the JSON file
2. Verify the namespace is correct
3. Ensure the JSON file is properly imported in `config.js`

### Wrong language displayed
1. Check localStorage key `i18nextLng`
2. Use `i18n.changeLanguage('ar')` to force language
3. Clear browser cache

### RTL not working
1. Check `document.documentElement.dir` attribute
2. Verify CSS supports logical properties (`margin-inline-start`)
3. Test with explicit `[dir="rtl"]` selectors
