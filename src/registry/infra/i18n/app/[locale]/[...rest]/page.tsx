import { FileQuestionIcon, HomeIcon } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getScopedI18n } from '@/locales/server';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getScopedI18n('notFound');
	return {
		title: `404 - ${t('title')}`,
	};
}

export default async function NotFoundPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const t = await getScopedI18n('notFound');

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
			<div className="flex flex-col items-center gap-4 text-center">
				<div className="rounded-full bg-muted p-6">
					<FileQuestionIcon className="h-12 w-12 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
					<p className="text-muted-foreground max-w-md">{t('description')}</p>
				</div>
			</div>
			<Link
				href={`/${locale}`}
				className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				<HomeIcon className="h-4 w-4" />
				{t('backHome')}
			</Link>
		</div>
	);
}
