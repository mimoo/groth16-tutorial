/**
 * editor.js — a small dependency-free code editor.
 *
 * A transparent <textarea> sits exactly on top of a syntax-highlighted <pre>.
 * The textarea owns the caret, selection and undo stack; the <pre> owns the
 * colours. As long as both use identical font metrics and padding they stay
 * in register.
 */

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'of', 'in', 'new', 'do', 'break', 'continue', 'switch', 'case', 'default',
  'typeof', 'instanceof', 'throw', 'try', 'catch', 'finally', 'delete', 'void',
  'class', 'extends', 'this', 'async', 'await', 'yield', 'export', 'import',
]);

const CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Tokenize JavaScript well enough to colour it. This is deliberately a lexer
 * and not a parser: it walks the string once and never backtracks.
 */
export function highlight(code) {
  let out = '';
  let i = 0;
  const n = code.length;

  const span = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`;

  while (i < n) {
    const c = code[i];

    // line comment
    if (c === '/' && code[i + 1] === '/') {
      let j = code.indexOf('\n', i);
      if (j === -1) j = n;
      out += span('tok-com', code.slice(i, j));
      i = j;
      continue;
    }

    // block comment
    if (c === '/' && code[i + 1] === '*') {
      let j = code.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      out += span('tok-com', code.slice(i, j));
      i = j;
      continue;
    }

    // strings and template literals
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === c) {
          j++;
          break;
        }
        j++;
      }
      out += span('tok-str', code.slice(i, j));
      i = j;
      continue;
    }

    // numbers (including BigInt literals like 197n and hex)
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXoObBn._]/.test(code[j])) j++;
      out += span('tok-num', code.slice(i, j));
      i = j;
      continue;
    }

    // identifiers
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let k = j;
      while (k < n && code[k] === ' ') k++;

      if (KEYWORDS.has(word)) out += span('tok-key', word);
      else if (CONSTANTS.has(word)) out += span('tok-const', word);
      else if (code[k] === '(') out += span('tok-fn', word);
      else if (/^[A-Z]/.test(word)) out += span('tok-const', word);
      else out += escapeHtml(word);
      i = j;
      continue;
    }

    if ('+-*/%=<>!&|^~?:'.includes(c)) {
      out += span('tok-op', c);
      i++;
      continue;
    }

    if ('()[]{},;.'.includes(c)) {
      out += span('tok-punc', c);
      i++;
      continue;
    }

    out += escapeHtml(c);
    i++;
  }

  return out;
}

/**
 * Mount an editor into `host`. Returns { getValue, setValue, focus }.
 */
export function createEditor(host, initial, { onChange, onRun } = {}) {
  host.classList.add('editor');
  host.innerHTML = `
    <div class="editor__scroll">
      <div class="editor__gutter"></div>
      <div class="editor__area">
        <pre class="editor__hl" aria-hidden="true"></pre>
        <textarea class="editor__input" spellcheck="false" autocapitalize="off"
                  autocomplete="off" autocorrect="off" wrap="off" rows="1"></textarea>
      </div>
    </div>`;

  const scroll = host.querySelector('.editor__scroll');
  const gutter = host.querySelector('.editor__gutter');
  const pre = host.querySelector('.editor__hl');
  const ta = host.querySelector('.editor__input');

  function paint() {
    const value = ta.value;
    // A trailing newline needs a placeholder or the <pre> is one line short.
    pre.innerHTML = highlight(value) + (value.endsWith('\n') ? '\n ' : '');
    const lines = value.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    // No height bookkeeping here: the <pre> and the textarea share a grid cell,
    // so repainting the <pre> resizes both.
  }

  function setValue(v) {
    ta.value = v;
    paint();
  }

  ta.addEventListener('input', () => {
    paint();
    onChange?.(ta.value);
  });

  // Keep the highlight layer aligned when the textarea scrolls horizontally.
  ta.addEventListener('scroll', () => {
    scroll.scrollLeft = ta.scrollLeft;
  });

  ta.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+Enter runs.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: e2, value } = ta;

      if (s !== e2 && value.slice(s, e2).includes('\n')) {
        // Block indent / outdent.
        const from = value.lastIndexOf('\n', s - 1) + 1;
        const block = value.slice(from, e2);
        const next = e.shiftKey
          ? block.replace(/^ {1,2}/gm, '')
          : block.replace(/^/gm, '  ');
        ta.setRangeText(next, from, e2, 'select');
      } else if (e.shiftKey) {
        const from = value.lastIndexOf('\n', s - 1) + 1;
        if (value.slice(from, from + 2) === '  ') {
          ta.setRangeText('', from, from + 2, 'end');
          ta.selectionStart = ta.selectionEnd = Math.max(from, s - 2);
        }
      } else {
        ta.setRangeText('  ', s, e2, 'end');
      }
      paint();
      onChange?.(ta.value);
      return;
    }

    if (e.key === 'Enter') {
      // Keep the current indentation, and add one level after an opener.
      const { selectionStart: s, value } = ta;
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const line = value.slice(lineStart, s);
      const indent = (line.match(/^[ \t]*/) || [''])[0];
      const opens = /[{([]\s*$/.test(line);
      const extra = opens ? '  ' : '';
      const closes = /^\s*[})\]]/.test(value.slice(s));

      e.preventDefault();
      if (opens && closes) {
        ta.setRangeText(`\n${indent}${extra}\n${indent}`, s, ta.selectionEnd, 'end');
        ta.selectionStart = ta.selectionEnd = s + 1 + indent.length + extra.length;
      } else {
        ta.setRangeText(`\n${indent}${extra}`, s, ta.selectionEnd, 'end');
      }
      paint();
      onChange?.(ta.value);
    }
  });

  setValue(initial);

  return {
    getValue: () => ta.value,
    setValue,
    focus: () => ta.focus(),
  };
}
