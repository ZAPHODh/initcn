"use client";

import { useState, type ComponentProps } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/docs/ui/button";
import { useConfig } from "./config-provider";
import {
	ORM_OPTIONS,
	FRAMEWORK_OPTIONS,
	type ORM,
	type Framework,
} from "./types";
import { Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfigToggle({
	className,
	...props
}: ComponentProps<"button">) {
	const [open, setOpen] = useState(false);
	const { config, setOrm, setFramework } = useConfig();

	const handleFrameworkChange = (framework: Framework) => {
		setFramework(framework);
	};

	const handleOrmChange = (orm: ORM) => {
		setOrm(orm);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className={cn(
						buttonVariants({
							size: "icon-sm",
							color: "ghost",
						}),
						className,
					)}
					aria-label="Configure Project"
					{...props}
				>
					<Settings2 />
				</button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Project Configuration</DialogTitle>
					<DialogDescription>
						Choose your stack to get personalized installation commands.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6 py-4">
					<div className="space-y-3">
						<label className="text-sm font-medium">Framework</label>
						<div className="grid gap-2">
							{FRAMEWORK_OPTIONS.map((option) => (
								<button
									type="button"
									key={option.value}
									onClick={() =>
										option.available && handleFrameworkChange(option.value)
									}
									disabled={!option.available}
									className={cn(
										"flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
										config.framework === option.value && option.available
											? "border-fd-primary bg-fd-primary/5 ring-1 ring-fd-primary"
											: "border-fd-border hover:border-fd-muted-foreground/50",
										!option.available && "opacity-50 cursor-not-allowed",
									)}
								>
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"flex size-5 items-center justify-center rounded-full border-2",
												config.framework === option.value && option.available
													? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
													: "border-fd-muted-foreground/30",
											)}
										>
											{config.framework === option.value &&
												option.available && <Check className="size-3" />}
										</div>
										<div className="font-medium">{option.label}</div>
									</div>
									{!option.available && (
										<Badge variant="secondary" className="text-xs">
											Coming Soon
										</Badge>
									)}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<label className="text-sm font-medium">Database / ORM</label>
						<div className="grid gap-2">
							{ORM_OPTIONS.map((option) => (
								<button
									type="button"
									key={option.value}
									onClick={() => option.available && handleOrmChange(option.value)}
									disabled={!option.available}
									className={cn(
										"flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
										config.orm === option.value && option.available
											? "border-fd-primary bg-fd-primary/5 ring-1 ring-fd-primary"
											: "border-fd-border hover:border-fd-muted-foreground/50",
										!option.available && "opacity-50 cursor-not-allowed",
									)}
								>
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"flex size-5 items-center justify-center rounded-full border-2",
												config.orm === option.value && option.available
													? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
													: "border-fd-muted-foreground/30",
											)}
										>
											{config.orm === option.value && option.available && (
												<Check className="size-3" />
											)}
										</div>
										<div>
											<div className="font-medium">{option.label}</div>
											{option.description && (
												<div className="text-sm text-fd-muted-foreground">
													{option.description}
												</div>
											)}
										</div>
									</div>
									{!option.available && (
										<Badge variant="secondary" className="text-xs">
											Coming Soon
										</Badge>
									)}
								</button>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function ConfigModal() {
	const [open, setOpen] = useState(false);
	const { config, setOrm, setFramework } = useConfig();

	const handleFrameworkChange = (framework: Framework) => {
		setFramework(framework);
	};

	const handleOrmChange = (orm: ORM) => {
		setOrm(orm);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<Settings2 className="size-4" />
					Configure Project
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Project Configuration</DialogTitle>
					<DialogDescription>
						Choose your stack to get personalized installation commands.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6 py-4">
					{/* Framework Selection */}
					<div className="space-y-3">
						<label className="text-sm font-medium">Framework</label>
						<div className="grid gap-2">
							{FRAMEWORK_OPTIONS.map((option) => (
								<button
									type="button"
									key={option.value}
									onClick={() =>
										option.available && handleFrameworkChange(option.value)
									}
									disabled={!option.available}
									className={cn(
										"flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
										config.framework === option.value && option.available
											? "border-fd-primary bg-fd-primary/5 ring-1 ring-fd-primary"
											: "border-fd-border hover:border-fd-muted-foreground/50",
										!option.available && "opacity-50 cursor-not-allowed",
									)}
								>
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"flex size-5 items-center justify-center rounded-full border-2",
												config.framework === option.value && option.available
													? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
													: "border-fd-muted-foreground/30",
											)}
										>
											{config.framework === option.value &&
												option.available && <Check className="size-3" />}
										</div>
										<div className="font-medium">{option.label}</div>
									</div>
									{!option.available && (
										<Badge variant="secondary" className="text-xs">
											Coming Soon
										</Badge>
									)}
								</button>
							))}
						</div>
					</div>

					{/* ORM Selection */}
					<div className="space-y-3">
						<label className="text-sm font-medium">Database / ORM</label>
						<div className="grid gap-2">
							{ORM_OPTIONS.map((option) => (
								<button
									type="button"
									key={option.value}
									onClick={() => option.available && handleOrmChange(option.value)}
									disabled={!option.available}
									className={cn(
										"flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
										config.orm === option.value && option.available
											? "border-fd-primary bg-fd-primary/5 ring-1 ring-fd-primary"
											: "border-fd-border hover:border-fd-muted-foreground/50",
										!option.available && "opacity-50 cursor-not-allowed",
									)}
								>
									<div className="flex items-center gap-3">
										<div
											className={cn(
												"flex size-5 items-center justify-center rounded-full border-2",
												config.orm === option.value && option.available
													? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
													: "border-fd-muted-foreground/30",
											)}
										>
											{config.orm === option.value && option.available && (
												<Check className="size-3" />
											)}
										</div>
										<div>
											<div className="font-medium">{option.label}</div>
											{option.description && (
												<div className="text-sm text-fd-muted-foreground">
													{option.description}
												</div>
											)}
										</div>
									</div>
									{!option.available && (
										<Badge variant="secondary" className="text-xs">
											Coming Soon
										</Badge>
									)}
								</button>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
