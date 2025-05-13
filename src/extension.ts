import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {

	const webviewPanelCommand = vscode.commands.registerCommand('aireviewer.helloWorld', async () => {

		let panelTitle: string = "AI Code Reviewer";
		let panelIdentifier: string = "AI_Code_Reviewer";
		let panelViewColumnOptions: vscode.ViewColumn = vscode.ViewColumn.Two;
		let panelOptions: vscode.WebviewPanelOptions & vscode.WebviewOptions = {
			enableScripts: true
		};

		let panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(panelTitle,
			panelIdentifier,
			panelViewColumnOptions,
			panelOptions);

		const filePath: vscode.Uri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'html', 'index.html'));
		panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');

		panel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case "OnFileSelected":

					const files = await vscode.window.showOpenDialog({
						canSelectMany: false,
						openLabel: 'Select a file',
						canSelectFiles: true,
						canSelectFolders: false,
						defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
					});

					if (files && files[0]) {
						const bytes = await vscode.workspace.fs.readFile(files[0]);
						const content = Buffer.from(bytes).toString('utf8');

						vscode.window.showInformationMessage(content);

						panel!.webview.postMessage({
							command: 'DisplayFileContent',
							content
						});
					}
					break;
			}
		});
	});

	context.subscriptions.push(webviewPanelCommand);
}

function getWebviewContent(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>AI Code Reviewer</title>

	<!-- Prism.js for syntax highlighting -->
	<link href="https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism-tomorrow.css" rel="stylesheet" />
	<script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-clike.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-javascript.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js"></script>

	<style>
		body {
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			background-color: #1e1e1e;
			color: #ccc;
			padding: 2rem;
			margin: 0;
		}

		button {
			background-color: #007acc;
			color: white;
			padding: 10px 20px;
			border: none;
			border-radius: 5px;
			font-size: 1rem;
			cursor: pointer;
		}

		button:hover {
			background-color: #005a9e;
		}

		pre {
			margin-top: 1.5rem;
			background-color: #2d2d2d;
			padding: 1rem;
			border-radius: 8px;
			overflow-x: auto;
			max-height: 80vh;
		}

		code {
			font-family: 'Fira Code', monospace;
			font-size: 0.95rem;
		}
	</style>
</head>
<body>
	<button onclick="selectFile()">Choose File for Reviewing</button>
	<pre><code id="selectedFileDisplay" class="language-javascript"></code></pre>

	<script>
		const vscode = acquireVsCodeApi();

		function selectFile() {
			vscode.postMessage({ command: "OnFileSelected" });
		}

		window.addEventListener('message', event => {
			const msg = event.data;
			const fileContentDisplay = document.getElementById('selectedFileDisplay');

			switch (msg.command) {
				case 'DisplayFileContent':
					fileContentDisplay.textContent = msg.content;
					Prism.highlightElement(fileContentDisplay);
					break;
			}
		});
	</script>
</body>
</html>
`;
}
