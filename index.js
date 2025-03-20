const path = require('path');
const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');

function getFiles() {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(filePath => ({
        filePath,
        content: readFile(filePath)
    }));
}

function parseTodos(files) {
    const todos = [];
    const todoRegex = /\/\/\s*TODO[:\s]*(.*)/i;
    for (const file of files) {
        const lines = file.content.split('\n');
        for (const line of lines) {
            const match = line.match(todoRegex);
            if (match) {
                let todoText = match[1].trim();
                let user = '';
                let date = '';
                let comment = todoText;
                const parts = todoText.split(';').map(p => p.trim());
                if (parts.length >= 3) {
                    user = parts[0];
                    date = parts[1];
                    comment = parts.slice(2).join('; ');
                }
                const importanceCount = (todoText.match(/!/g) || []).length;
                todos.push({
                    importance: importanceCount > 0,
                    importanceCount,
                    user,
                    date,
                    comment,
                    file: path.basename(file.filePath)
                });
            }
        }
    }
    return todos;
}

function formatCell(text, width) {
    text = text || '';
    if (text.length > width) {
        return width > 3 ? text.slice(0, width - 3) + '...' : text.slice(0, width);
    }
    return text.padEnd(width, ' ');
}

function printTodos(todosToPrint) {
    const header = {
        importance: '!',
        user: 'user',
        date: 'date',
        comment: 'comment',
        file: 'file'
    };

    const maxWidths = {
        importance: 1,
        user: 10,
        date: 10,
        comment: 50,
        file: 30
    };

    const cols = ['importance', 'user', 'date', 'comment', 'file'];
    let widths = {};
    for (const col of cols) {
        let headerLength = header[col].length;
        let maxDataLength = headerLength;
        for (const todo of todosToPrint) {
            let value = col === 'importance' ? (todo.importance ? '!' : '') : (todo[col] || '');
            if (value.length > maxDataLength) {
                maxDataLength = value.length;
            }
        }
        widths[col] = Math.min(maxDataLength, maxWidths[col]);
    }

    const headerRow = cols.map(col => formatCell(header[col], widths[col])).join('  |  ');
    const separatorRow = '-'.repeat(headerRow.length);
    console.log(headerRow);
    console.log(separatorRow);
    for (const todo of todosToPrint) {
        const row = cols.map(col => {
            let value = col === 'importance' ? (todo.importance ? '!' : '') : (todo[col] || '');
            return formatCell(value, widths[col]);
        }).join('  |  ');
        console.log(row);
    }
    console.log(separatorRow);
}

const files = getFiles();
const todos = parseTodos(files);

console.log('Please, write your command!');
readLine(processCommand);

function processCommand(command) {
    command = command.replace(/\r/g, '').trim();
    const tokens = command.split(/\s+/);
    const mainCommand = tokens[0].toLowerCase();

    switch (mainCommand) {
        case 'exit':
            process.exit(0);
            break;
        case 'show':
            printTodos(todos);
            break;
        case 'important':
            printTodos(todos.filter(todo => todo.importanceCount > 0));
            break;
        case 'user':
            if (tokens.length < 2) {
                console.log('wrong command');
            } else {
                const username = tokens.slice(1).join(' ');
                printTodos(todos.filter(todo => todo.user && todo.user.toLowerCase() === username.toLowerCase()));
            }
            break;
        case 'sort':
            if (tokens.length < 2) {
                console.log('wrong command');
            } else {
                const sortType = tokens[1].toLowerCase();
                let sortedTodos = [...todos];
                if (sortType === 'importance') {
                    sortedTodos.sort((a, b) => b.importanceCount - a.importanceCount);
                } else if (sortType === 'user') {
                    sortedTodos.sort((a, b) => {
                        if (a.user && b.user) {
                            return a.user.toLowerCase().localeCompare(b.user.toLowerCase());
                        } else if (a.user) {
                            return -1;
                        } else if (b.user) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                } else if (sortType === 'date') {
                    sortedTodos.sort((a, b) => {
                        if (a.date && b.date) {
                            return new Date(b.date) - new Date(a.date);
                        } else if (a.date) {
                            return -1;
                        } else if (b.date) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                } else {
                    console.log('wrong command');
                    return;
                }
                printTodos(sortedTodos);
            }
            break;
        case 'date':
            if (tokens.length < 2) {
                console.log('wrong command');
            } else {
                const dateArg = tokens[1];
                const parts = dateArg.split('-');
                let filterDate;
                if (parts.length === 1) {
                    filterDate = new Date(parts[0], 0, 1);
                } else if (parts.length === 2) {
                    filterDate = new Date(parts[0], parts[1] - 1, 1);
                } else if (parts.length === 3) {
                    filterDate = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    console.log('wrong command');
                    return;
                }
                const filteredTodos = todos.filter(todo => {
                    if (todo.date) {
                        const todoDate = new Date(todo.date);
                        return todoDate > filterDate;
                    }
                    return false;
                });
                printTodos(filteredTodos);
            }
            break;
        default:
            console.log('wrong command');
            break;
    }
}
