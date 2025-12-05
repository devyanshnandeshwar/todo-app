/* TODO App with: edit, clear completed, filters */
// DOM refs
const input = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("todo-list");
const remainingEl = document.getElementById("remaining");
const clearCompletedBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter-btn");
const themeToggle = document.getElementById("theme-toggle");

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let filter = "all"; // all | active | completed
let theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

// utils
function persist() {
  localStorage.setItem("todos", JSON.stringify(todos));
}
function uid(){ return Date.now() + Math.floor(Math.random()*1000); }
function applyTheme(next) {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  if (themeToggle) themeToggle.textContent = next === "dark" ? "🌙" : "☀️";
}
applyTheme(theme);

// render
function render() {
  list.innerHTML = "";
  const filtered = todos.filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  filtered.forEach(todo => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.id = todo.id;
    li.draggable = true;
    li.classList.add("animate-in");

    const left = document.createElement("div");
    left.className = "left-block";

    const checkbox = document.createElement("button");
    checkbox.className = "todo-checkbox";
    checkbox.innerHTML = todo.completed ? "✓" : "";
    checkbox.title = "Toggle complete";
    checkbox.addEventListener("click", () => toggleComplete(todo.id));

    const text = document.createElement("div");
    text.className = "todo-text" + (todo.completed ? " done" : "");
    text.textContent = todo.text;
    text.title = "Double-click to edit";
    // double-click to edit
    text.addEventListener("dblclick", () => startEdit(todo.id, text));

    left.appendChild(checkbox);
    left.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(todo.id, text));

    const delBtn = document.createElement("button");
    delBtn.className = "action-btn delete";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);

    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragover", handleDragOver);
    li.addEventListener("drop", handleDrop);
    li.addEventListener("dragend", handleDragEnd);

    list.appendChild(li);
  });

  // remaining count
  const rem = todos.filter(t => !t.completed).length;
  remainingEl.textContent = rem;
}

let draggingId = null;
function handleDragStart(e) {
  draggingId = Number(e.currentTarget.dataset.id);
  e.currentTarget.classList.add("dragging");
}
function handleDragOver(e) {
  e.preventDefault();
  const li = e.currentTarget;
  const rect = li.getBoundingClientRect();
  const offset = e.clientY - rect.top;
  li.dataset.dropPosition = offset > rect.height / 2 ? "after" : "before";
}
function handleDrop(e) {
  e.preventDefault();
  const targetId = Number(e.currentTarget.dataset.id);
  if (!draggingId || !targetId || draggingId === targetId) return;
  const placeAfter = e.currentTarget.dataset.dropPosition === "after";
  reorderTodos(draggingId, targetId, placeAfter);
}
function handleDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  draggingId = null;
  Array.from(list.children).forEach(li => li.removeAttribute("data-drop-position"));
}
function reorderTodos(dragId, targetId, placeAfter) {
  const dragIdx = todos.findIndex(t => t.id === dragId);
  const targetIdx = todos.findIndex(t => t.id === targetId);
  if (dragIdx === -1 || targetIdx === -1) return;
  const [item] = todos.splice(dragIdx, 1);
  let insertIdx = todos.findIndex(t => t.id === targetId);
  if (placeAfter) insertIdx += 1;
  todos.splice(insertIdx, 0, item);
  persist();
  render();
}

// add
function addTodo(text) {
  const t = {
    id: uid(),
    text: text.trim(),
    completed: false
  };
  todos.push(t);
  persist();
  render();
}

// toggle
function toggleComplete(id) {
  todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  persist();
  render();
}

// delete
function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  persist();
  render();
}

// clear completed
clearCompletedBtn.addEventListener("click", () => {
  todos = todos.filter(t => !t.completed);
  persist();
  render();
});

// filters
filterBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    render();
  });
});

// theme toggle
themeToggle.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme(theme);
});

// edit flow
function startEdit(id, textNode) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  // create input
  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.value = todo.text;
  inputEl.className = "edit-input";
  // replace textNode with input
  textNode.replaceWith(inputEl);
  inputEl.focus();
  // save handlers
  function save() {
    const val = inputEl.value.trim();
    if (val.length === 0) {
      // if empty -> delete
      deleteTodo(id);
    } else {
      todos = todos.map(t => t.id === id ? { ...t, text: val } : t);
      persist();
      render();
    }
  }
  inputEl.addEventListener("blur", save);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      inputEl.blur();
    } else if (e.key === "Escape") {
      render(); // cancel
    }
  });
}

// initial wiring
addBtn.addEventListener("click", () => {
  const v = input.value.trim();
  if (v) {
    addTodo(v);
    input.value = "";
    input.focus();
  }
});

// also allow Enter key on input
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});

// initial render
render();