// script.js

// Основная функция-интерпретатор для языка Flash
function runFlashCode(codeInput) {
    const outputElement = document.getElementById('console-output'); // Получаем элемент консоли
    outputElement.textContent = ''; // Очищаем консоль перед каждым запуском
    let outputBuffer = ""; // Буфер для сбора всего вывода, чтобы обновить консоль один раз

    outputBuffer += "--- Start Flash Execution ---\n";

    // Разбиваем введенный код на отдельные строки
    const lines = codeInput.trim().split('\n');

    // Проходим по каждой строке кода
    lines.forEach((line, index) => {
        const trimmedLine = line.trim(); // Удаляем пробелы по краям строки
        
        // Пропускаем пустые строки
        if (!trimmedLine) {
            return; 
        }

        // Разбиваем строку на части по пробелам (команда и аргументы)
        const parts = trimmedLine.split(/\s+/); 
        const command = parts[0]; // Первая часть - это команда
        const lineNumber = index + 1; // Номер строки для сообщений об ошибках

        // Логика обработки каждой команды
        if (command === "Show") {
            // Проверяем, есть ли значение для вывода
            if (parts.length < 2) {
                outputBuffer += `Error on line ${lineNumber}: 'Show' command needs a value.\n`;
            } else {
                // Все слова после 'Show' объединяем в одно сообщение
                const value = parts.slice(1).join(' '); 
                outputBuffer += value + '\n';
            }
        } 
        else if (command === "Add") {
            // Проверяем правильное количество аргументов
            if (parts.length !== 3) {
                outputBuffer += `Error on line ${lineNumber}: 'Add' command needs two numbers.\n`;
            } else {
                // Пытаемся преобразовать аргументы в числа
                const num1 = parseFloat(parts[1]);
                const num2 = parseFloat(parts[2]);
                // Проверяем, что аргументы - это числа
                if (isNaN(num1) || isNaN(num2)) {
                    outputBuffer += `Error on line ${lineNumber}: 'Add' command needs valid numbers.\n`;
                } else {
                    outputBuffer += (num1 + num2) + '\n'; // Выполняем сложение и добавляем в буфер
                }
            }
        }
        else if (command === "Subtract") {
            if (parts.length !== 3) {
                outputBuffer += `Error on line ${lineNumber}: 'Subtract' command needs two numbers.\n`;
            } else {
                const num1 = parseFloat(parts[1]);
                const num2 = parseFloat(parts[2]);
                if (isNaN(num1) || isNaN(num2)) {
                    outputBuffer += `Error on line ${lineNumber}: 'Subtract' command needs valid numbers.\n`;
                } else {
                    outputBuffer += (num1 - num2) + '\n';
                }
            }
        }
        else if (command === "Multiply") {
            if (parts.length !== 3) {
                outputBuffer += `Error on line ${lineNumber}: 'Multiply' command needs two numbers.\n`;
            } else {
                const num1 = parseFloat(parts[1]);
                const num2 = parseFloat(parts[2]);
                if (isNaN(num1) || isNaN(num2)) {
                    outputBuffer += `Error on line ${lineNumber}: 'Multiply' command needs valid numbers.\n`;
                } else {
                    outputBuffer += (num1 * num2) + '\n';
                }
            }
        }
        else if (command === "Divide") {
            if (parts.length !== 3) {
                outputBuffer += `Error on line ${lineNumber}: 'Divide' command needs two numbers.\n`;
            } else {
                const num1 = parseFloat(parts[1]);
                const num2 = parseFloat(parts[2]);
                if (isNaN(num1) || isNaN(num2)) {
                    outputBuffer += `Error on line ${lineNumber}: 'Divide' command needs valid numbers.\n`;
                } else if (num2 === 0) { // Проверка деления на ноль
                    outputBuffer += `Error on line ${lineNumber}: Cannot divide by zero.\n`;
                } else {
                    outputBuffer += (num1 / num2) + '\n';
                }
            }
        }
        else {
            // Если команда не распознана
            outputBuffer += `Error on line ${lineNumber}: Unknown command '${command}'.\n`;
        }
    });

    outputBuffer += "--- End Flash Execution ---\n";
    outputElement.textContent = outputBuffer; // Обновляем содержимое консоли один раз в конце
}

// Эта функция вызывается, когда пользователь нажимает кнопку "Запустить код Flash"
function runCode() {
    const codeInput = document.getElementById('code-editor').value; // Получаем код из текстового поля
    runFlashCode(codeInput); // Передаем код нашему интерпретатору
}