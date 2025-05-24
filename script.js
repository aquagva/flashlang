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
        // Expected: Store [value] In [cell_name]
        // This requires careful parsing if 'value' itself can contain spaces.
        // For simplicity now, let's assume 'value' is a single word or number.
        if (parts.length < 4 || parts[2] !== "In") {
            addToOutput(`Error on line ${lineNumber}: 'Store' command syntax error. Expected 'Store [value] In [cell_name]'.`);
        } else {
            const valueToStorePart = parts[1]; // The part right after "Store"
            const cellName = parts[3]; // The part right after "In"

            // Determine if the value is a number or text
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
            // Get everything after "Show" as the potential display value
            const displayPart = parts.slice(1).join(' '); 
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
        const cellName = parts[3]; // The cell to store input into
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
        if (parts.length !== 8) { // 8 parts: Calculate, Op, To, ResultCell, From, Val1, And, Val2
            addToOutput(`Error on line ${lineNumber}: 'Calculate' command syntax error. Expected 'Calculate [operation] To [result_cell] From [val1] And [val2]'.`);
            setTimeout(processNextLine, 10);
            return;
        }
        const operation = parts[1];
        const resultCell = parts[3];
        const val1 = getValue(parts[5]);
        const val2 = getValue(parts[7]);

        if (typeof val1 !== 'number' || typeof val2 !== 'number') {
            addToOutput(`Error on line <span class="math-inline">\{lineNumber\}\: '</span>{operation}' operation needs valid numbers. Got '<span class="math-inline">\{val1\}' and '</span>{val2}'.`);
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
                addToOutput(`Error on line <span class="math-inline">\{lineNumber\}\: Unknown operation type '</span>{operation}'.`);
                setTimeout(processNextLine, 10);
                return;
        }
        memoryCells[resultCell] = result;
        setTimeout(processNextLine, 10);
    }
    // If condition_start
    else if (command === "If") {
        if (parts.length < 4) { // e.g., If val1 IsEqual val2 (4 parts minimum)
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
