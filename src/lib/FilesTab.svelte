<script>
	import { onMount } from 'svelte';
	import { uploadedFiles, filesActivity, UPLOAD_DIR } from './filesState.js';
	import SmallButton from './SmallButton.svelte';

	export let handleTool;

	let isDragging = false;
	let fileInput;
	let previewContent = null;
	let previewFileName = null;
	let renameFile = null;
	let renameValue = '';
	let ffmpegAvailable = null; // null = checking, true/false = result

	onMount(async () => {
		if (handleTool) {
			const result = await handleTool({ command: 'which ffmpeg' });
			ffmpegAvailable = result && result.includes('/ffmpeg');
		}
	});

	// Sanitize filename for bash safety
	function sanitizeFilename(name) {
		// Remove or replace dangerous characters
		return name.replace(/[`$\\;"'|&<>(){}[\]!#*?~]/g, '_').replace(/\s+/g, '_');
	}

	// Format file size
	function formatSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}

	// Generate unique ID
	function generateId() {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// Handle drag events
	function handleDragEnter(e) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragOver(e) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e) {
		e.preventDefault();
		isDragging = false;
	}

	async function handleDrop(e) {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer.files;
		for (const file of files) {
			await uploadFile(file);
		}
	}

	function handleFileSelect(e) {
		const files = e.target.files;
		for (const file of files) {
			uploadFile(file);
		}
		// Reset input so same file can be selected again
		e.target.value = '';
	}

	function triggerFileInput() {
		fileInput.click();
	}

	async function uploadFile(file) {
		if (!handleTool) {
			alert('System not initialized. Please wait and try again.');
			return;
		}

		const sanitizedName = sanitizeFilename(file.name);
		const filePath = `${UPLOAD_DIR}/${sanitizedName}`;
		const fileId = generateId();

		// Warn for large files
		if (file.size > 5 * 1024 * 1024) {
			if (!confirm(`File "${file.name}" is ${formatSize(file.size)}. Large files may take a while to upload. Continue?`)) {
				return;
			}
		}

		// Add file to list with uploading status
		const fileEntry = {
			id: fileId,
			name: sanitizedName,
			originalName: file.name,
			path: filePath,
			size: file.size,
			status: 'uploading'
		};
		uploadedFiles.update(files => [...files, fileEntry]);
		filesActivity.set(true);

		try {
			// Ensure upload directory exists
			await handleTool({ command: `mkdir -p ${UPLOAD_DIR}` });

			// Read file as ArrayBuffer and convert to base64
			const arrayBuffer = await file.arrayBuffer();
			const bytes = new Uint8Array(arrayBuffer);
			const base64 = btoa(String.fromCharCode.apply(null, bytes));

			// For large files, use chunked approach with heredoc
			if (base64.length > 50000) {
				// Split into chunks and use heredoc
				const chunkSize = 40000;
				const chunks = [];
				for (let i = 0; i < base64.length; i += chunkSize) {
					chunks.push(base64.slice(i, i + chunkSize));
				}

				// First chunk creates file
				await handleTool({ command: `echo '${chunks[0]}' > /tmp/_upload_chunk.txt` });

				// Remaining chunks append
				for (let i = 1; i < chunks.length; i++) {
					await handleTool({ command: `echo '${chunks[i]}' >> /tmp/_upload_chunk.txt` });
				}

				// Decode the combined base64
				await handleTool({ command: `base64 -d /tmp/_upload_chunk.txt > "${filePath}"` });
				await handleTool({ command: `rm /tmp/_upload_chunk.txt` });
			} else {
				// Small file: single command
				await handleTool({ command: `echo '${base64}' | base64 -d > "${filePath}"` });
			}

			// Update status to completed
			uploadedFiles.update(files =>
				files.map(f => f.id === fileId ? { ...f, status: 'completed' } : f)
			);
		} catch (error) {
			console.error('Upload error:', error);
			uploadedFiles.update(files =>
				files.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
			);
		} finally {
			filesActivity.set(false);
		}
	}

	async function previewFile(file) {
		if (!handleTool) return;

		filesActivity.set(true);
		try {
			const result = await handleTool({ command: `head -c 2000 "${file.path}" | cat -v` });
			previewContent = result || '(empty file)';
			previewFileName = file.name;
		} catch (error) {
			previewContent = 'Error reading file';
			previewFileName = file.name;
		} finally {
			filesActivity.set(false);
		}
	}

	function closePreview() {
		previewContent = null;
		previewFileName = null;
	}

	function startRename(file) {
		renameFile = file;
		renameValue = file.name;
	}

	async function confirmRename() {
		if (!handleTool || !renameFile || !renameValue.trim()) return;

		const oldPath = renameFile.path;
		const sanitizedName = sanitizeFilename(renameValue.trim());
		const newPath = `${UPLOAD_DIR}/${sanitizedName}`;

		if (oldPath === newPath) {
			renameFile = null;
			return;
		}

		filesActivity.set(true);
		try {
			await handleTool({ command: `mv "${oldPath}" "${newPath}"` });

			uploadedFiles.update(files =>
				files.map(f => f.id === renameFile.id
					? { ...f, name: sanitizedName, path: newPath }
					: f
				)
			);
		} catch (error) {
			console.error('Rename error:', error);
		} finally {
			filesActivity.set(false);
			renameFile = null;
		}
	}

	function cancelRename() {
		renameFile = null;
		renameValue = '';
	}

	async function deleteFile(file) {
		if (!handleTool) return;
		if (!confirm(`Delete "${file.name}"?`)) return;

		filesActivity.set(true);
		try {
			await handleTool({ command: `rm "${file.path}"` });
			uploadedFiles.update(files => files.filter(f => f.id !== file.id));
		} catch (error) {
			console.error('Delete error:', error);
		} finally {
			filesActivity.set(false);
		}
	}

	async function downloadFile(file) {
		if (!handleTool) return;

		filesActivity.set(true);
		try {
			// Get base64 of file
			const result = await handleTool({ command: `base64 "${file.path}"` });

			if (!result) {
				alert('Error downloading file');
				return;
			}

			// Clean up the result (remove any shell prompt artifacts)
			const base64Data = result.trim().split('\n').filter(line =>
				!line.startsWith('user@') && !line.startsWith('#') && line.trim()
			).join('');

			// Decode base64 and create download
			const binaryString = atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes]);

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = file.originalName || file.name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download error:', error);
			alert('Error downloading file');
		} finally {
			filesActivity.set(false);
		}
	}

</script>

<h1 class="text-lg font-bold">Files</h1>
<p class="text-sm">Upload files to the VM filesystem</p>

<!-- Hidden file input -->
<input
	type="file"
	bind:this={fileInput}
	on:change={handleFileSelect}
	class="hidden"
	multiple
/>

<!-- Drag and drop zone -->
<div
	class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors {isDragging ? 'border-blue-400 bg-neutral-500' : 'border-gray-500 hover:border-gray-400'}"
	on:dragenter={handleDragEnter}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
	on:click={triggerFileInput}
	role="button"
	tabindex="0"
	on:keypress={(e) => e.key === 'Enter' && triggerFileInput()}
>
	<i class="fas fa-cloud-upload-alt text-2xl mb-2"></i>
	<p class="text-sm">Drop files here or click to browse</p>
	<p class="text-xs text-gray-400 mt-1">Files saved to {UPLOAD_DIR}</p>
</div>

<!-- File list -->
{#if $uploadedFiles.length > 0}
	<div class="mt-3">
		<p class="text-sm font-semibold mb-2">Uploaded Files:</p>
		<div class="max-h-40 overflow-y-auto scrollbar space-y-1">
			{#each $uploadedFiles as file (file.id)}
				<div class="flex items-center gap-2 bg-neutral-700 p-2 rounded text-sm">
					{#if renameFile && renameFile.id === file.id}
						<input
							type="text"
							bind:value={renameValue}
							on:keydown={(e) => e.key === 'Enter' && confirmRename()}
							class="flex-1 bg-neutral-600 px-1 rounded text-sm"
						/>
						<SmallButton buttonIcon="fa-solid fa-check" clickHandler={confirmRename} buttonTooltip="Confirm" isFA={true} />
						<SmallButton buttonIcon="fa-solid fa-times" clickHandler={cancelRename} buttonTooltip="Cancel" isFA={true} />
					{:else}
						<span class="flex-1 truncate" title={file.path}>
							{file.name}
							{#if file.status === 'uploading'}
								<i class="fas fa-spinner fa-spin ml-1"></i>
							{:else if file.status === 'error'}
								<i class="fas fa-exclamation-triangle text-red-400 ml-1"></i>
							{/if}
						</span>
						<span class="text-gray-400 text-xs">{formatSize(file.size)}</span>
						<SmallButton buttonIcon="fa-solid fa-eye" clickHandler={() => previewFile(file)} buttonTooltip="Preview" isFA={true} />
						<SmallButton buttonIcon="fa-solid fa-pen" clickHandler={() => startRename(file)} buttonTooltip="Rename" isFA={true} />
						<SmallButton buttonIcon="fa-solid fa-download" clickHandler={() => downloadFile(file)} buttonTooltip="Download" isFA={true} />
						<SmallButton buttonIcon="fa-solid fa-trash" clickHandler={() => deleteFile(file)} buttonTooltip="Delete" isFA={true} bgColor="bg-red-900" hoverColor="hover:bg-red-700" />
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Preview modal -->
{#if previewContent !== null}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={closePreview}>
		<div class="bg-neutral-700 p-4 rounded-lg max-w-lg max-h-96 overflow-auto m-4" on:click|stopPropagation>
			<div class="flex justify-between items-center mb-2">
				<h3 class="font-bold">{previewFileName}</h3>
				<SmallButton buttonIcon="fa-solid fa-times" clickHandler={closePreview} buttonTooltip="Close" isFA={true} />
			</div>
			<pre class="text-xs bg-neutral-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">{previewContent}</pre>
		</div>
	</div>
{/if}

<!-- FFmpeg status section -->
<div class="mt-4 pt-3 border-t border-neutral-500">
	<p class="text-sm text-gray-300 mb-2">Media tools:</p>
	{#if ffmpegAvailable === null}
		<p class="text-sm text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i>Checking FFmpeg...</p>
	{:else if ffmpegAvailable}
		<p class="text-sm text-green-400"><i class="fas fa-check mr-1"></i>FFmpeg available</p>
	{:else}
		<p class="text-sm text-gray-400"><i class="fas fa-times mr-1"></i>FFmpeg not installed</p>
	{/if}
</div>
