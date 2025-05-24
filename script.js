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

// --- New Copy/Paste/Download Functions ---

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

function downloadDocumentation() {
    const documentationContent = `
# Документация Языка Flash

## Введение во Flash

Flash — это простой, пошаговый язык программирования, разработанный для интерактивных сценариев, обработки данных и управления логикой. Он идеален для тех, кто делает первые шаги в программировании, создавая текстовые приключения, калькуляторы или простые симуляции.

Ключевые особенности Flash:
* Простота: Чёткий и понятный синтаксис.
* Построчное выполнение: Код выполняется строка за строкой.
* Гибкое управление потоком: Возможность переходить к любой строке кода.

Все команды во Flash пишутся **только маленькими буквами (в нижнем регистре)**.

## 1. Основы Flash: Переменные (Ячейки Памяти)

Во Flash данные хранятся в **ячейках памяти**, которые можно представить как именованные "коробки" для хранения информации.

* Имя ячейки: Уникальное слово, используемое для доступа к данным. Должно быть одним словом (без пробелов).
    * Примеры: 'имя', 'счет', 'здоровьеИгрока', 'сообщение'.
* Тип данных: Ячейки могут хранить:
    * Числа: Целые числа ('10', '500') или десятичные дроби ('3.14', '0.5').
    * Текст: Последовательность символов (например, 'привет', 'да', 'нет').

## 2. Команды Языка Flash

Ниже представлены все доступные команды языка Flash с подробными описаниями и примерами использования.

### 2.1. 'store [значение] in [имя_ячейки]'

* Назначение: Присваивает 'значение' указанной 'имени_ячейки'. Если ячейки с таким именем не существует, она будет создана.
* Параметры:
    * '[значение]': Литерал (число или текст), который нужно сохранить. Если это текст, он должен быть одним словом. Для текста с пробелами требуется его передача как единой сущности, чего текущая версия Flash не поддерживает напрямую без кавычек. Рекомендуется использовать текст без пробелов.
    * '[имя_ячейки]': Имя ячейки, в которую будет сохранено значение.
* Примеры:
    ```flash
    store 100 in points      // Сохранить число 100 в ячейке 'points'
    store player1 in current_player // Сохранить текст 'player1' в ячейке 'current_player'
    store true in game_over   // Сохранить текст 'true' (как строку) в ячейке 'game_over'
    ```

### 2.2. 'show [значение_или_имя_ячейки]'

* Назначение: Выводит 'значение' или содержимое 'имя_ячейки' в консоль.
* Параметры:
    * '[значение_или_имя_ячейки]':
        * Литерал: текст (например, 'Привет, мир!'), число (например, '42'). Если это текст с пробелами, он будет выведен как есть, если это единственное, что идет после 'show'.
        * Имя ячейки: Содержимое указанной ячейки будет выведено.
* Примеры:
    ```flash
    show points           // Выведет текущее значение из ячейки 'points'
    show Привет, добро пожаловать! // Выведет "Привет, добро пожаловать!"
    show current_player   // Выведет содержимое ячейки 'current_player'
    ```

### 2.3. 'get input for [имя_ячейки] with prompt [текст_сообщения]'

* Назначение: Выводит 'текст_сообщения' в консоль как приглашение для пользователя, приостанавливает выполнение программы, ожидает ввода текста или числа от пользователя, а затем сохраняет введенные данные в указанную 'имя_ячейки'.
* Параметры:
    * '[имя_ячейки]': Имя ячейки, куда будет сохранено введенное пользователем значение.
    * '[текст_сообщения]': Сообщение, которое будет показано пользователю как приглашение к вводу.
* Примеры:
    ```flash
    get input for userName with prompt Введите ваше имя:
    get input for age with prompt Сколько вам лет?:
    ```

### 2.4. 'calculate [операция] to [имя_результирующей_ячейки] from [значение1/ячейка1] and [значение2/ячейка2]'

* Назначение: Выполняет математическую операцию над двумя числами и сохраняет числовой результат в указанную 'имя_результирующей_ячейки'.
* Параметры:
    * '[операция]': Тип математической операции. Допустимые значения:
        * 'sum' (сложение)
        * 'difference' (вычитание)
        * 'product' (умножение)
        * 'quotient' (деление)
    * '[имя_результирующей_ячейки]': Имя ячейки, в которую будет записан результат операции.
    * '[значение1/ячейка1]': Первое число для операции. Может быть либо литералом (числом), либо именем ячейки, содержащей число.
    * '[значение2/ячейка2]': Второе число для операции. Может быть либо литералом (числом), либо именем ячейки, содержащей число.
* Важно: Оба операнда должны быть числами. Попытка деления на ноль приведет к ошибке выполнения.
* Примеры:
    ```flash
    store 10 in num1
    store 5 in num2
    calculate sum to total from num1 and num2    // total = 15
    show total

    calculate difference to remaining from 20 and num2 // remaining = 15
    show remaining

    calculate product to area from 7 and 8       // area = 56
    show area

    calculate quotient to average from 100 and 4 // average = 25
    show average

    // Пример с ошибкой (деление на ноль)
    store 0 in zero_val
    calculate quotient to bad_result from 10 and zero_val // Вызовет ошибку
    ```

### 2.5. 'if [значение1/ячейка1] [условие] [значение2/ячейка2]'

* Назначение: Начинает блок условного кода. Команды внутри этого блока будут выполнены только в том случае, если указанное условие истинно.
* Параметры:
    * '[значение1/ячейка1]': Первое значение для сравнения (литерал или содержимое ячейки).
    * '[условие]': Тип сравнения. Допустимые значения:
        * 'isequal' (равно)
        * 'isgreater' (больше)
        * 'isless' (меньше)
    * '[значение2/ячейка2]': Второе значение для сравнения (литерал или содержимое ячейки).
* Важно:
    * Для 'isgreater' и 'isless' оба сравниваемых значения должны быть числами.
    * 'isequal' работает как для чисел, так и для текста.
    * Каждый 'if' должен быть закрыт соответствующим 'endif'.
* Примеры:
    ```flash
    store 18 in userAge
    if userAge isgreater 16
      show Вы достаточно взрослый для игры!
    endif

    store "admin" in userRole
    if userRole isequal admin
      show Добро пожаловать, администратор.
    endif
    ```

### 2.6. 'else'

* Назначение: Используется **внутри** блока 'if...endif'. Команды, расположенные после 'else' и до 'endif', будут выполнены, **если условие в соответствующем 'if' оказалось ложным**.
* Важно: 'else' всегда должен находиться между 'if' и 'endif'.
* Примеры:
    ```flash
    get input for choice with prompt Нравится ли вам солнце? (да/нет):
    if choice isequal да
      show Отлично!
    else
      show Жаль.
    endif
    ```

### 2.7. 'endif'

* Назначение: Завершает блок 'if' или 'if/else'. **Каждый 'if' должен иметь ровно один соответствующий 'endif'**. Отсутствие 'endif' или их неправильное расположение приведет к ошибкам выполнения.
* Примеры: (См. примеры для 'if' и 'else')

### 2.8. 'goto [номер_строки]'

* Назначение: Безусловно передает управление выполнением программы к указанной 'номеру_строки'. Это позволяет создавать циклы, повторно выполнять блоки кода или переходить к определенным точкам программы.
* Параметры:
    * '[номер_строки]': Целое число, указывающее на номер строки в вашем коде. Нумерация строк начинается с '1' для первой строки.
* Важно: Используйте 'goto' осторожно. Неправильное использование может привести к бесконечным циклам (когда программа повторяется без возможности выхода) или к "прыжкам", которые делают код трудночитаемым. Убедитесь, что 'номер_строки' действительно существует в вашей программе.
* Примеры (простой счетчик):
    ```flash
    show Начинаем отсчет...
    store 1 in counter
    // Строка 3: loop_start
    show Текущее значение:
    show counter
    calculate sum to counter from counter and 1
    if counter isless 5
      goto 3 // Возвращаемся к строке 3 (повторяем цикл, пока counter < 5)
    endif
    show Отсчет завершен.
    ```

## 3. Структура Кода Flash

* Каждая команда на новой строке: Каждая инструкция Flash должна занимать отдельную строку.
* Нижний регистр: Все ключевые слова команд ('store', 'show', 'if', 'goto' и т.д.) и условия ('isequal', 'isgreater', 'isless') должны быть написаны маленькими буквами.
* Комментарии: Вы можете добавлять комментарии для лучшей читаемости кода. Любая строка, начинающаяся с '//', будет проигнорирована интерпретатором.
    ```flash
    // Это однострочный комментарий.
    show Привет! // Комментарий в конце строки.
    ```
* Пустые строки: Пустые строки между командами игнорируются, но не должны содержать никаких символов.

## 4. Примеры Скриптов Flash

### 4.1. Скрипт "Угадай число"

```flash
show --- Игра "Угадай число" ---
show Я загадал число от 1 до 10. Попробуй угадать!
store 7 in secretNumber
store 0 in guessCount
store 0 in userGuess
// Начало игрового цикла (строка 6)
get input for userGuess with prompt Введите вашу догадку:
calculate sum to guessCount from guessCount and 1 // Увеличиваем счетчик попыток
if userGuess isequal secretNumber
  show Правильно! Вы угадали число!
  show Вам потребовалось
  show guessCount
  show попыток.
  goto 20 // Переход к концу игры
else
  show Неправильно.
  if userGuess isless secretNumber
    show Ваша догадка слишком низка.
  else
    show Ваша догадка слишком высока.
  endif
endif
goto 6 // Возвращаемся к началу игрового цикла (строка 6)
// Конец игры (строка 20)
show --- Игра окончена! ---
