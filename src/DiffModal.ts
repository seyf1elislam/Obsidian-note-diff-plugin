import { App, Modal, Setting, TFile, Notice } from "obsidian";
import * as Diff from "diff"; // Import the diff library

export class DiffModal extends Modal {
	file1: TFile; // The first file (or the active file)
	file2: TFile | null = null; // The file to compare against
	file2Content: string = "";
	file1Content: string = "";
	resultEl: HTMLElement; // Element to display diff results
	initialFile2Provided: boolean; // Flag to check if file2 was given at start

	// Constructor now accepts an optional second file
	constructor(app: App, file1: TFile, file2?: TFile) {
		super(app);
		this.file1 = file1;
		this.initialFile2Provided = !!file2; // Check if file2 was passed
		if (file2) {
			this.file2 = file2;
		}
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty(); // Clear previous content

		// Adjust title based on whether file2 is already known
		const title = this.initialFile2Provided
			? `Comparing: ${this.file1.basename} vs ${this.file2?.basename}`
			: `Compare: ${this.file1.basename} with...`;
		contentEl.createEl("h2", { text: title });

		// --- File Selection (Only show if file2 wasn't provided initially) ---
		if (!this.initialFile2Provided) {
			const fileSelector = new Setting(contentEl)
				.setName("Compare with file")
				.setDesc("Select the Markdown file to compare against.")
				.addSearch((search) => {
					// Configure the search component for Markdown files
					const inputEl = search.inputEl;
					inputEl.placeholder = "Search for a Markdown file...";
					const markdownFiles = this.app.vault.getMarkdownFiles();
					let suggestions: TFile[] = [];
					const suggestionContainer = createDiv({
						cls: "suggestion-container",
					});
					inputEl.parentElement?.appendChild(suggestionContainer);
					search.onChange((value) => {
						suggestionContainer.empty();
						if (!value) {
							this.file2 = null;
							this.updateDiffDisplay();
							return;
						}
						const searchTerm = value.toLowerCase();
						suggestions = markdownFiles
							.filter(
								(file) =>
									file.path
										.toLowerCase()
										.includes(searchTerm) &&
									file.path !== this.file1.path
							)
							.slice(0, 10);
						suggestions.forEach((file) => {
							const suggestionEl = suggestionContainer.createDiv({
								cls: "suggestion-item",
							});
							suggestionEl.setText(file.path);
							suggestionEl.onmousedown = (e) => {
								e.preventDefault();
								this.selectFile(
									file,
									inputEl,
									suggestionContainer
								);
							};
						});
					});
					inputEl.onblur = () => {
						setTimeout(() => suggestionContainer.empty(), 150);
					};
				});
		} else {
			// Optionally add text indicating the files being compared if selection is hidden
			contentEl.createEl("p", {
				text: `Comparing ${this.file1.path} and ${this.file2?.path}`,
			});
		}

		// --- Diff Result Display Area ---
		this.resultEl = contentEl.createDiv("diff-results");
		this.resultEl.setText("Loading comparison..."); // Initial text

		// --- Load content ---
		const success = await this.loadFilesContent();
		if (success) {
			this.updateDiffDisplay(); // Show diff immediately if both files loaded
		} else {
			// Error handled within loadFilesContent
			this.resultEl.setText("Error loading file content.");
		}
	}

	// Helper to load content for one or both files
	async loadFilesContent(): Promise<boolean> {
		try {
			// Always load file1
			this.file1Content = await this.app.vault.cachedRead(this.file1);

			// Load file2 if it exists (either passed in or selected)
			if (this.file2) {
				this.file2Content = await this.app.vault.cachedRead(this.file2);
			} else if (this.initialFile2Provided) {
				// This case shouldn't happen if constructor logic is right, but safety check
				console.error("File 2 was expected but is null.");
				new Notice("Internal error: File 2 missing.");
				return false;
			}
			// If file2 wasn't provided initially, file2Content remains empty until selected

			return true; // Success
		} catch (err) {
			console.error("Error reading file content:", err);
			const failedFile = (err as any).message?.includes(
				this.file1.basename
			)
				? this.file1.basename
				: this.file2?.basename || "unknown file";
			new Notice(`Error reading content for ${failedFile}`);
			// Don't close the modal, let user see the error message
			return false; // Failure
		}
	}

	// Helper to handle file selection from suggestions (only used if file2 wasn't initial)
	async selectFile(
		file: TFile,
		inputEl: HTMLInputElement,
		suggestionContainer: HTMLElement
	) {
		this.file2 = file;
		inputEl.value = file.path;
		suggestionContainer.empty();
		new Notice(`Selected: ${file.basename}`);
		// Now load file2 content and update display
		if (await this.loadFilesContent()) {
			// Reload content (specifically file2)
			this.updateDiffDisplay();
		} else {
			this.file2 = null; // Reset selection on error
			this.file2Content = "";
			this.updateDiffDisplay(); // Clear diff display
		}
	}

	// --- Calculate and Display Diff (No changes needed here) ---
	updateDiffDisplay() {
		this.resultEl.empty(); // Clear previous results

		// Check if both files and their content are ready
		if (
			!this.file1 ||
			!this.file2 ||
			!this.file1Content ||
			!this.file2Content
		) {
			// Provide appropriate message based on state
			if (!this.file2) {
				this.resultEl.setText("Select a file to compare against.");
			} else if (!this.file1Content || !this.file2Content) {
				this.resultEl.setText("Waiting for file content...");
			} else {
				this.resultEl.setText("Ready for comparison."); // Should be replaced by diff shortly
			}
			return;
		}

		// Use diff library to compare lines
		const diffResult = Diff.diffLines(
			this.file1Content,
			this.file2Content,
			{
				newlineIsToken: true,
				ignoreWhitespace: false,
			}
		);

		const fragment = document.createDocumentFragment();

		diffResult.forEach((part) => {
			const span = fragment.createSpan({
				cls: part.added
					? "diff-added"
					: part.removed
					? "diff-removed"
					: "diff-unchanged",
			});
			const lines = part.value.split("\n");
			if (lines[lines.length - 1] === "") lines.pop();

			lines.forEach((line, index) => {
				const lineSpan = span.createSpan();
				let prefix = "  ";
				if (part.added) prefix = "+ ";
				if (part.removed) prefix = "- ";
				lineSpan.textContent = prefix + line;
				if (index < lines.length - 1 || part.value.endsWith("\n")) {
					lineSpan.createEl("br");
				}
			});
		});

		this.resultEl.appendChild(fragment);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
