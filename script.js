// script.js

// Global state for the interpreter
let memoryCells = {}; // Stores all cells (cell_name -> value)
let codeLines = []; // Array of all lines in the Flash program
let currentLineIndex = 0; // Tracks which line is currently executing
let isWaitingForInput = false; // Flag to pause execution for user input
let targetCellForInput = null; // Stores which cell the 'get input for' command is targeting

let outputBuffer = ""; // Accumulates output before writing to console element

// Function to add messages to the output buffer
function addToOutput(message) {
    outputBuffer += message + '\n';
}

// Function to update the console display and scroll to bottom
function updateConsoleDisplay() {
    document.getElementById('console-output').textContent = outputBuffer;
    const consoleElement = document.getElementById('console-output');
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

// Clears the console output
function clearConsole() {
    outputBuffer = "";
    updateConsoleDisplay();
}

// Main function to start running Flash code
function runCode() {
    const codeInput = document.getElementById('code-editor').value;
    clearConsole(); // Clear console on a new run

    memoryCells = {}; // Reset memory cells for a new run
    codeLines = codeInput.trim().split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    currentLineIndex = 0;
    isWaitingForInput = false;
    targetCellForInput = null;

    addToOutput("--- Flash Execution Started ---");
    updateConsoleDisplay();

    // Start processing lines. Use a timeout to allow UI to update and prevent blocking
    // This is crucial for interactive input and preventing browser freezes
    setTimeout(processNextLine, 10); 
}

// Processes the next line of Flash code
function processNextLine() {
    if (isWaitingForInput) {
        return; // Don't process if waiting for user input
    }
    if (currentLineIndex >= codeLines.length) {
        addToOutput("--- Flash Execution Finished ---");
        updateConsoleDisplay();
        return; // End of program
    }

    const line = codeLines[currentLineIndex];
    const lineNumber = currentLineIndex + 1; // Line number for error messages
    currentLineIndex++; // Advance to the next line for the next call

    const trimmedLine = line.trim();
    // Commands are now case-insensitive
    const parts = trimmedLine.split(/\s+/); 
    const command = parts[0].toLowerCase(); // Convert command to lowercase for consistent checking

    // Helper to get value (literal or from cell)
    function getValue(part) {
        if (memoryCells.hasOwnProperty(part)) {
            return memoryCells[part];
        }
        const numValue = parseFloat(part);
        return isNaN(numValue) ? part : numValue;
    }

    // --- Command Logic ---

    // store value in cell_name
    if (command === "store") {
        // Expected: store [value] in [cell_name]
        if (parts.length < 4 || parts[2].toLowerCase() !== "in") {
            addToOutput(`Error on line ${lineNumber}: 'store' command syntax error. Expected 'store [value] in [cell_name]'.`);
        } else {
            const valueToStorePart = parts[1];
            const cellName = parts[3];
            const parsedValue = isNaN(parseFloat(valueToStorePart)) ? valueToStorePart : parseFloat(valueToStorePart);
            memoryCells[cellName] = parsedValue;
        }
        setTimeout(processNextLine, 10);
    } 
    // show value_or_cell_name
    else if (command === "show") {
        if (parts.length < 2) {
            addToOutput(`Error on line ${lineNumber}: 'show' command needs a value or cell name.`);
        } else {
            const displayPart = parts.slice(1).join(' '); 
            if (memoryCells.hasOwnProperty(displayPart)) {
                addToOutput(memoryCells[displayPart]);
            } else {
                addToOutput(displayPart);
            }
        }
        setTimeout(processNextLine, 10);
    }
    // get input for cell_name with prompt message_text
    else if (command === "get" && parts[1].toLowerCase() === "input" && parts[2].toLowerCase() === "for" && parts[4].toLowerCase() === "with" && parts[5].toLowerCase() === "prompt") {
        if (parts.length < 7) {
            addToOutput(`Error on line ${lineNumber}: 'get input for' command syntax error. Expected 'get input for [cell_name] with prompt [message_text]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const cellName = parts[3];
        const promptMessage = parts.slice(6).join(' ');
        
        addToOutput(`[Flash asks]: ${promptMessage}`);
        targetCellForInput = cellName;
        isWaitingForInput = true;
        updateConsoleDisplay();
        document.getElementById('user-input-field').focus();
    }
    // calculate operation to result_cell_name from value1/cell1 and value2/cell2
    else if (command === "calculate" && parts[2].toLowerCase() === "to" && parts[4].toLowerCase() === "from" && parts[6].toLowerCase() === "and") {
        if (parts.length !== 8) { 
            addToOutput(`Error on line ${lineNumber}: 'calculate' command syntax error. Expected 'calculate [operation] to [result_cell] from [val1] and [val2]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const operation = parts[1].toLowerCase(); // Operation also lowercase
        const resultCell = parts[3];
        const val1 = getValue(parts[5]);
        const val2 = getValue(parts[7]);

        if (typeof val1 !== 'number' || typeof val2 !== 'number') {
            addToOutput(`Error on line ${lineNumber}: '${operation}' operation needs valid numbers. Got '${val1}' and '${val2}'.`);
            setTimeout(processNextLine, 10);
            return;
        }

        let result;
        switch (operation) {
            case "sum": result = val1 + val2; break;
            case "difference": result = val1 - val2; break;
            case "product": result = val1 * val2; break;
            case "quotient":
                if (val2 === 0) {
                    addToOutput(`Error on line ${lineNumber}: Cannot divide by zero.`);
                    setTimeout(processNextLine, 10);
                    return;
                }
                result = val1 / val2;
                break;
            default:
                addToOutput(`Error on line ${lineNumber}: Unknown operation type '${operation}'.`);
                setTimeout(processNextLine, 10);
                return;
        }
        memoryCells[resultCell] = result;
        setTimeout(processNextLine, 10);
    }
    // if condition_start
    else if (command === "if") {
        if (parts.length < 4) {
            addToOutput(`Error on line ${lineNumber}: 'if' command syntax error.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const val1 = getValue(parts[1]);
        const condition = parts[2].toLowerCase(); // Condition also lowercase
        const val2 = getValue(parts[3]);

        let conditionMet = false;
        if (condition === "isequal") {
            conditionMet = (val1 == val2);
        } else if (condition === "isgreater") {
            if (typeof val1 !== 'number' || typeof val2 !== 'number') {
                 addToOutput(`Error on line ${lineNumber}: 'isgreater' needs numbers for comparison.`);
                 setTimeout(processNextLine, 10); return;
            }
            conditionMet = (val1 > val2);
        } else if (condition === "isless") {
            if (typeof val1 !== 'number' || typeof val2 !== 'number') {
                addToOutput(`Error on line ${lineNumber}: 'isless' needs numbers for comparison.`);
                setTimeout(processNextLine, 10); return;
            }
            conditionMet = (val1 < val2);
        } else {
            addToOutput(`Error on line ${lineNumber}: Unknown condition '${condition}'.`);
            setTimeout(processNextLine, 10);
            return;
        }

        if (!conditionMet) {
            let ifCounter = 1;
            let foundElse = false;
            let skipToEndIf = false;
            for (let i = currentLineIndex; i < codeLines.length; i++) {
                const subCommand = codeLines[i].trim().split(/\s+/)[0].toLowerCase();
                if (subCommand === "if") {
                    ifCounter++;
                } else if (subCommand === "endif") {
                    ifCounter--;
                } else if (subCommand === "else" && ifCounter === 1) {
                    foundElse = true;
                    currentLineIndex = i + 1;
                    break;
                }
                if (ifCounter === 0) {
                    skipToEndIf = true;
                    currentLineIndex = i + 1;
                    break;
                }
            }
            if (!foundElse && !skipToEndIf) {
                addToOutput(`Error on line ${lineNumber}: 'if' block not properly closed with 'endif'.`);
                currentLineIndex = codeLines.length;
            }
        }
        setTimeout(processNextLine, 10);
    }
    // else block
    else if (command === "else") {
        let ifCounter = 1;
        for (let i = currentLineIndex; i < codeLines.length; i++) {
            const subCommand = codeLines[i].trim().split(/\s+/)[0].toLowerCase();
            if (subCommand === "if") {
                ifCounter++;
            } else if (subCommand === "endif") {
                ifCounter--;
            }
            if (ifCounter === 0) {
                currentLineIndex = i + 1;
                break;
            }
        }
        if (ifCounter > 0) {
             addToOutput(`Error on line ${lineNumber}: 'else' block not properly closed with 'endif'.`);
             currentLineIndex = codeLines.length;
        }
        setTimeout(processNextLine, 10);
    }
    // endif block
    else if (command === "endif") {
        setTimeout(processNextLine, 10);
    }
    // goto line_number
    else if (command === "goto") {
        if (parts.length !== 2) {
            addToOutput(`Error on line ${lineNumber}: 'goto' command needs a line number. Expected 'goto [line_number]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const targetLine = parseInt(parts[1]);
        if (isNaN(targetLine) || targetLine < 1 || targetLine > codeLines.length) {
            addToOutput(`Error on line ${lineNumber}: 'goto' target line '${parts[1]}' is invalid or out of bounds.`);
            currentLineIndex = codeLines.length; // Stop execution
            setTimeout(processNextLine, 10);
            return;
        }
        currentLineIndex = targetLine - 1; // Adjust for 0-based array index
        setTimeout(processNextLine, 10);
    }
    else {
        addToOutput(`Error on line ${lineNumber}: Unknown command '${command}'.`);
        setTimeout(processNextLine, 10);
    }
    updateConsoleDisplay();
}

// Function called when the user clicks the "Send Input" button
function sendInput() {
    if (!isWaitingForInput || !targetCellForInput) {
        addToOutput("[System]: Not currently waiting for input.");
        updateConsoleDisplay();
        return;
    }

    const inputField = document.getElementById('user-input-field');
    const userInput = inputField.value;
    inputField.value = ''; // Clear the input field

    addToOutput(`[You typed]: ${userInput}`);
    
    const parsedInput = isNaN(parseFloat(userInput)) ? userInput : parseFloat(userInput);
    memoryCells[targetCellForInput] = parsedInput;

    isWaitingForInput = false;
    targetCellForInput = null;
    updateConsoleDisplay();
    setTimeout(processNextLine, 10);
}
