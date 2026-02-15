import { i18n } from '@lingui/core';

// Vitest imports UI components directly without running app bootstrap.
// Activate a default locale so i18n._(...) calls don't throw in tests.
i18n.load('en', {});
i18n.activate('en');
