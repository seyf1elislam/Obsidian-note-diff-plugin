import { MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { DiffModal } from "./DiffModal"; // Adjust path if needed
import {
	NoteDiffSettings,
	DEFAULT_SETTINGS,
	MarkdownDiffSettingsTab,
} from "./settings";

export default class NoteDiffPlugin extends Plugin {
	settings: NoteDiffSettings;
	// Variable to store the first file selected via context menu
	fileToCompare: TFile | null = null;

	async onload() {
		await this.loadSettings();

		console.log("Loading Markdown File Diff plugin...");

		// --- Command Palette Command (Original) ---
		this.addCommand({
			id: "diff-current-file",
			name: "Diff Current File with Another File",
			checkCallback: (checking: boolean) => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView && markdownView.file) {
					if (!checking) {
						// Open the modal, passing only the active file.
						// The modal will prompt for the second file.
						new DiffModal(this.app, markdownView.file).open();
					}
					return true;
				}
				return false;
			},
		});

		// --- File Context Menu Event ---
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
				// Ensure it's a markdown file before adding options
				if (!(file instanceof TFile) || file.extension !== "md") {
					return;
				}

				// Option 1: Select the first file for comparison
				menu.addItem((item) => {
					item.setTitle("Select for compare")
						.setIcon("copy") // Example icon, choose a relevant one
						.onClick(async () => {
							this.fileToCompare = file;
							new Notice(
								`${file.basename} selected for comparison.`
							);
						});
				});

				// Option 2: Compare the current file with the previously selected one
				if (
					this.fileToCompare &&
					this.fileToCompare.path !== file.path
				) {
					// Only show if a file has been selected AND it's not the same file
					menu.addItem((item) => {
						item.setTitle(
							`Compare with: ${this.fileToCompare?.basename}`
						)
							.setIcon("diff") // Example icon
							.onClick(async () => {
								if (this.fileToCompare) {
									// Open the modal, passing both files directly.
									new DiffModal(
										this.app,
										this.fileToCompare,
										file
									).open();
									// Optional: Reset selection after comparison?
									// this.fileToCompare = null;
								} else {
									new Notice(
										"Error: First file for comparison is not selected anymore."
									);
								}
							});
					});
				}
			})
		);

		// Optional Settings Tab
		this.addSettingTab(new MarkdownDiffSettingsTab(this));

		console.log("Markdown File Diff plugin loaded.");
	}

	onunload() {
		this.fileToCompare = null; // Clear selection on unload
		console.log("Markdown File Diff plugin unloaded.");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Example Settings Tab (Optional - Keep commented out if not needed)
/*
class SampleSettingTab extends PluginSettingTab {
	plugin: MarkdownDiffPlugin;
	// ... (constructor and display method as before) ...
}
*/
