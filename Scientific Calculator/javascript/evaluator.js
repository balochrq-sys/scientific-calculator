/**
 * evaluator.js
 * Custom Math Evaluator (No eval allowed!)
 * Features: Tokenizer -> Implicit Multiplication -> Shunting-Yard Parser -> RPN Evaluator
 */

const Evaluator = (() => {
    'use strict';

    // ==========================================
    // 1. MATH RULES & DICTIONARIES
    // ==========================================
    const OPERATORS = {
        '+': { precedence: 1, assoc: 'L', arity: 2 },
        '−': { precedence: 1, assoc: 'L', arity: 2 }, // UI minus
        '-': { precedence: 1, assoc: 'L', arity: 2 }, // Keyboard minus
        '×': { precedence: 2, assoc: 'L', arity: 2 },
        '*': { precedence: 2, assoc: 'L', arity: 2 }, // Keyboard multiply
        '÷': { precedence: 2, assoc: 'L', arity: 2 },
        '/': { precedence: 2, assoc: 'L', arity: 2 }, // Keyboard divide
        '^': { precedence: 3, assoc: 'R', arity: 2 }, // Power
        '%': { precedence: 4, assoc: 'L', arity: 1 }, // Percentage
        '!': { precedence: 5, assoc: 'L', arity: 1 }  // Factorial (Postfix)
    };

    const FUNCTIONS = new Set([
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
        'log', 'ln', 'sqrt', 'square', 'reciprocal'
    ]);

    const CONSTANTS = {
        'π': Math.PI,
        'pi': Math.PI,
        'e': Math.E
    };

    // ==========================================
    // 2. HELPER FUNCTIONS
    // ==========================================
    const isNumber = (val) => !isNaN(parseFloat(val)) && isFinite(val);

    const factorial = (n) => {
        if (n < 0 || !Number.isInteger(n)) throw new Error("Error");
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    };

    const fixPrecision = (num) => {
        // Fixes floating point issues (e.g., 0.1 + 0.2 = 0.3)
        return parseFloat(Number(num).toPrecision(12));
    };

    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const toDegrees = (radians) => radians * (180 / Math.PI);

    // ==========================================
    // 3. TOKENIZER (Splits string into parts)
    // ==========================================
    const tokenize = (expression) => {
        const tokens = [];
        const str = expression.replace(/\s+/g, '');
        let i = 0;

        while (i < str.length) {
            let char = str[i];

            // A. Numbers
            if (/[0-9.]/.test(char)) {
                let num = '';
                let decimalCount = 0;
                while (i < str.length && /[0-9.]/.test(str[i])) {
                    if (str[i] === '.') decimalCount++;
                    if (decimalCount > 1) throw new Error("Invalid Input"); // Multiple decimals check
                    num += str[i];
                    i++;
                }
                tokens.push(num);
                continue;
            }

            // B. Words (Functions or Constants)
            if (/[a-zA-Zπ]/.test(char)) {
                let word = '';
                while (i < str.length && /[a-zA-Zπ0-9]/.test(str[i])) {
                    word += str[i];
                    i++;
                }
                tokens.push(word);
                continue;
            }

            // C. Operators & Parentheses
            if (OPERATORS[char] || char === '(' || char === ')') {
                // Handle Unary Minus (Negative numbers like "-5" or "(-3)")
                if ((char === '-' || char === '−') && 
                    (tokens.length === 0 || OPERATORS[tokens[tokens.length - 1]] || tokens[tokens.length - 1] === '(')) {
                    let num = '-';
                    i++;
                    while (i < str.length && /[0-9.]/.test(str[i])) {
                        num += str[i];
                        i++;
                    }
                    if (num !== '-') {
                        tokens.push(num);
                        continue;
                    } else {
                        // If it was just a negative sign before a function/parenthesis (e.g., "-sin(30)")
                        tokens.push('-1', '×');
                        continue;
                    }
                }
                tokens.push(char);
                i++;
                continue;
            }
            
            // Unrecognized character
            throw new Error("Invalid Input");
        }

        // [BONUS] Implicit Multiplication (e.g., "2π" -> "2", "×", "π" OR "3(2)" -> "3", "×", "(")
        const finalTokens = [];
        for (let j = 0; j < tokens.length; j++) {
            finalTokens.push(tokens[j]);
            if (j < tokens.length - 1) {
                let curr = tokens[j];
                let next = tokens[j + 1];
                
                let currIsNumOrConstOrClose = isNumber(curr) || CONSTANTS[curr] || curr === ')' || curr === '!';
                let nextIsNumOrConstOrFuncOrOpen = isNumber(next) || CONSTANTS[next] || FUNCTIONS.has(next) || next === '(';

                if (currIsNumOrConstOrClose && nextIsNumOrConstOrFuncOrOpen) {
                    finalTokens.push('×'); // Insert multiplication
                }
            }
        }
        return finalTokens;
    };

    // ==========================================
    // 4. SHUNTING-YARD (Infix to RPN)
    // ==========================================
    const toRPN = (tokens) => {
        const output = [];
        const opStack = [];

        for (let token of tokens) {
            if (isNumber(token) || CONSTANTS[token]) {
                output.push(token);
            } 
            else if (FUNCTIONS.has(token)) {
                opStack.push(token);
            } 
            else if (OPERATORS[token]) {
                const o1 = token;
                while (opStack.length > 0) {
                    const o2 = opStack[opStack.length - 1];
                    if (OPERATORS[o2] && (
                        (OPERATORS[o1].assoc === 'L' && OPERATORS[o1].precedence <= OPERATORS[o2].precedence) ||
                        (OPERATORS[o1].assoc === 'R' && OPERATORS[o1].precedence < OPERATORS[o2].precedence)
                    )) {
                        output.push(opStack.pop());
                    } else {
                        break;
                    }
                }
                opStack.push(o1);
            } 
            else if (token === '(') {
                opStack.push(token);
            } 
            else if (token === ')') {
                while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
                    output.push(opStack.pop());
                }
                if (opStack.length === 0) throw new Error("Error"); // Unbalanced parens
                opStack.pop(); // Pop the '('
                
                // If there's a function before the '(', pop it to output
                if (opStack.length > 0 && FUNCTIONS.has(opStack[opStack.length - 1])) {
                    output.push(opStack.pop());
                }
            }
        }

        while (opStack.length > 0) {
            const op = opStack.pop();
            if (op === '(' || op === ')') throw new Error("Error"); // Unbalanced parens
            output.push(op);
        }

        return output;
    };

    // ==========================================
    // 5. RPN EVALUATOR (Calculates the result)
    // ==========================================
    const evalRPN = (rpnQueue, angleMode) => {
        const stack = [];

        for (let token of rpnQueue) {
            if (isNumber(token)) {
                stack.push(parseFloat(token));
            } 
            else if (CONSTANTS[token]) {
                stack.push(CONSTANTS[token]);
            } 
            else if (OPERATORS[token]) {
                const arity = OPERATORS[token].arity;
                if (stack.length < arity) throw new Error("Invalid Input");

                if (arity === 1) {
                    // Unary operators (%, !)
                    const a = stack.pop();
                    if (token === '%') stack.push(a / 100);
                    if (token === '!') stack.push(factorial(a));
                } 
                else if (arity === 2) {
                    // Binary operators
                    const b = stack.pop();
                    const a = stack.pop();
                    
                    switch (token) {
                        case '+': stack.push(a + b); break;
                        case '−': 
                        case '-': stack.push(a - b); break;
                        case '×': 
                        case '*': stack.push(a * b); break;
                        case '÷': 
                        case '/': 
                            if (b === 0) throw new Error("Cannot divide by zero");
                            stack.push(a / b); 
                            break;
                        case '^': stack.push(Math.pow(a, b)); break;
                    }
                }
            } 
            else if (FUNCTIONS.has(token)) {
                if (stack.length < 1) throw new Error("Invalid Input");
                const a = stack.pop();
                
                // Angle conversions for Trig functions
                let rad = angleMode === 'DEG' ? toRadians(a) : a;

                switch (token) {
                    case 'sin': stack.push(Math.sin(rad)); break;
                    case 'cos': stack.push(Math.cos(rad)); break;
                    case 'tan': 
                        if (angleMode === 'DEG' && (a % 180 === 90 || a % 180 === -90)) throw new Error("Error"); // Tan(90) undefined
                        stack.push(Math.tan(rad)); 
                        break;
                    case 'asin': stack.push(angleMode === 'DEG' ? toDegrees(Math.asin(a)) : Math.asin(a)); break;
                    case 'acos': stack.push(angleMode === 'DEG' ? toDegrees(Math.acos(a)) : Math.acos(a)); break;
                    case 'atan': stack.push(angleMode === 'DEG' ? toDegrees(Math.atan(a)) : Math.atan(a)); break;
                    case 'log': 
                        if (a <= 0) throw new Error("Error");
                        stack.push(Math.log10(a)); 
                        break;
                    case 'ln': 
                        if (a <= 0) throw new Error("Error");
                        stack.push(Math.log(a)); 
                        break;
                    case 'sqrt': 
                        if (a < 0) throw new Error("Error");
                        stack.push(Math.sqrt(a)); 
                        break;
                    case 'square': stack.push(a * a); break;
                    case 'reciprocal': 
                        if (a === 0) throw new Error("Cannot divide by zero");
                        stack.push(1 / a); 
                        break;
                }
            }
        }

        if (stack.length !== 1) throw new Error("Invalid Input");
        
        return fixPrecision(stack.pop());
    };

    // ==========================================
    // 6. PUBLIC API
    // ==========================================
    return {
        calculate: (expression, angleMode = 'DEG') => {
            if (!expression || expression.trim() === '') return '';
            
            try {
                const tokens = tokenize(expression);
                const rpn = toRPN(tokens);
                const result = evalRPN(rpn, angleMode);
                
                // Protect against NaN or Infinity bugs bypassing our catch
                if (isNaN(result)) throw new Error("Error");
                if (!isFinite(result)) throw new Error("Cannot divide by zero");
                
                return result.toString();
            } catch (error) {
                // Pass the error message (e.g., "Cannot divide by zero" or "Error")
                return error.message || "Error";
            }
        }
    };
})();