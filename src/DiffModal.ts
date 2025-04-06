import { App, Modal, TFile, Notice } from "obsidian";
import * as Diff from "diff";
export class DiffModal extends Modal {
	file1: TFile; // The first file (or the active file)
	file2: TFile; // | null = null; // The file to compare against
	file2Content: string = "";
	file1Content: string = "";
	resultEl: HTMLElement; // Element to display diff results

	constructor(app: App, file1: TFile, file2: TFile) {
		super(app);
		this.file1 = file1;
		this.file2 = file2;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty(); // Clear previous content

		// Adjust title based on whether file2 is already known
		const title = `Comparing: ${this.file1.basename} vs ${this.file2?.basename}`;
		contentEl.createEl("h2", { text: title });

		contentEl.createEl("p", {
			text: `Comparing ${this.file1.path} and ${this.file2?.path}`,
		});
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
			this.file1Content = await this.app.vault.cachedRead(this.file1);
			this.file2Content = await this.app.vault.cachedRead(this.file2);
			return true; // Success
		} catch (err) {
			console.error("Error reading file content:", err);
			const failedFile = err.message?.includes(this.file1.basename)
				? this.file1.basename
				: this.file2?.basename || "unknown file";
			new Notice(`Error reading content for ${failedFile}`);
			this.close();
			return false; // Failure
		}
	}

	// Update the diff display area with the comparison results
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
			if (!this.file1Content || !this.file2Content) {
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
