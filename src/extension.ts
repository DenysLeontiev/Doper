import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as path from 'path'
import * as fs from 'fs'

const openAIClient = new OpenAI({
	apiKey: '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'
});

export async function activate(context: vscode.ExtensionContext) {

	const webviewPanelCommand = vscode.commands.registerCommand('aireviewer.aireviewer', async () => {
		openReviewPanel(context);
	});

	const reviewFileCommand = vscode.commands.registerCommand('aireviewer.reviewSelectedFile', async (uri: vscode.Uri) => {
		openReviewPanel(context, uri);
	});

	context.subscriptions.push(webviewPanelCommand);
	context.subscriptions.push(reviewFileCommand);
}

async function openReviewPanel(context: vscode.ExtensionContext, fileToLoad?: vscode.Uri) {
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
					defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri
				});

				if (files && files[0]) {
					const bytes = await vscode.workspace.fs.readFile(files[0]);
					const content = Buffer.from(bytes).toString('utf8');

					panel.webview.postMessage({
						command: 'DisplayFileContent',
						content
					});
				}
				break;
			case "OnSendToChatGPT":
				console.log("Started Refactoring");
				let chatReponse = await queryChat(message.content);
				panel.webview.postMessage({
					command: 'ReceivedResponseFromChatGPT',
					content: chatReponse
				});
				vscode.window.showInformationMessage("Ended Refactoring");
				break;
		}
	});

	if (fileToLoad) {
		const bytes = await vscode.workspace.fs.readFile(fileToLoad);
		const content = Buffer.from(bytes).toString('utf8');

		panel.webview.postMessage({
			command: 'DisplayFileContent',
			content
		});
	}
}

async function queryChat(content: string): Promise<OpenAI.Responses.Response> {

	const model: string = "gpt-4o";
	const instructions: string = "You are a code assistant. Refactor and imrpove code and reply with the full result ONLY as code. No comments or explanations. No markdown formatting";

	const response = await openAIClient.responses.create({
		model: model,
		instructions: instructions,
		input: content,
	});

	return response;
}
