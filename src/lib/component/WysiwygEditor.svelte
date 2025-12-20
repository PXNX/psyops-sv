<script lang="ts">
	import { onMount } from "svelte";
	import DOMPurify from "dompurify";
	import IconArrowUndo from "~icons/fluent/arrow-undo-20-regular";
	import IconArrowRedo from "~icons/fluent/arrow-redo-20-regular";
	import IconTextBold from "~icons/fluent/text-bold-20-regular";
	import IconTextItalic from "~icons/fluent/text-italic-20-regular";
	import IconTextUnderline from "~icons/fluent/text-underline-20-regular";
	import IconTextColor from "~icons/fluent/color-20-regular";
	import IconChevronDown from "~icons/fluent/chevron-down-20-regular";
	import IconList from "~icons/fluent/text-bullet-list-20-regular";
	import IconListNumber from "~icons/fluent/text-number-list-ltr-20-regular";
	import IconLink from "~icons/fluent/link-20-regular";
	import IconImage from "~icons/fluent/image-20-regular";
	import IconTable from "~icons/fluent/table-20-regular";
	import IconInfo from "~icons/fluent/info-20-regular";
	import IconAdd from "~icons/fluent/add-20-regular";
	import IconEdit from "~icons/fluent/edit-20-regular";
	import IconAlignLeft from "~icons/fluent/text-align-left-20-regular";
	import IconAlignCenter from "~icons/fluent/text-align-center-20-regular";
	import IconAlignRight from "~icons/fluent/text-align-right-20-regular";
	import IconAlignJustify from "~icons/fluent/text-align-justify-20-regular";
	import IconPoll from "~icons/fluent/poll-20-regular";
	import IconDelete from "~icons/fluent/delete-20-regular";
	import IconOpen from "~icons/fluent/open-20-regular";

	// Types
	type FormatType = "" | "h1" | "h2" | "h3" | "blockquote";

	interface EditorProps {
		initialContent?: string;
		onContentChange?: (content: string) => void;
		placeholder?: string;
		class?: string;
	}

	interface PollOption {
		id: string;
		text: string;
	}

	// Props
	let {
		initialContent = "",
		onContentChange = (content: string) => {},
		placeholder = "Start typing...",
		class: className = ""
	}: EditorProps = $props();

	let editor: HTMLDivElement | null = $state(null);
	let history: string[] = $state([]);
	let historyIndex: number = $state(-1);
	let showLinkDialog: boolean = $state(false);
	let showImageDialog: boolean = $state(false);
	let showPollDialog: boolean = $state(false);
	let showFormatMenu: boolean = $state(false);
	let linkUrl: string = $state("");
	let linkText: string = $state("");
	let imageUrl: string = $state("");
	let imageCaption: string = $state("");
	let imagePreview: string = $state("");
	let currentColor: string = $state("#000000");
	let activeFormat: FormatType = $state("");
	let savedSelection: Range | null = $state(null);
	let editingElement: HTMLAnchorElement | HTMLImageElement | null = $state(null);
	let isEditMode: boolean = $state(false);
	let showDeleteButton: boolean = $state(false);
	let deleteButtonPosition: { top: number; left: number } = $state({ top: 0, left: 0 });
	let elementToDelete: HTMLElement | null = $state(null);
	let pollQuestion: string = $state("");
	let pollOptions: PollOption[] = $state([
		{ id: crypto.randomUUID(), text: "" },
		{ id: crypto.randomUUID(), text: "" }
	]);

	// Sanitize content to prevent XSS
	const sanitizeContent = (html: string): string => {
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				"p",
				"br",
				"strong",
				"em",
				"u",
				"h1",
				"h2",
				"h3",
				"h4",
				"ul",
				"ol",
				"li",
				"blockquote",
				"a",
				"img",
				"table",
				"thead",
				"tbody",
				"tr",
				"th",
				"td",
				"span",
				"div",
				"figure",
				"figcaption",
				"button",
				"input",
				"label"
			],
			ALLOWED_ATTR: [
				"href",
				"src",
				"alt",
				"class",
				"style",
				"rel",
				"target",
				"data-poll-id",
				"data-option-id",
				"data-poll-results",
				"data-table-id",
				"data-table-controls",
				"type",
				"name",
				"value",
				"onclick"
			],
			ALLOWED_STYLES: {
				"*": {
					color: [/^#[0-9a-fA-F]{3,6}$/],
					"background-color": [/^#[0-9a-fA-F]{3,6}$/],
					"text-align": [/^(left|center|right|justify)$/]
				}
			}
		});
	};

	const saveSelection = (): void => {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			savedSelection = selection.getRangeAt(0).cloneRange();
		}
	};

	const restoreSelection = (): void => {
		if (savedSelection) {
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(savedSelection);
			}
		}
	};

	const saveState = (): void => {
		if (!editor) return;
		const content = sanitizeContent(editor.innerHTML);
		history = [...history.slice(0, historyIndex + 1), content];
		historyIndex = history.length - 1;
		onContentChange(content);
	};

	const restoreState = (index: number): void => {
		if (history[index] && editor) {
			editor.innerHTML = history[index];
		}
	};

	const undo = (): void => {
		if (historyIndex > 0) {
			historyIndex--;
			restoreState(historyIndex);
			onContentChange(history[historyIndex]);
		}
	};

	const redo = (): void => {
		if (historyIndex < history.length - 1) {
			historyIndex++;
			restoreState(historyIndex);
			onContentChange(history[historyIndex]);
		}
	};

	const execCommand = (command: string, value: string | null = null): void => {
		document.execCommand(command, false, value);
		editor?.focus();
		saveState();
	};

	const formatText = (command: string): void => {
		execCommand(command);
	};

	const changeColor = (): void => {
		execCommand("foreColor", currentColor);
	};

	const alignText = (alignment: string): void => {
		const alignMap: Record<string, string> = {
			left: "justifyLeft",
			center: "justifyCenter",
			right: "justifyRight",
			justify: "justifyFull"
		};
		execCommand(alignMap[alignment]);
	};

	const formatBlock = (format: string): void => {
		if (activeFormat === format) {
			execCommand("formatBlock", "p");
			activeFormat = "";
			showFormatMenu = false;
			return;
		}

		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const container = range.commonAncestorContainer;
			const blockParent = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);

			let currentBlock: HTMLElement | null = blockParent;
			while (currentBlock && currentBlock !== editor) {
				if (["BLOCKQUOTE", "H1", "H2", "H3"].includes(currentBlock.tagName)) {
					document.execCommand("formatBlock", false, "p");
					break;
				}
				currentBlock = currentBlock.parentElement;
			}
		}

		execCommand("formatBlock", format);
		activeFormat = format as FormatType;
		showFormatMenu = false;
	};

	const insertOrUpdateLink = (): void => {
		const sanitizedUrl = linkUrl.trim();
		if (!sanitizedUrl) return;

		if (!sanitizedUrl.match(/^(https?:\/\/|mailto:|\/)/i)) return;

		if (isEditMode && editingElement && editingElement instanceof HTMLAnchorElement) {
			editingElement.href = sanitizedUrl;
			if (linkText) {
				// Keep the external link icon
				const existingIcon = editingElement.querySelector(".external-link-icon");
				editingElement.textContent = linkText;
				if (existingIcon) {
					editingElement.appendChild(existingIcon);
				}
			}
			saveState();
		} else {
			restoreSelection();

			const selection = window.getSelection();
			if (!selection) return;

			let range: Range;
			if (savedSelection) {
				range = savedSelection;
			} else if (selection.rangeCount > 0) {
				range = selection.getRangeAt(0);
			} else {
				range = document.createRange();
				if (editor) {
					range.selectNodeContents(editor);
					range.collapse(false);
				}
			}

			const container = range.commonAncestorContainer;
			const element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);
			const blockElement = element?.closest("blockquote, h1, h2, h3");

			if (blockElement && blockElement.parentElement) {
				const p = document.createElement("p");
				const link = document.createElement("a");
				link.href = sanitizedUrl;
				link.className = "link link-primary";
				link.rel = "noopener noreferrer";
				link.target = "_blank";

				link.textContent = linkText || sanitizedUrl;

				// Add external link icon
				const icon = document.createElement("span");
				icon.className = "external-link-icon";
				icon.innerHTML = "↗";
				link.appendChild(icon);

				p.appendChild(link);
				p.appendChild(document.createTextNode(" "));

				blockElement.parentElement.insertBefore(p, blockElement.nextSibling);

				const newRange = document.createRange();
				newRange.setStartAfter(link);
				newRange.setEndAfter(link);
				selection.removeAllRanges();
				selection.addRange(newRange);
			} else {
				const link = document.createElement("a");
				link.href = sanitizedUrl;
				link.className = "link link-primary";
				link.rel = "noopener noreferrer";
				link.target = "_blank";

				link.textContent = linkText || sanitizedUrl;

				// Add external link icon
				const icon = document.createElement("span");
				icon.className = "external-link-icon";
				icon.innerHTML = "↗";
				link.appendChild(icon);

				range.deleteContents();
				range.insertNode(link);

				range.setStartAfter(link);
				range.setEndAfter(link);
				selection.removeAllRanges();
				selection.addRange(range);
			}

			saveState();
		}

		linkUrl = "";
		linkText = "";
		showLinkDialog = false;
		savedSelection = null;
		editingElement = null;
		isEditMode = false;
		editor?.focus();
	};

	const insertOrUpdateImage = (): void => {
		const sanitizedUrl = imageUrl.trim();
		if (!sanitizedUrl) return;

		if (!sanitizedUrl.match(/^(https?:\/\/|\/)/i)) return;

		if (isEditMode && editingElement && editingElement instanceof HTMLImageElement) {
			editingElement.src = sanitizedUrl;
			editingElement.alt = imageCaption || "Image";

			const figure = editingElement.closest("figure");
			if (figure) {
				let figcaption = figure.querySelector("figcaption");
				if (imageCaption.trim()) {
					if (!figcaption) {
						figcaption = document.createElement("figcaption");
						figcaption.className = "text-center text-sm mt-2 opacity-70";
						figure.appendChild(figcaption);
					}
					figcaption.textContent = imageCaption;
				} else if (figcaption) {
					figcaption.remove();
				}
			}
			saveState();
		} else {
			restoreSelection();

			const selection = window.getSelection();
			if (!selection) return;

			let range: Range;
			if (savedSelection) {
				range = savedSelection;
			} else if (selection.rangeCount > 0) {
				range = selection.getRangeAt(0);
			} else {
				range = document.createRange();
				if (editor) {
					range.selectNodeContents(editor);
					range.collapse(false);
				}
			}

			const figure = document.createElement("figure");
			figure.className = "my-6";

			const img = document.createElement("img");
			img.src = sanitizedUrl;
			img.alt = imageCaption || "Image";
			img.className = "rounded-lg";

			figure.appendChild(img);

			if (imageCaption.trim()) {
				const figcaption = document.createElement("figcaption");
				figcaption.textContent = imageCaption;
				figcaption.className = "text-center text-sm mt-2 opacity-70";
				figure.appendChild(figcaption);
			}

			const p = document.createElement("p");
			p.innerHTML = "<br>";

			const container = range.commonAncestorContainer;
			const element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);
			const blockElement = element?.closest("blockquote, h1, h2, h3");

			if (blockElement && blockElement.parentElement) {
				blockElement.parentElement.insertBefore(p, blockElement.nextSibling);
				blockElement.parentElement.insertBefore(figure, blockElement.nextSibling);
			} else {
				range.deleteContents();
				range.insertNode(p);
				range.insertNode(figure);
			}

			range.setStart(p, 0);
			range.setEnd(p, 0);
			selection.removeAllRanges();
			selection.addRange(range);

			saveState();
		}

		imageUrl = "";
		imageCaption = "";
		imagePreview = "";
		showImageDialog = false;
		savedSelection = null;
		editingElement = null;
		isEditMode = false;
		editor?.focus();
	};

	const loadImagePreview = async (): Promise<void> => {
		if (imageUrl && imageUrl.match(/^(https?:\/\/|\/)/i)) {
			imagePreview = imageUrl;
		} else {
			imagePreview = "";
		}
	};

	const insertTable = (): void => {
		const tableId = crypto.randomUUID();
		const table = `
      <div class="table-wrapper" data-table-controls="true">
        <table class="table table-zebra" data-table-id="${tableId}">
          <thead>
            <tr>
              <th>Header 1</th>
              <th>Header 2</th>
              <th>Header 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cell 1</td>
              <td>Cell 2</td>
              <td>Cell 3</td>
            </tr>
            <tr>
              <td>Cell 4</td>
              <td>Cell 5</td>
              <td>Cell 6</td>
            </tr>
          </tbody>
        </table>
        <div class="table-controls">
          <button class="btn btn-xs btn-outline" onclick="window.addTableRow('${tableId}')">+ Row</button>
          <button class="btn btn-xs btn-outline" onclick="window.addTableColumn('${tableId}')">+ Column</button>
          <button class="btn btn-xs btn-error btn-outline" onclick="window.removeTableRow('${tableId}')">- Row</button>
          <button class="btn btn-xs btn-error btn-outline" onclick="window.removeTableColumn('${tableId}')">- Column</button>
        </div>
      </div>
      <p><br></p>
    `;
		document.execCommand("insertHTML", false, table);
		saveState();
	};

	const insertPoll = (): void => {
		if (!pollQuestion.trim()) return;

		const validOptions = pollOptions.filter((opt) => opt.text.trim());
		if (validOptions.length < 2) return;

		const pollId = crypto.randomUUID();

		// Escape HTML to prevent XSS
		const escapeHtml = (text: string) => {
			const div = document.createElement("div");
			div.textContent = text;
			return div.innerHTML;
		};

		const pollHTML = `
<div class="poll-container card bg-base-200 p-4 my-6" data-poll-id="${pollId}">
	<h4 class="font-bold text-lg mb-4">${escapeHtml(pollQuestion)}</h4>
	<div class="poll-options space-y-2">
		${validOptions
			.map(
				(opt) => `
		<label class="flex items-center gap-2 cursor-pointer p-2 hover:bg-base-300 rounded poll-option">
			<input type="radio" name="poll-${pollId}" value="${opt.id}" class="radio radio-primary" />
			<span>${escapeHtml(opt.text)}</span>
		</label>
		`
			)
			.join("")}
	</div>
	<button class="btn btn-primary btn-sm mt-4 poll-vote-btn" onclick="window.submitPoll('${pollId}')">Vote</button>
	<div class="poll-results mt-4 hidden" data-poll-results="${pollId}"></div>
</div>
<p><br></p>
		`;

		restoreSelection();
		const selection = window.getSelection();
		if (!selection) return;

		let range: Range;
		if (savedSelection) {
			range = savedSelection;
		} else if (selection.rangeCount > 0) {
			range = selection.getRangeAt(0);
		} else {
			range = document.createRange();
			if (editor) {
				range.selectNodeContents(editor);
				range.collapse(false);
			}
		}

		const container = range.commonAncestorContainer;
		const element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);
		const blockElement = element?.closest("blockquote, h1, h2, h3");

		if (blockElement && blockElement.parentElement) {
			// Insert after block element
			const temp = document.createElement("div");
			temp.innerHTML = pollHTML;
			const pollNode = temp.firstElementChild;
			if (pollNode) {
				blockElement.parentElement.insertBefore(pollNode, blockElement.nextSibling);
			}
		} else {
			// Insert at cursor position
			document.execCommand("insertHTML", false, pollHTML);
		}

		// Reset poll form
		pollQuestion = "";
		pollOptions = [
			{ id: crypto.randomUUID(), text: "" },
			{ id: crypto.randomUUID(), text: "" }
		];
		showPollDialog = false;
		savedSelection = null;
		saveState();
		editor?.focus();
	};

	const openLinkDialog = (): void => {
		saveSelection();
		isEditMode = false;
		editingElement = null;
		linkUrl = "";
		linkText = "";
		showLinkDialog = true;
	};

	const openImageDialog = (): void => {
		saveSelection();
		isEditMode = false;
		editingElement = null;
		imageUrl = "";
		imageCaption = "";
		imagePreview = "";
		showImageDialog = true;
	};

	const openPollDialog = (): void => {
		saveSelection();
		pollQuestion = "";
		pollOptions = [
			{ id: crypto.randomUUID(), text: "" },
			{ id: crypto.randomUUID(), text: "" }
		];
		showPollDialog = true;
	};

	const addPollOption = (): void => {
		pollOptions = [...pollOptions, { id: crypto.randomUUID(), text: "" }];
	};

	const removePollOption = (id: string): void => {
		if (pollOptions.length > 2) {
			pollOptions = pollOptions.filter((opt) => opt.id !== id);
		}
	};

	const handleEditorClick = (e: MouseEvent): void => {
		const target = e.target as HTMLElement;

		// Handle link clicks
		if (target.tagName === "A" || target.closest("a")) {
			e.preventDefault();
			e.stopPropagation();
			const link = (target.tagName === "A" ? target : target.closest("a")) as HTMLAnchorElement;

			elementToDelete = link;

			// Position delete button near the link
			const rect = link.getBoundingClientRect();
			const editorRect = editor?.getBoundingClientRect();
			if (editorRect) {
				deleteButtonPosition = {
					top: rect.top - editorRect.top,
					left: rect.right - editorRect.left + 5
				};
			}

			showDeleteButton = true;

			// Store link info for editing
			editingElement = link;
			return;
		}

		// Handle image clicks - show delete button
		if (target.tagName === "IMG") {
			e.preventDefault();
			e.stopPropagation();
			const img = target as HTMLImageElement;
			const figure = img.closest("figure");

			if (figure) {
				elementToDelete = figure;
			} else {
				elementToDelete = img;
			}

			// Position delete button near the image
			const rect = img.getBoundingClientRect();
			const editorRect = editor?.getBoundingClientRect();
			if (editorRect) {
				deleteButtonPosition = {
					top: rect.top - editorRect.top + 5,
					left: rect.right - editorRect.left - 90
				};
			}

			showDeleteButton = true;
			return;
		}

		// Handle poll clicks - show delete button
		if (target.closest(".poll-container")) {
			e.preventDefault();
			e.stopPropagation();
			const pollContainer = target.closest(".poll-container") as HTMLElement;

			if (pollContainer) {
				elementToDelete = pollContainer;

				// Position delete button at top right of poll
				const rect = pollContainer.getBoundingClientRect();
				const editorRect = editor?.getBoundingClientRect();
				if (editorRect) {
					deleteButtonPosition = {
						top: rect.top - editorRect.top + 10,
						left: rect.right - editorRect.left - 50
					};
				}

				showDeleteButton = true;
				return;
			}
		}

		// Handle table clicks - show delete button
		if (target.closest(".table-wrapper")) {
			const tableWrapper = target.closest(".table-wrapper") as HTMLElement;

			// Don't show delete button if clicking on table controls
			if (target.closest(".table-controls")) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			if (tableWrapper) {
				elementToDelete = tableWrapper;

				// Position delete button at top right of table
				const rect = tableWrapper.getBoundingClientRect();
				const editorRect = editor?.getBoundingClientRect();
				if (editorRect) {
					deleteButtonPosition = {
						top: rect.top - editorRect.top + 10,
						left: rect.right - editorRect.left - 50
					};
				}

				showDeleteButton = true;
				return;
			}
		}

		// Hide delete button when clicking elsewhere
		showDeleteButton = false;
		elementToDelete = null;
	};

	const deleteElement = (): void => {
		if (elementToDelete && editor) {
			elementToDelete.remove();
			showDeleteButton = false;
			elementToDelete = null;
			saveState();
		}
	};

	const editImage = (): void => {
		if (elementToDelete) {
			const img =
				elementToDelete.tagName === "FIGURE"
					? elementToDelete.querySelector("img")
					: (elementToDelete as HTMLImageElement);

			if (img instanceof HTMLImageElement) {
				editingElement = img;
				isEditMode = true;
				imageUrl = img.src;
				imageCaption = img.alt;

				const figure = img.closest("figure");
				if (figure) {
					const figcaption = figure.querySelector("figcaption");
					if (figcaption) {
						imageCaption = figcaption.textContent || "";
					}
				}

				loadImagePreview();
				showImageDialog = true;
				showDeleteButton = false;
			}
		}
	};

	const editLink = (): void => {
		if (elementToDelete instanceof HTMLAnchorElement) {
			editingElement = elementToDelete;
			isEditMode = true;
			linkUrl = elementToDelete.href;
			linkText = elementToDelete.textContent?.replace("↗", "").trim() || "";
			showLinkDialog = true;
			showDeleteButton = false;
		}
	};

	// Table manipulation functions
	const setupTableControls = (): void => {
		(window as any).addTableRow = (tableId: string) => {
			const table = editor?.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement;
			if (!table) return;

			const tbody = table.querySelector("tbody");
			if (!tbody) return;

			const columnCount = table.querySelectorAll("thead th").length;
			const newRow = tbody.insertRow();

			for (let i = 0; i < columnCount; i++) {
				const cell = newRow.insertCell();
				cell.textContent = `Cell ${tbody.rows.length}-${i + 1}`;
			}

			saveState();
		};

		(window as any).addTableColumn = (tableId: string) => {
			const table = editor?.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement;
			if (!table) return;

			const thead = table.querySelector("thead");
			const tbody = table.querySelector("tbody");

			if (thead) {
				const headerRow = thead.querySelector("tr");
				if (headerRow) {
					const th = document.createElement("th");
					th.textContent = `Header ${headerRow.children.length + 1}`;
					headerRow.appendChild(th);
				}
			}

			if (tbody) {
				Array.from(tbody.querySelectorAll("tr")).forEach((row, rowIndex) => {
					const cell = row.insertCell();
					cell.textContent = `Cell ${rowIndex + 1}-${row.cells.length}`;
				});
			}

			saveState();
		};

		(window as any).removeTableRow = (tableId: string) => {
			const table = editor?.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement;
			if (!table) return;

			const tbody = table.querySelector("tbody");
			if (!tbody || tbody.rows.length <= 1) return;

			tbody.deleteRow(tbody.rows.length - 1);
			saveState();
		};

		(window as any).removeTableColumn = (tableId: string) => {
			const table = editor?.querySelector(`[data-table-id="${tableId}"]`) as HTMLTableElement;
			if (!table) return;

			const thead = table.querySelector("thead");
			const tbody = table.querySelector("tbody");

			if (thead) {
				const headerRow = thead.querySelector("tr");
				if (headerRow && headerRow.children.length > 1) {
					headerRow.removeChild(headerRow.lastElementChild!);
				}
			}

			if (tbody) {
				Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
					if (row.cells.length > 1) {
						row.deleteCell(row.cells.length - 1);
					}
				});
			}

			saveState();
		};

		(window as any).submitPoll = (pollId: string) => {
			const pollContainer = editor?.querySelector(`[data-poll-id="${pollId}"]`);
			if (!pollContainer) return;

			const selectedOption = pollContainer.querySelector('input[type="radio"]:checked') as HTMLInputElement;
			if (!selectedOption) return;

			// Simulate results (in real app, this would be stored)
			const options = pollContainer.querySelectorAll('input[type="radio"]');
			const resultsDiv = pollContainer.querySelector(`[data-poll-results="${pollId}"]`);

			if (resultsDiv) {
				resultsDiv.classList.remove("hidden");
				resultsDiv.innerHTML = '<h5 class="font-semibold mb-2">Results:</h5>';

				options.forEach((opt: Element) => {
					const input = opt as HTMLInputElement;
					const label = opt.closest("label");
					const text = label?.querySelector("span")?.textContent || "";
					const isSelected = input.checked;
					const percentage = isSelected ? 100 : 0; // Simplified

					resultsDiv.innerHTML += `
						<div class="mb-2">
							<div class="flex justify-between text-sm mb-1">
								<span>${text}</span>
								<span>${percentage}%</span>
							</div>
							<progress class="progress progress-primary" value="${percentage}" max="100"></progress>
						</div>
					`;
				});
			}

			// Disable voting
			const voteButton = pollContainer.querySelector("button");
			if (voteButton) {
				voteButton.disabled = true;
				voteButton.textContent = "Voted";
			}
		};
	};

	// Public API methods
	export const getContent = (): string => {
		if (!editor) return "";
		return sanitizeContent(editor.innerHTML);
	};

	export const setContent = (content: string): void => {
		if (!editor) return;
		const sanitized = sanitizeContent(content);
		editor.innerHTML = sanitized;
		saveState();
	};

	export const clearContent = (): void => {
		if (!editor) return;
		editor.innerHTML = "";
		saveState();
	};

	onMount(() => {
		setupTableControls();

		if (editor) {
			if (initialContent) {
				editor.innerHTML = sanitizeContent(initialContent);
			}
			saveState();

			editor.addEventListener("input", () => {
				saveState();
			});

			editor.addEventListener("paste", (e: ClipboardEvent) => {
				e.preventDefault();
				const text = e.clipboardData?.getData("text/html") || e.clipboardData?.getData("text/plain") || "";
				const sanitized = sanitizeContent(text);
				document.execCommand("insertHTML", false, sanitized);
			});

			editor.addEventListener("keydown", (e: KeyboardEvent) => {
				if (e.key === "Enter") {
					const selection = window.getSelection();
					if (selection && selection.rangeCount > 0) {
						const range = selection.getRangeAt(0);
						const container = range.commonAncestorContainer;
						const element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);

						if (element?.closest("blockquote")) {
							e.preventDefault();
							document.execCommand("insertHTML", false, "<br><br>");
							setTimeout(() => {
								document.execCommand("formatBlock", false, "p");
								activeFormat = "";
							}, 0);
						}
					}
				}

				// Hide delete button on Escape
				if (e.key === "Escape") {
					showDeleteButton = false;
					elementToDelete = null;
				}
			});

			editor.addEventListener("mouseup", updateActiveFormat);
			editor.addEventListener("keyup", updateActiveFormat);
		}

		// Hide delete button when clicking outside editor
		const handleClickOutside = (e: MouseEvent) => {
			if (editor && !editor.contains(e.target as Node)) {
				showDeleteButton = false;
				elementToDelete = null;
			}
		};

		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});

	const updateActiveFormat = (): void => {
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const container = range.commonAncestorContainer;
			const element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);

			if (element?.closest("h1")) activeFormat = "h1";
			else if (element?.closest("h2")) activeFormat = "h2";
			else if (element?.closest("h3")) activeFormat = "h3";
			else if (element?.closest("blockquote")) activeFormat = "blockquote";
			else activeFormat = "";
		}
	};
