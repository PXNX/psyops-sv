/**
 * Composable for managing image upload state and handlers
 */
export function useImageUpload(initialPreviewUrl: string | null = null) {
    let previewUrl = $state<string | null>(initialPreviewUrl);
    let dragActive = $state(false);
    let fileInput = $state<HTMLInputElement>();
    let currentFile = $state<File | undefined>();

    function updatePreview(file: File, originalUrl: string | null) {
        // Clean up old preview URL if it's a blob URL
        if (previewUrl && previewUrl !== originalUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
        previewUrl = URL.createObjectURL(file);
        currentFile = file;
    }

    function handleFileSelect(event: Event, originalUrl: string | null) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            updatePreview(file, originalUrl);
        }
    }

    function handleDrop(event: DragEvent, originalUrl: string | null) {
        event.preventDefault();
        dragActive = false;
        const file = event.dataTransfer?.files[0];
        if (file) {
            updatePreview(file, originalUrl);
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        dragActive = true;
    }

    function handleDragLeave() {
        dragActive = false;
    }

    function clearImage(originalUrl: string | null) {
        currentFile = undefined;

        // Clean up blob URL
        if (previewUrl && previewUrl !== originalUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }

        previewUrl = originalUrl;

        if (fileInput) {
            fileInput.value = "";
        }
    }

    function cleanup(originalUrl: string | null) {
        if (previewUrl && previewUrl !== originalUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
        }
    }

    return {
        get previewUrl() {
            return previewUrl;
        },
        set previewUrl(value: string | null) {
            previewUrl = value;
        },
        get dragActive() {
            return dragActive;
        },
        get fileInput() {
            return fileInput;
        },
        set fileInput(value: HTMLInputElement | undefined) {
            fileInput = value;
        },
        get currentFile() {
            return currentFile;
        },
        set currentFile(value: File | undefined) {
            currentFile = value;
        },
        handleFileSelect,
        handleDrop,
        handleDragOver,
        handleDragLeave,
        clearImage,
        cleanup
    };
}
