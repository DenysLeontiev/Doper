import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as path from 'path'
import * as fs from 'fs'

const openAIClient: OpenAI = new OpenAI({
    apiKey: ""
});

const openAIApiKey: string = "openAIKey";

let chatGptModel: string = "gpt-4.1-nano";
let panel: vscode.WebviewPanel;

export async function activate(context: vscode.ExtensionContext) {

    setApiKey(context);

    const webviewPanelCommand = vscode.commands.registerCommand('doper.doper', async () => {
        openReviewPanel(context);
    });

    const reviewFileCommand = vscode.commands.registerCommand('doper.reviewSelectedFile', async (uri: vscode.Uri) => {
        openReviewPanel(context, uri);
    });

    let disposableTextSelection = vscode.commands.registerCommand("doper.getSelectedText", () => {
        handleTextSelection();
    });

    context.subscriptions.push(webviewPanelCommand);
    context.subscriptions.push(reviewFileCommand);
    context.subscriptions.push(disposableTextSelection);
}

async function openReviewPanel(context: vscode.ExtensionContext, fileToLoad?: vscode.Uri) {
    let panelTitle: string = "AI Code Reviewer";
    let panelIdentifier: string = "AI_Code_Reviewer";
    let panelViewColumnOptions: vscode.ViewColumn = vscode.ViewColumn.Two;
    let panelOptions: vscode.WebviewPanelOptions & vscode.WebviewOptions = {
        enableScripts: true
    };

    panel = vscode.window.createWebviewPanel(panelTitle,
        panelIdentifier,
        panelViewColumnOptions,
        panelOptions);

    const filePath: vscode.Uri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'html', 'index.html'));
    panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');
    // panel.webview.html = getWebviewHtml();

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
                let chatReponse = await queryChat(message.content.fileContent, message.content.userPrompt);
                panel.webview.postMessage({
                    command: 'ReceivedResponseFromChatGPT',
                    content: chatReponse
                });
                vscode.window.showInformationMessage("Ended Refactoring");
                break;
            case "OnModelSelected":
                let newChatGptModel = message.content.value;
                setChatGptModel(newChatGptModel);
                vscode.window.showInformationMessage("New Model Selected: " + newChatGptModel);
                break;
            case "OnApiKeySaved":
                let apiKeyValue = message.content;
                await context.secrets.store(openAIApiKey, apiKeyValue);

                setApiKey(context);
                break;
            case "OnApiKeyDeleted":
                deleteApiKey(context);
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

function handleTextSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document || !editor.selection || !panel || !panel.webview) {
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    panel.webview.postMessage({
        command: 'OnTextSelected',
        content: selectedText
    });
}

async function queryChat(content: string, userPrompt?: string): Promise<OpenAI.Responses.Response> {

    vscode.window.showInformationMessage("userPrompt: " + userPrompt);

    const instructions: string = `You are a code assistant. Refactor and imrpove code and reply with the full result ONLY as JSON is that format {hint:'Hints from response code, some recommendation', code: 'The actual code'}.If a user prompt is provided and it is relevant to the code, take it into account. If it is not related, ignore it.User Prompt: ${userPrompt}. No comments or explanations. No markdown formatting.`;

    const response = await openAIClient.responses.create({
        model: chatGptModel,
        instructions: instructions,
        input: content,
    });

    return response;
}

async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
    let apiKey = await context.secrets.get(openAIApiKey);

    if (apiKey) {
        openAIClient.apiKey = apiKey;
        vscode.window.showInformationMessage("OpenAI Api Key is set");
    }
    else {
        vscode.window.showInformationMessage("No OpenAI Api Key available");
    }
}

async function deleteApiKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(openAIApiKey);
    openAIClient.apiKey = "";
    vscode.window.showInformationMessage("OpenAI Api Key is deleted");
}

function setChatGptModel(model: string): void {
    chatGptModel = model;
}


