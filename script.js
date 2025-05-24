// script.js

// Global state for the interpreter
let memoryCells = {}; // Stores all cells (cell_name -> value)
let codeLines = []; // Array of all lines in the Flash program
let currentLineIndex = 0; // Tracks which line is currently executing
let isWaitingForInput = false; // Flag to pause execution for user input
let targetCellForInput = null; // Stores which cell the 'Get Input For' command is targeting

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
    codeLines = codeInput.trim().split('\n');
    currentLineIndex = 0;
    isWaitingForInput = false;
    targetCellForInput = null;

    addToOutput("--- Flash Execution Started ---");
    updateConsoleDisplay();

    // Start processing lines. Use a timeout to allow UI to update and prevent blocking
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

    if (!trimmedLine) {
        setTimeout(processNextLine, 10); // Skip empty lines
        return;
    }

    const parts = trimmedLine.split(/\s+/); 
    const command = parts[0];

    // Helper to get value (literal or from cell)
    function getValue(part) {
        if (memoryCells.hasOwnProperty(part)) {
            return memoryCells[part];
        }
        const numValue = parseFloat(part);
        return isNaN(numValue) ? part : numValue;
    }

    // --- Command Logic ---

    // Store value In cell_name
    if (command === "Store") {
        if (parts.length < 4 || parts[2] !== "In") {
            addToOutput(`Error on line ${lineNumber}: 'Store' command syntax error. Expected 'Store [value] In [cell_name]'.`);
        } else {
            const valueToStorePart = parts[1];
            const cellName = parts[3];
            const parsedValue = isNaN(parseFloat(valueToStorePart)) ? valueToStorePart : parseFloat(valueToStorePart);
            memoryCells[cellName] = parsedValue;
        }
        setTimeout(processNextLine, 10);
    } 
    // Show value_or_cell_name
    else if (command === "Show") {
        if (parts.length < 2) {
            addToOutput(`Error on line ${lineNumber}: 'Show' command needs a value or cell name.`);
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
    // Get Input For cell_name With Prompt message_text
    else if (command === "Get" && parts[1] === "Input" && parts[2] === "For" && parts[4] === "With" && parts[5] === "Prompt") {
        if (parts.length < 7) {
            addToOutput(`Error on line ${lineNumber}: 'Get Input For' command syntax error. Expected 'Get Input For [cell_name] With Prompt [message_text]'.`);
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
    // Calculate operation To result_cell_name From value1/cell1 And value2/cell2
    else if (command === "Calculate" && parts[2] === "To" && parts[4] === "From" && parts[6] === "And") {
        if (parts.length !== 8) { 
            addToOutput(`Error on line ${lineNumber}: 'Calculate' command syntax error. Expected 'Calculate [operation] To [result_cell] From [val1] And [val2]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const operation = parts[1];
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
            case "Sum": result = val1 + val2; break;
            case "Difference": result = val1 - val2; break;
            case "Product": result = val1 * val2; break;
            case "Quotient":
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
    // If condition_start
    else if (command === "If") {
        if (parts.length < 4) {
            addToOutput(`Error on line ${lineNumber}: 'If' command syntax error.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const val1 = getValue(parts[1]);
        const condition = parts[2];
        const val2 = getValue(parts[3]);

        let conditionMet = false;
        if (condition === "IsEqual") {
            conditionMet = (val1 == val2);
        } else if (condition === "IsGreater") {
            if (typeof val1 !== 'number' || typeof val2 !== 'number') {
                 addToOutput(`Error on line ${lineNumber}: 'IsGreater' needs numbers for comparison.`);
                 setTimeout(processNextLine, 10); return;
            }
            conditionMet = (val1 > val2);
        } else if (condition === "IsLess") {
            if (typeof val1 !== 'number' || typeof val2 !== 'number') {
                addToOutput(`Error on line ${lineNumber}: 'IsLess' needs numbers for comparison.`);
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
                const subCommand = codeLines[i].trim().split(/\s+/)[0];
                if (subCommand === "If") {
                    ifCounter++;
                } else if (subCommand === "EndIf") {
                    ifCounter--;
                } else if (subCommand === "Else" && ifCounter === 1) {
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
                addToOutput(`Error on line ${lineNumber}: 'If' block not properly closed with 'EndIf'.`);
                currentLineIndex = codeLines.length;
            }
        }
        setTimeout(processNextLine, 10);
    }
    // Else block
    else if (command === "Else") {
        let ifCounter = 1;
        for (let i = currentLineIndex; i < codeLines.length; i++) {
            const subCommand = codeLines[i].trim().split(/\s+/)[0];
            if (subCommand === "If") {
                ifCounter++;
            } else if (subCommand === "EndIf") {
                ifCounter--;
            }
            if (ifCounter === 0) {
                currentLineIndex = i + 1;
                break;
            }
        }
        if (ifCounter > 0) {
             addToOutput(`Error on line ${lineNumber}: 'Else' block not properly closed with 'EndIf'.`);
             currentLineIndex = codeLines.length;
        }
        setTimeout(processNextLine, 10);
    }
    // EndIf block
    else if (command === "EndIf") {
        setTimeout(processNextLine, 10);
    }
    // GoTo line_number
    else if (command === "GoTo") {
        if (parts.length !== 2) {
            addToOutput(`Error on line ${lineNumber}: 'GoTo' command needs a line number. Expected 'GoTo [line_number]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const targetLine = parseInt(parts[1]);
        if (isNaN(targetLine) || targetLine < 1 || targetLine > codeLines.length) {
            addToOutput(`Error on line ${lineNumber}: 'GoTo' target line '${parts[1]}' is invalid.`);
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
