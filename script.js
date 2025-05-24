// script.js

let memoryCells = {};
let codeLines = [];
let currentLineIndex = 0;
let isWaitingForInput = false;
let targetCellForInput = null;
let outputBuffer = "";

function addToOutput(message) {
    outputBuffer += message + '\n';
    updateConsoleDisplay();
}

function updateConsoleDisplay() {
    const consoleElement = document.getElementById('console-output');
    consoleElement.textContent = outputBuffer;
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function clearConsole() {
    outputBuffer = "";
    updateConsoleDisplay();
}

function runCode() {
    const codeInput = document.getElementById('code-editor').value;
    clearConsole();

    memoryCells = {};
    codeLines = codeInput.split('\n').filter(line => line.trim() !== '');
    currentLineIndex = 0;
    isWaitingForInput = false;
    targetCellForInput = null;

    addToOutput("--- Flash Execution Started ---");
    setTimeout(processNextLine, 10);
}

function processNextLine() {
    if (isWaitingForInput) {
        return;
    }
    if (currentLineIndex >= codeLines.length) {
        addToOutput("--- Flash Execution Finished ---");
        return;
    }

    const line = codeLines[currentLineIndex];
    const lineNumber = currentLineIndex + 1;
    currentLineIndex++;

    const trimmedLine = line.trim();
    const parts = trimmedLine.split(/\s+/);
    const command = parts[0].toLowerCase();

    function getValue(part) {
        if (memoryCells.hasOwnProperty(part)) {
            return memoryCells[part];
        }
        const numValue = parseFloat(part);
        return isNaN(numValue) ? part : numValue;
    }

    // --- Command Logic ---

    if (command === "store") {
        if (parts.length < 4 || parts[2].toLowerCase() !== "in") {
            addToOutput(`Error on line ${lineNumber}: 'store' syntax error. Expected 'store [value] in [cell_name]'.`);
        } else {
            const valueToStorePart = parts[1];
            const cellName = parts[3];
            memoryCells[cellName] = isNaN(parseFloat(valueToStorePart)) ? valueToStorePart : parseFloat(valueToStorePart);
        }
        setTimeout(processNextLine, 10);
    }
    else if (command === "show") {
        if (parts.length < 2) {
            addToOutput(`Error on line ${lineNumber}: 'show' needs a value or cell name.`);
        } else {
            const displayPart = parts.slice(1).join(' ');
            addToOutput(memoryCells.hasOwnProperty(displayPart) ? memoryCells[displayPart] : displayPart);
        }
        setTimeout(processNextLine, 10);
    }
    else if (command === "get" && parts[1].toLowerCase() === "input" && parts[2].toLowerCase() === "for" && parts[4].toLowerCase() === "with" && parts[5].toLowerCase() === "prompt") {
        if (parts.length < 7) {
            addToOutput(`Error on line ${lineNumber}: 'get input for' syntax error. Expected 'get input for [cell_name] with prompt [message_text]'.`);
            setTimeout(processNextLine, 10); return;
        }
        targetCellForInput = parts[3];
        const promptMessage = parts.slice(6).join(' ');
        addToOutput(`[Flash asks]: ${promptMessage}`);
        isWaitingForInput = true;
        document.getElementById('user-input-field').focus();
    }
    else if (command === "calculate" && parts[2].toLowerCase() === "to" && parts[4].toLowerCase() === "from" && parts[6].toLowerCase() === "and") {
        if (parts.length !== 8) {
            addToOutput(`Error on line ${lineNumber}: 'calculate' syntax error. Expected 'calculate [operation] to [result_cell] from [val1] and [val2]'.`);
            setTimeout(processNextLine, 10); return;
        }
        const operation = parts[1].toLowerCase();
        const resultCell = parts[3];
        const val1 = getValue(parts[5]);
        const val2 = getValue(parts[7]);

        if (typeof val1 !== 'number' || typeof val2 !== 'number') {
            addToOutput(`Error on line ${lineNumber}: '${operation}' needs numbers. Got '${val1}' and '${val2}'.`);
            setTimeout(processNextLine, 10); return;
        }

        let result;
        switch (operation) {
            case "sum": result = val1 + val2; break;
            case "difference": result = val1 - val2; break;
            case "product": result = val1 * val2; break;
            case "quotient":
                if (val2 === 0) {
                    addToOutput(`Error on line ${lineNumber}: Cannot divide by zero.`);
                    setTimeout(processNextLine, 10); return;
                }
                result = val1 / val2; break;
            default:
                addToOutput(`Error on line ${lineNumber}: Unknown operation '${operation}'.`);
                setTimeout(processNextLine, 10); return;
        }
        memoryCells[resultCell] = result;
        setTimeout(processNextLine, 10);
    }
    else if (command === "if") {
        if (parts.length < 4) { addToOutput(`Error on line ${lineNumber}: 'if' syntax error.`); setTimeout(processNextLine, 10); return; }
        const val1 = getValue(parts[1]);
        const condition = parts[2].toLowerCase();
        const val2 = getValue(parts[3]);

        let conditionMet = false;
        if (condition === "isequal") { conditionMet = (val1 == val2); }
        else if (condition === "isgreater") { conditionMet = (typeof val1 === 'number' && typeof val2 === 'number' && val1 > val2); }
        else if (condition === "isless") { conditionMet = (typeof val1 === 'number' && typeof val2 === 'number' && val1 < val2); }
        else { addToOutput(`Error on line ${lineNumber}: Unknown condition '${condition}'.`); setTimeout(processNextLine, 10); return; }

        if (!conditionMet) {
            let ifCounter = 1;
            let foundElse = false;
            for (let i = currentLineIndex; i < codeLines.length; i++) {
                const subCommand = codeLines[i].trim().split(/\s+/)[0].toLowerCase();
                if (subCommand === "if") { ifCounter++; }
                else if (subCommand === "endif") { ifCounter--; }
                else if (subCommand === "else" && ifCounter === 1) { foundElse = true; currentLineIndex = i + 1; break; }
                if (ifCounter === 0) { currentLineIndex = i + 1; break; }
            }
            if (!foundElse && ifCounter > 0) { addToOutput(`Error on line ${lineNumber}: 'if' block not properly closed with 'endif'.`); currentLineIndex = codeLines.length; }
        }
        setTimeout(processNextLine, 10);
    }
    else if (command === "else") {
        let ifCounter = 1;
        for (let i = currentLineIndex; i < codeLines.length; i++) {
            const subCommand = codeLines[i].trim().split(/\s+/)[0].toLowerCase();
            if (subCommand === "if") { ifCounter++; }
            else if (subCommand === "endif") { ifCounter--; }
            if (ifCounter === 0) { currentLineIndex = i + 1; break; }
        }
        if (ifCounter > 0) { addToOutput(`Error on line ${lineNumber}: 'else' block not properly closed with 'endif'.`); currentLineIndex = codeLines.length; }
        setTimeout(processNextLine, 10);
    }
    else if (command === "endif") {
        setTimeout(processNextLine, 10);
    }
    else if (command === "goto") {
        if (parts.length !== 2) { addToOutput(`Error on line ${lineNumber}: 'goto' needs a line number. Expected 'goto [line_number]'.`); setTimeout(processNextLine, 10); return; }
        const targetLine = parseInt(parts[1]);
        if (isNaN(targetLine) || targetLine < 1 || targetLine > codeLines.length) {
            addToOutput(`Error on line ${lineNumber}: 'goto' target '${parts[1]}' is invalid.`);
            currentLineIndex = codeLines.length;
            setTimeout(processNextLine, 10); return;
        }
        currentLineIndex = targetLine - 1;
        setTimeout(processNextLine, 10);
    }
    else {
        addToOutput(`Error on line ${lineNumber}: Unknown command '${command}'.`);
        setTimeout(processNextLine, 10);
    }
}

function sendInput() {
    if (!isWaitingForInput || !targetCellForInput) {
        addToOutput("[System]: Not currently waiting for input.");
        return;
    }

    const inputField = document.getElementById('user-input-field');
    const userInput = inputField.value;
    inputField.value = '';

    addToOutput(`[You typed]: ${userInput}`);
    memoryCells[targetCellForInput] = isNaN(parseFloat(userInput)) ? userInput : parseFloat(userInput);

    isWaitingForInput = false;
    targetCellForInput = null;
    setTimeout(processNextLine, 10);
}

// --- Copy/Paste Functions (Без изменений) ---

async function copyCode() {
    const codeEditor = document.getElementById('code-editor');
    try {
        await navigator.clipboard.writeText(codeEditor.value);
        alert('Flash code copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy code: ', err);
        alert('Failed to copy code. Please copy manually.');
    }
}

async function pasteCode() {
    const codeEditor = document.getElementById('code-editor');
    try {
        const text = await navigator.clipboard.readText();
        codeEditor.value = text;
        alert('Flash code pasted!');
    } catch (err) {
        console.error('Failed to paste code: ', err);
        alert('Failed to paste code. Please paste manually.');
    }
}

async function copyConsole() {
    const consoleOutput = document.getElementById('console-output');
    try {
        await navigator.clipboard.writeText(consoleOutput.textContent);
        alert('Console output copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy console output: ', err);
        alert('Failed to copy console output. Please copy manually.');
    }
}
