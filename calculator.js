"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const elHistory = document.getElementById("history");
    const elCurrent = document.getElementById("current");
    const elResult  = document.getElementById("result");
    const elKeys    = document.getElementById("keys");

    // State
    let input = "0";
    let lastResult = "";

    const DISPLAY_OPS = ["+", "-", "×", "÷", "%"];

    // Helpers
    function endsWithOperator(str) {
        if (!str) return false;
        return DISPLAY_OPS.includes(str.slice(-1));
    }

    function canInsertDecimal(str) {
        const lastOpIndex = findLastOperatorIndex(str);
        const chunk = str.slice(lastOpIndex + 1);
        return !chunk.includes(".");
    }

    function findLastOperatorIndex(str) {
        let lastIndex = -1;
        for (const op of DISPLAY_OPS) {
            const idx = str.lastIndexOf(op);
            if (idx > lastIndex) lastIndex = idx;
        }
        return lastIndex;
    }

    function toEvaluable(expr) {
        let s = expr.replace(/×/g, "*").replace(/÷/g, "/");
        s = s.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
        return s;
    }

    function evaluateExpression(expr) {
        if (!expr) return "";
        let trimmed = expr;
        while (endsWithOperator(trimmed)) trimmed = trimmed.slice(0, -1);
        if (!trimmed) return "";

        const evaluable = toEvaluable(trimmed);
        if (!/^[0-9+\-*/().\s%]*$/.test(evaluable)) return "Error";

        try {
            const val = Function(`"use strict"; return (${evaluable});`)();
            if (!isFinite(val)) return "Error";
            return +val.toFixed(12);
        } catch {
            return "Error";
        }
    }

    function render() {
        elCurrent.textContent = input || "0";
        const live = evaluateExpression(input);
        if (live === "" || live === "Error" || String(live) === input) {
            elResult.textContent = "";
        } else {
            elResult.textContent = "= " + live;
        }
    }

    function appendValue(val) {
        if (input === "0" && /^[0-9]$/.test(val)) {
            input = val;
            return;
        }
        if (val === ".") {
            if (!canInsertDecimal(input)) return;
            if (!input || endsWithOperator(input)) input += "0";
            input += ".";
            return;
        }
        if (DISPLAY_OPS.includes(val)) {
            if (!input) return;
            if (endsWithOperator(input)) {
                input = input.slice(0, -1) + val;
            } else {
                input += val;
            }
            return;
        }
        if (/^\d$/.test(val)) {
            input += val;
            return;
        }
    }

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

    function flashError() {
        const original = elCurrent.style.color;
        elCurrent.style.color = "#c1121f";
        setTimeout(() => {
            elCurrent.style.color = original || "inherit";
        }, 180);
    }

    function pressEffect(button) {
        if (!button) return;
        button.classList.add("pressed");
        setTimeout(() => button.classList.remove("pressed"), 120);
    }

    // Mouse input
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
            let v = value;
            if (v === "*") v = "×";
            if (v === "/") v = "÷";
            appendValue(v);
            render();
        }
    });

    // Keyboard input
    window.addEventListener("keydown", (e) => {
        const key = e.key;
        const keyToDisplay = { "*": "×", "/": "÷", "+": "+", "-": "-", "%": "%" };

        if (key === "Enter" || key === "=") {
            e.preventDefault();
            handleEquals();
            render();
            pressEffect(document.querySelector('[data-action="equals"]'));
            return;
        }
        if (key.toLowerCase() === "c") {
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
        if (/^\d$/.test(key)) {
            appendValue(key);
            render();
            pressEffect(document.querySelector(`.key.number[data-value="${key}"]`));
            return;
        }
        if (key === ".") {
            appendValue(".");
            render();
            pressEffect(document.querySelector(`.key.number[data-value="."]`));
            return;
        }
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

    render();
});
