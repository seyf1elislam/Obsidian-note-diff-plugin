import { PluginSettingTab, Setting } from "obsidian";
import NoteDiffPlugin from "./main";

export interface NoteDiffSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: NoteDiffSettings = {
	mySetting: "default",
};

// Inspired by https://stackoverflow.com/a/50851710/13613783
export type KeysOfType<Obj, Type> = NonNullable<
	{ [k in keyof Obj]: Obj[k] extends Type ? k : never }[keyof Obj]
>;

export class MarkdownDiffSettingsTab extends PluginSettingTab {
	constructor(public plugin: NoteDiffPlugin) {
		super(plugin.app, plugin);
	}

	addHeading(heading: string) {
		return new Setting(this.containerEl).setName(heading).setHeading();
	}

	addTextSetting(settingName: KeysOfType<NoteDiffSettings, string>) {
		return new Setting(this.containerEl).addText((text) => {
			text.setValue(this.plugin.settings[settingName])
				.setPlaceholder(DEFAULT_SETTINGS[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	addNumberSetting(settingName: KeysOfType<NoteDiffSettings, number>) {
		return new Setting(this.containerEl).addText((text) => {
			text.setValue("" + this.plugin.settings[settingName])
				.setPlaceholder("" + DEFAULT_SETTINGS[settingName])
				.then((text) => (text.inputEl.type = "number"))
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] =
						value === "" ? DEFAULT_SETTINGS[settingName] : +value;
					await this.plugin.saveSettings();
				});
		});
	}

	addToggleSetting(
		settingName: KeysOfType<NoteDiffSettings, boolean>,
		extraOnChange?: (value: boolean) => void
	) {
		return new Setting(this.containerEl).addToggle((toggle) => {
			toggle
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
					extraOnChange?.(value);
				});
		});
	}

	addDropdowenSetting(
		settingName: KeysOfType<NoteDiffSettings, string>,
		options: readonly string[],
		display?: (option: string) => string,
		extraOnChange?: (value: string) => void
	) {
		return new Setting(this.containerEl).addDropdown((dropdown) => {
			const displayNames = new Set<string>();
			for (const option of options) {
				const displayName = display?.(option) ?? option;
				if (!displayNames.has(displayName)) {
					dropdown.addOption(option, displayName);
					displayNames.add(displayName);
				}
			}
			dropdown
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
					extraOnChange?.(value);
				});
		});
	}

	addSliderSetting(
		settingName: KeysOfType<NoteDiffSettings, number>,
		min: number,
		max: number,
		step: number
	) {
		return new Setting(this.containerEl).addSlider((slider) => {
			slider
				.setLimits(min, max, step)
				.setValue(this.plugin.settings[settingName])
				.setDynamicTooltip()
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	display(): void {
		this.containerEl.empty();
		// this.addTextSetting("mySetting").setName("My Setting");
	}
}
