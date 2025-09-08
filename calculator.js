// ==========================================================
// Clean, Modular Vanilla JS Calculator (external file)
// - Supports mouse & keyboard
// - Handles decimals, AC, C, %, and basic operators
// - Gentle input sanitation to avoid invalid eval
// ==========================================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------
    // DOM references
    // -----------------------------
    const elHistory = document.getElementById("history");
    const elCurrent = document.getElementById("current");
    const elResult  = document.getElementById("result");
    const elKeys    = document.getElementById("keys");

    // -----------------------------
    // State
    // -----------------------------
    let input = "0";          // what user is typing
    let lastResult = "";      // last computed result for history

    // Allowed operator characters we display
    const DISPLAY_OPS = ["+", "-", "×", "÷", "%"];

    // -----------------------------
    // Utilities
    // -----------------------------

    /**
     * Is the last character of the current input an operator?
     */
    function endsWithOperator(str) {
        if (!str) return false;
        const last = str.slice(-1);
        return DISPLAY_OPS.includes(last);
    }

    /**
     * Can we add a decimal dot here? Prevent multiple decimals in one number chunk.
     */
    function canInsertDecimal(str) {
        // Find last operator position and examine substring after it
        const lastOpIndex = findLastOperatorIndex(str);
        const chunk = str.slice(lastOpIndex + 1);
        return !chunk.includes(".");
    }

    /**
     * Find index of last display operator (+, -, ×, ÷, %) in the string.
     * Returns -1 if none.
     */
    function findLastOperatorIndex(str) {
        let lastIndex = -1;
        for (const op of DISPLAY_OPS) {
            const idx = str.lastIndexOf(op);
            if (idx > lastIndex) lastIndex = idx;
        }
        return lastIndex;
    }

    /**
     * Convert display expression to a JS-evaluable string.
     * Also handles percent (%) as /100 for the immediate number token.
     */
    function toEvaluable(expr) {
        // Replace × and ÷
        let s = expr.replace(/×/g, "*").replace(/÷/g, "/");

        // Handle percent:
        // Convert tokens like "50%" to "(50/100)"
        // Also handle cases like "200+10%" => "200+(10/100)"
        // For a simplified approach, replace "<number>%" with "(<number>/100)"
        s = s.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

        return s;
    }

    /**
     * Evaluate the expression safely-ish.
     * - Avoid trailing operators.
     * - Use Function constructor (local only).
     */
    function evaluateExpression(expr) {
        if (!expr) return "";
        // Remove trailing operator if present
        let trimmed = expr;
        while (endsWithOperator(trimmed)) {
            trimmed = trimmed.slice(0, -1);
        }
        if (!trimmed) return "";

        const evaluable = toEvaluable(trimmed);

        // Disallow any characters other than digits, operators, dot, parentheses, and spaces
        if (!/^[0-9+\-*/().\s%]*$/.test(evaluable)) {
            return "Error";
        }

        try {
            // eslint-disable-next-line no-new-func
            const val = Function(`"use strict"; return (${evaluable});`)();
            // Handle division by zero or non-finite results
            if (!isFinite(val)) return "Error";
            return +val.toFixed(12); // normalize to avoid floating errors in display
        } catch {
            return "Error";
        }
    }

    /**
     * Update Display areas (current & live result).
     */
    function render() {
        elCurrent.textContent = input || "0";

        const live = evaluateExpression(input);
        if (live === "" || live === "Error" || String(live) === input) {
            elResult.textContent = "";
        } else {
            elResult.textContent = "= " + live;
        }
    }

    /**
     * Add a value to the input (numbers/operators/decimal).
     */
    function appendValue(val) {
        // If starting from "0", replace unless decimal
        if (input === "0" && /^[0-9]$/.test(val)) {
            input = val;
            return;
        }
        if (val === ".") {
            if (!canInsertDecimal(input)) return;
            // If last char is operator or input empty, prepend a leading zero
            if (!input || endsWithOperator(input)) {
                input += "0";
            }
            input += ".";
            return;
        }

        // Operators
        if (DISPLAY_OPS.includes(val)) {
            if (!input) return; // no leading operator
            // Replace last operator if user presses two operators in a row
            if (endsWithOperator(input)) {
                input = input.slice(0, -1) + val;
            } else {
                input += val;
            }
            return;
        }

        // Numbers
        if (/^\d$/.test(val)) {
            input += val;
            return;
        }
    }

    /**
     * Handle AC (all clear) and C (backspace).
     */
    function handleClear(type) {
        if (type === "ac") {
            input = "0";
            lastResult = "";
            elHistory.textContent = "";
            elResult.textContent = "";
        } else if (type === "c") {
            if (input.length <= 1) {
                input = "0";
            } else {
                input = input.slice(0, -1);
            }
        }
    }

    /**
     * Commit evaluation with "=".
     */
    function handleEquals() {
        const val = evaluateExpression(input);
        if (val === "Error" || val === "") {
            flashError();
            return;
        }
        lastResult = String(val);
        elHistory.textContent = input + " =";
        input = lastResult;
        elResult.textContent = "";
    }

    /**
     * Tiny visual error feedback on the display area.
     */
    function flashError() {
        const original = elCurrent.style.color;
        elCurrent.style.color = "#c1121f";
        setTimeout(() => {
            elCurrent.style.color = original || "inherit";
        }, 180);
    }

    /**
     * Brief press animation for keys (mouse & keyboard).
     */
    function pressEffect(button) {
        if (!button) return;
        button.classList.add("pressed");
        setTimeout(() => button.classList.remove("pressed"), 120);
    }

    // -----------------------------
    // Mouse / Touch Input
    // -----------------------------
    elKeys.addEventListener("click", (e) => {
        const btn = e.target.closest("button.key");
        if (!btn) return;

        const action = btn.getAttribute("data-action");
        const value = btn.getAttribute("data-value");

        pressEffect(btn);

        if (action === "ac" || action === "c") {
            handleClear(action);
            render();
            return;
        }

        if (action === "equals") {
            handleEquals();
            render();
            return;
        }

        if (value != null) {
            // Normalize operator symbols to our display set
            let v = value;
            if (v === "*") v = "×";
            if (v === "/") v = "÷";
            appendValue(v);
            render();
        }
    });

    // -----------------------------
    // Keyboard Input
    // -----------------------------
    window.addEventListener("keydown", (e) => {
        const key = e.key;

        // Map keyboard to display ops and actions
        const keyToDisplay = {
            "*": "×",
            "/": "÷",
            "+": "+",
            "-": "-",
            "%": "%",
        };

        // Equals / Enter
        if (key === "Enter" || key === "=") {
            e.preventDefault();
            handleEquals();
            render();
            const equalsBtn = document.querySelector('[data-action="equals"]');
            pressEffect(equalsBtn);
            return;
        }

        // AC / C
        if (key.toLowerCase() === "c") {
            // Single 'c' acts as backspace; Esc/Delete do AC
            handleClear("c");
            render();
            pressEffect(document.querySelector('[data-action="c"]'));
            return;
        }
        if (key === "Escape" || key === "Delete") {
            handleClear("ac");
            render();
            pressEffect(document.querySelector('[data-action="ac"]'));
            return;
        }
        if (key === "Backspace") {
            handleClear("c");
            render();
            pressEffect(document.querySelector('[data-action="c"]'));
            return;
        }

        // Numbers
        if (/^\d$/.test(key)) {
            appendValue(key);
            render();
            pressEffect(document.querySelector(`.key.number[data-value="${key}"]`));
            return;
        }

        // Decimal
        if (key === ".") {
            appendValue(".");
            render();
            pressEffect(document.querySelector(`.key.number[data-value="."]`));
            return;
        }

        // Operators
        if (key in keyToDisplay) {
            appendValue(keyToDisplay[key]);
            render();
            const sel = key === "*"
                ? '.key.operator[data-value="×"]'
                : key === "/"
                ? '.key.operator[data-value="÷"]'
                : `.key.operator[data-value="${key}"]`;
            pressEffect(document.querySelector(sel));
            return;
        }
    });

    // Initial paint
    render();
});
