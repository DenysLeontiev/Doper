import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as path from 'path'
import * as fs from 'fs'

const openAIClient = new OpenAI({
	apiKey: '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'
});

export async function activate(context: vscode.ExtensionContext) {

	const webviewPanelCommand = vscode.commands.registerCommand('doper.doper', async () => {
		openReviewPanel(context);
	});

	const reviewFileCommand = vscode.commands.registerCommand('doper.doper', async (uri: vscode.Uri) => {
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
		{
			enableScripts: true
		});

	const filePath: vscode.Uri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'html', 'index.html'));
	// panel.webview.html = fs.readFileSync(filePath.fsPath, 'utf8');
	panel.webview.html = getWebviewHtml();

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

	const model: string = "gpt-4.1-nano";
	const instructions: string = "You are a code assistant. Refactor and imrpove code and reply with the full result ONLY as code. No comments or explanations. No markdown formatting";

	const response = await openAIClient.responses.create({
		model: model,
		instructions: instructions,
		input: content,
	});

	return response;
}

function getWebviewHtml() {
	return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Reviewer</title>

    <link href="https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism-tomorrow.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-clike.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js"></script>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1e1e1e;
            color: #ccc;
            padding: 2rem;
            margin: 0;
        }

        .content-wrapper {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .title {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        pre {
            margin-top: 1.5rem;
            background-color: #2d2d2d;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            max-height: 40vh;
        }

        code {
            font-family: 'Fira Code', monospace;
            font-size: 0.95rem;
        }

        .title-text {
            font-size: larger;
            font-weight: bolder;
        }

        .btn {
            background-color: #007acc;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
        }

        .btn:hover {
            background-color: #005a9e;
        }

        #file-selection {
            display: flex;
            flex-direction: column;
        }

        #file-refactor {
            display: flex;
            flex-direction: column;
        }

        #refactor-wrapper {
            display: flex;
            flex-direction: column;
        }

        .code-wrapper {
            position: relative;
        }

        .copy-button {
            position: absolute;
            top: 10px;
            right: 10px;
            border: none;
            color: #fff;
            background-color: rgba(0, 0, 0, 0);
        }
    </style>
</head>

<body>
    <div class="content-wrapper">
        <div class="title">
            <h1 class="title-text">AI Code Reviewer</h1>
        </div>
        <div id="file-selection">
            <button onclick="selectFile()" class="btn">Choose File for Reviewing</button>

            <div class="code-wrapper">
                <pre id="selectedFileDisplayWrapper">
                <code id="selectedFileDisplay" class="language-javascript"></code></pre>
                <button onclick="copySelectedFileContentToClipBoard(selectedFileDisplay)" id="copy-selected-file-button"
                    class="copy-button"><i class="fa-solid fa-copy"></i></button>
            </div>
        </div>
        <div id="refactor-wrapper">
            <button class="btn" id="refactor-button" onclick="refactorCode()">Refactor File</button>

            <div class="code-wrapper">
                <div id="file-refactor">
                    <pre
                        id="refactoredFileDisplayWrapper"><code id="refactoredFileDisplay" class="language-javascript"></code></pre>
                    <button onclick="copySelectedFileContentToClipBoard(refactoredFileDisplay)"
                        id="copy-selected-file-button" class="copy-button"><i class="fa-solid fa-copy"></i></button>
                </div>
            </div>
        </div>
    </div>
</body>

<script>
    const vscode = acquireVsCodeApi();

    const selectedFileDisplayWrapper = document.getElementById('selectedFileDisplayWrapper');
    const selectedFileDisplay = document.getElementById('selectedFileDisplay');
    const refactorButton = document.getElementById('refactor-button');

    const fileRefactor = document.getElementById('file-refactor');
    const refactoredFileDisplayWrapper = document.getElementById('refactoredFileDisplayWrapper');
    const refactoredFileDisplay = document.getElementById('refactoredFileDisplay');

    const copySelectedFileButton = document.getElementById('copy-selected-file-button');

    function selectFile() {
        hideFileRefactorDisplay();
        vscode.postMessage({ command: "OnFileSelected" });
    }

    function refactorCode() {
        vscode.postMessage({ command: 'OnSendToChatGPT', content: selectedFileDisplay.innerText })
    }

    function showSelectedFileDisplay() {
        selectedFileDisplayWrapper.style.display = "block";
        copySelectedFileButton.style.display = "block";
        copySelectedFileButton.style.display = "block";
    }

    function hideSelectedFileDisplay() {
        selectedFileDisplayWrapper.style.display = "none";
        copySelectedFileButton.style.display = "none";
    }

    function showRefactoredFileDisplay() {
        fileRefactor.style.display = "block";
    }

    function hideFileRefactorDisplay() {
        fileRefactor.style.display = "none";
    }

    function showRefactorButton() {
        refactorButton.style.display = "block";
    }

    function hideRefactorButton() {
        refactorButton.style.display = "none";
    }

    function copySelectedFileContentToClipBoard(htmlToCopyFrom) {
        navigator.clipboard.writeText(htmlToCopyFrom.textContent);
    }

    function syncScroll(source, target) {
        const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight);
        const targetScrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
        target.scrollTop = targetScrollTop;
    }

    selectedFileDisplayWrapper.addEventListener('scroll', () => syncScroll(selectedFileDisplayWrapper, refactoredFileDisplayWrapper));
    refactoredFileDisplayWrapper.addEventListener('scroll', () => syncScroll(refactoredFileDisplayWrapper, selectedFileDisplayWrapper));

    hideSelectedFileDisplay();
    hideFileRefactorDisplay();
    hideRefactorButton();

    window.addEventListener('message', event => {
        const msg = event.data;

        switch (msg.command) {
            case 'DisplayFileContent':
                selectedFileDisplay.textContent = msg.content;
                showSelectedFileDisplay();
                showRefactoredFileDisplay();
                showRefactorButton();
                Prism.highlightElement(selectedFileDisplay);
                break;
            case 'ReceivedResponseFromChatGPT':
                refactoredFileDisplay.textContent = msg.content.output_text;
                showRefactoredFileDisplay();

                Prism.highlightElement(refactoredFileDisplay)
                break;
        }
    });
</script>

</html>`;
}