</script>

<div class="card bg-base-100 shadow-xl {className}">
	<div class="card-body p-0">
		<!-- Toolbar -->
		<div
			class="bg-base-200 border-b border-base-300 p-2 sm:p-3 flex flex-wrap gap-1 sm:gap-2 items-center sticky top-0 z-10"
		>
			<!-- History -->
			<div class="join">
				<button class="btn btn-sm join-item" onclick={undo} disabled={historyIndex <= 0} aria-label="Undo">
					<IconArrowUndo class="size-4" />
				</button>
				<button
					class="btn btn-sm join-item"
					onclick={redo}
					disabled={historyIndex >= history.length - 1}
					aria-label="Redo"
				>
					<IconArrowRedo class="size-4" />
				</button>
			</div>

			<div class="divider divider-horizontal m-0"></div>

			<!-- Text Formatting -->
			<div class="join">
				<button class="btn btn-sm join-item font-bold" onclick={() => formatText("bold")}>
					<IconTextBold class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => formatText("italic")}>
					<IconTextItalic class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => formatText("underline")}>
					<IconTextUnderline class="size-4" />
				</button>
			</div>

			<!-- Color -->
			<label class="btn btn-sm gap-1">
				<IconTextColor class="size-4" />
				<div class="w-4 h-4 rounded border border-base-300" style="background-color: {currentColor}"></div>
				<input type="color" bind:value={currentColor} onchange={changeColor} class="w-0 h-0 opacity-0 absolute" />
			</label>

			<div class="divider divider-horizontal m-0"></div>

			<!-- Alignment -->
			<div class="join">
				<button class="btn btn-sm join-item" onclick={() => alignText("left")} aria-label="Align Left">
					<IconAlignLeft class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => alignText("center")} aria-label="Align Center">
					<IconAlignCenter class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => alignText("right")} aria-label="Align Right">
					<IconAlignRight class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => alignText("justify")} aria-label="Justify">
					<IconAlignJustify class="size-4" />
				</button>
			</div>

			<div class="divider divider-horizontal m-0"></div>

			<!-- Format Dropdown -->
			<div class="dropdown">
				<button class="btn btn-sm gap-1" onclick={() => (showFormatMenu = !showFormatMenu)}>
					<span class="text-xs">
						{activeFormat === "h1"
							? "H1"
							: activeFormat === "h2"
								? "H2"
								: activeFormat === "h3"
									? "H3"
									: activeFormat === "blockquote"
										? "Quote"
										: "Format"}
					</span>
					<IconChevronDown class="size-3" />
				</button>
				{#if showFormatMenu}
					<ul class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-lg border border-base-300 mt-1">
						<li><button onclick={() => formatBlock("h1")} class="text-xl font-bold">Heading 1</button></li>
						<li><button onclick={() => formatBlock("h2")} class="text-lg font-bold">Heading 2</button></li>
						<li><button onclick={() => formatBlock("h3")} class="text-base font-bold">Heading 3</button></li>
						<li><button onclick={() => formatBlock("p")}>Paragraph</button></li>
						<li class="menu-title"><span>Block Styles</span></li>
						<li>
							<button
								onclick={() => {
									formatBlock("blockquote");
									activeFormat = "blockquote";
								}}>Quote</button
							>
						</li>
					</ul>
				{/if}
			</div>

			<div class="divider divider-horizontal m-0"></div>

			<!-- Lists -->
			<div class="join">
				<button class="btn btn-sm join-item" onclick={() => formatText("insertUnorderedList")}>
					<IconList class="size-4" />
				</button>
				<button class="btn btn-sm join-item" onclick={() => formatText("insertOrderedList")}>
					<IconListNumber class="size-4" />
				</button>
			</div>

			<div class="divider divider-horizontal m-0"></div>

			<!-- Insert -->
			<button class="btn btn-sm btn-primary gap-1" onclick={openLinkDialog}>
				<IconLink class="size-4" />
				<span class="hidden sm:inline text-xs">Link</span>
			</button>
			<button class="btn btn-sm btn-secondary gap-1" onclick={openImageDialog}>
				<IconImage class="size-4" />
				<span class="hidden sm:inline text-xs">Image</span>
			</button>
			<button class="btn btn-sm gap-1" onclick={insertTable}>
				<IconTable class="size-4" />
				<span class="hidden sm:inline text-xs">Table</span>
			</button>
			<button class="btn btn-sm btn-accent gap-1" onclick={openPollDialog}>
				<IconPoll class="size-4" />
				<span class="hidden sm:inline text-xs">Poll</span>
			</button>
		</div>

		<!-- Editor with Tailwind Typography -->
		<div
			bind:this={editor}
			contenteditable="true"
			onclick={handleEditorClick}
			class="min-h-[300px] sm:min-h-[500px] p-4 sm:p-6 prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none"
			data-placeholder={placeholder}
		></div>

		<!-- Floating Delete/Edit Button -->
		{#if showDeleteButton && elementToDelete}
			<div
				class="absolute z-20 flex gap-1"
				style="top: {deleteButtonPosition.top}px; left: {deleteButtonPosition.left}px;"
			>
				{#if elementToDelete.tagName === "FIGURE" || elementToDelete.tagName === "IMG"}
					<button class="btn btn-sm btn-square btn-info" onclick={editImage} aria-label="Edit">
						<IconEdit class="size-4" />
					</button>
				{/if}
				<button class="btn btn-sm btn-square btn-error" onclick={deleteElement} aria-label="Delete">
					<IconDelete class="size-4" />
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Link Dialog -->
{#if showLinkDialog}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4 flex items-center gap-2">
				{#if isEditMode}
					<IconEdit class="size-5 text-primary" />
					Edit Link
				{:else}
					<IconLink class="size-5 text-primary" />
					Insert Link
				{/if}
			</h3>
			<div class="space-y-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text">URL</span>
					</label>
					<input
						type="url"
						bind:value={linkUrl}
						placeholder="https://example.com"
						class="input input-bordered w-full"
					/>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text">Display Text <span class="badge badge-sm">optional</span></span>
					</label>
					<input type="text" bind:value={linkText} placeholder="Click here" class="input input-bordered w-full" />
				</div>
				<div class="alert alert-info">
					<IconInfo class="size-5" />
					<span class="text-sm">Links will open in a new tab with an external link icon</span>
				</div>
			</div>
			<div class="modal-action">
				<button
					class="btn"
					onclick={() => {
						showLinkDialog = false;
						savedSelection = null;
						editingElement = null;
						isEditMode = false;
					}}>Cancel</button
				>
				<button class="btn btn-primary gap-2" onclick={insertOrUpdateLink}>
					{#if isEditMode}
						<IconEdit class="size-4" />
						Update
					{:else}
						<IconAdd class="size-4" />
						Insert
					{/if}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button
				onclick={() => {
					showLinkDialog = false;
					savedSelection = null;
					editingElement = null;
					isEditMode = false;
				}}>close</button
			>
		</form>
	</dialog>
{/if}

<!-- Image Dialog -->
{#if showImageDialog}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4 flex items-center gap-2">
				{#if isEditMode}
					<IconEdit class="size-5 text-secondary" />
					Edit Image
				{:else}
					<IconImage class="size-5 text-secondary" />
					Insert Image
				{/if}
			</h3>
			<div class="space-y-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text">Image URL</span>
					</label>
					<input
						type="url"
						bind:value={imageUrl}
						oninput={loadImagePreview}
						placeholder="https://example.com/image.jpg"
						class="input input-bordered w-full"
					/>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text">Caption <span class="badge badge-sm">optional</span></span>
					</label>
					<input
						type="text"
						bind:value={imageCaption}
						placeholder="Image description"
						class="input input-bordered w-full"
					/>
				</div>
				{#if imagePreview}
					<div class="card bg-base-200">
						<div class="card-body p-4">
							<p class="text-sm font-semibold mb-2">Preview:</p>
							<figure class="m-0">
								<img
									src={imagePreview}
									alt="Preview"
									class="rounded-lg max-h-48 object-contain mx-auto"
									onerror={() => (imagePreview = "")}
								/>
								{#if imageCaption}
									<figcaption class="text-center text-sm mt-2 opacity-70">{imageCaption}</figcaption>
								{/if}
							</figure>
						</div>
					</div>
				{/if}
				<div class="alert alert-info">
					<IconInfo class="size-5" />
					<span class="text-sm">URLs must start with http://, https://, or /</span>
				</div>
			</div>
			<div class="modal-action">
				<button
					class="btn"
					onclick={() => {
						showImageDialog = false;
						imagePreview = "";
						imageCaption = "";
						savedSelection = null;
						editingElement = null;
						isEditMode = false;
					}}>Cancel</button
				>
				<button class="btn btn-secondary gap-2" onclick={insertOrUpdateImage}>
					{#if isEditMode}
						<IconEdit class="size-4" />
						Update
					{:else}
						<IconAdd class="size-4" />
						Insert
					{/if}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button
				onclick={() => {
					showImageDialog = false;
					imagePreview = "";
					imageCaption = "";
					savedSelection = null;
					editingElement = null;
					isEditMode = false;
				}}>close</button
			>
		</form>
	</dialog>
{/if}

<!-- Poll Dialog -->
{#if showPollDialog}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4 flex items-center gap-2">
				<IconPoll class="size-5 text-accent" />
				Create Poll
			</h3>
			<div class="space-y-4">
				<div class="form-control">
					<label class="label">
						<span class="label-text">Question</span>
					</label>
					<input
						type="text"
						bind:value={pollQuestion}
						placeholder="What's your favorite color?"
						class="input input-bordered w-full"
					/>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text">Options (minimum 2)</span>
					</label>
					<div class="space-y-2">
						{#each pollOptions as option, index}
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={option.text}
									placeholder="Option {index + 1}"
									class="input input-bordered w-full"
								/>
								{#if pollOptions.length > 2}
									<button
										class="btn btn-square btn-error btn-outline"
										onclick={() => removePollOption(option.id)}
										aria-label="Remove option"
									>
										<IconDelete class="size-4" />
									</button>
								{/if}
							</div>
						{/each}
					</div>
					<button class="btn btn-sm btn-outline mt-2" onclick={addPollOption}>
						<IconAdd class="size-4" />
						Add Option
					</button>
				</div>
			</div>
			<div class="modal-action">
				<button
					class="btn"
					onclick={() => {
						showPollDialog = false;
						savedSelection = null;
					}}>Cancel</button
				>
				<button class="btn btn-accent gap-2" onclick={insertPoll}>
					<IconAdd class="size-4" />
					Insert Poll
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button
				onclick={() => {
					showPollDialog = false;
					savedSelection = null;
				}}>close</button
			>
		</form>
	</dialog>
{/if}

<style>
	[contenteditable]:empty:before {
		content: attr(data-placeholder);
		color: oklch(var(--bc) / 0.4);
		pointer-events: none;
	}

	:global(figure) {
		display: block;
		margin: 1.5rem 0;
	}

	:global(figure img) {
		display: block;
		margin: 0 auto;
	}

	:global(figure figcaption) {
		display: block;
		margin-top: 0.5rem;
	}

	:global(.external-link-icon) {
		display: inline-block;
		margin-left: 0.25rem;
		font-size: 0.75em;
		vertical-align: super;
		opacity: 0.7;
	}

	:global(.table-wrapper) {
		margin: 1.5rem 0;
	}

	:global(.table-controls) {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: oklch(var(--b2));
		border-radius: 0.5rem;
	}

	:global(.poll-options) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	:global(.poll-option) {
		display: flex !important;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		cursor: pointer;
	}

	:global(.poll-option:hover) {
		background: oklch(var(--b3));
		border-radius: 0.5rem;
	}

	:global(.poll-container) {
		user-select: none;
		display: block !important;
		position: relative;
		cursor: pointer;
	}

	:global(.poll-container:hover) {
		outline: 2px solid oklch(var(--p) / 0.3);
		outline-offset: 2px;
	}

	:global(.table-wrapper) {
		position: relative;
		cursor: pointer;
	}

	:global(.table-wrapper:hover) {
		outline: 2px solid oklch(var(--p) / 0.3);
		outline-offset: 2px;
	}

	:global(figure) {
		position: relative;
		cursor: pointer;
	}

	:global(figure:hover) {
		outline: 2px solid oklch(var(--p) / 0.3);
		outline-offset: 2px;
	}

	:global(.poll-container input[type="radio"]) {
		cursor: pointer;
	}

	:global(.poll-results) {
		padding-top: 1rem;
		border-top: 1px solid oklch(var(--bc) / 0.2);
	}
</style>
