import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {

	const webviewPanelCommand = vscode.commands.registerCommand('aireviewer.aireviewer', async () => {

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