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

    // Split by one or more spaces, and handle quoted strings if needed for messages
    // For now, simpler split for distinct words for commands
    const parts = trimmedLine.split(/\s+/); 
    const command = parts[0];

    // Helper to get value (literal or from cell)
    function getValue(part) {
        if (memoryCells.hasOwnProperty(part)) {
            return memoryCells[part];
        }
        // Try parsing as number, otherwise return as string
        const numValue = parseFloat(part);
        return isNaN(numValue) ? part : numValue;
    }

    // --- Command Logic ---

    // Store value In cell_name
    if (command === "Store") {
        if (parts.length < 4 || parts[2] !== "In") {
            addToOutput(`Error on line ${lineNumber}: 'Store' command syntax error. Expected 'Store [value] In [cell_name]'.`);
        } else {
            const cellName = parts[3];
            const valueToStore = parts.slice(1, 2).join(' '); // Only the first word after 'Store' for simple value
            // If the value is a number literal, parse it. Otherwise, store as text.
            const parsedValue = isNaN(parseFloat(valueToStore)) ? valueToStore : parseFloat(valueToStore);
            memoryCells[cellName] = parsedValue;
        }
        setTimeout(processNextLine, 10);
    } 
    // Show value_or_cell_name
    else if (command === "Show") {
        if (parts.length < 2) {
            addToOutput(`Error on line ${lineNumber}: 'Show' command needs a value or cell name.`);
        } else {
            const displayPart = parts.slice(1).join(' '); // Get everything after 'Show'
            if (memoryCells.hasOwnProperty(displayPart)) {
                addToOutput(memoryCells[displayPart]); // Show content of cell
            } else {
                addToOutput(displayPart); // Show as literal text/number
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
        const promptMessage = parts.slice(6).join(' '); // The rest is the prompt message
        
        addToOutput(`[Flash asks]: ${promptMessage}`);
        targetCellForInput = cellName; // Store which cell to put the input into
        isWaitingForInput = true; // Pause execution
        updateConsoleDisplay(); // Ensure prompt is visible
        document.getElementById('user-input-field').focus(); // Focus input field
        // Execution will resume when sendInput() is called
    }
    // Calculate operation To result_cell_name From value1/cell1 And value2/cell2
    else if (command === "Calculate" && parts[2] === "To" && parts[4] === "From" && parts[6] === "And") {
        if (parts.length !== 7) {
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
        if (parts.length < 4) { // e.g., If val1 IsEqual val2
            addToOutput(`Error on line ${lineNumber}: 'If' command syntax error.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const val1 = getValue(parts[1]);
        const condition = parts[2];
        const val2 = getValue(parts[3]);

        let conditionMet = false;
        if (condition === "IsEqual") {
            conditionMet = (val1 == val2); // Use == for loose comparison (number/string)
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
            // Skip to EndIf or Else
            let ifCounter = 1; // Counter for nested Ifs
            let foundElse = false;
            let skipToEndIf = false;
            for (let i = currentLineIndex; i < codeLines.length; i++) {
                const subCommand = codeLines[i].trim().split(/\s+/)[0];
                if (subCommand === "If") {
                    ifCounter++;
                } else if (subCommand === "EndIf") {
                    ifCounter--;
                } else if (subCommand === "Else" && ifCounter === 1) { // Found Else for current If
                    foundElse = true;
                    currentLineIndex = i + 1; // Jump past Else
                    break;
                }
                if (ifCounter === 0) { // Found matching EndIf for current If
                    skipToEndIf = true;
                    currentLineIndex = i + 1; // Jump past EndIf
                    break;
                }
            }
            if (!foundElse && !skipToEndIf) {
                addToOutput(`Error on line ${lineNumber}: 'If' block not properly closed with 'EndIf'.`);
                currentLineIndex = codeLines.length; // Stop execution
            }
        }
        setTimeout(processNextLine, 10); // Continue execution (either inside or after If/Else)
    }
    // Else block
    else if (command === "Else") {
        // If we reached 'Else', it means the 'If' condition was true,
        // so we need to skip the 'Else' block entirely until the matching 'EndIf'.
        let ifCounter = 1; // Counter for nested Ifs
        for (let i = currentLineIndex; i < codeLines.length; i++) {
            const subCommand = codeLines[i].trim().split(/\s+/)[0];
            if (subCommand === "If") {
                ifCounter++;
            } else if (subCommand === "EndIf") {
                ifCounter--;
            }
            if (ifCounter === 0) { // Found matching EndIf for this If/Else block
                currentLineIndex = i + 1; // Jump past EndIf
                break;
            }
        }
        if (ifCounter > 0) { // No matching EndIf found for this Else
             addToOutput(`Error on line ${lineNumber}: 'Else' block not properly closed with 'EndIf'.`);
             currentLineIndex = codeLines.length; // Stop execution
        }
        setTimeout(processNextLine, 10);
    }
    // EndIf block
    else if (command === "EndIf") {
        // Just continue to the next line
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

    addToOutput(`[You typed]: ${userInput}`); // Show what user typed
    
    // Store the user input into the target cell
    // Try to parse as number if it looks like one, otherwise store as string
    const parsedInput = isNaN(parseFloat(userInput)) ? userInput : parseFloat(userInput);
    memoryCells[targetCellForInput] = parsedInput;

    isWaitingForInput = false; // Resume execution
    targetCellForInput = null; // Clear target cell
    updateConsoleDisplay();
    setTimeout(processNextLine, 10); // Continue executing the script
}
