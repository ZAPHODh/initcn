'use client';

import { useCurrentLocale, useChangeLocale } from '@/locales/client';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';

// Configure available locales here
const locales = [
	{ code: 'en', name: 'English', flag: '🇺🇸' },
	// Add more locales: { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

export function LanguageSwitcher() {
	const currentLocale = useCurrentLocale();
	const changeLocale = useChangeLocale();
	const pathname = usePathname();

	const handleLocaleChange = (newLocale: string) => {
		// Get the current path without locale
		const pathWithoutLocale = pathname.split('/').slice(2).join('/');
		// Change locale (next-international will handle navigation)
		changeLocale(newLocale);
	};

	const currentLocaleData = locales.find((l) => l.code === currentLocale);

	return (
		<div className="relative inline-block">
			<button
				type="button"
				className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
				onClick={() => {
					const currentIndex = locales.findIndex(
						(l) => l.code === currentLocale,
					);
					const nextIndex = (currentIndex + 1) % locales.length;
					handleLocaleChange(locales[nextIndex].code);
				}}
			>
				<Languages className="h-4 w-4" />
				<span>
					{currentLocaleData?.flag} {currentLocaleData?.name}
				</span>
			</button>
		</div>
	);
}
