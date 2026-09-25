/**
 * app.js
 * UI Controller for Scientific Calculator
 * Matched to the provided HTML structure
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ==========================================
    // 1. STATE
    // ==========================================
    const state = {
        currentInput: '0',
        expression: '',
        memory: Number(localStorage.getItem('calc_memory')) || 0,
        angleMode: localStorage.getItem('calc_angleMode') || 'DEG',
        isShifted: false,
        history: JSON.parse(localStorage.getItem('calc_history') || '[]'),
        theme: localStorage.getItem('calc_theme') || 'dark',
        needsReset: false,
        isError: false
    };

    // ==========================================
    // 2. DOM
    // ==========================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const displayResult = $('#result');
    const displayExpression = $('#expression');
    const modeIndicator = $('#modeIndicator');
    const memIndicator = $('#memIndicator');
    const shiftIndicator = $('#shiftIndicator');
    const modeBtn = $('#modeBtn');

    const keysContainer = $('#keys');
    const themeToggleBtn = $('#themeToggleBtn');
    const historyPanel = $('#historyPanel');
    const historyOverlay = $('#historyOverlay');
    const historyToggleBtn = $('#historyToggleBtn');
    const historyCloseBtn = $('#historyCloseBtn');
    const clearHistoryBtn = $('#clearHistoryBtn');
    const historyList = $('#historyList');
    const copyBtn = $('#copyBtn');

    // ==========================================
    // 3. DISPLAY
    // ==========================================
    const updateDisplay = () => {
        displayExpression.textContent = state.expression;
        displayResult.textContent = state.currentInput;

        displayResult.classList.remove('shrink-1', 'shrink-2', 'shrink-3', 'error');
        const len = String(state.currentInput).length;

        if (state.isError) {
            displayResult.classList.add('error');
        } else if (len > 18) {
            displayResult.classList.add('shrink-3');
        } else if (len > 13) {
            displayResult.classList.add('shrink-2');
        } else if (len > 9) {
            displayResult.classList.add('shrink-1');
        }

        if (modeIndicator) modeIndicator.textContent = state.angleMode;
        if (memIndicator) memIndicator.textContent = state.memory !== 0 ? 'M' : '';
        if (shiftIndicator) shiftIndicator.textContent = state.isShifted ? '2ND' : '';
        if (modeBtn) modeBtn.textContent = state.angleMode;

        document.documentElement.setAttribute('data-theme', state.theme);
    };

    const clearAll = () => {
        state.currentInput = '0';
        state.expression = '';
        state.isError = false;
        state.needsReset = false;
    };

    const resetAfterErrorIfNeeded = () => {
        if (state.isError) clearAll();
    };

    // ==========================================
    // 4. HANDLERS
    // ==========================================
    const handleNumber = (val) => {
        resetAfterErrorIfNeeded();

        if (state.needsReset) {
            state.expression = '';
            state.currentInput = val === '.' ? '0.' : val;
            state.needsReset = false;
            updateDisplay();
            return;
        }

        if (val === '.' && state.currentInput.includes('.')) return;

        if (state.currentInput === '0' && val !== '.') {
            state.currentInput = val;
        } else if (state.currentInput === '-0' && val !== '.') {
            state.currentInput = '-' + val;
        } else {
            state.currentInput += val;
        }
        updateDisplay();
    };
    const getParenthesisBalance = () => {
        const openCount = (state.expression.match(/\(/g) || []).length;
        const closeCount = (state.expression.match(/\)/g) || []).length;

        return openCount - closeCount;
    };
    const handleOperator = (op) => {
        resetAfterErrorIfNeeded();

        const trimmed = state.expression.trim();
        const last = trimmed.slice(-1);
        const operators = ['+', '−', '-', '×', '*', '÷', '/', '^'];

        // 1. Replace last operator if user presses two operators in a row
        if (operators.includes(last) && state.currentInput === '0') {
            state.expression = trimmed.slice(0, -1) + `${op} `;
            updateDisplay();
            return;
        }

        // 2. Prevent adding an operator right after an open parenthesis "("
        if (last === '(' && state.currentInput === '0') {
            return;
        }

        // 3. If expression ends with a complete term (like ")", "!", "%", or "^2") and input is '0',
        // attach the operator directly without adding a rogue "0"
        if (state.currentInput === '0' && trimmed && !operators.includes(last)) {
            state.expression = `${trimmed} ${op} `;
            updateDisplay();
            return;
        }

        // 4. Normal operator entry
        if (state.expression) {
            state.expression = state.expression.trimEnd() + ' ';
        }

        state.expression += `${state.currentInput} ${op} `;
        state.currentInput = '0';
        state.needsReset = false;

        updateDisplay();
    };


    const handleEquals = () => {
        if (state.isError) {
            clearAll();
            updateDisplay();
            return;
        }

        let full = state.expression || '';
        const trimmed = full.trim();
        const last = trimmed.slice(-1);
        const endsWithOpOrOpen = ['+', '−', '-', '×', '*', '÷', '/', '^', '('].includes(last);

        // Append current number only when needed
        if (state.currentInput !== '0' || endsWithOpOrOpen || !trimmed) {
            full += state.currentInput;
        }

        full = full.replace(/\s+/g, '');
        if (!full) return;

        const result = Evaluator.calculate(full, state.angleMode);

        if (result === 'Error' || result === 'Cannot divide by zero' || result === 'Invalid Input') {
            state.isError = true;
            state.currentInput = result;
            state.expression = '';
        } else {
            addHistory(full, result);
            state.currentInput = result;
            state.expression = '';
            state.isError = false;
        }
        state.needsReset = true;
        updateDisplay();
    };

    const handleAction = (action) => {
        switch (action) {
            case 'clear':
                clearAll();
                break;

            case 'delete':
                if (state.isError || state.needsReset) {
                    clearAll();
                } else if (state.currentInput.length <= 1 || state.currentInput === '-0') {
                    state.currentInput = '0';
                } else {
                    state.currentInput = state.currentInput.slice(0, -1);
                }
                break;

            case 'negate':
                resetAfterErrorIfNeeded();
                if (state.currentInput !== '0' && state.currentInput !== 'Error') {
                    state.currentInput = state.currentInput.startsWith('-')
                        ? state.currentInput.slice(1)
                        : '-' + state.currentInput;
                }
                break;

            case 'equals':
                handleEquals();
                return; // already updated
        }
        updateDisplay();
    };

    const handleFunction = (action, value) => {
        resetAfterErrorIfNeeded();

        // DEG / RAD toggle
        if (action === 'toggle-mode') {
            state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
            localStorage.setItem('calc_angleMode', state.angleMode);
            updateDisplay();
            return;
        }

        // 2nd / Shift for inverse trig
        if (action === 'second') {
            state.isShifted = !state.isShifted;
            const map = [
                ['sin', 'asin', 'sin', 'sin⁻¹'],
                ['cos', 'acos', 'cos', 'cos⁻¹'],
                ['tan', 'atan', 'tan', 'tan⁻¹']
            ];
            map.forEach(([normal, inverse, normalText, invText]) => {
                // find either state
                const btn = document.querySelector(`[data-action="${normal}"], [data-action="${inverse}"]`);
                if (!btn) return;
                if (state.isShifted) {
                    btn.dataset.action = inverse;
                    btn.textContent = invText;
                } else {
                    btn.dataset.action = normal;
                    btn.textContent = normalText;
                }
            });
            const secondBtn = document.querySelector('[data-action="second"]');
            if (secondBtn) secondBtn.classList.toggle('active', state.isShifted);
            updateDisplay();
            return;
        }

        // Parentheses
        // Open Parenthesis
        if (action === 'open-paren') {
            if (state.needsReset) {
                state.expression = '';
                state.needsReset = false;
            }
            if (state.currentInput !== '0') {
                state.expression += state.currentInput + ' × (';
                state.currentInput = '0';
            } else {
                state.expression += '(';
            }
            updateDisplay();
            return;
        }

        // Close Parenthesis
        if (action === 'close-paren') {
            const balance = getParenthesisBalance();

            // No open parenthesis to close
            if (balance <= 0) return;

            // If current input is 0, check if expression ends with an operator or "("
            if (state.currentInput === '0') {
                const lastChar = state.expression.trim().slice(-1);
                const operators = ['+', '−', '-', '×', '*', '÷', '/', '^', '('];
                if (operators.includes(lastChar)) return;

                state.expression += ')';
            } else {
                // If a number is currently typed, append number then ")"
                state.expression += state.currentInput + ')';
                state.currentInput = '0';
            }

            updateDisplay();
            return;
        }

        // Constants π / e
        if (value === 'pi' || value === 'e' || value === 'π') {
            if (state.needsReset) {
                state.expression = '';
                state.needsReset = false;
            }
            state.currentInput = (value === 'e') ? 'e' : 'π';
            updateDisplay();
            return;
        }

        // Prefix functions: sin( cos( log( ...
        const prefixFns = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'];
        if (prefixFns.includes(action)) {
            if (state.needsReset) {
                state.expression = '';
                state.needsReset = false;
            }
            if (state.currentInput !== '0') {
                state.expression += `${state.currentInput}×${action}(`;
            } else {
                state.expression += `${action}(`;
            }
            state.currentInput = '0';
            updateDisplay();
            return;
        }

        // Postfix / binary-ish ops applied to current number
        // square, power, reciprocal, factorial, percent
        if (['square', 'power', 'reciprocal', 'factorial', 'percent'].includes(action)) {
            const map = {
                square: '^2',
                power: '^',
                reciprocal: '^(-1)',
                factorial: '!',
                percent: '%'
            };
            // Wrap current input for safety with negatives
            state.expression += `(${state.currentInput})${map[action]}`;
            state.currentInput = '0';
            state.needsReset = false;
            updateDisplay();
            return;
        }
    };

    const handleMemory = (action) => {
        if (state.isError) return;
        const n = parseFloat(state.currentInput);

        if (action === 'mc') {
            state.memory = 0;
        } else if (action === 'mr') {
            state.currentInput = String(state.memory);
            state.needsReset = true;
        } else if (action === 'm-plus') {
            if (!isNaN(n)) state.memory += n;
            state.needsReset = true;
        } else if (action === 'm-minus') {
            if (!isNaN(n)) state.memory -= n;
            state.needsReset = true;
        }

        localStorage.setItem('calc_memory', state.memory);
        updateDisplay();
    };

    // ==========================================
    // 5. CLICK DELEGATION (MAIN FIX)
    // ==========================================
    if (keysContainer) {
        keysContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            // visual press
            btn.classList.add('key-pressed');
            setTimeout(() => btn.classList.remove('key-pressed'), 120);

            const value = btn.dataset.value;
            const action = btn.dataset.action;

            // Numbers / decimal
            if (btn.classList.contains('btn-number') || value === '.') {
                handleNumber(value);
                return;
            }

            // Basic operators
            if (btn.classList.contains('btn-operator') && value) {
                handleOperator(value);
                return;
            }

            // Memory
            if (btn.classList.contains('btn-memory') && action) {
                handleMemory(action);
                return;
            }

            // Parentheses ( ) can be btn-action or btn-function
            if (action === 'open-paren' || action === 'close-paren') {
                handleFunction(action, value);
                return;
            }

            // Equals / AC / DEL / ±
            if (action === 'equals' || action === 'clear' || action === 'delete' || action === 'negate') {
                handleAction(action);
                return;
            }

            // Scientific functions + constants + mode
            if (btn.classList.contains('btn-function')) {
                handleFunction(action, value);
                return;
            }
        });
    }

    // ==========================================
    // 6. THEME / HISTORY / COPY (safe guards)
    // ==========================================
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('calc_theme', state.theme);
            updateDisplay();
        });
    }

    const renderHistory = () => {
        if (!historyList) return;
        historyList.innerHTML = '';

        if (!state.history.length) {
            historyList.innerHTML = '<li class="history-empty">No history yet</li>';
            return;
        }

        state.history.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.tabIndex = 0;
            li.innerHTML = `
                <span class="history-expression">${item.expr}</span>
                <span class="history-result">= ${item.result}</span>
            `;
            li.addEventListener('click', () => {
                clearAll();
                state.currentInput = String(item.result);
                updateDisplay();
                closeHistory();
            });
            historyList.appendChild(li);
        });
    };

    const addHistory = (expr, result) => {
        state.history.unshift({ expr, result });
        if (state.history.length > 10) state.history.pop();
        localStorage.setItem('calc_history', JSON.stringify(state.history));
        renderHistory();
    };

    const openHistory = () => {
        historyPanel && historyPanel.classList.add('open');
        historyOverlay && historyOverlay.classList.add('active');
    };
    const closeHistory = () => {
        historyPanel && historyPanel.classList.remove('open');
        historyOverlay && historyOverlay.classList.remove('active');
    };

    historyToggleBtn && historyToggleBtn.addEventListener('click', openHistory);
    historyCloseBtn && historyCloseBtn.addEventListener('click', closeHistory);
    historyOverlay && historyOverlay.addEventListener('click', closeHistory);

    clearHistoryBtn && clearHistoryBtn.addEventListener('click', () => {
        state.history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(String(state.currentInput));
                const toast = document.createElement('div');
                toast.className = 'toast show';
                toast.textContent = 'Result copied!';
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 300);
                }, 1600);
            } catch (err) {
                console.warn('Clipboard failed', err);
            }
        });
    }

    // ==========================================
    // 7. KEYBOARD SUPPORT
    // ==========================================
    document.addEventListener('keydown', (e) => {
        let selector = null;

        if (/^[0-9.]$/.test(e.key)) selector = `[data-value="${e.key}"]`;
        else if (e.key === '+') selector = '[data-value="+"]';
        else if (e.key === '-') selector = '[data-value="−"]';
        else if (e.key === '*') selector = '[data-value="×"]';
        else if (e.key === '/') selector = '[data-value="÷"]';
        else if (e.key === '^') selector = '[data-action="power"]';
        else if (e.key === '%') selector = '[data-action="percent"]';
        else if (e.key === '!') selector = '[data-action="factorial"]';
        else if (e.key === '(') selector = '[data-action="open-paren"]';
        else if (e.key === ')') selector = '[data-action="close-paren"]';
        else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            selector = '[data-action="equals"]';
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            selector = '[data-action="delete"]';
        } else if (e.key === 'Escape') {
            selector = '[data-action="clear"]';
        }

        if (!selector) return;
        const btn = document.querySelector(selector);
        if (btn) btn.click();
    });

    // ==========================================
    // 8. INIT
    // ==========================================
    renderHistory();
    updateDisplay();
});